import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker'; // Original used Picker
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { BRANCH_MAPPINGS, DISPLAY_YEARS } from '../../constants/Mappings';
import { CourseDef, deleteCourseDef, saveCourseDef } from '../../storage/sqlite';
import { styles } from './dashboard.styles';

export const CoursesManagement = ({ courses, filters, loadData }: { courses: CourseDef[], filters: any, loadData: () => void }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [newCourse, setNewCourse] = useState<CourseDef>({
        courseCode: '', courseName: '', department: filters.dept === 'All' ? 'CSE' : filters.dept,
        semester: filters.sem === 'All' ? 3 : (filters.sem || 3), credits: 3, iseMax: 20, mseMax: 30, eseMax: 50,
        yearOfStudy: filters.year === 'All' ? 'SE' : (filters.year || 'SE')
    });

    useEffect(() => {
        if (filters) {
            setNewCourse(prev => ({
                ...prev,
                department: filters.dept === 'All' ? prev.department : filters.dept,
                semester: filters.sem === 'All' ? prev.semester : (filters.sem || prev.semester),
                yearOfStudy: filters.year === 'All' ? prev.yearOfStudy : (filters.year || prev.yearOfStudy)
            }));
        }
    }, [filters]);

    const handleSave = async () => {
        if (!newCourse.courseCode || !newCourse.courseName) {
            Alert.alert('Error', 'Please enter course code and name');
            return;
        }
        try {
            await saveCourseDef(newCourse);
            await loadData();
            setModalOpen(false);
            Alert.alert('Success', 'Course saved successfully');
        } catch (e: any) {
            console.error(e);
            if (e.message?.includes('UNIQUE')) {
                Alert.alert('Error', 'Course Code already exists. Please use a unique code.');
            } else {
                Alert.alert('Error', 'Failed to save course. ' + (e.message || ''));
            }
        }
    };

    const handleDelete = async (courseCode: string) => {
        Alert.alert(
            'Delete Course',
            'Are you sure you want to delete this course?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteCourseDef(courseCode);
                            await loadData();
                            Alert.alert('Success', 'Course deleted successfully');
                        } catch (e: any) {
                            console.error(e);
                            Alert.alert('Error', 'Failed to delete course');
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.moduleCard}>
            <View style={styles.moduleHeader}>
                <Text style={styles.moduleTitle}>Courses Management</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]} onPress={() => setModalOpen(true)}>
                        <Ionicons name="add" size={20} color="#fff" />
                        <Text style={styles.actionBtnText}>Add Course</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.tableCell, { flex: 0.7 }]}>Code</Text>
                    <Text style={[styles.tableCell, { flex: 1.4 }]}>Name</Text>
                    <Text style={[styles.tableCell, { flex: 0.4 }]}>Year</Text>
                    <Text style={[styles.tableCell, { flex: 0.4 }]}>Sem</Text>
                    <Text style={[styles.tableCell, { flex: 0.4 }]}>Cr</Text>
                    <Text style={[styles.tableCell, { flex: 0.4 }]}>ISE</Text>
                    <Text style={[styles.tableCell, { flex: 0.4 }]}>MSE</Text>
                    <Text style={[styles.tableCell, { flex: 0.4 }]}>ESE</Text>
                    <Text style={[styles.tableCell, { flex: 0.4 }]}>Action</Text>
                </View>
                {courses.map(c => (
                    <View key={c.courseCode} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { flex: 0.7 }]}>{c.courseCode}</Text>
                        <Text style={[styles.tableCell, { flex: 1.4 }]}>{c.courseName}</Text>
                        <Text style={[styles.tableCell, { flex: 0.4 }]}>{c.yearOfStudy}</Text>
                        <Text style={[styles.tableCell, { flex: 0.4 }]}>{c.semester}</Text>
                        <Text style={[styles.tableCell, { flex: 0.4 }]}>{c.credits}</Text>
                        <Text style={[styles.tableCell, { flex: 0.4 }]}>{c.iseMax}</Text>
                        <Text style={[styles.tableCell, { flex: 0.4 }]}>{c.mseMax}</Text>
                        <Text style={[styles.tableCell, { flex: 0.4 }]}>{c.eseMax}</Text>
                        <TouchableOpacity style={[styles.tableCell, { flex: 0.4, alignItems: 'center' }]} onPress={() => handleDelete(c.courseCode)}>
                            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>

            <Modal visible={modalOpen} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBody, { maxWidth: 500 }]}>
                        <Text style={styles.modalTitle}>Add New Course</Text>
                        <ScrollView>
                            <Text style={styles.filterLabel}>Department / Branch</Text>
                            <View style={[styles.pickerWrapper, { width: '100%', marginBottom: 15 }]}>
                                <Picker
                                    selectedValue={newCourse.department}
                                    onValueChange={v => setNewCourse({ ...newCourse, department: v })}
                                >
                                    {Object.keys(BRANCH_MAPPINGS).map(d => (
                                        <Picker.Item key={d} label={BRANCH_MAPPINGS[d]} value={d} />
                                    ))}
                                </Picker>
                            </View>

                            <Text style={styles.filterLabel}>Year of Study</Text>
                            <View style={[styles.pickerWrapper, { width: '100%', marginBottom: 15 }]}>
                                <Picker
                                    selectedValue={newCourse.yearOfStudy}
                                    onValueChange={v => setNewCourse({ ...newCourse, yearOfStudy: v })}
                                >
                                    {DISPLAY_YEARS.map(y => (
                                        <Picker.Item key={y.value} label={y.label} value={y.value} />
                                    ))}
                                </Picker>
                            </View>

                            <Text style={styles.filterLabel}>Course Code</Text>
                            <TextInput placeholder="Course Code" style={styles.input} value={newCourse.courseCode} onChangeText={t => setNewCourse({ ...newCourse, courseCode: t })} />

                            <Text style={styles.filterLabel}>Course Name</Text>
                            <TextInput placeholder="Course Name" style={styles.input} value={newCourse.courseName} onChangeText={t => setNewCourse({ ...newCourse, courseName: t })} />

                            <View style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.filterLabel}>Credits</Text>
                                    <TextInput placeholder="Credits" style={styles.input} keyboardType="numeric" value={newCourse.credits.toString()} onChangeText={t => setNewCourse({ ...newCourse, credits: parseInt(t) || 0 })} />
                                </View>
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={styles.filterLabel}>Semester</Text>
                                    <TextInput placeholder="Semester" style={styles.input} keyboardType="numeric" value={newCourse.semester.toString()} onChangeText={t => setNewCourse({ ...newCourse, semester: parseInt(t) || 0 })} />
                                </View>
                            </View>

                            <View style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.filterLabel}>ISE Max</Text>
                                    <TextInput placeholder="ISE Max" style={styles.input} keyboardType="numeric" value={newCourse.iseMax.toString()} onChangeText={t => setNewCourse({ ...newCourse, iseMax: parseInt(t) || 0 })} />
                                </View>
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={styles.filterLabel}>MSE Max</Text>
                                    <TextInput placeholder="MSE Max" style={styles.input} keyboardType="numeric" value={newCourse.mseMax.toString()} onChangeText={t => setNewCourse({ ...newCourse, mseMax: parseInt(t) || 0 })} />
                                </View>
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={styles.filterLabel}>ESE Max</Text>
                                    <TextInput placeholder="ESE Max" style={styles.input} keyboardType="numeric" value={newCourse.eseMax.toString()} onChangeText={t => setNewCourse({ ...newCourse, eseMax: parseInt(t) || 0 })} />
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.row}>
                            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={() => setModalOpen(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleSave}>
                                <Text style={styles.btnText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};
