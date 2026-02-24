import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { YEAR_MAPPINGS } from '../../constants/Mappings';
import { getSession } from '../../services/session.service';
import { logCommunication } from '../../services/student.service';
import { supabase } from '../../services/supabase';
import {
    AttendanceSession,
    getAttendanceRecords,
    getTeacherBatchConfig,
    TeacherBatchConfig,
    toCamelCase
} from '../../storage/sqlite';
import { getLocalDateString } from '../../utils/date';
import { EnhancedAttendanceSummary } from '../EnhancedAttendanceSummary';
import { styles } from './dashboard.styles';

export const AttendanceSummaryManagement = ({ filters }: any) => {
    const [config, setConfig] = useState<TeacherBatchConfig | null>(null);
    const [session, setSession] = useState<AttendanceSession | null>(null);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDate, setSelectedDate] = useState(getLocalDateString());
    const [showNativeDatePicker, setShowNativeDatePicker] = useState(false);

    // Follow-up Modal State
    const [callModalVisible, setCallModalVisible] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [callForm, setCallForm] = useState({
        reason: 'Family Emergency',
        customDescription: '',
        reportUrl: '',
        markAsLate: false
    });

    useEffect(() => {
        loadGfmDashboard();
    }, [filters, selectedDate]);

    const loadGfmDashboard = async () => {
        setLoading(true);
        try {
            const s = await getSession();
            if (!s) return;

            const batchConfig = await getTeacherBatchConfig(s.id);
            if (!batchConfig) {
                setLoading(false);
                return;
            }
            setConfig(batchConfig);

            const mainDivision = batchConfig.division ? batchConfig.division[0].toUpperCase() : '';
            const academicMatch = batchConfig.class || batchConfig.academicYear;
            const fullYearName = YEAR_MAPPINGS[academicMatch] || academicMatch;

            console.log(`[AttendanceSummary] Loading Dashboard - Date: ${selectedDate}, Dept: ${batchConfig.department}, Academic: ${academicMatch} (full: ${fullYearName}), Div: ${mainDivision}`);

            // Robust session lookup
            const { data: sessions, error: sessionError } = await supabase
                .from('attendance_sessions')
                .select('*')
                .eq('date', selectedDate)
                .eq('department', batchConfig.department)
                .ilike('division', `${mainDivision}%`)
                .order('created_at', { ascending: false });

            if (sessionError) throw sessionError;

            console.log(`[AttendanceSummary] Found ${sessions?.length || 0} sessions for date=${selectedDate}, dept=${batchConfig.department}, div=${mainDivision}`);
            if (sessions && sessions.length > 0) {
                console.log(`[AttendanceSummary] Session academic_year values: [${sessions.map((s: any) => s.academic_year).join(', ')}]`);
            }

            // Find the best academic match in code to avoid complex SQL or logic
            const divSession = (sessions || []).find(sess => {
                const sYear = sess.academic_year || '';
                return sYear === academicMatch ||
                    sYear === fullYearName ||
                    sYear === batchConfig.academicYear ||
                    (academicMatch === 'Second Year' && (sYear === 'SE' || sYear === '2nd')) ||
                    (academicMatch === 'Third Year' && (sYear === 'TE' || sYear === '3rd')) ||
                    (academicMatch === 'Final Year' && (sYear === 'BE' || sYear === '4th')) ||
                    (academicMatch === 'First Year' && (sYear === 'FE' || sYear === '1st'));
            });

            // Fallback: if no year match but sessions exist for this date/dept/div, use latest
            const selectedSession = divSession || (sessions && sessions.length > 0 ? sessions[0] : null);
            if (!divSession && selectedSession) {
                console.warn(`[AttendanceSummary] No exact year match, falling back to latest session: ${selectedSession.id} (year=${selectedSession.academic_year})`);
            }

            console.log(`[AttendanceSummary] Selected session: ${selectedSession ? selectedSession.id : 'None'}`);

            if (selectedSession) {
                setSession(toCamelCase(selectedSession));
                const attRecords = await getAttendanceRecords(selectedSession.id);

                const fromVal = (batchConfig.rbtFrom || '').trim().toUpperCase();
                const toVal = (batchConfig.rbtTo || '').trim().toUpperCase();

                const extractTailNum = (str: string) => {
                    const match = String(str || '').match(/\d+$/);
                    return match ? parseInt(match[0]) : NaN;
                };

                const fromSeq = extractTailNum(fromVal);
                const toSeq = extractTailNum(toVal);

                console.log(`[AttendanceSummary] Filter Range: [${fromVal}](${fromSeq}) to [${toVal}](${toSeq})`);

                const filtered = attRecords.filter((r, idx) => {
                    // Try to extract sequence from all possible fields
                    const prnSeq = extractTailNum(r.prn || r.studentPrn);
                    const rollSeq = extractTailNum(r.rollNo || r.studentRollNo);

                    // Use the most likely sequence (prioritize roll sequence if available and matches range format)
                    const studentSeq = !isNaN(rollSeq) ? rollSeq : prnSeq;

                    const isMatch = (!isNaN(studentSeq) && !isNaN(fromSeq) && !isNaN(toSeq))
                        ? (studentSeq >= fromSeq && studentSeq <= toSeq)
                        : (String(r.prn || '').toUpperCase() >= fromVal && String(r.prn || '').toUpperCase() <= toVal);

                    if (idx < 5) {
                        console.log(`[AttendanceSummary] Check #${idx}: PRN=${r.prn}, Roll=${r.rollNo}, Seq=${studentSeq}, Match=${isMatch}`);
                    }
                    return isMatch;
                });

                console.log(`[AttendanceSummary] Total=${attRecords.length}, Filtered=${filtered.length}`);
                setRecords(filtered);
            } else {
                setSession(null);
                setRecords([]);
            }
        } catch (e) {
            console.error('[AttendanceSummary] Error:', e);
            Alert.alert('Error', 'Failed to load GFM dashboard');
        } finally {
            setLoading(false);
        }
    };

    const openCallFollowup = (record: any) => {
        setSelectedStudent(record);
        setCallForm({
            reason: 'Family Emergency',
            customDescription: '',
            reportUrl: '',
            markAsLate: false
        });
        setCallModalVisible(true);
    };

    const submitFollowup = async () => {
        if (!selectedStudent) return;
        setSaving(true);
        try {
            const s = await getSession();
            // 1. Log Communication
            await logCommunication(
                s?.id,
                selectedStudent.prn || selectedStudent.studentPrn,
                'call',
                `Follow-up: ${callForm.reason}. ${callForm.customDescription}`,
                'Parent',
                undefined,
                undefined,
                callForm.reason,
                callForm.customDescription,
                callForm.reportUrl
            );

            // 2. If marked as late, update attendance record
            if (callForm.markAsLate) {
                await supabase
                    .from('attendance_records')
                    .update({
                        status: 'Present',
                        remark: `Late Remark: ${callForm.reason}`,
                        approved_by_gfm: s?.id
                    })
                    .eq('id', selectedStudent.id);
            } else {
                // Just verify as GFM
                await supabase
                    .from('attendance_records')
                    .update({
                        approved_by_gfm: s?.id,
                        remark: callForm.reason
                    })
                    .eq('id', selectedStudent.id);
            }

            Alert.alert('Success', 'Follow-up logged successfully');
            setCallModalVisible(false);
            loadGfmDashboard();
        } catch (e) {
            Alert.alert('Error', 'Failed to log follow-up');
        } finally {
            setSaving(false);
        }
    };

    const router = useRouter();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ marginTop: 15, color: COLORS.textLight }}>Loading attendance data...</Text>
            </View>
        );
    }

    if (!config) {
        return (
            <View style={styles.moduleCard}>
                <Text style={styles.emptyText}>No batch configuration found.</Text>
                <Text style={styles.helperText}>Please contact admin to set up your batch assignment.</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <View style={[styles.moduleCard, { marginBottom: 15, padding: 0, overflow: 'hidden' }]}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 15,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F1F5F9'
                }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.textLight, letterSpacing: 1, marginBottom: 4 }}>ATTENDANCE DATE</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="calendar" size={20} color={COLORS.primary} />
                            {Platform.OS === 'web' ? (
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    style={{
                                        fontSize: '18px',
                                        fontWeight: '700',
                                        color: COLORS.text,
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        outline: 'none',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            ) : (
                                <TouchableOpacity onPress={() => setShowNativeDatePicker(true)}>
                                    <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text }}>
                                        {selectedDate || "Select Date"}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {showNativeDatePicker && (
                                <DateTimePicker
                                    value={selectedDate ? new Date(selectedDate) : new Date()}
                                    mode="date"
                                    display="default"
                                    onChange={(event: any, date?: Date) => {
                                        setShowNativeDatePicker(false);
                                        if (date) {
                                            setSelectedDate(getLocalDateString(date));
                                        }
                                    }}
                                />
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={{
                            backgroundColor: COLORS.primary,
                            paddingHorizontal: 20,
                            paddingVertical: 10,
                            borderRadius: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            shadowColor: COLORS.primary,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 4
                        }}
                        onPress={loadGfmDashboard}
                    >
                        <Ionicons name="sync" size={18} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Load Records</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', padding: 12, backgroundColor: '#F8FAFC', gap: 10 }}>
                    <TouchableOpacity
                        onPress={() => {
                            const today = getLocalDateString();
                            setSelectedDate(today);
                        }}
                        style={{
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 20,
                            backgroundColor: selectedDate === getLocalDateString() ? COLORS.primary : '#E2E8F0',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: selectedDate === getLocalDateString() ? '#fff' : COLORS.textSecondary }}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            const d = new Date();
                            d.setDate(d.getDate() - 1);
                            setSelectedDate(getLocalDateString(d));
                        }}
                        style={{
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 20,
                            backgroundColor: selectedDate === getLocalDateString(new Date(Date.now() - 86400000)) ? COLORS.primary : '#E2E8F0',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: selectedDate === getLocalDateString(new Date(Date.now() - 86400000)) ? '#fff' : COLORS.textSecondary }}>Yesterday</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {session ? (
                <EnhancedAttendanceSummary
                    students={records}
                    batchConfig={config}
                    onRefresh={loadGfmDashboard}
                    isPastDate={selectedDate < getLocalDateString()}
                />
            ) : (
                <View style={styles.moduleCard}>
                    <Ionicons name="today-outline" size={48} color={COLORS.textLight} style={{ alignSelf: 'center', marginBottom: 15 }} />
                    <Text style={styles.emptyText}>No attendance records for {selectedDate}</Text>
                    <Text style={styles.helperText}>Wait for the subject teacher to submit attendance or pick another date.</Text>
                </View>
            )}

            <Modal visible={callModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Log Follow-up Call</Text>
                        <Text style={styles.helperText}>
                            Student: {selectedStudent?.fullName} (Roll: {selectedStudent?.rollNo || '-'})
                        </Text>

                        <ScrollView>
                            <Text style={styles.label}>Reason for Absence (Parent info)</Text>
                            <View style={styles.pickerWrapper}>
                                <TextInput
                                    style={styles.picker}
                                    value={callForm.reason}
                                    onChangeText={(t) => setCallForm({ ...callForm, reason: t })}
                                    placeholder="Reason"
                                />
                            </View>

                            <Text style={styles.label}>Additional Notes</Text>
                            <TextInput
                                style={[styles.input, { height: 80 }]}
                                multiline
                                placeholder="Details from conversation..."
                                value={callForm.customDescription}
                                onChangeText={t => setCallForm({ ...callForm, customDescription: t })}
                            />

                            <View style={styles.checkboxContainer}>
                                <TouchableOpacity
                                    style={[styles.smallStatusBtn, { backgroundColor: callForm.markAsLate ? COLORS.primary : 'transparent' }]}
                                    onPress={() => setCallForm({ ...callForm, markAsLate: !callForm.markAsLate })}
                                >
                                    <Ionicons name={callForm.markAsLate ? "checkbox" : "square-outline"} size={20} color={callForm.markAsLate ? "#fff" : COLORS.text} />
                                </TouchableOpacity>
                                <Text style={styles.checkboxLabel}>Mark as Present (Late)</Text>
                            </View>

                            <View style={styles.btnRow}>
                                <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={() => setCallModalVisible(false)}>
                                    <Text style={{ color: COLORS.text }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={submitFollowup} disabled={saving}>
                                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save Log</Text>}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};
