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
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/colors';
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
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    title: {
        ...TYPOGRAPHY.h3,
        color: COLORS.text,
    },
    closeButton: {
        padding: SPACING.sm,
    },
    userInfo: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    userName: {
        ...TYPOGRAPHY.h3,
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    userEmail: {
        ...TYPOGRAPHY.bodySmall,
        color: COLORS.textSecondary,
    },
    menuContainer: {
        flex: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    menuLabel: {
        ...TYPOGRAPHY.body,
        color: COLORS.text,
        flex: 1,
        marginLeft: SPACING.md,
    },
});
