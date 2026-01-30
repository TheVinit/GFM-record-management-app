import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { getAllActivitiesByFilter } from '../../storage/sqlite';
import { styles } from './dashboard.styles';

export const ActivitiesManagement = ({ students, filters, handleVerify, handleViewDocument }: any) => {
    const [activities, setActivities] = useState<any[]>([]);

    const isWeb = Platform.OS === 'web';

    useEffect(() => {
        if (filters) {
            loadActivities();
        }
    }, [filters]);

    const loadActivities = async () => {
        if (!filters?.dept) return;
        const data = await getAllActivitiesByFilter(filters.dept, filters.year, filters.div, filters.sem, filters.activityType);

        // Filter based on authorized student list
        const authorizedPrns = new Set(students.map((s: any) => s.prn));
        const filtered = data.filter((a: any) => authorizedPrns.has(a.prn));

        setActivities(filtered);
    };

    const exportActivitiesCSV = () => {
        let csv = 'PRN,Student,Semester,Activity,Type,Date,Status\n';
        activities.forEach(a => {
            csv += `${a.prn},"${a.fullName}",${a.semester},"${a.activityName}","${a.type}","${a.activityDate}","${a.verificationStatus}"\n`;
        });

        if (isWeb) {
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Activities_Report_${filters.dept}.csv`;
            a.click();
        } else {
            Alert.alert('Export', 'CSV Exported (Simulation)');
        }
    };

    return (
        <View style={styles.moduleCard}>
            <View style={styles.moduleHeader}>
                <Text style={styles.moduleTitle}>Activities Management</Text>
                <TouchableOpacity style={styles.actionBtn} onPress={exportActivitiesCSV}>
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
                        <Text style={[styles.tableCell, { width: 150 }]}>Activity</Text>
                        <Text style={[styles.tableCell, { width: 100 }]}>Type</Text>
                        <Text style={[styles.tableCell, { width: 100 }]}>Status</Text>
                        <Text style={[styles.tableCell, { width: 80 }]}>Actions</Text>
                    </View>
                    {activities.length > 0 ? (
                        activities.map((a, idx) => (
                            <View key={idx} style={styles.tableRow}>
                                <Text style={[styles.tableCell, { width: 100 }]}>{a.prn}</Text>
                                <Text style={[styles.tableCell, { width: 150 }]}>{a.fullName}</Text>
                                <Text style={[styles.tableCell, { width: 60 }]}>{a.semester}</Text>
                                <Text style={[styles.tableCell, { width: 150 }]}>{a.activityName}</Text>
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
                                        <TouchableOpacity onPress={() => handleVerify('student_activities', a.id, 'Verified')}>
                                            <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
                                        </TouchableOpacity>
                                    ) : (
                                        <Ionicons name="checkmark-done-circle" size={20} color={COLORS.success} />
                                    )}
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={{ padding: 20, textAlign: 'center', color: '#999' }}>No activities found for current filters</Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};
