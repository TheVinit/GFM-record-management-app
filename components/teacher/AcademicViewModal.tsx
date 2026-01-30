import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { getAcademicRecordsByStudent, Student } from '../../storage/sqlite';
import { styles } from './dashboard.styles';
import { DetailItem } from './DetailItem';

interface AcademicViewModalProps {
    student: Student | null;
    visible: boolean;
    onClose: () => void;
}

export const AcademicViewModal = ({ student, visible, onClose }: AcademicViewModalProps) => {
    const { width } = useWindowDimensions();
    const [academicRecords, setAcademicRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (visible && student) {
            loadAcademicData();
        }
    }, [visible, student]);

    const loadAcademicData = async () => {
        if (!student) return;
        setLoading(true);
        try {
            const records = await getAcademicRecordsByStudent(student.prn);
            setAcademicRecords(records);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalBody, { width: '90%', maxWidth: 700, maxHeight: '80%' }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Academic Report Preview</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView>
                        {student && (
                            <View style={[styles.detailSection, { backgroundColor: '#fff', elevation: 0, borderWidth: 1, borderColor: '#eee' }]}>
                                <View style={styles.detailGrid}>
                                    <DetailItem label="Name" value={student.fullName} />
                                    <DetailItem label="PRN" value={student.prn} />
                                    <DetailItem label="Dept" value={student.branch} />
                                    <DetailItem label="Div" value={student.division} />
                                    <DetailItem label="SGPA" value={academicRecords.length > 0 ? academicRecords[academicRecords.length - 1].sgpa : 'N/A'} />
                                    <DetailItem label="CGPA" value={academicRecords.length > 0 ? academicRecords[academicRecords.length - 1].cgpa : 'N/A'} />
                                </View>
                            </View>
                        )}

                        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Semester Report</Text>
                        {loading ? (
                            <ActivityIndicator size="small" color={COLORS.secondary} style={{ padding: 20 }} />
                        ) : academicRecords.length > 0 ? (
                            <View style={styles.table}>
                                <View style={[styles.tableRow, styles.tableHeader]}>
                                    <Text style={[styles.tableCell, { flex: 0.5 }]}>Sem</Text>
                                    <Text style={[styles.tableCell, { flex: 2 }]}>Course</Text>
                                    <Text style={[styles.tableCell, { flex: 0.6 }]}>MSE</Text>
                                    <Text style={[styles.tableCell, { flex: 0.6 }]}>ESE</Text>
                                    <Text style={[styles.tableCell, { flex: 0.6 }]}>Grade</Text>
                                </View>
                                {academicRecords.map((r, idx) => (
                                    <View key={idx} style={styles.tableRow}>
                                        <Text style={[styles.tableCell, { flex: 0.5 }]}>{r.semester}</Text>
                                        <Text style={[styles.tableCell, { flex: 2 }]}>{r.courseName}</Text>
                                        <Text style={[styles.tableCell, { flex: 0.6 }]}>{r.mseMarks || 0}</Text>
                                        <Text style={[styles.tableCell, { flex: 0.6 }]}>{r.eseMarks || 0}</Text>
                                        <Text style={[styles.tableCell, { flex: 0.6, fontWeight: 'bold', color: r.grade === 'F' ? COLORS.error : COLORS.success }]}>{r.grade}</Text>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ color: COLORS.textLight }}>No academic records found for this student.</Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={{ marginTop: 20, alignItems: 'center' }}>
                        <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.primary, width: '100%' }]} onPress={onClose}>
                            <Text style={styles.btnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};
