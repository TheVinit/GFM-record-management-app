import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { Student } from '../../storage/sqlite';
import { styles } from './dashboard.styles';

// Fallback for jsPDF if needed locally or web
// import jsPDF from 'jspdf'; 

export const StudentManagement = ({ students, filters, onViewDetails, onPrint, handleVerify, onCall }: any) => {

    const isWeb = Platform.OS === 'web';

    const exportCSV = () => {
        let csv = 'PRN,Name,Department,Year,Division,Status\n';
        students.forEach((s: any) => {
            csv += `${s.prn},"${s.fullName}","${s.branch}","${s.yearOfStudy}","${s.division}","${s.verificationStatus}"\n`;
        });

        if (isWeb) {
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Student_Report_${filters.dept}.csv`;
            a.click();
        } else {
            Alert.alert('Export', 'CSV Exported (Simulation)');
        }
    };

    return (
        <View style={styles.moduleCard}>
            <View style={styles.moduleHeader}>
                <Text style={styles.moduleTitle}>Student Management</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]} onPress={exportCSV}>
                        <Ionicons name="download-outline" size={20} color="#fff" />
                        <Text style={styles.actionBtnText}>Export CSV</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.helperText}>
                Showing {students.length} students {filters.dept !== 'All' ? `in ${filters.dept}` : ''}
            </Text>

            <ScrollView horizontal>
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <Text style={[styles.tableCell, { width: 100 }]}>PRN</Text>
                        <Text style={[styles.tableCell, { width: 200 }]}>Name</Text>
                        <Text style={[styles.tableCell, { width: 50 }]}>Div</Text>
                        <Text style={[styles.tableCell, { width: 80 }]}>Status</Text>
                        <Text style={[styles.tableCell, { width: 150 }]}>Actions</Text>
                    </View>
                    {students.map((s: Student) => (
                        <View key={s.prn} style={styles.tableRow}>
                            <Text style={[styles.tableCell, { width: 100 }]}>{s.prn}</Text>
                            <Text style={[styles.tableCell, { width: 200 }]}>{s.fullName}</Text>
                            <Text style={[styles.tableCell, { width: 50 }]}>{s.division}</Text>
                            <Text style={[styles.tableCell, { width: 80, color: s.verificationStatus === 'Verified' ? COLORS.success : COLORS.warning }]}>
                                {s.verificationStatus || 'Pending'}
                            </Text>
                            <View style={{ width: 150, flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity onPress={() => onViewDetails(s)}>
                                    <Ionicons name="eye-outline" size={20} color={COLORS.secondary} />
                                </TouchableOpacity>
                                {/* Verify Button */}
                                {s.verificationStatus !== 'Verified' && (
                                    <TouchableOpacity onPress={() => handleVerify('students', s.prn, 'Verified')}>
                                        <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
                                    </TouchableOpacity>
                                )}
                                {/* Call Button if needed */}
                                {onCall && (
                                    <TouchableOpacity onPress={() => onCall(s)}>
                                        <Ionicons name="call-outline" size={20} color={COLORS.success} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
};
