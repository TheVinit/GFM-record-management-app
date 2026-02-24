import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { getSession } from '../../services/session.service';
import { supabase } from '../../services/supabase';
import { getLocalDateString } from '../../utils/date';
import { generatePDF } from '../../utils/pdf-generator';

const ReportsDashboard = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<any[]>([]);
    const [createModalVisible, setCreateModalVisible] = useState(false);

    // Create Report State
    const [startDate, setStartDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        loadReports();
    }, []);

    const loadReports = async () => {
        setLoading(true);
        const session = await getSession();
        if (!session) {
            router.replace('/');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('attendance_reports')
                .select('*')
                .eq('gfm_id', session.id)
                .order('date', { ascending: false });

            if (error) throw error;
            setReports(data || []);
        } catch (err) {
            console.error('Error loading reports:', err);
            Alert.alert('Error', 'Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        const session = await getSession();
        if (!session) return;

        setGenerating(true);
        try {
            // 1. Get Batch Config
            const { data: batchConfig } = await supabase
                .from('teacher_batch_configs')
                .select('*')
                .eq('teacher_id', session.id)
                .single();

            if (!batchConfig) throw new Error("Batch config not found. Please ensure your batch is assigned.");

            const dateStr = getLocalDateString(startDate);

            // 2. Fetch all students in this batch
            const { data: studentsInRange } = await supabase
                .from('students')
                .select('prn, roll_no, full_name')
                .eq('branch', batchConfig.department)
                .eq('year_of_study', batchConfig.class)
                .eq('division', batchConfig.division?.[0] || 'A');

            if (!studentsInRange || studentsInRange.length === 0) {
                throw new Error("No students found in this batch allocation.");
            }

            // Numeric range filtering (matches dashboard logic)
            const extractTailNum = (str: string) => {
                const match = String(str).match(/\d+$/);
                return match ? parseInt(match[0]) : NaN;
            };

            const fNum = extractTailNum(batchConfig.rbt_from);
            const tNum = extractTailNum(batchConfig.rbt_to);

            const batchStudents = studentsInRange.filter(s => {
                const sNum = extractTailNum(s.roll_no || s.prn);
                if (isNaN(fNum) || isNaN(tNum) || isNaN(sNum)) return false;
                const seq = sNum % 1000;
                const fSeq = fNum % 1000;
                const tSeq = tNum % 1000;
                return seq >= fSeq && seq <= tSeq;
            });

            const studentPrns = batchStudents.map(s => s.prn);
            const totalStudentsCount = batchStudents.length;

            // 3. Fetch Attendance Records for this date and students
            // First get sessions for this date
            const { data: sessions } = await supabase
                .from('attendance_sessions')
                .select('id')
                .eq('date', dateStr);

            const sessionIds = sessions?.map(s => s.id) || [];

            const { data: attendanceRecords } = await supabase
                .from('attendance_records')
                .select('student_prn, status')
                .in('session_id', sessionIds)
                .in('student_prn', studentPrns);

            const absentPrns = attendanceRecords?.filter(r => r.status === 'Absent').map(r => r.student_prn) || [];
            const totalAbsentCount = absentPrns.length;

            // 4. Fetch Follow-ups and Leave Notes
            const { count: contactedCount } = await supabase
                .from('attendance_follow_ups')
                .select('*', { count: 'exact', head: true })
                .in('student_prn', studentPrns)
                .or(`date.eq.${dateStr},created_at.gte.${dateStr}T00:00:00,created_at.lte.${dateStr}T23:59:59`);

            const { count: leaveNotesCount } = await supabase
                .from('pre_informed_absences')
                .select('*', { count: 'exact', head: true })
                .in('student_prn', studentPrns)
                .lte('start_date', dateStr)
                .gte('end_date', dateStr);

            // 5. Build Report Object
            const absentDetails = batchStudents
                .filter(s => absentPrns.includes(s.prn))
                .map(s => ({ roll: s.roll_no, name: s.full_name }));

            const newReport = {
                date: dateStr,
                gfm_id: session.id,
                department: batchConfig.department,
                year: batchConfig.class,
                division: batchConfig.division?.[0] || 'A',
                batch_range: `${batchConfig.rbt_from}-${batchConfig.rbt_to}`,
                total_students: totalStudentsCount,
                total_absent: totalAbsentCount,
                total_contacted: contactedCount || 0,
                total_pre_informed: leaveNotesCount || 0,
                report_data: {
                    summary: `Generated Report for ${dateStr}`,
                    absent_details: absentDetails
                }
            };

            const { error } = await supabase
                .from('attendance_reports')
                .insert(newReport);

            if (error) throw error;

            setCreateModalVisible(false);
            loadReports();
            Alert.alert("Success", "Report generated successfully using live attendance data.");

        } catch (err: any) {
            console.error('Error generating report:', err);
            Alert.alert('Report Generation Failed', err.message || 'Check your internet connection and batch assignment.');
        } finally {
            setGenerating(false);
        }
    };

    const handleExportPDF = async (report: any) => {
        try {
            // Create HTML for PDF
            const html = `
            <html>
                <body>
                    <h1>Attendance Report</h1>
                    <p>Date: ${report.date}</p>
                    <p>Batch: ${report.department} ${report.year} Div ${report.division}</p>
                    <hr/>
                    <h3>Summary</h3>
                    <ul>
                        <li>Total Students: ${report.total_students}</li>
                        <li>Total Absent: ${report.total_absent}</li>
                        <li>Contacted: ${report.total_contacted}</li>
                    </ul>
                </body>
            </html>
        `;

            await generatePDF({
                fileName: `Report_${report.date}.pdf`,
                htmlTemplate: html,
                data: report
            });
        } catch (e) {
            Alert.alert("Error", "Failed to export PDF");
        }
    };

    const renderReportItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardRow}>
                <View>
                    <Text style={styles.cardTitle}>Daily Report: {item.date}</Text>
                    <Text style={styles.cardSubtitle}>{item.batch_range}</Text>
                </View>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.total_absent} Absent</Text>
                </View>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>Total</Text>
                    <Text style={styles.statValue}>{item.total_students}</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>Contacted</Text>
                    <Text style={styles.statValue}>{item.total_contacted}</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>Leave Notes</Text>
                    <Text style={styles.statValue}>{item.total_pre_informed}</Text>
                </View>
            </View>

            <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleExportPDF(item)}>
                    <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.actionText}>Export PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                    <Ionicons name="eye-outline" size={18} color={COLORS.text} />
                    <Text style={[styles.actionText, { color: COLORS.text }]}>View Details</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Attendance Reports</Text>
                <TouchableOpacity onPress={() => setCreateModalVisible(true)} style={styles.addBtn}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={reports}
                    renderItem={renderReportItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text-outline" size={64} color={COLORS.textLight} />
                            <Text style={styles.emptyText}>No reports generated yet</Text>
                            <TouchableOpacity style={styles.createBtn} onPress={() => setCreateModalVisible(true)}>
                                <Text style={styles.createBtnText}>Generate Report</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* Create Modal */}
            <Modal visible={createModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Generate Report</Text>
                            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Select Date</Text>
                            <TouchableOpacity style={styles.dateInput} onPress={() => setShowPicker(true)}>
                                <Text>{startDate.toLocaleDateString()}</Text>
                                <Ionicons name="calendar" size={20} color={COLORS.primary} />
                            </TouchableOpacity>
                            {showPicker && (
                                <DateTimePicker
                                    value={startDate}
                                    mode="date"
                                    onChange={(e, d) => {
                                        setShowPicker(Platform.OS === 'ios');
                                        if (d) setStartDate(d);
                                    }}
                                />
                            )}
                        </View>

                        <TouchableOpacity
                            style={[styles.primaryBtn, generating && { opacity: 0.7 }]}
                            onPress={handleGenerateReport}
                            disabled={generating}
                        >
                            {generating ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Generate</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        justifyContent: 'space-between'
    },
    backBtn: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    addBtn: {
        backgroundColor: COLORS.primary,
        padding: 8,
        borderRadius: 8,
    },
    list: {
        padding: 15,
    },
    card: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    cardSubtitle: {
        fontSize: 14,
        color: COLORS.textLight,
    },
    badge: {
        backgroundColor: COLORS.error + '15',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
    },
    badgeText: {
        color: COLORS.error,
        fontSize: 12,
        fontWeight: 'bold',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f9f9f9',
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
    },
    stat: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: 5,
        gap: 10,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#eee',
    },
    actionText: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '500',
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.textLight,
        marginVertical: 15,
    },
    createBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    createBtnText: {
        color: '#fff',
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        marginBottom: 8,
        fontWeight: '500',
    },
    dateInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        borderRadius: 8,
    },
    primaryBtn: {
        backgroundColor: COLORS.primary,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    primaryBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default ReportsDashboard;
