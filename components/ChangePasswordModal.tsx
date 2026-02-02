import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { getSession, saveSession } from '../services/session.service';
import { supabase } from '../services/supabase';

interface ChangePasswordModalProps {
  visible: boolean;
  userEmail: string;
  currentPassword: string;
  onSuccess: () => void;
  onClose?: () => void;
  isFirstLogin?: boolean;
}

export function ChangePasswordModal({
  visible,
  userEmail,
  currentPassword,
  onSuccess,
  onClose,
  isFirstLogin = false
}: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleChangePassword = async () => {
    setError('');

    if (!oldPassword.trim()) {
      setError('Please enter your current password');
      return;
    }

    if (oldPassword !== currentPassword) {
      setError('Current password is incorrect');
      return;
    }

    if (!newPassword.trim()) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword === oldPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          password: newPassword,
          first_login: false
        })
        .eq('email', userEmail.toLowerCase().trim());

      if (updateError) throw updateError;

      // Update Supabase Auth if applicable
      const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
      if (authError) console.warn('Supabase Auth update skipped:', authError.message);

      // Sync session
      const session = await getSession();
      if (session && session.email.toLowerCase() === userEmail.toLowerCase()) {
        session.password = newPassword;
        session.firstLogin = false;
        await saveSession(session);
      }

      if (Platform.OS === 'web') {
        window.alert('Password Changed!\n\nYour password has been updated successfully.');
      }

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isFirstLogin ? undefined : onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.icon}>🔐</Text>
            <Text style={styles.title}>
              {isFirstLogin ? 'Welcome! Set Your Password' : 'Change Password'}
            </Text>
            {isFirstLogin && (
              <Text style={styles.subtitle}>
                For security, please change your password before continuing.
              </Text>
            )}
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Current Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter current password"
                value={oldPassword}
                onChangeText={setOldPassword}
                secureTextEntry={!showOld}
              />
              <TouchableOpacity onPress={() => setShowOld(!showOld)} style={styles.eye}>
                <Text>{showOld ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNew}
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eye}>
                <Text>{showNew ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={[styles.input, styles.inputFull]}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showNew}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Change Password</Text>
              )}
            </TouchableOpacity>

            {!isFirstLogin && onClose && (
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 50,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  form: {},
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#fafafa',
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  inputFull: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#fafafa',
  },
  eye: {
    padding: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  errorIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    flex: 1,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelText: {
    color: '#666',
    fontSize: 16,
  },
});
