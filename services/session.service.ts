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
  password?: string;
  firstLogin?: boolean;
  access_token?: string;
  refresh_token?: string;
};

// SAVE SESSION
export const saveSession = async (user: SessionUser) => {
  console.log(`💾 [SessionService] Saving session for: ${user.email} (${user.role})`);

  if (Platform.OS === 'web') {
    try {
      await AsyncStorage.setItem('gfm_session', JSON.stringify({
        ...user,
        updatedAt: Date.now()
      }));
      console.log("✅ [SessionService] Session saved to AsyncStorage (Web)");
    } catch (e) {
      console.error("❌ [SessionService] Failed to save session to Web Storage", e);
    }
    return;
  }

  const db = await dbPromise;
  if (!db) return; // Should not happen on Native if initialized correctly

  const now = Date.now();

  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO session (id, user_id, email, role, prn, isProfileComplete, password, first_login, access_token, refresh_token, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [SESSION_ID, user.id, user.email, user.role, user.prn || null, user.isProfileComplete ? 1 : 0, user.password || null, user.firstLogin ? 1 : 0, user.access_token || null, user.refresh_token || null, now]
    );
    console.log("✅ [SessionService] Session saved to SQLite");
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

    const row = await db.getFirstAsync(`SELECT * FROM session WHERE id = ?`, [SESSION_ID]) as {
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
      password: row.password || extData.password,
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
export const clearSession = async () => {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem('gfm_session');
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem('session_extended');
      } catch (e) { }
    }
    return;
  }

  const db = await dbPromise;
  try {
    if (!db) return;
    await db.runAsync(`DELETE FROM session WHERE id = ?`, [SESSION_ID]);
    console.log("🧹 [SessionService] Session cleared from SQLite");
  } catch (error) {
    console.error("❌ [SessionService] Failed to clear session:", error);
  }
};
