import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/colors';
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

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
    visible,
    onClose,
    userName,
    userEmail,
    photoUri,
    menuItems,
}) => {
    return (
        <BottomSheet visible={visible} onClose={onClose} height={500}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Profile</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                </View>

                {/* User Info */}
                <View style={styles.userInfo}>
                    <View style={styles.avatar}>
                        {photoUri ? (
                            <Image source={{ uri: photoUri }} style={styles.avatarImage} />
                        ) : (
                            <Ionicons name="person" size={40} color={COLORS.primary} />
                        )}
                    </View>
                    <Text style={styles.userName}>{userName}</Text>
                    {userEmail && <Text style={styles.userEmail}>{userEmail}</Text>}
                </View>

                {/* Menu Items */}
                <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.menuItem}
                            onPress={() => {
                                item.onPress();
                                onClose();
                            }}
                        >
                            <Ionicons
                                name={item.icon}
                                size={22}
                                color={item.color || COLORS.text}
                            />
                            <Text style={[styles.menuLabel, item.color && { color: item.color }]}>
                                {item.label}
                            </Text>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
                        </TouchableOpacity>
                    ))}
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
});
