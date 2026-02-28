import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/colors';

interface DashboardHeaderProps {
    title: string;
    subtitle?: string;
    showProfile?: boolean;
    onProfilePress?: () => void;
    leftIcon?: keyof typeof Ionicons.glyphMap;
    onLeftPress?: () => void;
    rightElement?: React.ReactNode;
    photoUri?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    title,
    subtitle,
    showProfile = true,
    onProfilePress,
    leftIcon,
    onLeftPress,
    rightElement,
    photoUri,
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.headerTop}>
                <View style={styles.leftSection}>
                    {leftIcon ? (
                        <TouchableOpacity
                            onPress={onLeftPress}
                            style={styles.iconBtn}
                            activeOpacity={0.7}
                        >
                            <Ionicons name={leftIcon} size={24} color={COLORS.white} />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.brandWrapper}>
                            <View style={styles.logoContainer}>
                                <Image
                                    source={require('../../assets/images/icon.png')}
                                    style={styles.logo}
                                    resizeMode="contain"
                                />
                            </View>
                        </View>
                    )}
                </View>

                <View style={styles.centerSection}>
                    <Text style={styles.brandSubtitle} numberOfLines={1}>
                        {subtitle || "GFM Management System"}
                    </Text>
                </View>

                <View style={styles.rightSection}>
                    {rightElement}
                    {showProfile && (
                        <TouchableOpacity
                            onPress={onProfilePress}
                            style={styles.profileBtn}
                            activeOpacity={0.7}
                        >
                            <View style={styles.avatarWrapper}>
                                {photoUri ? (
                                    <Image source={{ uri: photoUri }} style={styles.avatar} />
                                ) : (
                                    <Ionicons name="person" size={20} color={COLORS.primary} />
                                )}
                            </View>
                            <View style={styles.onlineBadge} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.welcomeSection}>
                <Text style={styles.welcomeLabel} numberOfLines={1}>
                    {title}
                </Text>
                <Text style={styles.dateText}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.primary,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: SPACING.lg,
        paddingHorizontal: SPACING.lg,
        borderBottomLeftRadius: RADIUS.xxl,
        borderBottomRightRadius: RADIUS.xxl,
        ...SHADOWS.lg,
        shadowColor: COLORS.primary,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    leftSection: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    centerSection: {
        flex: 2,
        alignItems: 'center',
    },
    rightSection: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    brandWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoContainer: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.lg,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
        ...SHADOWS.sm,
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    brandSubtitle: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    avatarWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    welcomeSection: {
        marginTop: SPACING.xs,
    },
    welcomeLabel: {
        ...TYPOGRAPHY.h2,
        color: COLORS.white,
        marginBottom: 4,
    },
    dateText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '500',
    },
});
