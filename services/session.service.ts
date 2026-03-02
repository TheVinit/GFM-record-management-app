import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { dbPromise } from '../storage/sqlite';

const SESSION_ID = 'current_user';

export type SessionUser = {
  id: string;
  email: string;
  prn?: string;
  role: 'student' | 'teacher' | 'admin' | 'attendance_taker';
  isProfileComplete: boolean;
  fullName?: string;
  department?: string;
  firstLogin?: boolean;
  access_token?: string;
  refresh_token?: string;
  is_active?: boolean;
};

// SAVE SESSION
const log = (...args: any[]) => { if (__DEV__) console.log(...args); };

export const saveSession = async (user: SessionUser) => {
  log(`💾 [SessionService] Saving session for: ${user.email} (${user.role})`);

  if (Platform.OS === 'web') {
    try {
      // For Multi-Account on Web, we store a list of accounts
      const accountsJson = await AsyncStorage.getItem('gfm_accounts') || '[]';
      let accounts = JSON.parse(accountsJson) as (SessionUser & { is_active: boolean })[];

      // Deactivate others
      accounts = accounts.map(a => ({ ...a, is_active: false }));

      const existingIndex = accounts.findIndex(a => a.id === user.id);
      if (existingIndex > -1) {
        accounts[existingIndex] = { ...user, is_active: true };
      } else {
        accounts.push({ ...user, is_active: true });
      }

      await AsyncStorage.setItem('gfm_accounts', JSON.stringify(accounts));
      // Keep legacy gfm_session for backward compatibility of simple checks
      await AsyncStorage.setItem('gfm_session', JSON.stringify(user));

      log("✅ [SessionService] Multi-account session saved (Web)");
    } catch (e) {
      console.error("❌ [SessionService] Failed to save session to Web Storage", e);
    }
    return;
  }

  const db = await dbPromise;
  if (!db) return;

  const now = Date.now();

  try {
    // 1. Deactivate all
    await db.runAsync('UPDATE session SET is_active = 0');

    // 2. Insert/Replace active session
    await db.runAsync(
      `INSERT OR REPLACE INTO session (user_id, email, role, prn, isProfileComplete, first_login, access_token, refresh_token, is_active, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.email, user.role, user.prn || null, user.isProfileComplete ? 1 : 0, user.firstLogin ? 1 : 0, user.access_token || null, user.refresh_token || null, 1, now]
    );
    log("✅ [SessionService] Session saved to SQLite (Active)");
  } catch (error) {
    console.error("❌ [SessionService] Failed to save session to SQLite:", error);
  }
};

// GET SESSION
export const getSession = async (): Promise<SessionUser | null> => {
  if (Platform.OS === 'web') {
    try {
      const json = await AsyncStorage.getItem('gfm_session');
      if (!json) return null;
      return JSON.parse(json) as SessionUser;
    } catch (e) {
      console.error("❌ [SessionService] Failed to read session from Web Storage", e);
      return null;
    }
  }

  try {
    const db = await dbPromise;
    if (!db) return null;

    const row = await db.getFirstAsync(`SELECT * FROM session WHERE is_active = 1 LIMIT 1`) as {
      user_id: string;
      email: string;
      role: string;
      prn: string | null;
      isProfileComplete: number;
      password: string | null;
      first_login: number | null;
      access_token: string | null;
      refresh_token: string | null;
    } | null;

    if (!row) return null;

    // Restore Supabase Session if tokens exist
    if (row.access_token && row.refresh_token) {
      // We import supabase dynamically or use the global one if possible, 
      // but importing strictly adds circular deps? no.
      const { supabase } = require('./supabase');
      // We don't await this to keep UI snappy, but it's important for subsequent requests
      try {
        await supabase.auth.setSession({
          access_token: row.access_token,
          refresh_token: row.refresh_token
        });
      } catch (err) {
        console.warn('Failed to restore Supabase session', err);
      }
    }

    let extData: { fullName?: string; department?: string; password?: string; firstLogin?: boolean } = {};
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem('session_extended');
        if (stored) extData = JSON.parse(stored);
      } catch (e) { }
    }

    return {
      id: row.user_id,
      email: row.email,
      role: row.role as any,
      prn: row.prn || undefined,
      isProfileComplete: row.isProfileComplete === 1,
      fullName: extData.fullName,
      department: extData.department,
      firstLogin: (row.first_login !== null ? row.first_login === 1 : extData.firstLogin),
      access_token: row.access_token || undefined,
      refresh_token: row.refresh_token || undefined
    };
  } catch (e) {
    console.error("❌ [SessionService] Error reading session from SQLite:", e);
    return null;
  }
};

// HELPER FOR QUICK CHECKS
export const isAuthenticated = async (): Promise<boolean> => {
  const session = await getSession();
  return !!session;
};

export const getUserRole = async (): Promise<'student' | 'teacher' | 'admin' | 'attendance_taker' | null> => {
  const session = await getSession();
  return session ? session.role : null;
};

export const getUserPrn = async (): Promise<string | null> => {
  const session = await getSession();
  return session ? session.prn || null : null;
};

export const isProfileComplete = async (): Promise<boolean> => {
  const session = await getSession();
  return session ? session.isProfileComplete : false;
};

// CLEAR SESSION (LOGOUT)
// GET ALL SAVED ACCOUNTS
export const getSavedAccounts = async (): Promise<SessionUser[]> => {
  if (Platform.OS === 'web') {
    const json = await AsyncStorage.getItem('gfm_accounts');
    return json ? JSON.parse(json) : [];
  }

  const db = await dbPromise;
  if (!db) return [];
  try {
    const rows = await db.getAllAsync(`SELECT * FROM session ORDER BY updatedAt DESC`) as any[];
    return rows.map(row => ({
      id: row.user_id,
      email: row.email,
      role: row.role,
      prn: row.prn,
      isProfileComplete: row.isProfileComplete === 1,
      access_token: row.access_token,
      refresh_token: row.refresh_token
    }));
  } catch (e) {
    return [];
  }
};

// SWITCH ACCOUNT
export const switchAccount = async (userId: string) => {
  if (Platform.OS === 'web') {
    const json = await AsyncStorage.getItem('gfm_accounts');
    if (json) {
      let accounts = JSON.parse(json) as (SessionUser & { is_active: boolean })[];
      const target = accounts.find(a => a.id === userId);
      if (target) {
        accounts = accounts.map(a => ({ ...a, is_active: a.id === userId }));
        await AsyncStorage.setItem('gfm_accounts', JSON.stringify(accounts));
        await AsyncStorage.setItem('gfm_session', JSON.stringify(target));
      }
    }
    return;
  }

  const db = await dbPromise;
  if (!db) return;
  try {
    await db.runAsync('UPDATE session SET is_active = 0');
    await db.runAsync('UPDATE session SET is_active = 1, updatedAt = ? WHERE user_id = ?', [Date.now(), userId]);
  } catch (e) {
    console.error("❌ [SessionService] Switch failed:", e);
  }
};

// CLEAR SESSION (LOGOUT)
export const clearSession = async (userId?: string) => {
  if (Platform.OS === 'web') {
    const json = await AsyncStorage.getItem('gfm_accounts');
    if (json) {
      let accounts = JSON.parse(json) as (SessionUser & { is_active: boolean })[];
      const idToRemove = userId || accounts.find(a => a.is_active)?.id;
      accounts = accounts.filter(a => a.id !== idToRemove);
      await AsyncStorage.setItem('gfm_accounts', JSON.stringify(accounts));

      // If we cleared the active one, clear gfm_session too
      if (!userId || userId === (JSON.parse(await AsyncStorage.getItem('gfm_session') || '{}').id)) {
        await AsyncStorage.removeItem('gfm_session');
      }
    }
    return;
  }

  const db = await dbPromise;
  try {
    if (!db) return;
    if (userId) {
      await db.runAsync(`DELETE FROM session WHERE user_id = ?`, [userId]);
    } else {
      await db.runAsync(`DELETE FROM session WHERE is_active = 1`);
    }
    log("Clarified session cleared");
  } catch (error) {
    console.error("❌ [SessionService] Clear failed:", error);
  }
};
