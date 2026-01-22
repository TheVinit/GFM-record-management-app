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
};

// SAVE SESSION
export const saveSession = async (user: SessionUser) => {
  console.log(`💾 [SessionService] Saving session to SQLite for: ${user.email} (${user.role})`);
  const db = await dbPromise;
  const now = Date.now();
  
  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO session (id, user_id, email, role, prn, isProfileComplete, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [SESSION_ID, user.id, user.email, user.role, user.prn || null, user.isProfileComplete ? 1 : 0, now]
    );
    console.log("✅ [SessionService] Session saved to SQLite");
  } catch (error) {
    console.error("❌ [SessionService] Failed to save session to SQLite:", error);
  }
  
  // Store extended data in localStorage for web
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('session_extended', JSON.stringify({
          fullName: user.fullName,
          department: user.department,
          password: user.password,
          firstLogin: user.firstLogin
        }));
      } catch (e) {}
    }
  };

// GET SESSION
export const getSession = async (): Promise<SessionUser | null> => {
  try {
    const db = await dbPromise;
    const row = await db.getFirstAsync<{
      user_id: string;
      email: string;
      role: string;
      prn: string | null;
      isProfileComplete: number;
    }>(`SELECT * FROM session WHERE id = ?`, [SESSION_ID]);

    if (!row) return null;

    let extData: { fullName?: string; department?: string; password?: string; firstLogin?: boolean } = {};
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const stored = localStorage.getItem('session_extended');
          if (stored) extData = JSON.parse(stored);
        } catch (e) {}
      }

      return {
        id: row.user_id,
        email: row.email,
        role: row.role as any,
        prn: row.prn || undefined,
        isProfileComplete: row.isProfileComplete === 1,
        fullName: extData.fullName,
        department: extData.department,
        password: extData.password,
        firstLogin: extData.firstLogin
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
  const db = await dbPromise;
  try {
    await db.runAsync(`DELETE FROM session WHERE id = ?`, [SESSION_ID]);
    console.log("🧹 [SessionService] Session cleared from SQLite");
  } catch (error) {
    console.error("❌ [SessionService] Failed to clear session:", error);
  }
  
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem('session_extended');
    } catch (e) {}
  }
};
