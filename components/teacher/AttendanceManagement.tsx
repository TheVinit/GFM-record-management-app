import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { getSession } from '../../services/session.service';
import { supabase } from '../../services/supabase';
import {
    AttendanceRecord,
    AttendanceSession,
    createAttendanceSession,
    getAttendanceRecords,
    getStudentsByDivision,
    saveAttendanceRecords,
    Student,
    toCamelCase
} from '../../storage/sqlite';
import { styles } from './dashboard.styles';

export const AttendanceManagement = ({ filters, loadData }: { filters: any, loadData: () => void }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [absentPrns, setAbsentPrns] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [session, setSession] = useState<AttendanceSession | null>(null);

    const isWeb = Platform.OS === 'web';

    useEffect(() => {
        if (filters.dept !== 'All' && filters.year !== 'All' && filters.div !== 'All') {
            initAttendance();
        }
    }, [filters]);

    const initAttendance = async () => {
        setLoading(true);
        const s = await getSession();
        if (!s) return;

        try {
            // Check if attendance already taken today for this division
            const today = new Date().toISOString().split('T')[0];
            const { data: existingSession, error } = await supabase
                .from('attendance_sessions')
                .select('*')
                .eq('date', today)
                .eq('department', filters.dept)
                .eq('academic_year', filters.year)
                .eq('division', filters.div)
                .maybeSingle();

            if (existingSession) {
                setSession(toCamelCase(existingSession));
                const records = await getAttendanceRecords(existingSession.id);
                const absents = new Set(records.filter(r => r.status === 'Absent').map(r => r.studentPrn));
                setAbsentPrns(absents);
            } else {
                setSession(null);
                setAbsentPrns(new Set());
            }

            const studentList = await getStudentsByDivision(filters.dept, filters.year, filters.div, true);
            setStudents(studentList);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleAbsent = (prn: string) => {
        if (session?.locked) return;
        setAbsentPrns(prev => {
            const next = new Set(prev);
            if (next.has(prn)) next.delete(prn);
            else next.add(prn);
            return next;
        });
    };

    const handleSubmit = async () => {
        if (students.length === 0) return;

        const confirmMsg = `Are you sure? Marking ${absentPrns.size} students as absent out of ${students.length}.`;
        if (!isWeb) {
            Alert.alert('Confirm Submission', confirmMsg, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Submit', onPress: submitFinal }
            ]);
        } else {
            if (window.confirm(confirmMsg)) submitFinal();
        }
    };

    const submitFinal = async () => {
        setSubmitting(true);
        try {
            const s = await getSession();
            const newSession = await createAttendanceSession({
                teacherId: s!.userId,
                date: new Date().toISOString().split('T')[0],
                academicYear: filters.year,
                department: filters.dept,
                class: filters.year, // Using year as class for now as per schema
                division: filters.div,
                locked: true
            });

            const records: AttendanceRecord[] = students.map(st => ({
                sessionId: newSession.id,
                studentPrn: st.prn,
                status: absentPrns.has(st.prn) ? 'Absent' : 'Present',
                remark: ''
            }));

            await saveAttendanceRecords(records);
            setSession(newSession);
            Alert.alert('Success', 'Attendance recorded successfully');
            loadData();
        } catch (e) {
            Alert.alert('Error', 'Failed to record attendance');
        } finally {
            setSubmitting(false);
        }
    };

    if (filters.dept === 'All' || filters.year === 'All' || filters.div === 'All') {
        return (
            <View style={[styles.moduleCard, { alignItems: 'center', padding: 40 }]}>
                <Ionicons name="filter-outline" size={48} color={COLORS.primary} />
                <Text style={{ marginTop: 10, fontSize: 16, fontWeight: 'bold' }}>Select Filters</Text>
                <Text style={{ textAlign: 'center', color: COLORS.textLight, marginTop: 5 }}>
                    Please select Department, Year, and Division to take attendance.
                </Text>
            </View>
        );
    }

    if (loading) return <ActivityIndicator size="large" color={COLORS.primary} />;

    return (
        <View style={styles.moduleCard}>
            <View style={styles.moduleHeader}>
                <View>
                    <Text style={styles.moduleTitle}>Attendance Taker</Text>
                    <Text style={styles.helperText}>
                        {filters.year} {filters.div} | {students.length} Students
                    </Text>
                </View>
                {session?.locked ? (
                    <View style={{ backgroundColor: COLORS.success + '20', padding: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="lock-closed" size={16} color={COLORS.success} />
                        <Text style={{ color: COLORS.success, fontWeight: 'bold', marginLeft: 5 }}>Submitted</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.saveBtn, { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }]}
                        onPress={handleSubmit}
                        disabled={submitting || students.length === 0}
                    >
                        {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Submit Absentees</Text>}
                    </TouchableOpacity>
                )}
            </View>

            <Text style={[styles.helperText, { marginBottom: 15, color: COLORS.secondary }]}>
                * Tap on students who are ABSENT. All others are marked Present by default.
            </Text>

            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.tableCell, { flex: 0.8 }]}>Roll / PRN</Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>Student Name</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>Status</Text>
                </View>
                <FlatList
                    data={students}
                    keyExtractor={item => item.prn}
                    scrollEnabled={false}
                    renderItem={({ item }) => {
                        const isAbsent = absentPrns.has(item.prn);
                        return (
                            <TouchableOpacity
                                style={[styles.tableRow, isAbsent && { backgroundColor: COLORS.error + '05' }]}
                                onPress={() => toggleAbsent(item.prn)}
                                disabled={session?.locked}
                            >
                                <Text style={[styles.tableCell, { flex: 0.8 }]}>{item.prn.slice(-3)}</Text>
                                <Text style={[styles.tableCell, { flex: 2, fontWeight: isAbsent ? 'bold' : 'normal' }]}>{item.fullName}</Text>
                                <View style={[
                                    { flex: 1, paddingVertical: 6, borderRadius: 6, alignItems: 'center' },
                                    !isAbsent ? { backgroundColor: COLORS.success + '15' } : { backgroundColor: COLORS.error + '15' }
                                ]}>
                                    <Text style={{
                                        fontWeight: 'bold', fontSize: 12,
                                        color: !isAbsent ? COLORS.success : COLORS.error
                                    }}>
                                        {isAbsent ? 'ABSENT' : 'PRESENT'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>
        </View>
    );
};
