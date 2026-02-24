import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { getFullYearName } from '../../constants/Mappings';
import { getFeePaymentsByFilter } from '../../storage/sqlite';
import { styles } from './dashboard.styles';

export const FeeManagement = ({ students, filters, handleVerify }: any) => {
    const [stats, setStats] = useState<any>(null);
    const [feeData, setFeeData] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'All' | 'Paid' | 'Pending'>('All');

    const isWeb = Platform.OS === 'web';

    useEffect(() => {
        if (filters) {
            loadFeeData();
        }
    }, [filters]);

    const loadFeeData = async () => {
        if (!filters) return;

        // Fetch department-level data
        const rawFeeData = await getFeePaymentsByFilter(filters.dept, filters.year, filters.div);

        // Create PRN set for O(1) lookup of assigned students
        const assignedPrns = new Set(students.map((s: any) => s.prn));

        // Filter: Keep only students assigned to this teacher
        const filtered = rawFeeData.filter(f => assignedPrns.has(f.prn));
        setFeeData(filtered);

        // Recalculate stats locally for assigned students only
        let studentsWithRemaining = 0;
        let totalRemainingAmount = 0;

        filtered.forEach(f => {
            const hasNoPayment = (f.paidAmount || 0) === 0;
            const hasBalance = (f.lastBalance || 0) > 0;

            if (hasBalance || hasNoPayment) {
                studentsWithRemaining++;
                totalRemainingAmount += (f.lastBalance || 0);
            }
        });

        setStats({
            totalStudents: filtered.length,
            studentsWithRemaining,
            totalRemainingAmount
        });
    };

    const filteredFeeData = feeData.filter(f => {
        const isPaid = (f.paidAmount || 0) > 0 && (f.lastBalance || 0) <= 0;
        const isPending = (f.lastBalance || 0) > 0 || (f.paidAmount || 0) === 0;

        if (activeTab === 'All') return true;
        if (activeTab === 'Paid') return isPaid;
        if (activeTab === 'Pending') return isPending;
        return true;
    });

    const exportFeeCSV = (onlyDefaulters = false) => {
        let csv = 'Roll No,PRN,Name,Year,Total Fee,Paid,Balance,Receipt Link\n';
        const dataToExport = onlyDefaulters
            ? feeData.filter(f => (f.lastBalance || 0) > 0 || (f.paidAmount || 0) === 0)
            : filteredFeeData;

        dataToExport.forEach(f => {
            csv += `${f.rollNo || ''},${f.prn},"${f.fullName}","${getFullYearName(f.yearOfStudy)}",${f.totalFee || 0},${f.paidAmount || 0},${f.lastBalance || 0},"${f.receiptUri || ''}"\n`;
        });

        if (isWeb) {
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${onlyDefaulters ? 'Defaulters' : 'Fee'}_Report_${filters.dept}.csv`;
            a.click();
        } else {
            Alert.alert('Export', 'CSV Exported (Simulation)');
        }
    };

    return (
        <View>
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Students</Text>
                    <Text style={styles.statValue}>{stats?.totalStudents || 0}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Defaulters</Text>
                    <Text style={[styles.statValue, { color: COLORS.error }]}>{stats?.studentsWithRemaining || 0}</Text>
                </View>
                <View style={[styles.statCard, { flex: 1.5 }]}>
                    <Text style={styles.statLabel}>Total Outstanding</Text>
                    <Text style={styles.statValue}>₹{stats?.totalRemainingAmount || 0}</Text>
                </View>
            </View>

            <View style={styles.moduleCard}>
                <View style={[styles.moduleHeader, { flexWrap: 'wrap', gap: 15, alignItems: 'flex-start' }]}>
                    <View style={{ flex: 1, minWidth: 200 }}>
                        <Text style={styles.moduleTitle}>Fee Management</Text>
                        <View style={{ flexDirection: 'row', marginTop: 10, gap: 10, flexWrap: 'wrap' }}>
                            {['All', 'Paid', 'Pending'].map((tab) => (
                                <TouchableOpacity
                                    key={tab}
                                    style={{
                                        paddingHorizontal: 16,
                                        paddingVertical: 6,
                                        borderRadius: 20,
                                        backgroundColor: activeTab === tab ? COLORS.primary : COLORS.background,
                                        borderWidth: 1,
                                        borderColor: activeTab === tab ? COLORS.primary : COLORS.border
                                    }}
                                    onPress={() => setActiveTab(tab as any)}
                                >
                                    <Text style={{
                                        color: activeTab === tab ? '#fff' : COLORS.text,
                                        fontWeight: '600',
                                        fontSize: 12
                                    }}>{tab}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: isWeb ? 0 : 5 }}>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success, paddingHorizontal: 12 }]} onPress={() => exportFeeCSV(false)}>
                            <Ionicons name="download-outline" size={18} color="#fff" />
                            <Text style={[styles.actionBtnText, { fontSize: 12 }]}>Report</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.error, paddingHorizontal: 12 }]} onPress={() => exportFeeCSV(true)}>
                            <Ionicons name="warning-outline" size={18} color="#fff" />
                            <Text style={[styles.actionBtnText, { fontSize: 12 }]}>Defaulters</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <ScrollView horizontal>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <Text style={[styles.tableCell, { width: 80 }]}>Roll No</Text>
                            <Text style={[styles.tableCell, { width: 100 }]}>PRN</Text>
                            <Text style={[styles.tableCell, { width: 150 }]}>Name</Text>
                            <Text style={[styles.tableCell, { width: 80 }]}>Year</Text>
                            <Text style={[styles.tableCell, { width: 80 }]}>Total</Text>
                            <Text style={[styles.tableCell, { width: 80 }]}>Paid</Text>
                            <Text style={[styles.tableCell, { width: 80 }]}>Balance</Text>
                            <Text style={[styles.tableCell, { width: 80 }]}>Status</Text>
                            <Text style={[styles.tableCell, { width: 120 }]}>Actions</Text>
                        </View>
                        {filteredFeeData.length === 0 ? (
                            <Text style={{ padding: 20, color: COLORS.textSecondary, textAlign: 'center' }}>No fee records found for current filter.</Text>
                        ) : (
                            filteredFeeData.map((f: any) => (
                                <View key={f.prn} style={styles.tableRow}>
                                    <Text style={[styles.tableCell, { width: 80 }]}>{f.rollNo || '-'}</Text>
                                    <Text style={[styles.tableCell, { width: 100 }]}>{f.prn}</Text>
                                    <Text style={[styles.tableCell, { width: 150 }]}>{f.fullName}</Text>
                                    <Text style={[styles.tableCell, { width: 80 }]}>{getFullYearName(f.yearOfStudy)}</Text>
                                    <Text style={[styles.tableCell, { width: 80 }]}>₹{f.totalFee || 0}</Text>
                                    <Text style={[styles.tableCell, { width: 80, color: (f.paidAmount || 0) > 0 ? COLORS.success : COLORS.error }]}>₹{f.paidAmount || 0}</Text>
                                    <Text style={[styles.tableCell, { width: 80, color: (f.lastBalance || 0) > 0 || (f.paidAmount || 0) === 0 ? COLORS.error : COLORS.success }]}>₹{f.lastBalance || 0}</Text>
                                    <Text style={[styles.tableCell, { width: 80, color: (f.lastBalance || 0) > 0 || (f.paidAmount || 0) === 0 ? COLORS.error : COLORS.success }]}>
                                        {(f.lastBalance || 0) > 0 ? (f.paidAmount > 0 ? 'Remaining' : 'Not Paid') : (f.paidAmount > 0 ? 'Paid' : 'Not Paid')}
                                    </Text>
                                    <View style={{ width: 120, flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                                        {f.receiptUri && (
                                            <TouchableOpacity onPress={() => {
                                                if (isWeb) {
                                                    window.open(f.receiptUri, '_blank');
                                                } else {
                                                    Linking.openURL(f.receiptUri).catch(() =>
                                                        Alert.alert('Error', 'Could not open receipt')
                                                    );
                                                }
                                            }}>
                                                <Ionicons name="receipt-outline" size={20} color={COLORS.secondary} />
                                            </TouchableOpacity>
                                        )}
                                        {f.verificationStatus !== 'Verified' ? (
                                            <TouchableOpacity onPress={() => handleVerify('fee_payments', f.id, 'Verified')}>
                                                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
                                            </TouchableOpacity>
                                        ) : (
                                            <Ionicons name="checkmark-done-circle" size={20} color={COLORS.success} />
                                        )}
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>
            </View>
        </View>
    );
};
