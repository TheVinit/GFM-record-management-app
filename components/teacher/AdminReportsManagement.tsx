import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
// Removed react-native-chart-kit import
import { COLORS } from '../../constants/colors';
import { generateDetailedGFMReportCSV, generateTodayAttendanceCSV, saveAndShareCSV } from '../../services/csv.service';
import { getAdminAnalytics } from '../../storage/sqlite';
import { getLocalDateString } from '../../utils/date';
import { handleViewDocument } from './dashboard.utils';

const isWeb = Platform.OS === 'web';
const screenWidth = Dimensions.get("window").width;

interface AuditItem {
    dept: string;
    year: string;
    div: string;
    batch: string;
    name: string;
    rollNo: string;
    prn: string;
    date: string;
    status: string;
    gfmName: string;
    callTime: string;
    reason: string;
    leaveNote: string;
    leaveProofUrl?: string | null;
    leaveAddedAt?: string;
    isCompliant: boolean;
    fullDate: string;
}

export const AdminReportsManagement = ({ filters }: any) => {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 1024;

    const [reportType, setReportType] = useState<'attendance' | 'gfm-audit'>('attendance');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [showFilterModal, setShowFilterModal] = useState(false);

    // Initial state from props
    const [localFilters, setLocalFilters] = useState({
        dept: filters.dept || 'All',
        year: filters.year || 'All',
        div: filters.div || 'All',
        date: getLocalDateString(),
        startDate: getLocalDateString(),
        endDate: '',
        gfmSearch: ''
    });

    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    useEffect(() => {
        setLocalFilters(prev => ({
            ...prev,
            dept: filters.dept || 'All',
            year: filters.year || 'All',
            div: filters.div || 'All',
        }));
    }, [filters]);

    useEffect(() => {
        loadData();
    }, [localFilters.dept, localFilters.year]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getAdminAnalytics();
            setStats(data);
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to load report data');
        } finally {
            setLoading(false);
        }
    };

    const getBatchSummary = () => {
        if (!stats) return [];

        const auditItems = getAuditData();
        const batchMap: Record<string, { total: number; compliant: number; pending: number }> = {};

        auditItems.forEach((item: any) => {
            const key = `${item.year} ${item.div} - ${item.batch}`;
            if (!batchMap[key]) {
                batchMap[key] = { total: 0, compliant: 0, pending: 0 };
            }
            batchMap[key].total++;
            if (item.isCompliant) {
                batchMap[key].compliant++;
            } else {
                batchMap[key].pending++;
            }
        });

        return Object.entries(batchMap).map(([batch, counts]) => ({
            batch,
            ...counts,
            complianceRate: counts.total > 0 ? Math.round((counts.compliant / counts.total) * 100) : 0
        })).sort((a, b) => b.total - a.total);
    };

    const getAuditData = () => {
        if (!stats) return [];

        const targetDate = localFilters.startDate || localFilters.date;
        const filteredAbsents = stats.absentRecords.filter((r: any) => {
            const rDate = r.sessionDate || new Date(r.createdAt || new Date()).toISOString().split('T')[0];

            // Date Filter
            let dateMatch = false;
            if (localFilters.startDate && localFilters.endDate && localFilters.endDate !== localFilters.startDate) {
                dateMatch = rDate >= localFilters.startDate && rDate <= localFilters.endDate;
            } else {
                dateMatch = rDate === targetDate;
            }
            if (!dateMatch) return false;

            // Dept Filter
            if (localFilters.dept !== 'All' && r.sessionDept !== localFilters.dept) return false;

            // Year Filter
            const sessionYear = r.sessionYear || '';
            const filterYear = localFilters.year || 'All';
            const yearMatch = filterYear === 'All' ||
                sessionYear === filterYear ||
                (filterYear === 'First Year' && (sessionYear === 'FE' || sessionYear === '1st')) ||
                (filterYear === 'Second Year' && (sessionYear === 'SE' || sessionYear === '2nd')) ||
                (filterYear === 'Third Year' && (sessionYear === 'TE' || sessionYear === '3rd')) ||
                (filterYear === 'Final Year' && (sessionYear === 'BE' || sessionYear === '4th'));
            if (!yearMatch) return false;

            // Division Filter
            if (localFilters.div !== 'All' && r.sessionDiv !== localFilters.div && r.sessionDiv?.[0] !== localFilters.div) return false;

            return true;
        });

        return filteredAbsents.map((absent: any) => {
            const absentDateStr = absent.sessionDate;

            // Precise matching for calls and leave notes using the session date
            const callLog = stats.calls.find((c: any) =>
                c.studentPrn === absent.studentPrn &&
                (c.sessionDate === absentDateStr || new Date(c.createdAt).toISOString().split('T')[0] === absentDateStr)
            );

            const leave = stats.leaveNotes?.find((l: any) =>
                l.studentPrn === absent.studentPrn &&
                l.startDate <= absentDateStr && l.endDate >= absentDateStr
            );

            const auditItem = {
                dept: absent.sessionDept || '-',
                year: absent.sessionYear || absent.studentYear || '-',
                div: absent.sessionDiv || absent.studentDiv || '-',
                batch: absent.sessionBatch || '-',
                name: absent.fullName || absent.studentPrn,
                rollNo: absent.rollNo || absent.studentPrn,
                prn: absent.studentPrn,
                date: absentDateStr,
                status: callLog ? 'Called' : (leave ? 'Leave Note' : 'Pending'),
                gfmName: callLog?.teacherName || 'Unknown', // View provides teacherName for call
                callTime: callLog ? new Date(callLog.createdAt).toLocaleTimeString() : '-',
                reason: callLog?.reason || 'No Call Logged',
                leaveNote: leave ? `${leave.reason}${leave.proofUrl ? ' (Proof Uploaded)' : ''}` : '-',
                leaveProofUrl: leave?.proofUrl || null,
                leaveAddedAt: leave?.createdAt ? new Date(leave.createdAt).toLocaleTimeString() : undefined,
                isCompliant: !!callLog || !!leave,
                fullDate: absent.createdAt || new Date().toISOString()
            } as AuditItem;

            if (localFilters.gfmSearch && !auditItem.gfmName.toLowerCase().includes(localFilters.gfmSearch.toLowerCase())) {
                return null;
            }

            return auditItem;
        }).filter(Boolean).sort((a: any, b: any) => new Date(b.fullDate).getTime() - new Date(a.fullDate).getTime());
    };


    const batchSummary = getBatchSummary();
    const auditData: AuditItem[] = getAuditData();

    if (loading) return (
        <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Analyzing Records...</Text>
        </View>
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, reportType === 'attendance' && styles.tabActive]}
                    onPress={() => setReportType('attendance')}
                >
                    <Text style={[styles.tabText, reportType === 'attendance' && styles.tabTextActive]}>Absenteeism Overview</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, reportType === 'gfm-audit' && styles.tabActive]}
                    onPress={() => setReportType('gfm-audit')}
                >
                    <Text style={[styles.tabText, reportType === 'gfm-audit' && styles.tabTextActive]}>GFM Call Audit</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.actionRow}>

                <TouchableOpacity style={[styles.actionButton, { backgroundColor: COLORS.accent }]} onPress={() => setShowFilterModal(true)}>
                    <Ionicons name="filter" size={16} color="white" />
                    <Text style={styles.actionText}>Refine Filters</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionButton, { backgroundColor: COLORS.secondary }]} onPress={async () => {
                    if (reportType === 'attendance') {
                        const csv = generateTodayAttendanceCSV(batchSummary.map(b => ({
                            division: b.batch,
                            present: b.compliant,
                            absent: b.pending,
                            total: b.total
                        })));
                        await saveAndShareCSV(csv, 'attendance_report.csv');
                    } else {
                        const csv = generateDetailedGFMReportCSV(auditData);
                        await saveAndShareCSV(csv, `detailed_gfm_report_${localFilters.date}.csv`);
                    }
                }}>
                    <Ionicons name="download" size={16} color="white" />
                    <Text style={styles.actionText}>Download CSV</Text>
                </TouchableOpacity>
            </View>

            {reportType === 'attendance' && (
                <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <Text style={styles.cardTitle}>Batch-wise Summary</Text>
                        <View style={styles.activeFilterBadge}>
                            <Text style={styles.activeFilterText}>
                                {localFilters.date}
                            </Text>
                        </View>
                    </View>
                    {batchSummary.length > 0 ? (
                        <View style={styles.summaryTable}>
                            <View style={styles.summaryHeader}>
                                <Text style={[styles.summaryCell, { flex: 2 }]}>Batch</Text>
                                <Text style={[styles.summaryCell, { flex: 1, textAlign: 'center' }]}>Absents</Text>
                                <Text style={[styles.summaryCell, { flex: 1, textAlign: 'center' }]}>Calls Done</Text>
                                <Text style={[styles.summaryCell, { flex: 1, textAlign: 'center' }]}>Compliance</Text>
                            </View>
                            {batchSummary.map((b, idx) => (
                                <View key={idx} style={styles.summaryRow}>
                                    <Text style={[styles.summaryCell, { flex: 2, fontWeight: 'bold' }]}>{b.batch}</Text>
                                    <Text style={[styles.summaryCell, { flex: 1, textAlign: 'center', color: COLORS.error, fontWeight: 'bold' }]}>{b.total}</Text>
                                    <Text style={[styles.summaryCell, { flex: 1, textAlign: 'center', color: COLORS.success }]}>{b.compliant}</Text>
                                    <View style={[styles.summaryCell, { flex: 1, alignItems: 'center' }]}>
                                        <View style={[styles.complianceBadge, { backgroundColor: b.complianceRate >= 90 ? COLORS.success + '20' : b.complianceRate >= 50 ? COLORS.warning + '20' : COLORS.error + '20' }]}>
                                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: b.complianceRate >= 90 ? COLORS.success : b.complianceRate >= 50 ? COLORS.warning : COLORS.error }}>
                                                {b.complianceRate}%
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.noData}><Text style={styles.noDataText}>No records found for summary.</Text></View>
                    )}
                </View>
            )}

            {reportType === 'gfm-audit' && (
                <View style={styles.auditContainer}>
                    <View style={styles.auditHeader}>
                        <Text style={styles.auditTitle}>GFM Compliance Report</Text>
                        <Text style={styles.auditSub}>Attendance records for {localFilters.date}</Text>
                    </View>

                    {auditData.length === 0 ? (
                        <View style={styles.noData}><Text>No records found.</Text></View>
                    ) : (
                        auditData.map((item, index) => (
                            <View key={index} style={[styles.auditRow, !item.isCompliant && styles.auditRowWarning]}>
                                <View style={styles.auditInfo}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={styles.auditPrn}>{item.name}</Text>
                                        <View style={{ flexDirection: 'row', gap: 6 }}>
                                            <Text style={styles.auditRollBadge}>Roll: {item.rollNo}</Text>
                                            <Text style={styles.auditBatchBadge}>{item.batch}</Text>
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                        <Text style={styles.auditDate}>{item.date}</Text>
                                        <View style={styles.vDivider} />
                                        <Text style={styles.auditPrn}>{item.prn}</Text>
                                        <View style={styles.vDivider} />
                                        <Text style={styles.auditGfm}>GFM: {item.gfmName}</Text>
                                    </View>
                                    {item.leaveNote !== '-' && (
                                        <Text style={styles.leaveNoteText}>📝 {item.leaveNote}</Text>
                                    )}
                                </View>
                                <View style={styles.auditStatus}>
                                    <View style={[styles.badge, { backgroundColor: item.status === 'Called' ? '#4CAF50' : (item.status === 'Leave Note' ? COLORS.secondary : '#F44336') }]}>
                                        <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
                                    </View>
                                    {item.status === 'Called' && item.callTime !== '-' && (
                                        <View style={styles.timestampRow}>
                                            <Ionicons name="time-outline" size={10} color="#666" />
                                            <Text style={styles.timestampText}>{item.callTime}</Text>
                                        </View>
                                    )}
                                    {item.status === 'Leave Note' && item.leaveAddedAt && (
                                        <View style={styles.timestampRow}>
                                            <Ionicons name="time-outline" size={10} color="#666" />
                                            <Text style={styles.timestampText}>{item.leaveAddedAt}</Text>
                                        </View>
                                    )}
                                    <Text style={styles.auditReason}>{item.reason}</Text>
                                    {item.leaveProofUrl && (
                                        <TouchableOpacity style={styles.viewProofBtn} onPress={() => handleViewDocument(item.leaveProofUrl!)}>
                                            <Ionicons name="eye" size={12} color={COLORS.primary} />
                                            <Text style={styles.viewProofText}>View Proof</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        ))
                    )}
                </View>
            )}

            <Modal visible={showFilterModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Refine View</Text>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalLabel}>View History</Text>
                        {/* Date Picker Logic */}
                        {isWeb ? (
                            <View style={{ flexDirection: 'row', gap: 30, marginBottom: 20 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textLight, marginBottom: 8, textTransform: 'uppercase' }}>Start Date</Text>
                                    <input
                                        type="date"
                                        style={{
                                            backgroundColor: '#f8fafc',
                                            borderRadius: 12,
                                            padding: '0 15px',
                                            height: '54px',
                                            border: '1px solid #E2E8F0',
                                            width: '100%',
                                            fontFamily: 'inherit',
                                            fontSize: '14px',
                                            outline: 'none',
                                            color: '#1E293B',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                        }}
                                        value={localFilters.startDate}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setLocalFilters({ ...localFilters, startDate: v, date: v });
                                        }}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textLight, marginBottom: 8, textTransform: 'uppercase' }}>End Date</Text>
                                    <input
                                        type="date"
                                        style={{
                                            backgroundColor: '#f8fafc',
                                            borderRadius: 12,
                                            padding: '0 15px',
                                            height: '54px',
                                            border: '1px solid #E2E8F0',
                                            width: '100%',
                                            fontFamily: 'inherit',
                                            fontSize: '14px',
                                            outline: 'none',
                                            color: '#1E293B',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                        }}
                                        value={localFilters.endDate}
                                        onChange={(e) => setLocalFilters({ ...localFilters, endDate: e.target.value })}
                                    />
                                </View>
                            </View>
                        ) : (
                            <>
                                <View style={{ flexDirection: 'row', gap: 30, marginBottom: 20 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textLight, marginBottom: 8, textTransform: 'uppercase' }}>Start Date</Text>
                                        <TouchableOpacity
                                            style={[styles.filterInput, { justifyContent: 'center', height: 54 }]}
                                            onPress={() => setShowStartPicker(true)}
                                        >
                                            <Text style={{ color: localFilters.startDate ? COLORS.text : COLORS.textLight, fontWeight: '600' }}>
                                                {localFilters.startDate || "Select Date"}
                                            </Text>
                                            <Ionicons name="calendar-outline" size={18} color={COLORS.primary} style={{ position: 'absolute', right: 15 }} />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textLight, marginBottom: 8, textTransform: 'uppercase' }}>End Date</Text>
                                        <TouchableOpacity
                                            style={[styles.filterInput, { justifyContent: 'center', height: 54 }]}
                                            onPress={() => setShowEndPicker(true)}
                                        >
                                            <Text style={{ color: localFilters.endDate ? COLORS.text : COLORS.textLight, fontWeight: '600' }}>
                                                {localFilters.endDate || "Optional"}
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', position: 'absolute', right: 15 }}>
                                                {!!localFilters.endDate && (
                                                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); setLocalFilters({ ...localFilters, endDate: '' }); }}>
                                                        <Ionicons name="close-circle" size={16} color={COLORS.error} style={{ marginRight: 5 }} />
                                                    </TouchableOpacity>
                                                )}
                                                <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {showStartPicker && (
                                    <DateTimePicker
                                        value={localFilters.startDate ? new Date(localFilters.startDate) : new Date()}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(event: any, selectedDate?: Date) => {
                                            setShowStartPicker(false);
                                            if (selectedDate) {
                                                const d = selectedDate.toISOString().split('T')[0];
                                                setLocalFilters({ ...localFilters, startDate: d, date: d });
                                            }
                                        }}
                                    />
                                )}

                                {showEndPicker && (
                                    <DateTimePicker
                                        value={localFilters.endDate ? new Date(localFilters.endDate) : new Date()}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(event: any, selectedDate?: Date) => {
                                            setShowEndPicker(false);
                                            if (selectedDate) {
                                                const d = selectedDate.toISOString().split('T')[0];
                                                setLocalFilters({ ...localFilters, endDate: d });
                                            }
                                        }}
                                    />
                                )}
                            </>
                        )}

                        <Text style={[styles.modalLabel, { textTransform: 'uppercase', color: COLORS.primary, letterSpacing: 0.5 }]}>Search GFM</Text>
                        <TextInput
                            style={[styles.filterInput, { marginBottom: 25, height: 54 }]}
                            value={localFilters.gfmSearch}
                            onChangeText={(v) => setLocalFilters({ ...localFilters, gfmSearch: v })}
                            placeholder="Type GFM name..."
                            placeholderTextColor="#94A3B8"
                        />

                        <Text style={[styles.modalLabel, { marginTop: 20 }]}>Academic Year</Text>
                        <View style={styles.chipRow}>
                            {['All', 'First Year', 'Second Year', 'Third Year', 'Final Year'].map(y => (
                                <TouchableOpacity
                                    key={y}
                                    onPress={() => setLocalFilters({ ...localFilters, year: y })}
                                    style={[styles.chip, localFilters.year === y && styles.chipActive]}
                                >
                                    <Text style={[styles.chipText, localFilters.year === y && styles.chipTextActive]}>{y}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.modalLabel}>Division</Text>
                        <View style={styles.chipRow}>
                            {['All', 'A', 'B', 'C'].map(d => (
                                <TouchableOpacity
                                    key={d}
                                    onPress={() => setLocalFilters({ ...localFilters, div: d })}
                                    style={[styles.chip, localFilters.div === d && styles.chipActive]}
                                >
                                    <Text style={[styles.chipText, localFilters.div === d && styles.chipTextActive]}>{d === 'All' ? 'All' : `Div ${d}`}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilterModal(false)}>
                            <Text style={styles.applyBtnText}>Apply Perspective</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    scrollContent: { padding: 16, paddingBottom: 50 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', height: 300 },
    loaderText: { marginTop: 10, color: COLORS.textSecondary },
    tabContainer: { flexDirection: 'row', marginBottom: 20, backgroundColor: 'white', borderRadius: 12, padding: 4, elevation: 2 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
    tabActive: { backgroundColor: COLORS.primary },
    tabText: { color: COLORS.textSecondary, fontWeight: '600' },
    tabTextActive: { color: 'white', fontWeight: 'bold' },
    actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginBottom: 15, flexWrap: 'wrap' },
    actionButton: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center', gap: 6 },
    actionText: { color: 'white', fontWeight: 'bold', fontSize: 11 },
    chartCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, alignItems: 'center', elevation: 3 },
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 15 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
    activeFilterBadge: { backgroundColor: COLORS.primary + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    activeFilterText: { fontSize: 10, color: COLORS.primary, fontWeight: 'bold' },
    noData: { padding: 40, alignItems: 'center' },
    noDataText: { color: COLORS.textLight, fontStyle: 'italic' },
    auditContainer: { backgroundColor: 'white', borderRadius: 16, padding: 16, elevation: 3 },
    auditHeader: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
    auditTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
    auditSub: { fontSize: 12, color: COLORS.textLight },
    auditRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexDirection: 'row', gap: 10 },
    auditRowWarning: { backgroundColor: '#fff8f8' },
    auditInfo: { flex: 2 },
    auditPrn: { fontSize: 14, fontWeight: 'bold', color: COLORS.text },
    auditBatchBadge: { backgroundColor: '#E3F2FD', color: '#1976D2', fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
    auditDate: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
    auditGfm: { fontSize: 11, color: COLORS.textSecondary },
    vDivider: { width: 1, height: 10, backgroundColor: '#ddd' },
    auditRollBadge: { backgroundColor: COLORS.primary + '10', color: COLORS.primary, fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontWeight: 'bold', overflow: 'hidden' },
    leaveNoteText: { fontSize: 11, color: '#666', marginTop: 4, backgroundColor: '#f5f5f5', padding: 4, borderRadius: 4 },

    auditStatus: { alignItems: 'flex-end', flex: 1 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 4 },
    badgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
    auditReason: { fontSize: 10, color: COLORS.textLight, textAlign: 'right' },
    viewProofBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    viewProofText: { fontSize: 10, color: COLORS.primary, fontWeight: 'bold' },
    timestampRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2, marginBottom: 4 },
    timestampText: { fontSize: 9, color: '#666', fontStyle: 'italic' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    modalLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textLight, marginBottom: 8 },
    filterInput: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', height: 54 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 25 },
    chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#E2E8F0' },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary, elevation: 3, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 5 },
    chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
    chipTextActive: { color: 'white', fontWeight: 'bold' },
    applyBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    applyBtnText: { color: 'white', fontWeight: 'bold' },
    summaryTable: { width: '100%', marginTop: 5 },
    summaryHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10, marginBottom: 5 },
    summaryRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f9f9f9', alignItems: 'center' },
    summaryCell: { fontSize: 12, color: COLORS.textSecondary },
    complianceBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }
});

export default AdminReportsManagement;
