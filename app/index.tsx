import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { login } from '../services/auth.service';
import { COLORS } from '../constants/colors';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
};

export default function Index() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const isXLargeScreen = width >= 1024;
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorType, setErrorType] = useState<'user' | 'password' | 'general' | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMessage('');
    setErrorType(null);
    
    if (!identifier.trim()) {
      setErrorMessage('Please enter your PRN, Email or ID');
      setErrorType('general');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter your password');
      setErrorType('general');
      return;
    }

    setLoading(true);
    try {
      const user = await login(identifier, password);

        if (user) {
          if (user.role === 'student') router.replace('/student/dashboard');
          else if (user.role === 'teacher') router.replace('/teacher/dashboard');
          else if (user.role === 'admin') router.replace('/admin/dashboard');
          else if (user.role === 'attendance_taker') router.replace('/attendance-taker/dashboard');
        }
    } catch (error: any) {
      const msg = error.message || 'Invalid credentials';
      
      if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('user')) {
        setErrorType('user');
        setErrorMessage('No account found with this PRN or Email. Please check your details or contact the administrator.');
      } else if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('invalid')) {
        setErrorType('password');
        setErrorMessage('Incorrect password. Please try again.');
      } else {
        setErrorType('general');
        setErrorMessage(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const getErrorIcon = () => {
    switch (errorType) {
      case 'user': return 'person-outline';
      case 'password': return 'lock-closed-outline';
      default: return 'alert-circle-outline';
    }
  };

  const getErrorTitle = () => {
    switch (errorType) {
      case 'user': return 'User Not Found';
      case 'password': return 'Wrong Password';
      default: return 'Login Failed';
    }
  };

  const styles = createStyles(width, height, isLargeScreen, isXLargeScreen);

  return (
    <View style={styles.container}>
      {isLargeScreen && (
        <View style={styles.leftPanel}>
          <View style={styles.brandSection}>
            <View style={styles.logoContainer}>
              <Ionicons name="school" size={isXLargeScreen ? 56 : 44} color={COLORS.white} />
            </View>
            <Text style={styles.brandTitle}>GFM Record</Text>
            <Text style={styles.brandSubtitle}>Student Management System</Text>
          </View>
          
          <View style={styles.featuresSection}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="document-text-outline" size={24} color={COLORS.white} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Digital Records</Text>
                <Text style={styles.featureDesc}>Access all student records digitally</Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.white} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Verified Data</Text>
                <Text style={styles.featureDesc}>Faculty verified academic records</Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="analytics-outline" size={24} color={COLORS.white} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Track Progress</Text>
                <Text style={styles.featureDesc}>Monitor academic performance</Text>
              </View>
            </View>
          </View>

          <Text style={styles.copyright}>© 2026 Rajarshi Shahu College of Engineering</Text>
        </View>
      )}

      <KeyboardAvoidingView 
        style={styles.rightPanel} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!isLargeScreen && (
            <View style={styles.mobileHeader}>
              <View style={styles.mobileLogoContainer}>
                <Ionicons name="school" size={40} color={COLORS.white} />
              </View>
              <Text style={styles.mobileBrandTitle}>GFM Record</Text>
              <Text style={styles.mobileBrandSubtitle}>Student Management System</Text>
            </View>
          )}
          
          <View style={styles.loginCard}>
            <View style={styles.loginHeader}>
              <Text style={styles.welcomeText}>Welcome Back</Text>
              <Text style={styles.loginSubtitle}>Sign in to access your dashboard</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>PRN / Email / ID</Text>
                <View style={[
                  styles.inputContainer,
                  focusedField === 'identifier' && styles.inputContainerFocused,
                  errorType === 'user' && styles.inputContainerError
                ]}>
                  <Ionicons 
                    name="person-outline" 
                    size={20} 
                    color={focusedField === 'identifier' ? COLORS.primary : COLORS.textLight} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your PRN, Email or ID"
                    placeholderTextColor={COLORS.textMuted}
                    value={identifier}
                    onChangeText={(text) => { setIdentifier(text); setErrorMessage(''); setErrorType(null); }}
                    autoCapitalize="none"
                    onFocus={() => setFocusedField('identifier')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[
                  styles.inputContainer,
                  focusedField === 'password' && styles.inputContainerFocused,
                  errorType === 'password' && styles.inputContainerError
                ]}>
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={20} 
                    color={focusedField === 'password' ? COLORS.primary : COLORS.textLight} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor={COLORS.textMuted}
                    value={password}
                    onChangeText={(text) => { setPassword(text); setErrorMessage(''); setErrorType(null); }}
                    secureTextEntry={!showPassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)} 
                    style={styles.eyeButton}
                  >
                    <Ionicons 
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'} 
                      size={20} 
                      color={COLORS.textLight} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {errorMessage ? (
                <View style={[
                  styles.errorContainer, 
                  errorType === 'user' && styles.errorContainerUser,
                  errorType === 'password' && styles.errorContainerPassword
                ]}>
                  <Ionicons name={getErrorIcon()} size={22} color={COLORS.error} style={styles.errorIcon} />
                  <View style={styles.errorContent}>
                    <Text style={styles.errorTitle}>{getErrorTitle()}</Text>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                </View>
              ) : null}

              <TouchableOpacity 
                style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
                onPress={handleLogin} 
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.forgotPass} 
                onPress={() => router.push('/forgot-password')}
              >
                <Text style={styles.forgotText}>Forgot your password?</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.helpSection}>
              <Ionicons name="help-circle-outline" size={18} color={COLORS.textLight} />
              <Text style={styles.helpText}>
                Need help? Contact your administrator
              </Text>
            </View>
          </View>
          
          {!isLargeScreen && (
            <Text style={styles.mobileCopyright}>© 2026 Rajarshi Shahu College of Engineering</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (width: number, height: number, isLargeScreen: boolean, isXLargeScreen: boolean) => StyleSheet.create({
  container: { 
    flex: 1, 
    flexDirection: isLargeScreen ? 'row' : 'column',
    backgroundColor: COLORS.background,
  },
  leftPanel: {
    width: isXLargeScreen ? '42%' : '40%',
    backgroundColor: COLORS.primary,
    padding: isXLargeScreen ? 48 : 32,
    justifyContent: 'space-between',
  },
  brandSection: {
    alignItems: 'flex-start',
    marginTop: isXLargeScreen ? 40 : 20,
  },
  logoContainer: {
    width: isXLargeScreen ? 88 : 72,
    height: isXLargeScreen ? 88 : 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: isXLargeScreen ? 36 : 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  brandSubtitle: {
    fontSize: isXLargeScreen ? 18 : 15,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 40,
  },
  featuresSection: {
    flex: 1,
    justifyContent: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isXLargeScreen ? 28 : 20,
  },
  featureIcon: {
    width: isXLargeScreen ? 52 : 44,
    height: isXLargeScreen ? 52 : 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: isXLargeScreen ? 17 : 15,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: isXLargeScreen ? 14 : 13,
    color: 'rgba(255,255,255,0.7)',
  },
  copyright: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'left',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: isLargeScreen ? COLORS.background : COLORS.primary,
  },
  scrollContent: { 
    flexGrow: 1,
    justifyContent: isLargeScreen ? 'center' : 'flex-start',
    padding: isLargeScreen ? 32 : 0,
  },
  mobileHeader: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  mobileLogoContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  mobileBrandTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 6,
  },
  mobileBrandSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  loginCard: {
    backgroundColor: COLORS.white,
    borderRadius: isLargeScreen ? 24 : 0,
    borderTopLeftRadius: isLargeScreen ? 24 : 28,
    borderTopRightRadius: isLargeScreen ? 24 : 28,
    padding: isLargeScreen ? 36 : 28,
    paddingBottom: isLargeScreen ? 36 : 40,
    maxWidth: isLargeScreen ? 480 : undefined,
    width: '100%',
    alignSelf: 'center',
    flex: isLargeScreen ? undefined : 1,
    shadowColor: isLargeScreen ? COLORS.shadow : 'transparent',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: isLargeScreen ? 8 : 0,
  },
  loginHeader: {
    marginBottom: 28,
  },
  welcomeText: {
    fontSize: isLargeScreen ? 28 : 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  form: {
    gap: 18,
  },
  inputGroup: {
    gap: 8,
  },
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  inputContainerError: {
    borderColor: COLORS.error,
    backgroundColor: '#FFF5F5',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: { 
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    height: '100%',
  },
  eyeButton: { 
    padding: 8,
    marginLeft: 8,
  },
  loginButton: { 
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: { 
    color: COLORS.white, 
    fontSize: 16, 
    fontWeight: 'bold',
  },
  forgotPass: { 
    alignItems: 'center',
    paddingVertical: 8,
  },
  forgotText: { 
    color: COLORS.primary, 
    fontWeight: '600',
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 14,
  },
  errorContainerUser: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  errorContainerPassword: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  errorIcon: { 
    marginRight: 12, 
    marginTop: 2,
  },
  errorContent: { 
    flex: 1,
  },
  errorTitle: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: COLORS.error, 
    marginBottom: 4,
  },
  errorText: { 
    color: '#B91C1C', 
    fontSize: 13, 
    lineHeight: 18,
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  helpText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  mobileCopyright: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingVertical: 16,
    backgroundColor: COLORS.white,
  },
});
