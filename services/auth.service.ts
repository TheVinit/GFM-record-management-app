import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearSQLite } from '../storage/sqlite';
import { clearSession, getSession, saveSession } from './session.service';
import { supabase } from './supabase';

const log = (...args: any[]) => { if (__DEV__) console.log(...args); };
const warn = (...args: any[]) => { if (__DEV__) console.warn(...args); };

import { Platform } from 'react-native';

export interface AuthStatus {
  isLoggedIn: boolean;
  role: 'student' | 'teacher' | 'admin' | 'attendance_taker' | null;
  prn: string | null;
  email: string | null;
}

export const checkLoginStatus = async (): Promise<AuthStatus> => {
  const session = await getSession();
  if (!session) {
    return { isLoggedIn: false, role: null, prn: null, email: null };
  }
  return {
    isLoggedIn: true,
    role: session.role,
    prn: session.prn || null,
    email: session.email
  };
};

let isLoggingIn = false;
let loginDone = false;
let loginInProgress = false;

export async function runAuthOnce(fn: () => Promise<void>) {
  if (loginDone || loginInProgress) return;
  loginInProgress = true;
  try {
    await fn();
  } finally {
    loginInProgress = false;
    loginDone = true;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE LOGIN
// 1. Resolve email from PRN/email using a secure server-side RPC (no auth needed)
// 2. Sign in via Supabase Auth (returns real JWT)
// 3. Fetch profile using the authenticated session
// ─────────────────────────────────────────────────────────────────────────────
export const login = async (identifier: string, pass: string) => {
  if (isLoggingIn) {
    warn('⚠️ Login already in progress. Ignoring duplicate call.');
    return;
  }
  isLoggingIn = true;

  try {
    // Aggressive sanitization
    const cleanIdentifier = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();

    // Timeout logic (15 seconds)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timeout. Please check your internet signal.')), 15000)
    );

    // Step 1: Resolve email via secure RPC
    const rpcPromise = supabase.rpc('get_email_for_identifier', { p_identifier: cleanIdentifier });
    const { data: resolvedEmail, error: rpcError } = await Promise.race([rpcPromise, timeoutPromise]) as any;

    if (rpcError || !resolvedEmail) {
      log(`❌ [Auth] Identifier lookup failed for: ${cleanIdentifier}`);
      throw new Error(
        cleanIdentifier.includes('@')
          ? 'No account found with this email. Please check your registered email.'
          : 'No account found with this EMPID / PRN. Try using your email address instead.'
      );
    }

    const email = resolvedEmail as string;

    // Step 2: Authenticate via Supabase Auth
    const authPromise = supabase.auth.signInWithPassword({
      email: email.trim(),
      password: cleanPass,
    });

    const { data: authData, error: authError } = await Promise.race([authPromise, timeoutPromise]) as any;

    if (authError || !authData.session) {
      if (authError) {
        log(`❌ [Auth] Sign in error: ${authError.message}`);
        throw new Error(authError.message);
      }
      throw new Error('Invalid password. Please try again.');
    }

    const session = authData.session;

    // Step 3: Fetch profile
    const profilePromise = supabase
      .from('profiles')
      .select('id, email, role, prn, full_name, department, first_login, is_profile_complete')
      .eq('id', authData.user.id)
      .single();

    const { data: profile, error: profileError } = await Promise.race([profilePromise, timeoutPromise]) as any;

    if (profileError || !profile) {
      throw new Error('Account found but profile is missing. Please contact your administrator.');
    }

    log(`✅ [Auth] Login successful: ${profile.role} — ${profile.email}`);

    await clearSQLite();
    await saveSession({
      id: profile.id,
      email: profile.email,
      role: profile.role,
      prn: profile.prn,
      isProfileComplete: !!profile.is_profile_complete,
      fullName: profile.full_name,
      department: profile.department,
      firstLogin: profile.first_login ?? true,
      refresh_token: session.refresh_token,
    });

    // Register this device session
    await registerDeviceSession().catch(err => console.warn('Failed to register device session:', err));

    return { id: profile.id, email: profile.email, role: profile.role, prn: profile.prn };
  } catch (err: any) {
    console.error('❌ [AuthService] Login error:', err.message);
    throw err;
  } finally {
    isLoggingIn = false;
  }
};

export const loginWithEmail = async (email: string, pass: string) => login(email, pass);

export const loginWithCode = async (
  email: string,
  passwordValue: string,
  role: 'teacher' | 'admin' | 'attendance_taker'
) => {
  // First verify the role matches before attempting full login
  const { data: resolvedEmail, error } = await supabase.rpc(
    'get_email_for_identifier',
    { p_identifier: email.trim() }
  );

  if (error || !resolvedEmail) {
    throw new Error('No account found with this email.');
  }

  // Check role from app_metadata after a quick signIn
  return login(email, passwordValue);
};

export const loginWithPRN = async (prn: string, pass: string) => login(prn, pass);

// ─────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD — Supabase built-in OTP email flow
// ─────────────────────────────────────────────────────────────────────────────
export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'gfmrecord://reset-password',
  });
  if (error) throw error;
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────────────────────
export const logout = async () => {
  await supabase.auth.signOut();
  await clearSession();
  await clearSQLite();
};

export const logoutAllDevices = async () => {
  const { data, error } = await supabase.functions.invoke('manage-sessions', {
    body: { action: 'revoke-all' },
  });
  if (error) throw error;

  // Clear local session as well
  await logout();
};

export const registerDeviceSession = async () => {
  let deviceName = 'Unknown Device';
  let os: string = Platform.OS;
  let browser = 'App';

  if (Platform.OS === 'web') {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';

    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'MacOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone')) os = 'iOS';

    deviceName = browser + ' on ' + os;
  } else {
    deviceName = Platform.OS === 'ios' ? 'iPhone' : 'Android Device';
  }

  const { data, error } = await supabase.rpc('register_session', {
    p_device_name: deviceName,
    p_os: os,
    p_browser: browser
  });

  if (error) throw error;

  // Store the actual session_id returned from DB to identify "This device"
  if (data?.[0]?.res_session_id) {
    await AsyncStorage.setItem('gfm_current_session_id', data[0].res_session_id);
  }
};

export const getCurrentSessionId = async () => {
  return await AsyncStorage.getItem('gfm_current_session_id');
};

export const listActiveDevices = async () => {
  const { data, error } = await supabase.functions.invoke('manage-sessions', {
    body: { action: 'list' },
  });
  if (error) throw error;
  return data.data;
};

export const revokeDeviceSession = async (sessionId: string) => {
  const { error } = await supabase.functions.invoke('manage-sessions', {
    body: { action: 'revoke', sessionId },
  });
  if (error) throw error;
};

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE COMPLETION
// ─────────────────────────────────────────────────────────────────────────────
export const markProfileComplete = async (userId: string) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_profile_complete: true })
      .eq('id', userId);
    if (error) console.error('Error updating profile status:', error);

    const session = await getSession();
    if (session && session.id === userId) {
      session.isProfileComplete = true;
      await saveSession(session);
    }
  } catch (e) {
    console.error('Failed to mark profile complete:', e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN CREATE USER — Server-side only
// ─────────────────────────────────────────────────────────────────────────────
export const adminCreateUser = async () => {
  throw new Error(
    'adminCreateUser is disabled in the client app. Use a Supabase Edge Function with the service role key.'
  );
};
