import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/colors';

interface AppHeaderProps {
    title: string;
    onFilterPress?: () => void;
    onProfilePress?: () => void;
    onNotificationPress?: () => void;
    filterCount?: number;
    showFilter?: boolean;
    showProfile?: boolean;
    showNotification?: boolean;
    leftIcon?: keyof typeof Ionicons.glyphMap;
    onLeftIconPress?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
    title,
    onFilterPress,
    onProfilePress,
    onNotificationPress,
    filterCount = 0,
    showFilter = false,
    showProfile = true,
    showNotification = false,
    leftIcon,
    onLeftIconPress,
}) => {
    return (
        <View style={styles.container}>
            {/* Left Side */}
            <View style={styles.leftSection}>
                {leftIcon && onLeftIconPress ? (
                    <TouchableOpacity onPress={onLeftIconPress} style={styles.iconButton}>
                        <Ionicons name={leftIcon} size={24} color={COLORS.text} />
                    </TouchableOpacity>
                ) : null}
                <Text style={styles.title} numberOfLines={1}>
                    {title}
                </Text>
            </View>

            {/* Right Side */}
            <View style={styles.rightSection}>
                {showFilter && onFilterPress && (
                    <TouchableOpacity onPress={onFilterPress} style={styles.iconButton}>
                        <Ionicons name="filter" size={22} color={COLORS.text} />
                        {filterCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{filterCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}

                {showNotification && onNotificationPress && (
                    <TouchableOpacity onPress={onNotificationPress} style={styles.iconButton}>
                        <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
                    </TouchableOpacity>
                )}

                {showProfile && onProfilePress && (
                    <TouchableOpacity onPress={onProfilePress} style={styles.iconButton}>
                        <Ionicons name="person-circle-outline" size={26} color={COLORS.primary} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        ...SHADOWS.sm,
        ...Platform.select({
            ios: {
                paddingTop: SPACING.xl + SPACING.md, // Account for status bar
            },
            android: {
                paddingTop: SPACING.md,
            },
        }),
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    title: {
        ...TYPOGRAPHY.h3,
        color: COLORS.text,
        marginLeft: SPACING.sm,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    iconButton: {
        padding: SPACING.sm,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: COLORS.error,
        borderRadius: RADIUS.full,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.white,
        fontSize: 10,
        fontWeight: '700',
    },
});
