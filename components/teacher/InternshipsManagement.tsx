import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { getAllInternshipsByFilter } from '../../storage/sqlite';
import { styles } from './dashboard.styles';

export const InternshipsManagement = ({ students, filters, handleVerify, handleViewDocument }: any) => {
    const [internships, setInternships] = useState<any[]>([]);

    const isWeb = Platform.OS === 'web';

    useEffect(() => {
        if (filters) {
            loadInternships();
        }
    }, [filters]);

    const loadInternships = async () => {
        if (!filters?.dept) return;
        const data = await getAllInternshipsByFilter(filters.dept, filters.year, filters.div, filters.sem);

        // Filter based on authorized student list
        const authorizedPrns = new Set(students.map((s: any) => s.prn));
        const filtered = data.filter((i: any) => authorizedPrns.has(i.prn));

        setInternships(filtered);
    };

    const exportInternshipsCSV = () => {
        let csv = 'PRN,Student,Sem,Company,Role,Duration,Status\n';
        internships.forEach(i => {
            csv += `${i.prn},"${i.fullName}",${i.semester},"${i.companyName}","${i.role}",${i.duration},"${i.verificationStatus}"\n`;
        });

        if (isWeb) {
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Internships_Report_${filters.dept}.csv`;
            a.click();
        } else {
            Alert.alert('Export', 'CSV Exported (Simulation)');
        }
    };

    return (
        <View style={styles.moduleCard}>
            <View style={styles.moduleHeader}>
                <Text style={styles.moduleTitle}>Internship Management</Text>
                <TouchableOpacity style={styles.actionBtn} onPress={exportInternshipsCSV}>
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
                        <Text style={[styles.tableCell, { width: 150 }]}>Company</Text>
                        <Text style={[styles.tableCell, { width: 100 }]}>Duration</Text>
                        <Text style={[styles.tableCell, { width: 100 }]}>Status</Text>
                        <Text style={[styles.tableCell, { width: 80 }]}>Actions</Text>
                    </View>
                    {internships.length > 0 ? (
                        internships.map((i, idx) => (
                            <View key={idx} style={styles.tableRow}>
                                <Text style={[styles.tableCell, { width: 100 }]}>{i.prn}</Text>
                                <Text style={[styles.tableCell, { width: 150 }]}>{i.fullName}</Text>
                                <Text style={[styles.tableCell, { width: 60 }]}>{i.semester}</Text>
                                <Text style={[styles.tableCell, { width: 150 }]}>{i.companyName}</Text>
                                <Text style={[styles.tableCell, { width: 100 }]}>{i.duration} Months</Text>
                                <Text style={[styles.tableCell, { width: 100, color: i.verificationStatus === 'Verified' ? COLORS.success : (i.verificationStatus === 'Rejected' ? COLORS.error : COLORS.warning) }]}>
                                    {i.verificationStatus}
                                </Text>
                                <View style={{ width: 80, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                    {i.certificateUri && (
                                        <TouchableOpacity onPress={() => handleViewDocument(i.certificateUri)}>
                                            <Ionicons name="eye-outline" size={20} color={COLORS.secondary} />
                                        </TouchableOpacity>
                                    )}
                                    {i.verificationStatus !== 'Verified' ? (
                                        <TouchableOpacity onPress={() => handleVerify('internships', i.id, 'Verified')}>
                                            <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
                                        </TouchableOpacity>
                                    ) : (
                                        <Ionicons name="checkmark-done-circle" size={20} color={COLORS.success} />
                                    )}
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={{ padding: 20, textAlign: 'center', color: '#999' }}>No internships found for current filters</Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};
