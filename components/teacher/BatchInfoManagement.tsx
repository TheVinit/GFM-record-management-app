import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/colors';

export const BatchInfoManagement = ({ batchConfig }: any) => {
    if (!batchConfig) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="information-circle-outline" size={48} color={COLORS.textLight} />
                <Text style={styles.emptyText}>No batch configuration found.</Text>
            </View>
        );
    }

    const infoItems = [
        { label: 'Department', value: batchConfig.department, icon: 'business-outline' },
        { label: 'Class / Year', value: batchConfig.class, icon: 'school-outline' },
        { label: 'Division', value: batchConfig.division, icon: 'grid-outline' },
        { label: 'RBT Numbers', value: `${batchConfig.rbtFrom} to ${batchConfig.rbtTo}`, icon: 'list-outline' },
        { label: 'Academic Year', value: batchConfig.academic_year || batchConfig.academicYear || '2024-25', icon: 'calendar-outline' },
        { label: 'Configuration Status', value: batchConfig.status || 'Active', icon: 'shield-checkmark-outline' },
    ];

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Batch Details</Text>
                <Text style={styles.subtitle}>Current assignment details as set by Admin</Text>
            </View>

            <View style={styles.grid}>
                {infoItems.map((item, index) => (
                    <View key={index} style={styles.card}>
                        <View style={styles.iconWrapper}>
                            <Ionicons name={item.icon as any} size={24} color={COLORS.primary} />
                        </View>
                        <View style={styles.content}>
                            <Text style={styles.label}>{item.label}</Text>
                            <Text style={styles.value}>{item.value || 'N/A'}</Text>
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.noticeCard}>
                <Ionicons name="warning-outline" size={20} color="#856404" />
                <Text style={styles.noticeText}>
                    If these details are incorrect, please contact the Administrator to update your batch configuration.
                </Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f8f9fa',
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -8,
    },
    card: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        margin: '1%',
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        minHeight: 100,
    },
    iconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    content: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 4,
        fontWeight: '500',
    },
    value: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    noticeCard: {
        marginTop: 24,
        padding: 16,
        backgroundColor: '#fff3cd',
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ffeeba',
    },
    noticeText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 14,
        color: '#856404',
        lineHeight: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: COLORS.textLight,
    },
});
