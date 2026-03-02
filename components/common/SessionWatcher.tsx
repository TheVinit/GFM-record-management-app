import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    AppState,
    Modal,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants/colors';
import { clearSession, getSession } from '../../services/session.service';
import { supabase } from '../../services/supabase';
import { clearSQLite } from '../../storage/sqlite';

// Role-based timeouts in milliseconds
const TIMEOUTS = {
    admin: 30 * 60 * 1000,          // 30 mins
    teacher: 60 * 60 * 1000,        // 60 mins
    attendance_taker: 20 * 60 * 1000, // 20 mins
    student: 7 * 24 * 60 * 60 * 1000, // 7 days (persistent)
};

const WARNING_BEFORE = 5 * 60 * 1000; // 5 minutes warning

export const SessionWatcher: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [showWarning, setShowWarning] = useState(false);
    const [remainingTime, setRemainingTime] = useState(0);
    const router = useRouter();

    const timerRef = useRef<any>(null);
    const warningTimerRef = useRef<any>(null);
    const lastActivityRef = useRef<number>(Date.now());
    const userRoleRef = useRef<string | null>(null);

    const handleLogout = async () => {
        setShowWarning(false);
        await supabase.auth.signOut();
        await clearSQLite();
        await clearSession();
        router.replace('/');
    };

    const resetTimer = async () => {
        const session = await getSession();
        if (!session) {
            userRoleRef.current = null;
            if (timerRef.current) clearTimeout(timerRef.current);
            if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
            return;
        }

        userRoleRef.current = session.role;
        lastActivityRef.current = Date.now();

        const timeout = (TIMEOUTS as any)[session.role] || TIMEOUTS.teacher;

        // Clear existing timers
        if (timerRef.current) clearTimeout(timerRef.current);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

        // Don't set short timeouts for students
        if (session.role === 'student') return;

        // Set Warning Timer
        warningTimerRef.current = setTimeout(() => {
            setShowWarning(true);
            startCountdown();
        }, timeout - WARNING_BEFORE);

        // Set Final Logout Timer
        timerRef.current = setTimeout(() => {
            handleLogout();
        }, timeout);
    };

    const startCountdown = () => {
        setRemainingTime(5 * 60); // 5 minutes in seconds
        const interval = setInterval(() => {
            setRemainingTime((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // PanResponder to detect any touch/pan on the screen
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponderCapture: () => {
                if (!showWarning) resetTimer();
                return false;
            },
            onStartShouldSetPanResponderCapture: () => {
                if (!showWarning) resetTimer();
                return false;
            },
        })
    ).current;

    useEffect(() => {
        resetTimer();

        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                // When app comes back to foreground, check if session is still valid
                resetTimer();
            }
        });

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
            subscription.remove();
        };
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View style={{ flex: 1 }} {...panResponder.panHandlers}>
            {children}

            <Modal
                visible={showWarning}
                transparent={true}
                animationType="fade"
            >
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="time-outline" size={48} color={COLORS.warning} />
                        </View>

                        <Text style={styles.title}>Session Expiring</Text>
                        <Text style={styles.message}>
                            You have been inactive for a while. Your session will expire in:
                        </Text>

                        <Text style={styles.timer}>{formatTime(remainingTime)}</Text>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={styles.logoutButton}
                                onPress={handleLogout}
                            >
                                <Text style={styles.logoutText}>Logout</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.stayButton}
                                onPress={() => {
                                    setShowWarning(false);
                                    resetTimer();
                                }}
                            >
                                <Text style={styles.stayText}>Stay Logged In</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    modal: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.warningLight + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    title: {
        ...TYPOGRAPHY.h2,
        color: COLORS.text,
        marginBottom: SPACING.sm,
    },
    message: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.lg,
    },
    timer: {
        fontSize: 48,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: SPACING.xl,
        fontVariant: ['tabular-nums'],
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: SPACING.md,
        width: '100%',
    },
    logoutButton: {
        flex: 1,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.error,
        alignItems: 'center',
    },
    logoutText: {
        color: COLORS.error,
        fontWeight: '600',
    },
    stayButton: {
        flex: 2,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
    },
    stayText: {
        color: COLORS.white,
        fontWeight: '600',
    },
});
