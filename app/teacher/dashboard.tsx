import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import {
  CourseDef,
  getAllCoursesDef,
  getAllStudents,
  getDistinctYearsOfStudy,
  saveStudentInfo,
  Student
} from '../../storage/sqlite';

import { COLORS } from '../../constants/colors';
import { BRANCH_MAPPINGS, DISPLAY_YEARS } from '../../constants/Mappings';
import { clearSession, getSession } from '../../services/session.service';

import { AcademicViewModal } from '../../components/teacher/AcademicViewModal';
import { styles } from '../../components/teacher/dashboard.styles';
import { exportStudentPDF, handleViewDocument } from '../../components/teacher/dashboard.utils';
import { ModuleRenderer } from '../../components/teacher/ModuleRenderer';
import { PrintOptionsModal } from '../../components/teacher/PrintOptionsModal';
import { QuickEditModal } from '../../components/teacher/QuickEditModal';
import { StudentDetailsModal } from '../../components/teacher/StudentDetailsModal';

const isWeb = Platform.OS === 'web';

type Module = 'courses' | 'students' | 'academic' | 'fee' | 'activities' | 'achievements' | 'internships' | 'analytics' | 'attendance' | 'attendance-summary' | 'admin-reports' | 'batch-config';

export default function TeacherDashboard() {
  const { width } = useWindowDimensions();
  const [currentModule, setCurrentModule] = useState<Module>('analytics');
  const [activeModuleGroup, setActiveModuleGroup] = useState<'Attendance' | 'GFM'>('Attendance');
  const [loading, setLoading] = useState(true);
  const [teacherPrn, setTeacherPrn] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherDept, setTeacherDept] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<CourseDef[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

  // Selection states for Modals
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<Student | null>(null);
  const [selectedStudentForAcademicView, setSelectedStudentForAcademicView] = useState<Student | null>(null);
  const [studentForPrint, setStudentForPrint] = useState<Student | null>(null);
  const [printOptionsVisible, setPrintOptionsVisible] = useState(false);
  const [printOptions, setPrintOptions] = useState({
    personal: true, academic: false, fees: false, activities: false, internships: false, all: false,
  });

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingSection, setEditingSection] = useState<string>('');
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editData, setEditData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  // Filters
  const [gfmDeptFilter, setGfmDeptFilter] = useState('All');
  const [gfmYearFilter, setGfmYearFilter] = useState('All');
  const [gfmDivFilter, setGfmDivFilter] = useState('All');
  const [attDeptFilter, setAttDeptFilter] = useState('All');
  const [attYearFilter, setAttYearFilter] = useState('All');
  const [attDivFilter, setAttDivFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [semFilter, setSemFilter] = useState<number | 'All'>('All');
  const [activityTypeFilter, setActivityTypeFilter] = useState<'All' | 'Extra-curricular' | 'Co-curricular' | 'Courses'>('All');

  const router = useRouter();
  const [userRole, setUserRole] = useState('');
  const [yearsOfStudy, setYearsOfStudy] = useState<string[]>([]);

  useEffect(() => {
    checkSession();
    loadYears();
  }, []);

  const checkSession = async () => {
    const session = await getSession();
    if (!session) {
      router.replace('/');
      return;
    }
    setTeacherPrn(session.prn ?? '');
    setTeacherName(session.fullName ?? '');
    setTeacherDept(session.department ?? '');
    setUserRole(session.role ?? '');
    loadData();
  };

  const loadYears = async () => {
    const years = await getDistinctYearsOfStudy();
    setYearsOfStudy(years);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const allStudents = await getAllStudents();
      setStudents(allStudents);
      setFilteredStudents(allStudents);
      const allCourses = await getAllCoursesDef();
      setCourses(allCourses);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await clearSession();
          router.replace('/');
        }
      }
    ]);
  };

  const openQuickEdit = (student: Student, section: string) => {
    setEditingStudent(student);
    setEditingSection(section);
    setEditData({ ...student });
    setEditModalVisible(true);
  };

  const handleQuickSave = async () => {
    setIsSaving(true);
    try {
      await saveStudentInfo(editData);
      Alert.alert('Success', `${editingSection} updated successfully`);
      setEditModalVisible(false);
      loadData();
      if (selectedStudentForDetails && selectedStudentForDetails.prn === editData.prn) {
        setSelectedStudentForDetails(editData);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update student information');
    } finally {
      setIsSaving(false);
    }
  };

  const SidebarItem = ({ id, icon, label, group }: { id: Module, icon: any, label: string, group: 'Attendance' | 'GFM' }) => (
    <TouchableOpacity
      style={[styles.sidebarItem, currentModule === id && styles.sidebarItemActive]}
      onPress={() => {
        setCurrentModule(id);
        setActiveModuleGroup(group);
      }}
    >
      <Ionicons name={icon} size={22} color={currentModule === id ? '#fff' : COLORS.textSecondary} />
      {width > 800 && (
        <Text style={[styles.sidebarText, currentModule === id && styles.sidebarTextActive]}>{label}</Text>
      )}
    </TouchableOpacity>
  );

  const renderFilters = () => {
    const isAttendance = activeModuleGroup === 'Attendance';
    const dept = isAttendance ? attDeptFilter : gfmDeptFilter;
    const year = isAttendance ? attYearFilter : gfmYearFilter;
    const div = isAttendance ? attDivFilter : gfmDivFilter;
    const setDept = isAttendance ? setAttDeptFilter : setGfmDeptFilter;
    const setYear = isAttendance ? setAttYearFilter : setGfmYearFilter;
    const setDiv = isAttendance ? setAttDivFilter : setGfmDivFilter;

    return (
      <View style={styles.filterContainer}>
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Dept:</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={dept} onValueChange={setDept} style={styles.picker}>
              <Picker.Item label="All" value="All" />
              {Object.keys(BRANCH_MAPPINGS).map(key => (
                <Picker.Item key={key} label={BRANCH_MAPPINGS[key]} value={key} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Year:</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={year} onValueChange={setYear} style={styles.picker}>
              <Picker.Item label="All" value="All" />
              {DISPLAY_YEARS.map(y => (
                <Picker.Item key={y.value} label={y.label} value={y.value} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Div:</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={div} onValueChange={setDiv} style={styles.picker}>
              <Picker.Item label="All" value="All" />
              {['A', 'B', 'C', 'D'].map(d => (
                <Picker.Item key={d} label={d} value={d} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={[styles.filterItem, { flex: 1, minWidth: 200 }]}>
          <Ionicons name="search-outline" size={20} color={COLORS.textLight} style={{ position: 'absolute', left: 12, zIndex: 1 }} />
          <TextInput
            style={[styles.input, { flex: 1, paddingLeft: 40, marginBottom: 0 }]}
            placeholder="Search students..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.collegeName}>GFM Record Management</Text>
          <Text style={styles.tagline}>{teacherName} | {teacherDept} Department</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          {width > 600 && <Text style={styles.logoutText}>Logout</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <ScrollView>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: COLORS.textLight, paddingHorizontal: 20, marginVertical: 10 }}>GENERAL</Text>
            <SidebarItem id="analytics" icon="bar-chart-outline" label="Analytics" group="Attendance" />
            <SidebarItem id="students" icon="people-outline" label="Manage Students" group="GFM" />

            <Text style={{ fontSize: 11, fontWeight: 'bold', color: COLORS.textLight, paddingHorizontal: 20, marginVertical: 10, marginTop: 20 }}>ACADEMIC</Text>
            <SidebarItem id="courses" icon="book-outline" label="Courses" group="GFM" />
            <SidebarItem id="academic" icon="school-outline" label="Academic Data" group="GFM" />
            <SidebarItem id="attendance" icon="calendar-outline" label="Daily Attendance" group="Attendance" />
            <SidebarItem id="attendance-summary" icon="list-outline" label="Attendance Summary" group="Attendance" />

            <Text style={{ fontSize: 11, fontWeight: 'bold', color: COLORS.textLight, paddingHorizontal: 20, marginVertical: 10, marginTop: 20 }}>RECORDS</Text>
            <SidebarItem id="fees" icon="card-outline" label="Fee Tracking" group="GFM" />
            <SidebarItem id="activities" icon="rocket-outline" label="Activities" group="GFM" />
            <SidebarItem id="achievements" icon="trophy-outline" label="Achievements" group="GFM" />
            <SidebarItem id="internships" icon="briefcase-outline" label="Internships" group="GFM" />

            {userRole === 'admin' && (
              <>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: COLORS.textLight, paddingHorizontal: 20, marginVertical: 10, marginTop: 20 }}>ADMIN</Text>
                <SidebarItem id="batch-config" icon="settings-outline" label="Batch Configuration" group="GFM" />
                <SidebarItem id="admin-reports" icon="document-text-outline" label="Admin Reports" group="Attendance" />
              </>
            )}
          </ScrollView>
        </View>

        {/* Content Area */}
        <View style={styles.contentArea}>
          {currentModule !== 'analytics' && currentModule !== 'attendance' && currentModule !== 'attendance-summary' && renderFilters()}

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ModuleRenderer
              currentModule={currentModule}
              teacherPrn={teacherPrn}
              teacherDept={teacherDept}
              students={students}
              searchQuery={searchQuery}
              gfmFilters={{ dept: gfmDeptFilter, year: gfmYearFilter, div: gfmDivFilter }}
              attFilters={{ dept: attDeptFilter, year: attYearFilter, div: attDivFilter }}
              courses={courses}
              semFilter={semFilter}
              activityTypeFilter={activityTypeFilter}
              onViewStudentDetails={setSelectedStudentForDetails}
              onViewAcademicRecord={setSelectedStudentForAcademicView}
              onPrintStudent={(s) => {
                setStudentForPrint(s);
                setPrintOptionsVisible(true);
              }}
              onQuickEdit={openQuickEdit}
              onRefresh={loadData}
              onViewDocument={handleViewDocument}
              yearsOfStudy={yearsOfStudy}
            />
          </ScrollView>
        </View>
      </View>

      {/* Modals */}
      <StudentDetailsModal
        visible={!!selectedStudentForDetails}
        student={selectedStudentForDetails}
        onClose={() => setSelectedStudentForDetails(null)}
        onViewDocument={handleViewDocument}
        onQuickEdit={openQuickEdit}
      />

      <AcademicViewModal
        visible={!!selectedStudentForAcademicView}
        student={selectedStudentForAcademicView}
        onClose={() => setSelectedStudentForAcademicView(null)}
      />

      <QuickEditModal
        visible={editModalVisible}
        section={editingSection}
        editData={editData}
        isSaving={isSaving}
        onClose={() => setEditModalVisible(false)}
        onSave={handleQuickSave}
        onDataChange={setEditData}
      />

      <PrintOptionsModal
        visible={printOptionsVisible}
        studentName={studentForPrint?.fullName || ''}
        options={printOptions}
        onOptionsChange={setPrintOptions}
        onClose={() => setPrintOptionsVisible(false)}
        onGenerate={() => {
          if (studentForPrint) {
            exportStudentPDF(studentForPrint, printOptions, setLoading);
            setPrintOptionsVisible(false);
          }
        }}
      />
    </View>
  );
}
