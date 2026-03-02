import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/colors';
import { getCurrentSessionId, listActiveDevices, logoutAllDevices, revokeDeviceSession } from '../../services/auth.service';
import { clearSession } from '../../services/session.service';
import { BottomSheet } from './BottomSheet';

interface ProfileMenuItem {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    color?: string;
}

interface ProfileMenuProps {
    visible: boolean;
    onClose: () => void;
    userName: string;
    userEmail?: string;
    photoUri?: string;
    menuItems: ProfileMenuItem[];
}

interface ActiveDevice {
    session_id: string;
    device_name: string;
    os: string;
    browser: string;
    last_active: string;
}


export const ProfileMenu: React.FC<ProfileMenuProps> = ({
    visible,
    onClose,
    userName,
    userEmail,
    photoUri,
    menuItems,
}) => {
    const router = useRouter();
    const [activeDevices, setActiveDevices] = React.useState<ActiveDevice[]>([]);
    const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [showDevices, setShowDevices] = React.useState(false);

    React.useEffect(() => {
        if (visible) {
            loadDevices();
            fetchCurrentSession();
        }
    }, [visible]);

    const fetchCurrentSession = async () => {
        const id = await getCurrentSessionId();
        setCurrentSessionId(id);
    };

    const loadDevices = async () => {
        setIsLoading(true);
        try {
            const devices = await listActiveDevices();
            setActiveDevices(devices || []);
        } catch (e) {
            console.error('Failed to load devices:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRevoke = async (sessionId: string, deviceName: string) => {
        const performRevoke = async () => {
            try {
                await revokeDeviceSession(sessionId);
                loadDevices();
            } catch (e) {
                console.error('Revoke failed:', e);
                if (Platform.OS !== 'web') {
                    Alert.alert('Error', 'Failed to logout device');
                } else {
                    alert('Failed to logout device');
                }
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(`Are you sure you want to log out of ${deviceName}?`)) {
                performRevoke();
            }
        } else {
            Alert.alert(
                'Logout Device',
                `Are you sure you want to log out of ${deviceName}?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Logout',
                        style: 'destructive',
                        onPress: performRevoke
                    }
                ]
            );
        }
    };

    const handleLogout = async () => {
        await clearSession();
        router.replace('/');
    };

    const handleLogoutAll = async () => {
        Alert.alert(
            'Logout All Other Devices',
            'This will sign you out of all other active sessions across all devices. Proceed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await logoutAllDevices();
                            onClose();
                            router.replace('/');
                        } catch (e) {
                            Alert.alert('Error', 'Failed to logout all devices');
                        }
                    }
                }
            ]
        );
    };

    const getDeviceIcon = (os: string): keyof typeof Ionicons.glyphMap => {
        const lowerOs = os?.toLowerCase() || '';
        if (lowerOs.includes('windows')) return 'desktop-outline';
        if (lowerOs.includes('mac') || lowerOs.includes('ios')) return 'logo-apple';
        if (lowerOs.includes('android')) return 'logo-android';
        return 'phone-portrait-outline';
    };

    return (
        <BottomSheet visible={visible} onClose={onClose} height={600} >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Account</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Active User Info */}
                    <View style={styles.userInfo}>
                        <View style={styles.avatar}>
                            {photoUri ? (
                                <Image source={{ uri: photoUri }} style={styles.avatarImage} />
                            ) : (
                                <View style={styles.initialsContainer}>
                                    <Text style={styles.initialsText}>
                                        {(userName || 'U').charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.userName}>{userName}</Text>
                        {userEmail && <Text style={styles.userEmail}>{userEmail}</Text>}
                    </View>

                    {/* Standard Menu Items */}
                    <View style={styles.section}>
                        {[
                            ...menuItems,
                            {
                                icon: 'log-out-outline',
                                label: 'Logout',
                                onPress: handleLogout,
                                color: COLORS.error
                            },
                            {
                                icon: 'shield-outline',
                                label: 'Saved Devices',
                                onPress: () => setShowDevices(!showDevices),
                                color: COLORS.primary
                            }
                        ].map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.menuItem}
                                onPress={() => {
                                    if (item.label === 'Saved Devices') {
                                        setShowDevices(!showDevices);
                                    } else {
                                        item.onPress();
                                        onClose();
                                    }
                                }}
                            >
                                <View style={[styles.iconContainer, item.color && { backgroundColor: item.color + '10' }]}>
                                    <Ionicons
                                        name={item.icon as any}
                                        size={20}
                                        color={item.color || COLORS.text}
                                    />
                                </View>
                                <Text style={[styles.menuLabel, item.color && { color: item.color }]}>
                                    {item.label}
                                </Text>
                                <Ionicons
                                    name={item.label === 'Saved Devices' ? (showDevices ? 'chevron-up' : 'chevron-down') : 'chevron-forward'}
                                    size={18}
                                    color={COLORS.textLight}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    {showDevices && (
                        <View style={styles.devicesSection}>
                            {/* Active Devices Section Header */}
                            <View style={styles.sectionHeader}>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>Where you're logged in</Text>
                                </View>
                            </View>

                            {activeDevices.map((device) => (
                                <View key={device.session_id} style={styles.accountItem}>
                                    {device.session_id !== currentSessionId && (
                                        <TouchableOpacity
                                            onPress={() => handleRevoke(device.session_id, device.device_name)}
                                            style={styles.revokeButtonLeft}
                                            activeOpacity={0.7}
                                            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                        >
                                            <Ionicons name="trash-outline" size={22} color={COLORS.error} />
                                        </TouchableOpacity>
                                    )}
                                    <View style={styles.deviceIcon}>
                                        <Ionicons name={getDeviceIcon(device.os)} size={24} color={COLORS.primary} />
                                    </View>
                                    <View style={styles.accountInfo}>
                                        <Text style={styles.accountName}>
                                            {device.device_name}
                                            {device.session_id === currentSessionId && (
                                                <Text style={styles.currentBadge}> (This device)</Text>
                                            )}
                                        </Text>
                                        <Text style={styles.accountRole}>
                                            {device.os} • {new Date(device.last_active).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                            ))}

                            <View style={styles.divider} />

                            {/* Footer Section - Centralized Security */}
                            <View style={styles.footer}>
                                <TouchableOpacity
                                    onPress={handleLogoutAll}
                                    style={styles.logoutAllButton}
                                >
                                    <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
                                    <Text style={styles.logoutAllText}>Logout of All Other Devices</Text>
                                </TouchableOpacity>
                                <Text style={styles.securityHint}>
                                    Secure your account if you left it logged in elsewhere.
                                </Text>
                            </View>
                        </View>
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    title: {
        ...TYPOGRAPHY.h3,
        color: COLORS.text,
        fontWeight: '700',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userInfo: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
        backgroundColor: COLORS.white,
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
        overflow: 'hidden',
        borderWidth: 4,
        borderColor: COLORS.background,
        ...SHADOWS.md,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    userName: {
        ...TYPOGRAPHY.h2,
        color: COLORS.text,
        marginBottom: SPACING.xs,
        textAlign: 'center',
        paddingHorizontal: SPACING.lg,
    },
    userEmail: {
        ...TYPOGRAPHY.bodySmall,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    menuContainer: {
        flex: 1,
        paddingHorizontal: SPACING.md,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        marginBottom: SPACING.xs,
    },
    menuLabel: {
        ...TYPOGRAPHY.body,
        color: COLORS.text,
        flex: 1,
        marginLeft: SPACING.md,
        fontWeight: '600',
    },
    initialsContainer: {
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    initialsText: {
        ...TYPOGRAPHY.h1,
        color: COLORS.white,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        flex: 1,
    },
    section: {
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.lg,
    },
    sectionHeader: {
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.sm,
        marginTop: SPACING.lg,
    },
    sectionTitle: {
        ...TYPOGRAPHY.bodySmall,
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    badge: {
        backgroundColor: COLORS.primaryLight + '20',
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        borderRadius: RADIUS.full,
        alignSelf: 'flex-start',
    },
    badgeText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.primary,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    devicesSection: {
        marginTop: SPACING.md,
        backgroundColor: COLORS.background,
        paddingBottom: SPACING.xl,
    },
    smallAvatarText: {
        ...TYPOGRAPHY.body,
        color: COLORS.white,
        fontWeight: 'bold',
    },
    accountInfo: {
        flex: 1,
    },
    accountName: {
        ...TYPOGRAPHY.body,
        color: COLORS.text,
        fontWeight: '600',
    },
    accountRole: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
    },
    removeButton: {
        padding: SPACING.xs,
    },
    globalLogoutSection: {
        marginTop: SPACING.md,
        paddingHorizontal: SPACING.lg,
        alignItems: 'center',
    },
    globalLogoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.lg,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        marginBottom: SPACING.xs,
    },
    globalLogoutText: {
        ...TYPOGRAPHY.bodySmall,
        color: COLORS.textSecondary,
        fontWeight: '700',
        marginLeft: SPACING.sm,
    },
    globalLogoutHint: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textLight,
        textAlign: 'center',
        paddingHorizontal: SPACING.xl,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.borderLight,
        marginVertical: SPACING.lg,
    },
    footer: {
        paddingHorizontal: SPACING.xl,
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    logoutAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.full,
        marginBottom: SPACING.sm,
    },
    logoutAllText: {
        ...TYPOGRAPHY.bodySmall,
        color: COLORS.primary,
        fontWeight: '600',
        marginLeft: SPACING.xs,
    },
    securityHint: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    currentBadge: {
        fontSize: 12,
        color: COLORS.success,
        fontWeight: 'bold',
    },
    deviceIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    accountItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    removeText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.error,
        fontWeight: '600',
    },
    revokeButtonLeft: {
        marginRight: SPACING.md,
        padding: SPACING.xs,
        backgroundColor: COLORS.errorLight + '20',
        borderRadius: RADIUS.sm,
    },
});
