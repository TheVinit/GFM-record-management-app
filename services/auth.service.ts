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
    
    // Try to find user by PRN first, then by email
    if (!identifier.includes('@')) {
      console.log(`🔍 [AuthService] Looking up by PRN: ${identifier}`);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, prn, full_name, department, password, first_login')
        .eq('prn', identifier)
        .maybeSingle();
      
      if (error) {
        console.error('PRN lookup error:', error);
        throw error;
      }
      profile = data;
    } else {
      console.log(`🔍 [AuthService] Looking up by email: ${identifier}`);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, prn, full_name, department, password, first_login')
        .eq('email', identifier)
        .maybeSingle();
      
      if (error) {
        console.error('Email lookup error:', error);
        throw error;
      }
      profile = data;
    }

    if (!profile) {
      console.error(`❌ [AuthService] No profile found for ${identifier}`);
      throw new Error('User not found. Please check your PRN or Email.');
    }

    // Verify password
    if (profile.password !== pass) {
      console.error(`❌ [AuthService] Invalid password for ${identifier}`);
      throw new Error('Invalid password.');
    }

    console.log(`✅ [AuthService] Login successful for ${profile.email} (${profile.role})`);
    
    // Clear local stale cache before saving new session
    await clearSQLite();
    
    await saveSession({
      id: profile.id,
      email: profile.email,
      role: profile.role,
      prn: profile.prn,
      isProfileComplete: true,
      fullName: profile.full_name,
      department: profile.department,
      password: profile.password,
      firstLogin: profile.first_login ?? true
    });

    return { id: profile.id, email: profile.email, role: profile.role, prn: profile.prn };
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
    .select('id, email, role, prn, full_name, department, password')
    .eq('email', email)
    .single();

  if (lookupError || !profile) throw new Error("User not found");
  if (profile.role !== role) throw new Error(`User is not an ${role}`);
  
  if (profile.password !== passwordValue) throw new Error("Invalid password");

  await clearSQLite();
  
  await saveSession({
    id: profile.id,
    email: profile.email,
    role: profile.role,
    prn: profile.prn,
    isProfileComplete: true,
    fullName: profile.full_name,
    department: profile.department
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
  // Update your profiles table if needed
  const session = await getSession();
  if (session && session.id === userId) {
    session.isProfileComplete = true;
    await saveSession(session);
  }
};
