import { clearSQLite } from '../storage/sqlite';
import { clearSession, getSession, saveSession } from './session.service';
import { supabase } from './supabase';

export interface AuthStatus {
  isLoggedIn: boolean;
  role: 'student' | 'teacher' | 'admin' | 'attendance_taker' | null;
  prn: string | null;
  email: string | null;
}

export const checkLoginStatus = async (): Promise<AuthStatus> => {
  const session = await getSession();
  if (!session) {
    return {
      isLoggedIn: false,
      role: null,
      prn: null,
      email: null
    };
  }
  return {
    isLoggedIn: true,
    role: session.role,
    prn: session.prn || null,
    email: session.email
  };
};

// SINGLETON LOCK for Auth
let isLoggingIn = false;

// GLOBAL AUTH EXECUTION GUARD (User Requested Pattern)
let loginInProgress = false;
let loginDone = false;

export async function runAuthOnce(fn: () => Promise<void>) {
  if (loginDone || loginInProgress) return;
  loginInProgress = true;
  try {
    await fn();
  } finally {
    loginInProgress = false; // Reset progress flag
    loginDone = true;        // Mark as done permanently for this session
  }
}

export const login = async (identifier: string, pass: string) => {
  if (isLoggingIn) {
    console.warn('⚠️ Login already in progress. Ignoring duplicate call.');
    return;
  }

  isLoggingIn = true;
  console.log(`🔑 [AuthService] Attempting login for: ${identifier}`);

  try {
    let profile = null;

    if (!identifier.includes('@')) {
      // Step 1: Try to find user by PRN / EMPID (stored in `prn` column)
      const { data: byPrn, error: prnError } = await supabase
        .from('profiles')
        .select('id, email, role, prn, full_name, department, password, first_login, is_profile_complete')
        .eq('prn', identifier.trim())
        .maybeSingle();

      if (prnError) throw prnError;
      profile = byPrn;

      // Step 2: Fallback — try matching by full_name if still not found
      // (rare, but useful for admins searching by name)
      // Note: Primary fallback is covered — EMPID lives in `prn` for all staff
    } else {
      const { data: byEmail, error: emailError } = await supabase
        .from('profiles')
        .select('id, email, role, prn, full_name, department, password, first_login, is_profile_complete')
        .eq('email', identifier.toLowerCase().trim())
        .maybeSingle();

      if (emailError) throw emailError;
      profile = byEmail;
    }

    if (!profile) {
      throw new Error(
        identifier.includes('@')
          ? 'No account found with this email. Please check your registered email address.'
          : 'No account found with this EMPID / PRN. Please check your ID or use your registered email address instead.'
      );
    }

    if (profile.password !== pass) {
      throw new Error('Invalid password.');
    }

    // --- LOCAL-ONLY AUTHENTICATION FLOW ---
    // User requested: Admin adds to profile -> User logs in directly.
    // No email confirmation, no Supabase Auth provider requirements.

    console.log(`✅ [AuthService] Local verification successful for ${profile.role}: ${profile.email}`);

    await clearSQLite();
    await saveSession({
      id: profile.id,
      email: profile.email,
      role: profile.role,
      prn: profile.prn,
      isProfileComplete: !!profile.is_profile_complete,
      fullName: profile.full_name,
      department: profile.department,
      password: profile.password,
      firstLogin: profile.first_login ?? true,
      // We pass a dummy token since we are using local-profile auth
      access_token: 'local-session-' + profile.id,
      refresh_token: 'local-refresh-' + profile.id
    });

    return { id: profile.id, email: profile.email, role: profile.role, prn: profile.prn };
  } catch (err: any) {
    console.error('❌ [AuthService] Login error:', err.message);
    throw err;
  } finally {
    isLoggingIn = false;
  }
};



export const loginWithEmail = async (email: string, pass: string) => {
  return login(email, pass);
};

export const loginWithCode = async (email: string, passwordValue: string, role: 'teacher' | 'admin' | 'attendance_taker') => {
  console.log(`🔑 [AuthService] Attempting login with ${role} password for email: ${email}`);

  const { data: profile, error: lookupError } = await supabase
    .from('profiles')
    .select('id, email, role, prn, full_name, department, password, first_login, is_profile_complete')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (lookupError || !profile) {
    throw new Error('No account found with this email. Please verify the email provided during registration.');
  }
  if (profile.role !== role) {
    throw new Error(`This email is not registered as a${role === 'admin' ? 'n' : ''} ${role.replace('_', ' ')}.`);
  }

  if (profile.password !== passwordValue) throw new Error('Invalid password. Please try again.');

  // --- LOCAL-ONLY AUTHENTICATION FLOW ---
  console.log(`✅ [AuthService] Local verification successful for ${profile.role}: ${profile.email}`);

  await clearSQLite();

  await saveSession({
    id: profile.id,
    email: profile.email,
    role: profile.role,
    prn: profile.prn,
    isProfileComplete: !!profile.is_profile_complete,
    fullName: profile.full_name,
    department: profile.department,
    password: profile.password,
    firstLogin: profile.first_login ?? true,
    // We pass a dummy token since we are using local-profile auth
    access_token: 'local-session-' + profile.id,
    refresh_token: 'local-refresh-' + profile.id
  });

  return { id: profile.id, email: profile.email, role: profile.role, prn: profile.prn };
};


export const adminCreateUser = async (email: string, prn: string | null, role: 'student' | 'teacher', code: string | null, fullName: string) => {
  // Admin operations must not run in the frontend app.
  // Please use scripts/create_admin.ts or scripts/fix-admin.ts with the service role key.
  throw new Error('adminCreateUser is not available in the client app. Use server-side script.');
}

export const loginWithPRN = async (prn: string, pass: string) => {
  return login(prn, pass);
};

export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'gfmrecord://reset-password',
  });
  if (error) throw error;
};

export const logout = async () => {
  await clearSession();
  await clearSQLite();
};

export const markProfileComplete = async (userId: string) => {
  try {
    // 1. Update Supabase
    const { error } = await supabase
      .from('profiles')
      .update({ is_profile_complete: true })
      .eq('id', userId);

    if (error) console.error('Error updating profile status in Supabase:', error);

    // 2. Update local session
    const session = await getSession();
    if (session && session.id === userId) {
      session.isProfileComplete = true;
      await saveSession(session);
    }
  } catch (e) {
    console.error('Failed to mark profile complete:', e);
  }
};
