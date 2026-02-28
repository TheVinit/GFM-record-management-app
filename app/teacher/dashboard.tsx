import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { supabase } from '../../services/supabase';
import {
  CourseDef,
  getAllCoursesDef,
  getAllStudents,
  getDistinctYearsOfStudy,
  getTeacherBatchConfig,
  saveStudentInfo,
  Student,
  updateLocalVerificationStatus,
  validateName
} from '../../storage/sqlite';

import { COLORS } from '../../constants/colors';
import { BRANCH_MAPPINGS, DISPLAY_YEARS, YEAR_MAPPINGS } from '../../constants/Mappings';
import { clearSession, getSession } from '../../services/session.service';

import { ChangePasswordModal } from '../../components/ChangePasswordModal';
import { DashboardHeader } from '../../components/common/DashboardHeader';
import { FilterModal } from '../../components/common/FilterModal';
import { ProfileMenu } from '../../components/common/ProfileMenu';
import { AcademicViewModal } from '../../components/teacher/AcademicViewModal';
import { styles } from '../../components/teacher/dashboard.styles';
import { exportStudentPDF, handleViewDocument } from '../../components/teacher/dashboard.utils';
import { ModuleRenderer } from '../../components/teacher/ModuleRenderer';
import { PrintOptionsModal } from '../../components/teacher/PrintOptionsModal';
import { QuickEditModal } from '../../components/teacher/QuickEditModal';
import { StudentDetailsModal } from '../../components/teacher/StudentDetailsModal';

const isWeb = Platform.OS === 'web';

type Module = 'courses' | 'students' | 'academic' | 'fees' | 'activities' | 'achievements' | 'internships' | 'analytics' | 'attendance' | 'attendance-summary' | 'admin-reports' | 'batch-info' | 'manage-staff' | 'daily-attendance' | 'register-student';

export default function TeacherDashboard() {
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams();
  const initialModuleParam = params?.module as Module | undefined;

  const [currentModule, setCurrentModule] = useState<Module>('analytics');
  const [activeModuleGroup, setActiveModuleGroup] = useState<'Attendance' | 'GFM' | 'ADMIN'>('Attendance');
  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState('');
  const [teacherPrn, setTeacherPrn] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherDept, setTeacherDept] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [allStudentsData, setAllStudentsData] = useState<Student[]>([]); // Cache for filtering
  const [courses, setCourses] = useState<CourseDef[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [isFirstLoginSession, setIsFirstLoginSession] = useState(false);

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(Platform.OS === 'web' && width > 1024 ? false : true);
  const [batchConfig, setBatchConfig] = useState<any>(null);

  // Animation
  const sidebarTranslateX = useRef(new Animated.Value(-260)).current;

  useEffect(() => {
    if (isSidebarCollapsed) {
      Animated.timing(sidebarTranslateX, {
        toValue: -260,
        duration: 300,
        useNativeDriver: true, // simplified
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }).start();
    } else {
      Animated.timing(sidebarTranslateX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }).start();
    }
  }, [isSidebarCollapsed]);

  // Filters
  const [gfmDeptFilter, setGfmDeptFilter] = useState('Computer Engineering');
  const [gfmYearFilter, setGfmYearFilter] = useState('All');
  const [gfmDivFilter, setGfmDivFilter] = useState('All');
  const [attDeptFilter, setAttDeptFilter] = useState('Computer Engineering');

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [attYearFilter, setAttYearFilter] = useState('All');
  const [attDivFilter, setAttDivFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [semFilter, setSemFilter] = useState<number | 'All'>('All');
  const [activityTypeFilter, setActivityTypeFilter] = useState<'All' | 'Extra-curricular' | 'Co-curricular' | 'Courses'>('All');
  const [showFilterModal, setShowFilterModal] = useState(false);

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
    setTeacherId(session.id);
    setTeacherPrn(session.prn ?? '');
    setTeacherName(session.fullName ?? '');
    setTeacherDept(session.department ?? '');
    setUserRole(session.role ?? '');
    setUserEmail(session.email ?? '');

    // CHECK FOR FIRST LOGIN
    if (session.firstLogin) {
      setIsFirstLoginSession(true);
      setShowChangePassword(true);
    }

    if (session.role === 'admin') {
      const defaultModule = initialModuleParam || 'admin-reports';
      setCurrentModule(defaultModule);
      setActiveModuleGroup('ADMIN');
    } else if (initialModuleParam) {
      setCurrentModule(initialModuleParam);
    }
    loadData(session.role, session.prn, session.id);
  };

  const loadYears = async () => {
    const years = await getDistinctYearsOfStudy();
    setYearsOfStudy(years);
  };

  useEffect(() => {
    if (userRole) {
      loadData();
    }
  }, [attDeptFilter, attYearFilter, attDivFilter, gfmDeptFilter, gfmYearFilter, gfmDivFilter, activeModuleGroup]);

  const loadData = async (roleOverride?: string, prnOverride?: string, idOverride?: string) => {
    // Only show loading spinner if we don't have data yet
    const needsFetch = allStudentsData.length === 0;
    if (needsFetch) setLoading(true);

    try {
      let sourceData = allStudentsData;

      const session = await getSession();
      const tId = idOverride || session?.id || teacherId;

      if (needsFetch) {
        sourceData = await getAllStudents();
        setAllStudentsData(sourceData);
        const allCourses = await getAllCoursesDef();
        setCourses(allCourses);

        // Fetch batch assignment
        const config = await getTeacherBatchConfig(tId);
        setBatchConfig(config);
      }

      const role = roleOverride || session?.role || userRole;
      const prn = prnOverride || session?.prn || teacherPrn;
      const name = session?.fullName || teacherName;

      let filtered = sourceData;
      if (role === 'teacher') {
        // Strict filtering: If batch config exists, use it as primary filter.
        // Otherwise fallback to direct GFM assignment.
        // Re-using the config fetched (or from state if not fetched now, but strictness might require caching config too? 
        // batchConfig state might be stale if we didn't fetch it. 
        // For Filter UI optimization, we assume config doesn't change often.
        // If needsFetch is false, we use existing batchConfig from state.
        const currentConfig = needsFetch ? (await getTeacherBatchConfig(tId)) : batchConfig;

        filtered = sourceData.filter(s => {
          if (currentConfig) {
            const matchDept = s.branch === currentConfig.department;

            // Normalize year (e.g., 'SE' and 'Second Year' both become 'Second Year')
            const normalizedConfigYear = YEAR_MAPPINGS[currentConfig.class] || currentConfig.class;
            const normalizedStudentYear = YEAR_MAPPINGS[s.yearOfStudy] || s.yearOfStudy;
            const matchYear = normalizedConfigYear === normalizedStudentYear;

            // Normalize division (e.g., 'A2' becomes 'A')
            const configMainDiv = currentConfig.division ? currentConfig.division[0].toUpperCase() : '';
            const studentMainDiv = s.division ? s.division[0].toUpperCase() : '';
            const matchDiv = configMainDiv === studentMainDiv;

            if (matchDept && matchYear && matchDiv) {
              const extractNum = (str: string) => {
                const match = String(str).match(/\d+$/);
                return match ? parseInt(match[0]) : NaN;
              };

              // Use rollNo if available, fallback to PRN
              const rollNoStr = s.rollNo || (s as any).roll_no || s.prn;
              const studentNum = extractNum(rollNoStr);
              const fromVal = extractNum(currentConfig.rbtFrom);
              const toVal = extractNum(currentConfig.rbtTo);

              if (!isNaN(studentNum) && !isNaN(fromVal) && !isNaN(toVal)) {
                // Handle sequence part (e.g., 28 from CS2428 or 028 from RBT...028)
                const sSeq = studentNum % 1000;
                const fSeq = fromVal % 1000;
                const tSeq = toVal % 1000;
                return sSeq >= fSeq && sSeq <= tSeq;
              }
            }
            return false;
          }

          // Fallback to direct GFM match if no batch config
          const isGfmForStudent = (s.gfmId && (s.gfmId === prn || s.gfmId === tId)) ||
            (s.gfmName && name && s.gfmName.toLowerCase() === name.toLowerCase());

          return isGfmForStudent;
        });
      } else if (role === 'admin') {
        // Admin filtering logic
        const isAttendance = activeModuleGroup === 'Attendance' || currentModule === 'admin-reports';
        const dept = isAttendance ? attDeptFilter : gfmDeptFilter;
        const year = isAttendance ? attYearFilter : gfmYearFilter;
        const div = isAttendance ? attDivFilter : gfmDivFilter;

        filtered = sourceData.filter(s => {
          const matchDept = dept === 'All' || s.branch === dept;
          const normalizedStudentYear = YEAR_MAPPINGS[s.yearOfStudy] || s.yearOfStudy;
          const matchYear = year === 'All' || normalizedStudentYear === year;
          const matchDiv = div === 'All' || (s.division && s.division.startsWith(div));
          return matchDept && matchYear && matchDiv;
        });
      }

      setStudents(filtered);
      setFilteredStudents(filtered);
    } catch (e) {
      console.error(e);
    } finally {
      if (needsFetch) setLoading(false);
    }
  };

  const handleLogout = async () => {
    const logout = async () => {
      await clearSession();
      router.replace('/');
    };

    if (isWeb) {
      if (window.confirm("Are you sure you want to logout?")) logout();
    } else {
      Alert.alert("Logout", "Are you sure?", [
        { text: "Cancel" },
        { text: "Logout", style: "destructive", onPress: logout }
      ]);
    }
  };

  const openQuickEdit = (student: Student, section: string) => {
    setEditingStudent(student);
    setEditingSection(section);
    setEditData({ ...student });
    setEditModalVisible(true);
  };

  const handleQuickSave = async () => {
    // Validation before saving
    if (editingSection === 'Personal Information') {
      if (!validateName(editData.fullName)) {
        Alert.alert('Invalid Name', 'Full Name must only contain alphabets, dots, or hyphens (2-50 chars).');
        return;
      }
    } else if (editingSection === 'Family Details') {
      if (editData.fatherName && !validateName(editData.fatherName)) {
        Alert.alert('Invalid Name', "Father's Name must be alphabetic.");
        return;
      }
      if (editData.motherName && !validateName(editData.motherName)) {
        Alert.alert('Invalid Name', "Mother's Name must be alphabetic.");
        return;
      }
    } else if (editingSection === 'Contact & Address') {
      if (editData.phone && editData.phone.length !== 10) {
        Alert.alert('Invalid Phone', 'Phone number must be 10 digits.');
        return;
      }
    }

    setIsSaving(true);
    try {
      await saveStudentInfo(editData);
      Alert.alert('Success', `${editingSection} updated successfully`);
      setEditModalVisible(false);
      loadData();
      if (selectedStudentForDetails && selectedStudentForDetails.prn === editData.prn) {
        setSelectedStudentForDetails(editData);
      }
    } catch (e: any) {
      console.error('Error updating student:', e);
      const errorMsg = e?.message || e?.code || 'Failed to update student information';
      Alert.alert('Database Error', `Could not save changes: ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerify = async (table: string, idOrPrn: any, status: string) => {
    try {
      const cleanId = String(idOrPrn).trim();
      if (!cleanId || cleanId === 'undefined' || cleanId === 'null') {
        console.error(`[Verification] Aborting - Invalid ID received: "${idOrPrn}"`);
        Alert.alert('Error', 'Invalid record ID. Please refresh and try again.');
        return;
      }

      const idField = table === 'students' ? 'prn' : 'id';
      const updateData: any = {
        verification_status: status,
        verified_by: teacherName,
      };

      if (table === 'students') {
        updateData.last_updated = new Date().toISOString();
      }

      // If it's not student table, ID is likely a bigint/number
      const queryId = table === 'students' ? cleanId : parseInt(cleanId);

      if (table !== 'students' && isNaN(queryId as number)) {
        throw new Error(`Critical Error: ID "${cleanId}" is not a valid number for table ${table}`);
      }

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq(idField, queryId);

      if (error) throw error;

      // Update local storage for immediate UI reflect
      await updateLocalVerificationStatus(table, idOrPrn, status, teacherName);

      Alert.alert('Success', `Verification status updated for ${table}`);
      loadData();
    } catch (e: any) {
      console.error('[Verification] Error:', e);
      Alert.alert('Error', 'Failed to update verification status');
    }
  };

  const SidebarItem = ({ id, icon, label, group }: { id: Module, icon: any, label: string, group: 'Attendance' | 'GFM' | 'ADMIN' }) => {
    const isActive = currentModule === id;
    const isMobile = Platform.OS !== 'web' || width <= 800;

    return (
      <TouchableOpacity
        style={[
          styles.sidebarItem,
          isActive && styles.sidebarItemActive,
          isMobile && styles.sidebarItemMobile
        ]}
        onPress={() => {
          setCurrentModule(id);
          setActiveModuleGroup(group);
          // Auto-close sidebar on mobile after selection
          if (isMobile) {
            setIsSidebarCollapsed(true);
          }
        }}
      >
        <Ionicons name={icon} size={isMobile ? 24 : 22} color={isActive ? '#fff' : COLORS.textSecondary} />
        {/* Show label on mobile when sidebar is open, or always on desktop */}
        {(isMobile || !isSidebarCollapsed) && (
          <Text style={[
            styles.sidebarText,
            isActive && styles.sidebarTextActive,
            isMobile && styles.sidebarTextMobile
          ]}>
            {label}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderFilters = () => {
    return (
      <View style={[styles.filterContainer, { paddingHorizontal: 20, marginBottom: 15 }]}>
        <View style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#fff',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: COLORS.border,
          height: 45,
          paddingHorizontal: 10
        }}>
          <Ionicons name="search-outline" size={20} color={COLORS.textLight} />
          <TextInput
            style={{ flex: 1, marginLeft: 10, fontSize: 16, color: COLORS.text }}
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
      <DashboardHeader
        title={teacherName}
        subtitle="Teacher Dashboard • GFM"
        onProfilePress={() => setShowProfileMenu(true)}
        leftIcon={isSidebarCollapsed ? "grid-outline" : "close-outline"}
        onLeftPress={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        photoUri={undefined} // Add photoUri if available in session
      />

      <View style={styles.mainContent}>
        {/* Sidebar */}

        {/* Sidebar Overlay (Backdrop) */}
        {!isSidebarCollapsed && (
          <TouchableOpacity
            style={styles.sidebarBackdrop}
            activeOpacity={1}
            onPress={() => setIsSidebarCollapsed(true)}
          />
        )}

        {/* Animated Sidebar */}
        <Animated.View style={[styles.sidebar, { transform: [{ translateX: sidebarTranslateX }] }]}>
          <ScrollView>
            {userRole === 'teacher' && (
              <>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: COLORS.textLight, paddingHorizontal: 20, marginVertical: 10, marginTop: 20 }}>GFM TOOLS</Text>
                <SidebarItem id="batch-info" icon="information-circle-outline" label="My Batch Info" group="GFM" />
                <SidebarItem id="students" icon="people-outline" label="My Students" group="GFM" />
                <SidebarItem id="academic" icon="school-outline" label="Academic Data" group="GFM" />
                <SidebarItem id="fees" icon="card-outline" label="Fee Status" group="GFM" />
                <SidebarItem id="activities" icon="layers-outline" label="Activities" group="GFM" />
                <SidebarItem id="achievements" icon="trophy-outline" label="Achievements" group="GFM" />
                <SidebarItem id="internships" icon="briefcase-outline" label="Internships" group="GFM" />
                <SidebarItem id="analytics" icon="analytics-outline" label="Batch Analytics" group="GFM" />

                <Text style={{ fontSize: 11, fontWeight: 'bold', color: COLORS.textLight, paddingHorizontal: 20, marginVertical: 10, marginTop: 20 }}>ATTENDANCE</Text>
                <SidebarItem id="attendance-summary" icon="list-outline" label="Attendance Log" group="Attendance" />
              </>
            )}

            {userRole === 'admin' && (
              <>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: COLORS.textLight, paddingHorizontal: 20, marginVertical: 10, marginTop: 20 }}>MONITORING</Text>
                <SidebarItem id="daily-attendance" icon="calendar-outline" label="Today Status" group="ADMIN" />
                <SidebarItem id="admin-reports" icon="stats-chart-outline" label="Attendance History" group="ADMIN" />

                <Text style={{ fontSize: 11, fontWeight: 'bold', color: COLORS.textLight, paddingHorizontal: 20, marginVertical: 10, marginTop: 20 }}>REGISTRATION</Text>
                <SidebarItem id="register-student" icon="person-add-outline" label="Add Students" group="ADMIN" />
                <SidebarItem id="students" icon="people-outline" label="Student Database" group="ADMIN" />

                <Text style={{ fontSize: 11, fontWeight: 'bold', color: COLORS.textLight, paddingHorizontal: 20, marginVertical: 10, marginTop: 20 }}>ADMIN TOOLS</Text>
                <SidebarItem id="fees" icon="card-outline" label="Fee Monitoring" group="ADMIN" />
                <SidebarItem id="manage-staff" icon="people-circle-outline" label="Manage Staff" group="ADMIN" />
                <SidebarItem id="courses" icon="book-outline" label="Course Config" group="ADMIN" />
              </>
            )}
          </ScrollView>
        </Animated.View>

        {/* Content Area */}
        <View style={styles.contentArea} role="main" aria-label="Teacher Dashboard Content">
          {currentModule !== 'analytics' && currentModule !== 'attendance' && currentModule !== 'attendance-summary' && currentModule !== 'admin-reports' && currentModule !== 'manage-staff' && currentModule !== 'daily-attendance' && currentModule !== 'register-student' && currentModule !== 'students' && renderFilters()}

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
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
              onPrintStudent={(s: Student) => {
                setStudentForPrint(s);
                setPrintOptionsVisible(true);
              }}
              onQuickEdit={openQuickEdit}
              onRefresh={loadData}
              onViewDocument={handleViewDocument}
              handleVerify={handleVerify}
              yearsOfStudy={yearsOfStudy}
              batchConfig={batchConfig}
              router={router}
            />
          </ScrollView>
        </View>
      </View>

      {/* Modals */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={() => setShowFilterModal(false)}
        onReset={() => {
          if (activeModuleGroup === 'Attendance') {
            setAttDeptFilter('All'); setAttYearFilter('All'); setAttDivFilter('All');
          } else {
            setGfmDeptFilter('All'); setGfmYearFilter('All'); setGfmDivFilter('All');
          }
          setSearchQuery('');
        }}
        department={activeModuleGroup === 'Attendance' ? attDeptFilter : gfmDeptFilter}
        onDepartmentChange={activeModuleGroup === 'Attendance' ? setAttDeptFilter : setGfmDeptFilter}
        departments={[{ label: 'All', value: 'All' }, ...Object.keys(BRANCH_MAPPINGS).map(k => ({ label: BRANCH_MAPPINGS[k], value: k }))]}
        year={activeModuleGroup === 'Attendance' ? attYearFilter : gfmYearFilter}
        onYearChange={activeModuleGroup === 'Attendance' ? setAttYearFilter : setGfmYearFilter}
        years={[{ label: 'All', value: 'All' }, ...DISPLAY_YEARS]}
        division={activeModuleGroup === 'Attendance' ? attDivFilter : gfmDivFilter}
        onDivisionChange={activeModuleGroup === 'Attendance' ? setAttDivFilter : setGfmDivFilter}
        divisions={['All', 'A', 'B', 'C'].map(d => ({ label: d, value: d }))}
      />

      <ProfileMenu
        visible={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        userName={teacherName}
        userEmail={userEmail}
        menuItems={[
          { icon: 'key-outline', label: 'Change Password', onPress: () => setShowChangePassword(true) },
          { icon: 'log-out-outline', label: 'Logout', onPress: handleLogout, color: COLORS.error }
        ]}
      />

      <StudentDetailsModal
        visible={!!selectedStudentForDetails}
        student={selectedStudentForDetails}
        onClose={() => setSelectedStudentForDetails(null)}
        onExportPDF={(student: Student, options: any) => exportStudentPDF(student, options, setLoading)}
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
        setEditData={setEditData}
      />

      <PrintOptionsModal
        visible={printOptionsVisible}
        student={studentForPrint}
        printOptions={printOptions}
        setPrintOptions={setPrintOptions}
        onClose={() => setPrintOptionsVisible(false)}
        onGenerate={() => {
          if (studentForPrint) {
            exportStudentPDF(studentForPrint, printOptions, setLoading);
            setPrintOptionsVisible(false);
          }
        }}
      />
      <ChangePasswordModal
        visible={showChangePassword}
        userEmail={userEmail}
        userId={teacherId}
        userPrn={teacherPrn}
        userRole="teacher"
        onSuccess={() => {
          setShowChangePassword(false);
          setIsFirstLoginSession(false);
          Alert.alert('Success', 'Password updated successfully');
        }}
        onClose={isFirstLoginSession ? undefined : () => setShowChangePassword(false)}
        isFirstLogin={isFirstLoginSession}
      />
    </View>
  );
}
