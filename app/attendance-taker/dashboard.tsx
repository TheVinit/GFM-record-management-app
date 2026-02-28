import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { DashboardHeader } from '../../components/common/DashboardHeader';
import { FilterModal } from '../../components/common/FilterModal';
import { ProfileMenu } from '../../components/common/ProfileMenu';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/colors';
import { DISPLAY_BRANCHES, DISPLAY_YEARS, getFullBranchName, getFullYearName } from '../../constants/Mappings';
import { clearSession, getSession } from '../../services/session.service';
import { supabase } from '../../services/supabase';
import {
  AttendanceRecord,
  AttendanceSession,
  createAttendanceSession,
  deleteAttendanceSession,
  getAttendanceRecords,
  getDistinctYearsOfStudy,
  getStudentsByDivision,
  saveAttendanceRecords,
  toCamelCase
} from '../../storage/sqlite';
import { getLocalDateString } from '../../utils/date';

const isWeb = Platform.OS === 'web';

type ViewMode = 'home' | 'add' | 'history';

export default function AttendanceTakerDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userName, setUserName] = useState('');
  const [lastSubmitted, setLastSubmitted] = useState<{
    session: AttendanceSession;
    absentCount: number;
    totalCount: number;
  } | null>(null);

  // Form state
  const [deptFilter, setDeptFilter] = useState('Computer Engineering');
  const [yearFilter, setYearFilter] = useState('Second Year');
  const [divFilter, setDivFilter] = useState('A');
  const [subBatchFilter, setSubBatchFilter] = useState(''); // '' = Whole Division, '1'/'2'/'3' = Sub-batch
  const [absentRollNos, setAbsentRollNos] = useState('');

  // Metadata
  const [yearsOfStudy, setYearsOfStudy] = useState<string[]>([]);
  const [completedDivisions, setCompletedDivisions] = useState<string[]>([]);

  // History state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [historySessions, setHistorySessions] = useState<AttendanceSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [sessionRecords, setSessionRecords] = useState<any[]>([]);
  const [sessionAllocations, setSessionAllocations] = useState<any[]>([]);
  const [sessionBatches, setSessionBatches] = useState<any[]>([]);

  // Suggestions state
  const [students, setStudents] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  // Modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    checkAuth();
    loadMetadata();
  }, []);

  useEffect(() => {
    if (yearFilter && deptFilter && divFilter) {
      checkCompletedDivisions();
      loadStudentsForSuggestions();
    }
  }, [yearFilter, deptFilter, divFilter, subBatchFilter, viewMode]);

  const loadStudentsForSuggestions = async () => {
    try {
      console.log(`🔍 Loading students for: ${deptFilter} ${yearFilter} Div ${divFilter}${subBatchFilter ? ` Sub-batch ${subBatchFilter}` : ''}`);

      // First, get all students for the division
      const { data, error } = await supabase
        .from('students')
        // Optimize: Select only necessary fields
        .select('prn, roll_no, full_name, branch, year_of_study, division')
        .eq('branch', deptFilter)
        .eq('year_of_study', yearFilter)
        .eq('division', divFilter)
        .order('prn');

      if (error) throw error;

      let studentsToShow = data || [];

      // If sub-batch is selected, filter by batch definition range
      if (subBatchFilter) {
        const { data: batchData } = await supabase
          .from('batch_definitions')
          .select('rbt_from, rbt_to')
          .eq('department', deptFilter)
          .eq('class', yearFilter)
          .eq('division', divFilter)
          .eq('sub_batch', subBatchFilter)
          .single();

        if (batchData) {
          const extractNum = (str: string) => {
            const match = String(str).match(/\d+$/);
            return match ? parseInt(match[0]) : NaN;
          };

          const fromNum = extractNum(batchData.rbt_from);
          const toNum = extractNum(batchData.rbt_to);

          studentsToShow = studentsToShow.filter((s: any) => {
            const rollNum = extractNum(s.roll_no || s.prn);
            if (isNaN(rollNum) || isNaN(fromNum) || isNaN(toNum)) return false;
            const seq = rollNum % 1000;
            const fSeq = fromNum % 1000;
            const tSeq = toNum % 1000;
            return seq >= fSeq && seq <= tSeq;
          });
        }
      }

      // Normalize and camelCase
      const processed = studentsToShow.map((s: any) => {
        const camel = toCamelCase(s);
        return {
          ...camel,
          rollNo: camel.rollNo || camel.roll_no || camel.prn
        };
      });

      console.log(`✅ Loaded ${processed.length} students for suggestions`);
      setStudents(processed);
    } catch (e) {
      console.error('❌ Error loading students for suggestions:', e);
    }
  };

  // Enhanced Roll No Suggestion Logic
  useEffect(() => {
    const parts = absentRollNos.split(/[,\s]+/);
    const lastPart = parts[parts.length - 1].toLowerCase();

    if (isFocused && students.length > 0) {
      const filtered = students
        .filter(s => {
          // Strict Context Check: Ensure student matches CURRENT filters
          const matchesContext =
            s.branch === deptFilter &&
            (s.yearOfStudy === yearFilter || s.year_of_study === yearFilter) &&
            s.division === divFilter;

          if (!matchesContext) return false;
          if (!lastPart) return true; // Show top results
          const rollNumber = s.rollNo || s.roll_no || '';
          const matchRoll = rollNumber.toString().toLowerCase().includes(lastPart);
          return matchRoll;
        })
        .map(s => ({ roll: s.rollNo || s.roll_no, name: s.fullName || s.full_name, prn: s.prn }))
        .slice(0, 10);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [absentRollNos, isFocused, students, deptFilter, yearFilter, divFilter]);

  const handleAbsentTextChange = (text: string) => {
    setAbsentRollNos(text);
  };

  const applySuggestion = (suggestion: any) => {
    const parts = absentRollNos.split(/,\s*/);
    // Use Full Roll No for display
    parts[parts.length - 1] = suggestion.roll;
    setAbsentRollNos(parts.filter(p => p.trim()).join(', ') + ', ');
    setSuggestions([]);
  };

  const checkCompletedDivisions = async () => {
    try {
      const today = getLocalDateString(); // Use local date, consistent with session creation
      console.log(`[AttendanceTaker] Checking completed divisions for date=${today}, year=${yearFilter}, dept=${deptFilter}`);
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('division')
        .eq('date', today)
        .eq('academic_year', yearFilter)
        .eq('department', deptFilter);

      if (error) throw error;
      const completed = data?.map(d => d.division) || [];
      console.log(`[AttendanceTaker] Completed divisions: [${completed.join(', ')}]`);
      setCompletedDivisions(completed);

      // If current division is completed, switch to next available one
      const available = ['A', 'B', 'C'].filter(d => !completed.includes(d));
      if (available.length > 0 && completed.includes(divFilter)) {
        setDivFilter(available[0]);
      }
    } catch (e) {
      console.error('Error checking completed divisions:', e);
    }
  };

  const checkAuth = async () => {
    const session = await getSession();
    if (!session || session.role !== 'attendance_taker') {
      router.replace('/');
    } else {
      setUserName(session.fullName || 'Attendance Taker');
      if (session.department) {
        // Convert abbreviation to full name if needed
        const fullDeptName = getFullBranchName(session.department);
        setDeptFilter(fullDeptName);
      }
    }
    setLoading(false);
  };

  const loadMetadata = async () => {
    const allYears = await getDistinctYearsOfStudy();
    setYearsOfStudy(allYears);

    if (allYears.length > 0 && (!yearFilter || !allYears.includes(yearFilter))) {
      // Default to FE (First Year) if available, else first year in list
      const firstYear = allYears.find(y => y === 'FE' || y.includes('1st')) || allYears[0];
      setYearFilter(firstYear);
    }
  };

  const handleLogout = async () => {
    await clearSession();
    router.replace('/');
  };


  const handleSubmitAttendance = async () => {
    if (!deptFilter || !yearFilter || !divFilter) {
      Alert.alert('Error', 'Please select Dept, Year and Division');
      return;
    }

    setSubmitting(true);
    try {
      const s = await getSession();
      if (!s) {
        console.error('[AttendanceTaker] No session found during submission');
        Alert.alert('Error', 'Your session has expired. Please log in again.');
        setSubmitting(false);
        return;
      }
      console.log('[AttendanceTaker] Starting submission for teacher:', s.id);
      console.log('[AttendanceTaker] Filters:', { deptFilter, yearFilter, divFilter, subBatchFilter });

      // 1. Fetch students for this division to map roll numbers
      const students = await getStudentsByDivision(deptFilter, yearFilter, divFilter, true);
      if (students.length === 0) {
        console.warn('[AttendanceTaker] No students found for selection');
        Alert.alert('Error', 'No students found for this selection');
        setSubmitting(false);
        return;
      }
      console.log(`[AttendanceTaker] Found ${students.length} students for mapping`);

      // 2. Parse absent roll numbers and normalize them
      const absentInput = absentRollNos
        .split(/[,\s]+/)
        .map(r => r.trim())
        .filter(r => r.length > 0);

      // 3. Create session with all required fields
      const batchLabel = subBatchFilter ? `${divFilter}${subBatchFilter}` : `Division ${divFilter}`;
      const newSession = await createAttendanceSession({
        teacherId: s.id,
        date: getLocalDateString(),
        academicYear: yearFilter,
        department: deptFilter,
        class: yearFilter,
        division: divFilter,
        batchName: batchLabel,
        rbtFrom: students[0]?.prn || '001',
        rbtTo: students[students.length - 1]?.prn || '999',
        locked: true
      });

      // 4. Create records - Map entered Roll Nos to Student PRNs
      const records: AttendanceRecord[] = students.map(student => {
        const studentPrnLower = student.prn.toLowerCase(); // Keep mapping for safety
        const rollNo = student.rollNo.toString().toLowerCase(); // Core check

        // Check if the student's Roll No matches any entry in the input
        const isAbsent = absentInput.some(input => {
          const lowerInput = input.toLowerCase();
          return lowerInput === rollNo; // Strict Roll No matching
        });

        return {
          sessionId: newSession.id,
          studentPrn: student.prn,
          status: isAbsent ? 'Absent' : 'Present',
          remark: ''
        };
      });

      const absentCount = records.filter(r => r.status === 'Absent').length;
      console.log(`[AttendanceTaker] Saving ${records.length} records (${absentCount} absent) for session ${newSession.id}`);
      console.log(`[AttendanceTaker] Session payload → dept=${deptFilter}, year=${yearFilter}, div=${divFilter}, date=${getLocalDateString()}, batch=${batchLabel}`);
      await saveAttendanceRecords(records);
      console.log('[AttendanceTaker] ✅ Successfully saved records to Supabase');

      setLastSubmitted({
        session: newSession,
        absentCount,
        totalCount: students.length
      });

      // Refresh completed divisions
      await checkCompletedDivisions();

      Alert.alert(
        '✅ Attendance Submitted',
        `${deptFilter} • ${yearFilter} • Div ${divFilter}${subBatchFilter ? ` (${batchLabel})` : ''}\n\n` +
        `Present: ${students.length - absentCount}\n` +
        `Absent: ${absentCount}\n\n` +
        `The record is now visible in the GFM portal.`
      );
      setAbsentRollNos('');
      // Do not reset viewMode to 'home' to keep year/dept selected
    } catch (e: any) {
      console.error('[AttendanceTaker] ❌ Submission failed:', e?.message || e);
      Alert.alert('Submission Failed', `Could not save attendance.\n\nError: ${e?.message || 'Unknown error'}\n\nPlease try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const loadHistory = async (date: Date) => {
    setLoadingHistory(true);
    try {
      const dateStr = getLocalDateString(date);
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('date', dateStr)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log(`[AttendanceTaker] Loaded ${data?.length || 0} history sessions for ${dateStr}`);
      setHistorySessions(data?.map(toCamelCase) || []);
      setSelectedSession(null);
      setSessionRecords([]);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const viewSessionDetails = async (session: AttendanceSession) => {
    setSelectedSession(session);
    setLoadingHistory(true);
    try {
      // 1. Fetch records using the robust view-based fetcher
      console.log(`[AttendanceTaker] Viewing details for session: ${session.id}`);
      const records = await getAttendanceRecords(session.id);
      const normalizedRecords = records.map(r => ({
        ...r,
        id: r.id || r.recordId,
        prn: r.prn || r.studentPrn,
        fullName: r.fullName || r.studentFullName,
        rollNo: r.rollNo || r.studentRollNo
      }));
      console.log(`[AttendanceTaker] Found ${normalizedRecords.length} records for session`);
      setSessionRecords(normalizedRecords);

      // 2. Fetch GFM Allocations for this session's context
      const { data: allocs, error } = await supabase
        .from('teacher_batch_configs')
        .select('*, profiles(full_name)')
        .eq('department', session.department)
        .eq('class', session.class)
        .eq('division', session.division)
        .eq('academic_year', session.academicYear);

      // 3. Fetch Batch Definitions for Ranges
      const { data: batches } = await supabase
        .from('batch_definitions')
        .select('*')
        .eq('department', session.department)
        .eq('class', session.class)
        .eq('division', session.division);

      if (!error) {
        setSessionAllocations(allocs || []);
        setSessionBatches(batches || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this attendance record? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoadingHistory(true);
            try {
              await deleteAttendanceSession(sessionId);
              Alert.alert('Success', 'Record deleted successfully');
              loadHistory(selectedDate);
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to delete record');
            } finally {
              setLoadingHistory(false);
            }
          }
        }
      ]
    );
  };

  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      loadHistory(date);
    }
  };

  const isSessionDeletable = (createdAt: string) => {
    const createdDate = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const diffHours = (now - createdDate) / (1000 * 60 * 60);
    return diffHours < 24;
  };

  const handleResetFilters = () => {
    setDeptFilter('Computer Engineering');
    setYearFilter('Second Year');
    setDivFilter('A');
    setSubBatchFilter('');
  };

  const renderHome = () => (
    <View style={styles.homeContainer}>
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeHeader}>
          <View>
            <Text style={styles.welcomeTitle}>Welcome Back</Text>
            <Text style={styles.welcomeSubtitle}>{userName}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userName.charAt(0)}</Text>
          </View>
        </View>

        {lastSubmitted && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{lastSubmitted.totalCount - lastSubmitted.absentCount}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{lastSubmitted.absentCount}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {Math.round(((lastSubmitted.totalCount - lastSubmitted.absentCount) / lastSubmitted.totalCount) * 100)}%
              </Text>
              <Text style={styles.statLabel}>Rate</Text>
            </View>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: COLORS.primary }]}
          onPress={() => {
            setViewMode('add');
            setShowFilterModal(true);
          }}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="add-circle" size={32} color={COLORS.white} />
          </View>
          <Text style={styles.actionTitle}>Take Attendance</Text>
          <Text style={styles.actionDesc}>Record new attendance for your class</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: COLORS.secondary }]}
          onPress={() => {
            setViewMode('history');
            loadHistory(selectedDate);
          }}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="calendar" size={32} color={COLORS.white} />
          </View>
          <Text style={styles.actionTitle}>View History</Text>
          <Text style={styles.actionDesc}>Check past attendance records</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAddForm = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Current Batch Summary */}
        <View style={styles.batchSummaryCard}>
          <View style={styles.batchHeader}>
            <Text style={styles.batchTitle}>Current Batch</Text>
            <TouchableOpacity
              style={styles.changeBatchBtn}
              onPress={() => setShowFilterModal(true)}
            >
              <Text style={styles.changeBatchText}>Change</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.tagsContainer}>
            <View style={styles.tag}>
              <Ionicons name="business" size={14} color={COLORS.textSecondary} />
              <Text style={styles.tagText}>{deptFilter}</Text>
            </View>
            <View style={styles.tag}>
              <Ionicons name="school" size={14} color={COLORS.textSecondary} />
              <Text style={styles.tagText}>{yearFilter}</Text>
            </View>
            <View style={styles.tag}>
              <Ionicons name="people" size={14} color={COLORS.textSecondary} />
              <Text style={styles.tagText}>Div {divFilter}</Text>
            </View>
            {subBatchFilter ? (
              <View style={[styles.tag, styles.activeTag]}>
                <Ionicons name="layers" size={14} color={COLORS.primary} />
                <Text style={[styles.tagText, { color: COLORS.primary }]}>Batch {divFilter}{subBatchFilter}</Text>
              </View>
            ) : (
              <View style={styles.tag}>
                <Ionicons name="layers" size={14} color={COLORS.textSecondary} />
                <Text style={styles.tagText}>Whole Class</Text>
              </View>
            )}
          </View>
        </View>

        {lastSubmitted && (
          <View style={styles.lastSubmittedCard}>
            <View style={styles.lastSubmittedHeader}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.lastSubmittedTitle}>Last Submission Success</Text>
            </View>
            <View style={styles.lastSubmittedDetails}>
              <Text style={styles.lastSubmittedText}>
                Class: <Text style={{ fontWeight: 'bold' }}>{getFullBranchName(lastSubmitted.session.department)} {getFullYearName(lastSubmitted.session.class)} ({lastSubmitted.session.division})</Text>
              </Text>
              <Text style={styles.lastSubmittedText}>
                Stats: <Text style={{ color: COLORS.success, fontWeight: 'bold' }}>{lastSubmitted.totalCount - lastSubmitted.absentCount} Present</Text>, {' '}
                <Text style={{ color: COLORS.error, fontWeight: 'bold' }}>{lastSubmitted.absentCount} Absent</Text>
              </Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mark Attendance</Text>

          {completedDivisions.length >= 3 ? (
            <View style={styles.completedBanner}>
              <Ionicons name="checkmark-done-circle" size={24} color={COLORS.success} />
              <Text style={styles.completedText}>All divisions (A, B, C) recorded for today.</Text>
            </View>
          ) : (
            <>
              {completedDivisions.includes(divFilter) && !subBatchFilter && (
                <View style={styles.warningBanner}>
                  <Ionicons name="alert-circle" size={20} color={COLORS.warning} />
                  <Text style={styles.warningText}>Division {divFilter} already recorded today.</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Absent Roll Numbers</Text>
                <Text style={styles.helperText}>Enter Full Roll No (e.g. CS2401, CS2405)</Text>

                {/* Suggestions rendered ABOVE the input so keyboard never hides them */}
                {suggestions.length > 0 && (
                  <View style={styles.suggestionBox}>
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                      style={{ maxHeight: 200 }}
                    >
                      {suggestions.map((s: any, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.suggestionItem}
                          onPress={() => applySuggestion(s)}
                        >
                          <View style={styles.suggestionInfo}>
                            <Text style={styles.suggestionText}>{s.roll}</Text>
                            <Text style={styles.suggestionName}>{s.name}</Text>
                          </View>
                          <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <TextInput
                  style={styles.textInput}
                  placeholder="Type roll no to search & add..."
                  value={absentRollNos}
                  onChangeText={handleAbsentTextChange}
                  onFocus={() => {
                    setIsFocused(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setIsFocused(false);
                    }, 300);
                  }}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (submitting || (completedDivisions.includes(divFilter) && !subBatchFilter)) && { opacity: 0.7 }
                ]}
                onPress={handleSubmitAttendance}
                disabled={submitting || (completedDivisions.includes(divFilter) && !subBatchFilter)}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>Submit Record</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderHistory = () => (
    <View style={styles.historyContainer}>
      <TouchableOpacity
        style={styles.datePickerBtn}
        onPress={() => setShowDatePicker(true)}
      >
        <Ionicons name="calendar" size={20} color={COLORS.primary} />
        <Text style={styles.dateText}>{selectedDate.toDateString()}</Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {showDatePicker && (
        isWeb ? (
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => {
              const date = new Date(e.target.value);
              if (!isNaN(date.getTime())) {
                onDateChange({}, date);
              }
            }}
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              marginTop: '10px',
              marginBottom: '20px',
              width: '100%',
              fontFamily: 'inherit'
            }}
          />
        ) : (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )
      )}

      {loadingHistory ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : selectedSession ? (
        <ScrollView style={styles.content}>
          <View style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <TouchableOpacity
                style={styles.changeBatchBtn}
                onPress={() => setSelectedSession(null)}
              >
                <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                <Text style={styles.changeBatchText}>Back</Text>
              </TouchableOpacity>

              {isSessionDeletable(selectedSession.createdAt) && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteSession(selectedSession.id)}
                >
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.sessionTitle}>
                {getFullBranchName(selectedSession.department)}
              </Text>
              <Text style={styles.sessionSubtitle}>
                {getFullYearName(selectedSession.class)} - Div {selectedSession.division}
              </Text>
              <Text style={styles.helperText}>
                {new Date(selectedSession.createdAt).toLocaleTimeString()}
              </Text>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{sessionRecords.length - sessionRecords.filter(r => r.status === 'Absent').length}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: COLORS.error }]}>{sessionRecords.filter(r => r.status === 'Absent').length}</Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
            </View>
          </View>

          {/* Student List */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Student Records</Text>
            {sessionRecords.map((item, index) => {
              const studentName = item.fullName || item.studentFullName || 'Unknown';
              const studentRoll = item.rollNo || item.studentRollNo || item.prn || 'N/A';
              const isAbsent = item.status === 'Absent';
              return (
                <View key={index} style={styles.studentItem}>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{studentName}</Text>
                    <Text style={styles.studentRoll}>{studentRoll}</Text>
                  </View>
                  <View style={[styles.statusBadge, isAbsent ? styles.absentBadge : styles.presentBadge]}>
                    <Text style={[styles.statusText, { color: isAbsent ? COLORS.error : COLORS.success }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Batch-wise Summary */}
          <View style={[styles.card, { marginBottom: 100 }]}>
            <Text style={styles.sectionTitle}>Batch-wise Absentee Summary</Text>
            {sessionAllocations.length === 0 ? (
              <Text style={styles.emptyText}>No GFM allocations found.</Text>
            ) : (
              sessionAllocations.map((alloc, idx) => {
                const batchDef = sessionBatches.find(b => b.sub_batch === alloc.batch_name || b.batch_name === alloc.batch_name);

                let absentees: any[] = [];
                let rangeText = '';

                if (batchDef) {
                  const extractNum = (str: any) => parseInt(String(str).match(/\d+$/)?.[0] || '0');
                  const fromNum = extractNum(batchDef.rbt_from);
                  const toNum = extractNum(batchDef.rbt_to);
                  rangeText = `(${batchDef.rbt_from} - ${batchDef.rbt_to})`;

                  absentees = sessionRecords.filter(r => {
                    if (r.status !== 'Absent') return false;
                    const roll = extractNum(r.rollNo || r.prn);
                    const seq = roll % 1000;
                    const fSeq = fromNum % 1000;
                    const tSeq = toNum % 1000;
                    return seq >= fSeq && seq <= tSeq;
                  });
                }

                return (
                  <View key={idx} style={styles.batchSummaryCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                      <Text style={[styles.sessionSubtitle, { fontWeight: 'bold', color: COLORS.primary }]}>
                        {alloc.batch_name} {rangeText}
                      </Text>
                      <Text style={styles.sessionSubtitle}>{alloc.profiles?.full_name || 'No GFM'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: COLORS.error, fontWeight: 'bold' }}>
                        Absentees: {absentees.length}
                      </Text>
                    </View>
                    {absentees.length > 0 && (
                      <Text style={[styles.helperText, { marginTop: 4, color: COLORS.text }]}>
                        {absentees.map(r => r.rollNo || r.prn).join(', ')}
                      </Text>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.content}>
          {historySessions.length === 0 ? (
            <Text style={styles.emptyText}>No records found for this date.</Text>
          ) : (
            historySessions.map((session) => (
              <TouchableOpacity
                key={session.id}
                style={styles.sessionCard}
                onPress={() => viewSessionDetails(session)}
              >
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle}>
                      {getFullBranchName(session.department)}
                    </Text>
                    <Text style={styles.sessionSubtitle}>
                      {getFullYearName(session.class)} • Div {session.division}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                </View>
                <Text style={styles.helperText}>
                  {new Date(session.createdAt).toLocaleTimeString()}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <DashboardHeader
        title={viewMode === 'home' ? 'Attendance Portal' : viewMode === 'add' ? 'Take Attendance' : 'History'}
        subtitle="Attendance Control"
        onProfilePress={() => setShowProfileMenu(true)}
        leftIcon={viewMode !== 'home' ? 'arrow-back' : undefined}
        onLeftPress={() => setViewMode('home')}
        rightElement={viewMode === 'add' && (
          <TouchableOpacity
            onPress={() => setShowFilterModal(true)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.15)',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Ionicons name="filter" size={22} color={COLORS.white} />
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          {viewMode === 'home' && renderHome()}
          {viewMode === 'add' && renderAddForm()}
          {viewMode === 'history' && renderHistory()}
        </View>
      )}

      {/* Modals */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={() => setShowFilterModal(false)}
        onReset={handleResetFilters}
        department={deptFilter}
        onDepartmentChange={setDeptFilter}
        departments={DISPLAY_BRANCHES}
        year={yearFilter}
        onYearChange={setYearFilter}
        years={DISPLAY_YEARS}
        division={divFilter}
        onDivisionChange={setDivFilter}
        divisions={['A', 'B', 'C'].map(d => ({ label: d, value: d }))}
        showSubBatch={true}
        subBatch={subBatchFilter}
        onSubBatchChange={(v) => {
          setSubBatchFilter(v);
          setAbsentRollNos('');
        }}
        disabledDivisions={completedDivisions}
      />

      <ProfileMenu
        visible={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        userName={userName}
        menuItems={[
          {
            label: 'Home',
            icon: 'home-outline',
            onPress: () => setViewMode('home'),
          },
          {
            label: 'Attendance History',
            icon: 'calendar-outline',
            onPress: () => {
              setViewMode('history');
              loadHistory(selectedDate);
            },
          },
          {
            label: 'Logout',
            icon: 'log-out-outline',
            onPress: handleLogout,
            color: COLORS.error,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.body,
  },
  // Home Styles
  homeContainer: {
    padding: SPACING.lg,
  },
  welcomeCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.md,
    marginBottom: SPACING.xl,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  welcomeTitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.white,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.borderLight,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    marginBottom: SPACING.md,
    marginLeft: SPACING.xs,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionCard: {
    flex: 1,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'flex-start',
    ...SHADOWS.md,
    height: 160,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  actionTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  actionDesc: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 16,
  },

  // Form Styles
  formContent: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  batchSummaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  batchTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
  },
  changeBatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  changeBatchText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeTag: {
    backgroundColor: COLORS.infoLight,
    borderColor: COLORS.primary,
  },
  tagText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  cardTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  helperText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    color: COLORS.text,
  },
  suggestionBox: {
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    ...SHADOWS.md,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.text,
  },
  suggestionName: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  submitBtnText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  },
  lastSubmittedCard: {
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  lastSubmittedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  lastSubmittedTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.success,
  },
  lastSubmittedDetails: {
    gap: 4,
  },
  lastSubmittedText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },

  // Utility
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.successLight,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  completedText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.success,
    flex: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.warningLight,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  warningText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.warning,
    flex: 1,
  },

  // History Styles (Keeping basic structure but reusing constants)
  historyContainer: {
    padding: SPACING.lg,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  dateText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  sessionCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    marginBottom: 4,
  },
  sessionSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  deleteBtn: {
    padding: SPACING.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  statBox: {
    alignItems: 'flex-start',
  },
  statNumber: {
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
  },
  statLabelSmall: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  loadingHistory: {
    marginTop: SPACING.xl,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: SPACING.xl,
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.body,
  },
  // Student List Styles
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.white,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    fontWeight: '600',
  },
  studentRoll: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  presentBadge: {
    backgroundColor: COLORS.successLight,
  },
  absentBadge: {
    backgroundColor: COLORS.errorLight,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});
