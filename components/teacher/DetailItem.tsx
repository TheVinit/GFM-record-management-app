import React from 'react';
import { Text, View } from 'react-native';
import { styles } from './dashboard.styles';

export const DetailItem = ({ label, value, fullWidth, color }: { label: string, value: any, fullWidth?: boolean, color?: string }) => (
    <View style={{ width: fullWidth ? '100%' : '48%', marginBottom: 15 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, color ? { color } : {}]}>{value || 'N/A'}</Text>
    </View>
);
