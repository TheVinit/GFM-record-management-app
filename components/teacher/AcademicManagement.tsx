import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker'; // Original used Picker
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import {
    CourseDef,
    getAcademicRecordsByStudent,
    getAllCoursesDef,
    saveAcademicRecord,
    Student
} from '../../storage/sqlite';
import { styles } from './dashboard.styles';

// Import jsPDF for web
let jsPDF: any;
if (Platform.OS === 'web') {
    try {
        jsPDF = require('jspdf');
        require('jspdf-autotable');
    } catch (e) {
        console.warn('jspdf not available');
    }
}

export const AcademicManagement = ({ students, filters, onViewDetails, onViewAcademicDetails }: any) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [selectedSemForMarks, setSelectedSemForMarks] = useState<number>(filters.sem === 'All' ? 3 : filters.sem);
    const [courses, setCourses] = useState<CourseDef[]>([]);
    const [marks, setMarks] = useState<Record<number, any>>({});
    const [sgpa, setSgpa] = useState('');
    const [cgpa, setCgpa] = useState('');
    const [academicStats, setAcademicStats] = useState<Record<string, any>>({});

    const isWeb = Platform.OS === 'web';

    useEffect(() => {
        if (filters) {
            loadCoursesAndMarks();
            loadAllAcademicStats();
        }
    }, [filters, students, selectedStudent, selectedSemForMarks]);

    const loadAllAcademicStats = async () => {
        const statsMap: Record<string, any> = {};
        for (const s of students) {
            const records = await getAcademicRecordsByStudent(s.prn);
            if (records && records.length > 0) {
                const semToUse = filters.sem === 'All' ? records[records.length - 1].semester : filters.sem;
                const semRecord = records.find(r => r.semester === semToUse) || records[records.length - 1];
                statsMap[s.prn] = { sgpa: semRecord.sgpa, cgpa: semRecord.cgpa };
            }
        }
        setAcademicStats(statsMap);
    };

    const loadCoursesAndMarks = async () => {
        if (!filters) return;
        const c = await getAllCoursesDef();
        const deptToUse = selectedStudent ? selectedStudent.branch : filters.dept;
        const semToUse = selectedStudent ? selectedSemForMarks : filters.sem;
        const filteredCourses = c.filter(course =>
            (deptToUse === 'All' || course.department === deptToUse) &&
            (semToUse === 'All' || course.semester === semToUse)
        );
        setCourses(filteredCourses);

        if (selectedStudent) {
            const existing = await getAcademicRecordsByStudent(selectedStudent.prn);
            const marksMap: Record<number, any> = {};
            existing.forEach(r => {
                if (semToUse === 'All' || r.semester === semToUse) {
                    marksMap[r.courseDefId] = r;
                }
            });
            setMarks(marksMap);
            const semRecord = semToUse === 'All' ? existing[existing.length - 1] : existing.find(r => r.semester === semToUse);
            if (semRecord) {
                setSgpa(semRecord.sgpa?.toString() || '');
                setCgpa(semRecord.cgpa?.toString() || '');
            } else {
                setSgpa('');
                setCgpa('');
            }
        }
    };

    const calculateSGPA = () => {
        const gradePoints: Record<string, number> = {
            'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'P': 4, 'F': 0
        };

        let totalCredits = 0;
        let weightedPoints = 0;

        courses.forEach(c => {
            const m = marks[c.id!];
            if (m && m.grade) {
                const points = gradePoints[m.grade] || 0;
                weightedPoints += points * (c.credits || 3);
                totalCredits += (c.credits || 3);
            }
        });

        if (totalCredits > 0) {
            const calculatedSgpa = (weightedPoints / totalCredits).toFixed(2);
            setSgpa(calculatedSgpa);
            if (!cgpa) setCgpa(calculatedSgpa);
        }
    };

    const handleEdit = (s: Student) => {
        setSelectedStudent(s);
        setModalOpen(true);
    };

    const handleSaveMarks = async () => {
        if (!selectedStudent) return;

        try {
            for (const c of courses) {
                const m = marks[c.id!];
                if (!m) continue;

                await saveAcademicRecord({
                    prn: selectedStudent.prn,
                    courseDefId: c.id!,
                    semester: c.semester,
                    iseMarks: Number(m.iseMarks) || 0,
                    mseMarks: Number(m.mseMarks) || 0,
                    eseMarks: Number(m.eseMarks) || 0,
                    totalMarks: (Number(m.iseMarks) || 0) + (Number(m.mseMarks) || 0) + (Number(m.eseMarks) || 0),
                    grade: m.grade || 'F',
                    sgpa: Number(sgpa) || 0,
                    cgpa: Number(cgpa) || 0,
                    academicYear: filters.year,
                });
            }
            setModalOpen(false);
            Alert.alert('Success', 'Academic records updated');
            loadAllAcademicStats();
        } catch (e) {
            Alert.alert('Error', 'Failed to save marks');
        }
    };

    const updateMark = (courseId: number, field: string, value: string) => {
        const course = courses.find(c => c.id === courseId);
        let finalValue = value;

        if (field !== 'grade' && course) {
            const numVal = parseInt(value) || 0;
            let maxVal = 50;
            if (field === 'iseMarks') maxVal = course.iseMax || 20;
            else if (field === 'mseMarks') maxVal = course.mseMax || 30;
            else if (field === 'eseMarks') maxVal = course.eseMax || 50;

            if (numVal > maxVal) {
                Alert.alert('Invalid Marks', `Maximum marks for ${field.replace('Marks', '').toUpperCase()} is ${maxVal}`);
                finalValue = maxVal.toString();
            } else if (numVal < 0) {
                finalValue = '0';
            }
        }

        setMarks(prev => ({
            ...prev,
            [courseId]: {
                ...(prev[courseId] || { iseMarks: 0, mseMarks: 0, eseMarks: 0, grade: 'F' }),
                [field]: field === 'grade' ? value : finalValue
            }
        }));
    };

    const exportCSV = () => {
        let csv = 'PRN,Name,SGPA,CGPA\n';
        students.forEach((s: Student) => {
            csv += `${s.prn},${s.fullName},${academicStats[s.prn]?.sgpa || '-'},${academicStats[s.prn]?.cgpa || '-'}\n`;
        });

        if (isWeb) {
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', `academic_records_${filters.dept}.csv`);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            Alert.alert('Export', 'CSV Exported locally (Simulation)');
        }
    };

    const exportAcademicPDF = () => {
        if (!isWeb || !jsPDF) return;
        const doc = new jsPDF.default ? new jsPDF.default() : new jsPDF();
        doc.setFontSize(16);
        doc.text("Academic Performance Report", 105, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Dept: ${filters.dept} | Year: ${filters.year} | Sem: ${filters.sem}`, 105, 22, { align: 'center' });

        const tableData = students.map((s: Student) => [
            s.prn,
            s.fullName,
            academicStats[s.prn]?.sgpa || '-',
            academicStats[s.prn]?.cgpa || '-'
        ]);

        (doc as any).autoTable({
            startY: 30,
            head: [['PRN', 'Student Name', 'SGPA', 'CGPA']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: COLORS.primary }
        });
        doc.save(`Academic_Report_${filters.dept}_Sem${filters.sem}.pdf`);
    };

    return (
        <View style={styles.moduleCard}>
            <View style={styles.moduleHeader}>
                <Text style={styles.moduleTitle}>Academic Management</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]} onPress={exportCSV}>
                        <Ionicons name="download-outline" size={20} color="#fff" />
                        <Text style={styles.actionBtnText}>Export CSV</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <Text style={styles.helperText}>Showing records for {filters.dept} - Year {filters.year} - Div {filters.div}</Text>

            <ScrollView horizontal>
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <Text style={[styles.tableCell, { width: 100 }]}>PRN</Text>
                        <Text style={[styles.tableCell, { width: 200 }]}>Name</Text>
                        <Text style={[styles.tableCell, { width: 80 }]}>SGPA</Text>
                        <Text style={[styles.tableCell, { width: 80 }]}>CGPA</Text>
                        <Text style={[styles.tableCell, { width: 120, textAlign: 'center' }]}>Actions</Text>
                    </View>
                    {students.map((s: Student) => (
                        <View key={s.prn} style={styles.tableRow}>
                            <Text style={[styles.tableCell, { width: 100 }]}>{s.prn}</Text>
                            <Text style={[styles.tableCell, { width: 200 }]}>{s.fullName}</Text>
                            <Text style={[styles.tableCell, { width: 80 }]}>{academicStats[s.prn]?.sgpa || '-'}</Text>
                            <Text style={[styles.tableCell, { width: 80 }]}>{academicStats[s.prn]?.cgpa || '-'}</Text>
                            <View style={{ width: 100, flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
                                <TouchableOpacity onPress={() => onViewAcademicDetails(s)}>
                                    <Ionicons name="eye-outline" size={20} color={COLORS.secondary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleEdit(s)}>
                                    <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            <Modal visible={modalOpen} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBody, { width: '95%', maxWidth: 800 }]}>
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Enter Marks: {selectedStudent?.fullName}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                                    <Text style={[styles.filterLabel, { marginBottom: 0, marginRight: 10 }]}>Select Semester:</Text>
                                    <View style={[styles.pickerWrapper, { width: 120, height: 35 }]}>
                                        <Picker
                                            selectedValue={selectedSemForMarks}
                                            onValueChange={(val) => setSelectedSemForMarks(Number(val))}
                                            style={{ height: 35 }}
                                        >
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                                <Picker.Item key={s} label={`Sem ${s}`} value={s} />
                                            ))}
                                        </Picker>
                                    </View>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setModalOpen(false)}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 500 }}>
                            <View style={[styles.tableRow, styles.tableHeader]}>
                                <Text style={[styles.tableCell, { flex: 2 }]}>Course</Text>
                                <Text style={[styles.tableCell, { flex: 1 }]}>ISE</Text>
                                <Text style={[styles.tableCell, { flex: 1 }]}>MSE</Text>
                                <Text style={[styles.tableCell, { flex: 1 }]}>ESE</Text>
                                <Text style={[styles.tableCell, { flex: 1 }]}>Grade</Text>
                            </View>
                            {courses.map(c => (
                                <View key={c.id} style={styles.tableRow}>
                                    <Text style={[styles.tableCell, { flex: 2 }]}>{c.courseName}</Text>
                                    <TextInput
                                        style={[styles.smallInput, { flex: 1 }]}
                                        keyboardType="numeric"
                                        placeholder={`Max ${c.iseMax}`}
                                        placeholderTextColor={COLORS.text}
                                        value={marks[c.id!]?.iseMarks ? marks[c.id!]?.iseMarks.toString() : ''}
                                        onChangeText={t => updateMark(c.id!, 'iseMarks', t)}
                                    />
                                    <TextInput
                                        style={[styles.smallInput, { flex: 1 }]}
                                        keyboardType="numeric"
                                        placeholder={`Max ${c.mseMax}`}
                                        placeholderTextColor={COLORS.text}
                                        value={marks[c.id!]?.mseMarks ? marks[c.id!]?.mseMarks.toString() : ''}
                                        onChangeText={t => updateMark(c.id!, 'mseMarks', t)}
                                    />
                                    <TextInput
                                        style={[styles.smallInput, { flex: 1 }]}
                                        keyboardType="numeric"
                                        placeholder={`Max ${c.eseMax}`}
                                        placeholderTextColor={COLORS.text}
                                        value={marks[c.id!]?.eseMarks ? marks[c.id!]?.eseMarks.toString() : ''}
                                        onChangeText={t => updateMark(c.id!, 'eseMarks', t)}
                                    />
                                    <View style={[styles.pickerWrapper, { flex: 1, height: 40 }]}>
                                        <Picker
                                            selectedValue={marks[c.id!]?.grade || 'F'}
                                            onValueChange={v => updateMark(c.id!, 'grade', v)}
                                            style={{ height: 40, color: marks[c.id!]?.grade === 'F' ? COLORS.error : COLORS.text }}
                                        >
                                            {['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F'].map(g => (
                                                <Picker.Item key={g} label={g} value={g} color={g === 'F' ? COLORS.error : undefined} />
                                            ))}
                                        </Picker>
                                    </View>
                                </View>
                            ))}

                            <View style={[styles.row, { marginTop: 20 }]}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={styles.filterLabel}>SGPA</Text>
                                        <TouchableOpacity onPress={calculateSGPA}>
                                            <Text style={{ color: COLORS.secondary, fontSize: 12, fontWeight: 'bold' }}>Auto Calculate</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        placeholder="Enter SGPA"
                                        value={sgpa}
                                        onChangeText={setSgpa}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.filterLabel}>CGPA</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        placeholder="Enter CGPA"
                                        value={cgpa}
                                        onChangeText={setCgpa}
                                    />
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.row}>
                            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={() => setModalOpen(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleSaveMarks}>
                                <Text style={styles.btnText}>Save Marks</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};
