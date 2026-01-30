import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { getAchievementsByFilter } from '../../storage/sqlite';
import { styles } from './dashboard.styles';

export const AchievementsManagement = ({ filters, handleVerify, handleViewDocument }: any) => {
    const [achievements, setAchievements] = useState<any[]>([]);

    const isWeb = Platform.OS === 'web';

    useEffect(() => {
        if (filters) {
            loadAchievements();
        }
    }, [filters]);

    const loadAchievements = async () => {
        if (!filters?.dept) return;
        const data = await getAchievementsByFilter(filters.dept, filters.year, filters.div, filters.sem);
        setAchievements(data);
    };

    const exportAchievementsCSV = () => {
        let csv = 'PRN,Student,Semester,Achievement,Type,Date,Status\n';
        achievements.forEach(a => {
            csv += `${a.prn},"${a.fullName}",${a.semester},"${a.achievementName}","${a.type}","${a.achievementDate}","${a.verificationStatus}"\n`;
        });

        if (isWeb) {
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Achievements_Report_${filters.dept}.csv`;
            a.click();
        } else {
            Alert.alert('Export', 'CSV Exported (Simulation)');
        }
    };

    return (
        <View style={styles.moduleCard}>
            <View style={styles.moduleHeader}>
                <Text style={styles.moduleTitle}>Achievements Management</Text>
                <TouchableOpacity style={styles.actionBtn} onPress={exportAchievementsCSV}>
                    <Ionicons name="download-outline" size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>Export CSV</Text>
                </TouchableOpacity>
            </View>
            <ScrollView horizontal>
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <Text style={[styles.tableCell, { width: 100 }]}>PRN</Text>
                        <Text style={[styles.tableCell, { width: 150 }]}>Student</Text>
                        <Text style={[styles.tableCell, { width: 60 }]}>Sem</Text>
                        <Text style={[styles.tableCell, { width: 150 }]}>Achievement</Text>
                        <Text style={[styles.tableCell, { width: 100 }]}>Type</Text>
                        <Text style={[styles.tableCell, { width: 100 }]}>Status</Text>
                        <Text style={[styles.tableCell, { width: 80 }]}>Actions</Text>
                    </View>
                    {achievements.length > 0 ? (
                        achievements.map((a, idx) => (
                            <View key={idx} style={styles.tableRow}>
                                <Text style={[styles.tableCell, { width: 100 }]}>{a.prn}</Text>
                                <Text style={[styles.tableCell, { width: 150 }]}>{a.fullName}</Text>
                                <Text style={[styles.tableCell, { width: 60 }]}>{a.semester}</Text>
                                <Text style={[styles.tableCell, { width: 150 }]}>{a.achievementName}</Text>
                                <Text style={[styles.tableCell, { width: 100 }]}>{a.type}</Text>
                                <Text style={[styles.tableCell, { width: 100, color: a.verificationStatus === 'Verified' ? COLORS.success : (a.verificationStatus === 'Rejected' ? COLORS.error : COLORS.warning) }]}>
                                    {a.verificationStatus}
                                </Text>
                                <View style={{ width: 80, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                    {a.certificateUri && (
                                        <TouchableOpacity onPress={() => handleViewDocument(a.certificateUri)}>
                                            <Ionicons name="eye-outline" size={20} color={COLORS.secondary} />
                                        </TouchableOpacity>
                                    )}
                                    {a.verificationStatus !== 'Verified' ? (
                                        <TouchableOpacity onPress={() => handleVerify('achievements', a.id, 'Verified')}>
                                            <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
                                        </TouchableOpacity>
                                    ) : (
                                        <Ionicons name="checkmark-done-circle" size={20} color={COLORS.success} />
                                    )}
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={{ padding: 20, textAlign: 'center', color: '#999' }}>No achievements found for current filters</Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};
