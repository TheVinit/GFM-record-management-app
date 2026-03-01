import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { COLORS } from '../constants/colors';
import { login } from '../services/auth.service';
import { checkSupabaseHealth } from '../services/supabase';

const { width, height } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [logoTaps, setLogoTaps] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const passwordRef = React.useRef<TextInput>(null);

  React.useEffect(() => {
    const check = async () => {
      const status = await checkSupabaseHealth();
      setHealth(status);
    };
    check();
  }, []);

  const handleLogoTap = () => {
    const newTaps = logoTaps + 1;
    if (newTaps >= 5) {
      setShowDebug(true);
      setLogoTaps(0);
    } else {
      setLogoTaps(newTaps);
    }
  };

  const handleLogin = async () => {
    if (!identifier.trim()) {
      Alert.alert('Error', 'Please enter your PRN, Email or ID');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    setLoginError(null);
    try {
      const user = await login(identifier, password);

      if (user) {
        if (user.role === 'student') router.replace('/student/dashboard');
        else if (user.role === 'teacher') router.replace('/teacher/dashboard');
        else if (user.role === 'admin') router.replace('/admin/dashboard');
        else if (user.role === 'attendance_taker') router.replace('/attendance-taker/dashboard');
      }
    } catch (error: any) {
      const msg = error.message || 'Something went wrong. Please try again.';
      if (msg.includes('No account found') || msg.includes('User not found') || msg.includes('Invalid password') || msg.includes('password') || msg.includes('Invalid login credentials')) {
        setLoginError('Invalid credentials');
      } else if (msg.includes('network') || msg.includes('fetch')) {
        Alert.alert('Connection Error', 'Unable to connect. Please check your internet connection and try again.');
      } else {
        Alert.alert('Login Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.contentWrapper}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Image source={require('../assets/images/left.png')} style={styles.sideImage} resizeMode="contain" />
              <View style={styles.centerContent}>
                <TouchableOpacity
                  onPress={handleLogoTap}
                  activeOpacity={0.7}
                  style={styles.logoContainer}
                >
                  <Image source={require('../assets/images/icon.png')} style={styles.mainLogo} resizeMode="contain" />
                </TouchableOpacity>
              </View>
              <Image source={require('../assets/images/right.png')} style={styles.sideImage} resizeMode="contain" />
            </View>
            <View style={styles.divider} />

            {health && (!health.hasUrl || !health.hasKey || !health.connectionOk) && (
              <TouchableOpacity
                style={styles.connectionWarning}
                onPress={() => setShowDebug(true)}
              >
                <Ionicons name="cloud-offline-outline" size={16} color="#FFF" />
                <Text style={styles.connectionWarningText}>
                  {!health.hasUrl || !health.hasKey
                    ? "Configuration Error: Keys missing"
                    : "Connecting to server..."}
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.instructionText}>Sign in to continue to your account</Text>

            {/* Identifier Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>PRN / Email / ID</Text>
              <View style={[
                styles.inputContainer,
                focusedInput === 'identifier' && styles.inputContainerFocused
              ]}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={focusedInput === 'identifier' ? '#667eea' : '#999'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your PRN, Email or ID"
                  placeholderTextColor="#999"
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  onFocus={() => setFocusedInput('identifier')}
                  onBlur={() => setFocusedInput(null)}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                  disableFullscreenUI={true}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[
                styles.inputContainer,
                focusedInput === 'password' && styles.inputContainerFocused
              ]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={focusedInput === 'password' ? '#667eea' : '#999'}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  disableFullscreenUI={true}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotPass}
              onPress={() => router.push('/forgot-password')}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {loginError && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            )}

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <View style={[styles.loginButtonContent, loading && { backgroundColor: COLORS.border }]}>
                {loading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={20} color={COLORS.white} style={{ marginLeft: 8 }} />
                  </>
                )}
              </View>
            </TouchableOpacity>

            {/* Quick Access Info */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color="#667eea" />
              <Text style={styles.infoText}>
                Students: Use your PRN as password for first login
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2026 Admin Control Portal</Text>
            <Text style={styles.footerSubtext}>Secure • Reliable • Efficient</Text>
          </View>
        </ScrollView>
      </View>
      <Modal
        visible={showDebug}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDebug(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.debugModal}>
            <View style={styles.debugHeader}>
              <Text style={styles.debugTitle}>System Diagnostics</Text>
              <TouchableOpacity onPress={() => setShowDebug(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.debugContent}>
              <View style={styles.debugItem}>
                <Text style={styles.debugLabel}>Supabase Keys</Text>
                <Text style={[styles.debugValue, (!health?.hasUrl || !health?.hasKey) && styles.errorText]}>
                  {health?.hasUrl && health?.hasKey ? "✅ Present" : "❌ Missing (Inlining Fail)"}
                </Text>
              </View>

              <View style={styles.debugItem}>
                <Text style={styles.debugLabel}>Project URL</Text>
                <Text style={styles.debugValue}>{health?.urlPreview || 'None'}</Text>
              </View>

              <View style={styles.debugItem}>
                <Text style={styles.debugLabel}>Network Connection</Text>
                <Text style={[styles.debugValue, !health?.connectionOk && styles.errorText]}>
                  {health?.connectionOk ? "✅ Online" : `❌ Offline (${health?.errorMessage || 'Unknown Error'})`}
                </Text>
              </View>

              <View style={styles.debugInfo}>
                <Ionicons name="information-circle" size={16} color="#667eea" style={{ marginRight: 8 }} />
                <Text style={styles.debugInfoText}>
                  If keys are missing, ensure you have set EXPO_PUBLIC_SUPABASE_URL in Vercel.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDebug(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    width: '100%',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  centerContent: {
    alignItems: 'center',
  },
  sideImage: {
    width: 60,
    height: 60,
    opacity: 0.9,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  mainLogo: {
    width: 80,
    height: 80,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginTop: 15,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 32,
    elevation: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    paddingHorizontal: 15,
    height: 56,
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  eyeButton: {
    padding: 8,
  },
  forgotPass: {
    alignSelf: 'flex-end',
    marginBottom: 25,
    marginTop: -5,
  },
  forgotText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.primary,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  loginButtonDisabled: {
    backgroundColor: COLORS.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  loginButtonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    paddingBottom: 20,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  footerSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  connectionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 15,
  },
  connectionWarningText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  debugModal: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '100%',
    padding: 20,
    maxWidth: 400,
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 10,
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  debugContent: {
    marginBottom: 20,
  },
  debugItem: {
    marginBottom: 15,
  },
  debugLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  debugValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  debugInfo: {
    flexDirection: 'row',
    backgroundColor: '#F0F4FF',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  debugInfoText: {
    fontSize: 11,
    color: '#4A5568',
    flex: 1,
    lineHeight: 16,
  },
  closeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
