import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Animated,
    Platform,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { COLORS, SHADOWS } from '../../constants/colors';

interface FloatingActionButtonProps {
    onPress: () => void;
    icon: keyof typeof Ionicons.glyphMap;
    size?: number;
    color?: string;
    backgroundColor?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
    onPress,
    icon,
    size = 56,
    color = COLORS.white,
    backgroundColor = COLORS.primary,
}) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.9,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    width: size,
                    height: size,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={[
                    styles.button,
                    {
                        backgroundColor,
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                    },
                ]}
                activeOpacity={0.9}
            >
                <Ionicons name={icon} size={size * 0.5} color={color} />
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        zIndex: 999,
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.xl,
        ...Platform.select({
            android: {
                elevation: 8,
            },
        }),
    },
});
