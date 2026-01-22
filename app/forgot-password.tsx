import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../services/supabase';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
};

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'email' | 'emailSent' | 'token' | 'password' | 'success'>('email');
  const [useTokenFlow, setUseTokenFlow] = useState(false);

  const generateToken = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleRequestReset = async () => {
    setErrorMessage('');
    
    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (error) {
        console.error('Profile lookup error:', error);
        throw new Error('Something went wrong. Please try again.');
      }

      if (!profile) {
        setErrorMessage('No account found with this email address. Please check your email or contact the administrator.');
        return;
      }

      const redirectUrl = Platform.OS === 'web' 
        ? `${window.location.origin}/reset-password`
        : 'gfmrecord://reset-password';

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim(),
        { redirectTo: redirectUrl }
      );

      if (resetError) {
        console.log('Supabase Auth email failed, using token flow:', resetError.message);
        setUseTokenFlow(true);
        
        const token = generateToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        const { error: tokenError } = await supabase
          .from('password_reset_tokens')
          .insert({
            email: email.toLowerCase().trim(),
            token: token,
            expires_at: expiresAt.toISOString(),
          });

        if (tokenError) {
          console.error('Token creation error:', tokenError);
          throw new Error('Failed to create reset token. Please try again.');
        }

        setResetToken(token);
        setStep('token');
        showAlert('Reset Code Generated', `Your password reset code is: ${token}\n\nThis code will expire in 1 hour.\n\nNote: In production, this would be sent to your email.`);
      } else {
        setStep('emailSent');
        showAlert('Email Sent!', 'Check your email for the password reset link. It may take a few minutes. Also check your spam folder.');
      }
    } catch (error: any) {
      console.error('Reset request error:', error);
      setErrorMessage(error.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async () => {
    setErrorMessage('');
    
    if (!resetToken.trim()) {
      setErrorMessage('Please enter the reset code');
      return;
    }

    setLoading(true);
    
    try {
      const { data: tokenData, error } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('token', resetToken.toUpperCase().trim())
        .eq('used', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !tokenData) {
        setErrorMessage('Invalid or expired reset code. Please request a new one.');
        return;
      }

      setStep('password');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorMessage('');
    
    if (!newPassword.trim()) {
      setErrorMessage('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setLoading(true);
    
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ password: newPassword })
        .eq('email', email.toLowerCase().trim());

      if (updateError) {
        throw new Error('Failed to update password. Please try again.');
      }

      await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('email', email.toLowerCase().trim())
        .eq('token', resetToken.toUpperCase().trim());

      setStep('success');
      showAlert('Success!', 'Your password has been reset successfully. You can now login with your new password.');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <View style={styles.form}>
      <Text style={styles.label}>Email Address</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />

      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <TouchableOpacity 
        style={[styles.resetButton, loading && styles.resetButtonDisabled]} 
        onPress={handleRequestReset} 
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.resetButtonText}>Get Reset Code</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderEmailSentStep = () => (
    <View style={styles.form}>
      <View style={styles.successIcon}>
        <Text style={styles.successEmoji}>✉️</Text>
      </View>
      <Text style={styles.successTitle}>Check Your Email</Text>
      <Text style={styles.emailText}>{email}</Text>
      <Text style={styles.instructionText}>
        We've sent a password reset link to your email address. Click the link in the email to reset your password.
      </Text>
      <Text style={[styles.instructionText, { color: '#f59e0b', marginTop: 10 }]}>
        Don't see it? Check your spam/junk folder. It may take a few minutes.
      </Text>

      <TouchableOpacity 
        style={[styles.resetButton, { marginTop: 25 }]} 
        onPress={handleRequestReset}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.resetButtonText}>Resend Email</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.resendButton} 
        onPress={() => { setStep('email'); setErrorMessage(''); }}
      >
        <Text style={styles.resendButtonText}>← Use Different Email</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTokenStep = () => (
    <View style={styles.form}>
      <View style={styles.successIcon}>
        <Text style={styles.successEmoji}>🔑</Text>
      </View>
      <Text style={styles.successText}>
        Enter the reset code shown in the alert
      </Text>
      <Text style={styles.emailText}>{email}</Text>

      <Text style={styles.label}>Reset Code</Text>
      <TextInput
        style={[styles.input, styles.tokenInput]}
        placeholder="Enter 6-digit code"
        value={resetToken}
        onChangeText={setResetToken}
        autoCapitalize="characters"
        maxLength={6}
      />

      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <TouchableOpacity 
        style={[styles.resetButton, loading && styles.resetButtonDisabled]} 
        onPress={handleVerifyToken} 
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.resetButtonText}>Verify Code</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.resendButton} 
        onPress={() => { setStep('email'); setErrorMessage(''); }}
      >
        <Text style={styles.resendButtonText}>← Change Email</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPasswordStep = () => (
    <View style={styles.form}>
      <View style={styles.successIcon}>
        <Text style={styles.successEmoji}>🔐</Text>
      </View>
      <Text style={styles.successText}>Create a new password</Text>

      <Text style={styles.label}>New Password</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, { flex: 1, borderWidth: 0 }]}
          placeholder="Enter new password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eye}>
          <Text>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Confirm Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Confirm new password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={!showPassword}
      />

      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <TouchableOpacity 
        style={[styles.resetButton, loading && styles.resetButtonDisabled]} 
        onPress={handleResetPassword} 
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.resetButtonText}>Reset Password</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.form}>
      <View style={styles.successIcon}>
        <Text style={styles.successEmoji}>✅</Text>
      </View>
      <Text style={styles.successTitle}>Password Reset Successful!</Text>
      <Text style={styles.instructionText}>
        Your password has been changed successfully. You can now login with your new password.
      </Text>

      <TouchableOpacity 
        style={styles.resetButton} 
        onPress={() => router.replace('/')}
      >
        <Text style={styles.resetButtonText}>Go to Login</Text>
      </TouchableOpacity>
    </View>
  );

  const getSubtitle = () => {
    switch (step) {
      case 'email': return 'Enter your email to reset your password';
      case 'emailSent': return 'Check your inbox';
      case 'token': return 'Enter the reset code';
      case 'password': return 'Create a new password';
      case 'success': return 'Password reset complete';
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.logo}>GFM Record</Text>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>{getSubtitle()}</Text>
          
          {step !== 'success' && step !== 'emailSent' && (
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, step === 'email' && styles.stepDotActive]} />
              <View style={styles.stepLine} />
              <View style={[styles.stepDot, step === 'token' && styles.stepDotActive]} />
              <View style={styles.stepLine} />
              <View style={[styles.stepDot, step === 'password' && styles.stepDotActive]} />
            </View>
          )}
        </View>

        {step === 'email' && renderEmailStep()}
        {step === 'emailSent' && renderEmailSentStep()}
        {step === 'token' && renderTokenStep()}
        {step === 'password' && renderPasswordStep()}
        {step === 'success' && renderSuccessStep()}

        {step !== 'success' && step !== 'emailSent' && (
          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.linkText}>← Back to Login</Text>
          </TouchableOpacity>
        )}
        
        {step === 'emailSent' && (
          <TouchableOpacity style={styles.backLink} onPress={() => router.replace('/')}>
            <Text style={styles.linkText}>← Back to Login</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { padding: 24, justifyContent: 'center', flexGrow: 1 },
  header: { alignItems: 'center', marginBottom: 30 },
  logo: { fontSize: 32, fontWeight: 'bold', color: '#007AFF', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 20 },
  form: { backgroundColor: '#fff', padding: 20, borderRadius: 15, elevation: 3 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 15 },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 10, 
    padding: 12, 
    fontSize: 16, 
    backgroundColor: '#fafafa' 
  },
  tokenInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 20,
    fontWeight: 'bold',
  },
  passwordContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 10, 
    backgroundColor: '#fafafa' 
  },
  eye: { padding: 10 },
  resetButton: { 
    backgroundColor: '#007AFF', 
    borderRadius: 10, 
    padding: 16, 
    alignItems: 'center', 
    marginTop: 20 
  },
  resetButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  backLink: { marginTop: 25, alignItems: 'center' },
  linkText: { color: '#007AFF', fontWeight: '500' },
  successIcon: { alignItems: 'center', marginBottom: 15 },
  successEmoji: { fontSize: 50 },
  successText: { fontSize: 16, color: '#333', textAlign: 'center', marginBottom: 5 },
  successTitle: { fontSize: 20, fontWeight: 'bold', color: '#22c55e', textAlign: 'center', marginBottom: 10 },
  emailText: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', textAlign: 'center', marginBottom: 15 },
  instructionText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 10 },
  resendButton: { 
    borderWidth: 1, 
    borderColor: '#007AFF', 
    borderRadius: 10, 
    padding: 14, 
    alignItems: 'center', 
    marginTop: 15 
  },
  resendButtonText: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 12,
    marginTop: 15,
  },
  errorIcon: { fontSize: 18, marginRight: 10 },
  errorText: { color: '#dc2626', fontSize: 14, flex: 1 },
  resetButtonDisabled: { opacity: 0.6 },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ddd',
  },
  stepDotActive: {
    backgroundColor: '#007AFF',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#ddd',
    marginHorizontal: 5,
  },
});
