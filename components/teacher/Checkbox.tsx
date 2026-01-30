import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants/colors';
import { styles } from './dashboard.styles';

export const Checkbox = ({ label, value, onValueChange, disabled = false }: { label: string, value: boolean, onValueChange: (v: boolean) => void, disabled?: boolean }) => (
    <TouchableOpacity
        style={[styles.checkboxContainer, disabled && { opacity: 0.5 }]}
        onPress={() => !disabled && onValueChange(!value)}
    >
        <Ionicons name={value ? "checkbox" : "square-outline"} size={22} color={value ? COLORS.secondary : COLORS.textLight} />
        <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
);
