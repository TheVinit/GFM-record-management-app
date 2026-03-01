import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker'; // Added missing Picker import
import { useRouter } from 'expo-router';
import Papa from 'papaparse';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import * as XLSX from 'xlsx';
import { FilterModal } from '../../components/common/FilterModal';
import { COLORS } from '../../constants/colors';
import { DISPLAY_BRANCHES, DISPLAY_YEARS, getFullBranchName, getFullYearName } from '../../constants/Mappings';
import { getSession } from '../../services/session.service';
import { deleteStudent, getAllStudents, getDistinctYearsOfStudy, saveStudent, Student } from '../../storage/sqlite';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

export default function ManageStudents() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [newStudent, setNewStudent] = useState({
    prn: '',
    fullName: '',
    email: '',
    phone: '',
    rollNo: '',
    parentMobile: '',
    branch: 'Computer Engineering',
    yearOfStudy: 'First Year',
    division: 'A'
  });

  const [yearsOfStudy, setYearsOfStudy] = useState<string[]>([]);

  // Filtering State
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  // Filters
  const [deptFilter, setDeptFilter] = useState('Computer Engineering');
  const [yearFilter, setYearFilter] = useState('All');
  const [divFilter, setDivFilter] = useState('All');

  useEffect(() => {
    filterStudents();
  }, [searchQuery, deptFilter, yearFilter, divFilter, students]);

  const filterStudents = () => {
    let result = students;

    // Filter by Dept
    if (deptFilter !== 'All') {
      result = result.filter(s => s.branch && s.branch.toLowerCase() === deptFilter.toLowerCase());
    }
    // Filter by Year
    if (yearFilter !== 'All') {
      result = result.filter(s => s.yearOfStudy === yearFilter);
    }
    // Filter by Division
    if (divFilter !== 'All') {
      result = result.filter(s => s.division === divFilter);
    }
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.fullName.toLowerCase().includes(q) ||
        s.prn.toString().includes(q)
      );
    }

    setFilteredStudents(result);
  };

  useEffect(() => {
    checkAuth();
    loadData();
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    const years = await getDistinctYearsOfStudy();
    setYearsOfStudy(years);
  };

  const checkAuth = async () => {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      router.replace('/');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const studentData = await getAllStudents();
      setStudents(studentData);
      setFilteredStudents(studentData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!newStudent.prn || !newStudent.fullName || !newStudent.email || !newStudent.phone) {
      Alert.alert('Error', 'Please enter PRN, Full Name, Email and Mobile Number');
      return;
    }
    if (newStudent.phone.length !== 10 || !/^[0-9]+$/.test(newStudent.phone)) {
      Alert.alert('Error', 'Mobile number must be exactly 10 digits');
      return;
    }
    try {
      await saveStudent({
        ...newStudent,
        gfmId: '',
        gfmName: ''
      });
      setModalVisible(false);
      setNewStudent({
        prn: '',
        fullName: '',
        email: '',
        phone: '',
        parentMobile: '',
        rollNo: '',
        branch: 'Computer Engineering',
        yearOfStudy: 'First Year',
        division: 'A'
      });
      loadData();
      Alert.alert('Success', 'Student added successfully');
    } catch (error: any) {
      if (error?.message?.includes('already exists') || error?.message?.includes('duplicate')) {
        Alert.alert('Error', 'This Email or PRN already exists. Please use unique details.');
      } else {
        Alert.alert('Error', 'Failed to add student. Ensure PRN is unique.');
      }
    }
  };

  const handleFileSelect = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportProgress(0);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    const processData = (data: any[]) => {
      const parsedStudents = data.map((row: any) => ({
        fullName: row['Full Name'] || row['fullName'] || row['Name'] || row['name'] || '',
        email: row['Email'] || row['email'] || row['Email ID'] || row['EmailID'] || '',
        prn: String(row['PRN'] || row['prn'] || ''),
        phone: row['Phone'] || row['phone'] || row['Mobile'] || row['mobile'] || row['Mobile Number'] || '',
        parentMobile: row['Parent Mobile'] || row['parentMobile'] || row['Father Mobile'] || row['Mother Mobile'] || '',
        rollNo: row['Roll No'] || row['rollNo'] || row['Roll Number'] || row['RollNo'] || '',
        branch: row['Branch'] || row['branch'] || row['Department'] || row['department'] || 'Computer Engineering',
        yearOfStudy: row['Year'] || row['year'] || row['Year of Study'] || row['yearOfStudy'] || 'First Year',
        division: row['Division'] || row['division'] || row['Div'] || row['div'] || 'A'
      })).filter((s: any) => s.fullName && s.prn);

      setImportPreview(parsedStudents);
      setImportModalVisible(true);
      setImporting(false);
    };

    try {
      if (fileExtension === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => processData(results.data),
          error: () => {
            Alert.alert('Error', 'Failed to read CSV file');
            setImporting(false);
          }
        });
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            processData(data);
          } catch (err) {
            Alert.alert('Error', 'Failed to read Excel file');
            setImporting(false);
          }
        };
        reader.onerror = () => {
          Alert.alert('Error', 'Failed to read Excel file');
          setImporting(false);
        };
        reader.readAsBinaryString(file);
      } else {
        Alert.alert('Error', 'Unsupported file format');
        setImporting(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process file');
      setImporting(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportStudents = async () => {
    if (importPreview.length === 0) {
      Alert.alert('Error', 'No students to import');
      return;
    }

    setImporting(true);
    setImportProgress(0);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < importPreview.length; i++) {
      const student = importPreview[i];
      try {
        await saveStudent({
          ...student,
          gfmId: '',
          gfmName: ''
        });
        successCount++;
      } catch (e) {
        failCount++;
      }
      setImportProgress(Math.round(((i + 1) / importPreview.length) * 100));
    }

    setImporting(false);
    setImportModalVisible(false);
    setImportPreview([]);
    loadData();
    Alert.alert('Import Complete', `Successfully added ${successCount} students. ${failCount > 0 ? `${failCount} failed (duplicate PRN/Email).` : ''}`);
  };

  const downloadTemplate = () => {
    const templatePath = '/csv-templates/students_import_template.csv';
    const link = document.createElement('a');
    link.href = templatePath;
    link.download = 'students_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteStudent = (prn: string) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to remove student ${prn}? This will also remove their login profile.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteStudent(prn);
              loadData();
              Alert.alert('Success', 'Student removed successfully');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete student: ' + (error.message || JSON.stringify(error)));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderStudentItem = ({ item }: { item: Student }) => (
    <View style={styles.studentCard}>
      <View style={styles.studentInfo}>
        <Ionicons name="person-circle-outline" size={40} color={COLORS.primary} />
        <View style={styles.textContainer}>
          <Text style={styles.studentName}>{item.fullName}</Text>
          <Text style={styles.studentPrn}>PRN: {item.prn}</Text>
          <Text style={styles.studentDetails}>{getFullBranchName(item.branch)} | {getFullYearName(item.yearOfStudy)} | Div {item.division}</Text>
          {item.email && <Text style={styles.studentEmail}>{item.email}</Text>}
        </View>
      </View>
      <TouchableOpacity onPress={() => handleDeleteStudent(item.prn)} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Students</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {isWeb && (
            <TouchableOpacity onPress={() => fileInputRef.current?.click()} style={styles.importBtn}>
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
              <Text style={styles.importBtnText}>Import CSV</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {isWeb && (
        <input
          type="file"
          ref={fileInputRef as any}
          accept=".csv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      )}

      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={COLORS.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Name or PRN..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
          <Ionicons name="options-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.prn}
          renderItem={renderStudentItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No students found. Click + to add a student or Import from CSV.</Text>
          }
        />
      )}


      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={() => setShowFilterModal(false)}
        onReset={() => {
          setDeptFilter('All');
          setYearFilter('All');
          setDivFilter('All');
          setSearchQuery('');
        }}
        department={deptFilter}
        onDepartmentChange={setDeptFilter}
        departments={[{ label: 'All', value: 'All' }, ...DISPLAY_BRANCHES]}
        year={yearFilter}
        onYearChange={setYearFilter}
        years={[{ label: 'All', value: 'All' }, ...DISPLAY_YEARS]}
        division={divFilter}
        onDivisionChange={setDivFilter}
        divisions={['All', 'A', 'B', 'C'].map(d => ({ label: d, value: d }))}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Student</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={true}
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              <Text style={styles.label}>Full Name *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="Student's Full Name"
                  placeholderTextColor="#94A3B8"
                  value={newStudent.fullName}
                  onChangeText={t => setNewStudent({ ...newStudent, fullName: t })}
                />
              </View>

              <Text style={styles.label}>Email ID *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="student@email.com"
                  placeholderTextColor="#94A3B8"
                  value={newStudent.email}
                  onChangeText={t => setNewStudent({ ...newStudent, email: t })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <Text style={styles.label}>Mobile Number *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#94A3B8"
                  value={newStudent.phone}
                  onChangeText={t => setNewStudent({ ...newStudent, phone: t.replace(/[^0-9]/g, '') })}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              <Text style={styles.label}>Parent Mobile Number (Optional)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#94A3B8"
                  value={newStudent.parentMobile}
                  onChangeText={t => setNewStudent({ ...newStudent, parentMobile: t.replace(/[^0-9]/g, '') })}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Roll No (Optional)</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="list-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputField}
                      placeholder="e.g. 101"
                      placeholderTextColor="#94A3B8"
                      value={newStudent.rollNo || ''}
                      onChangeText={t => setNewStudent({ ...newStudent, rollNo: t })}
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>PRN *</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="card-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputField}
                      placeholder="Unique PRN Number"
                      placeholderTextColor="#94A3B8"
                      value={newStudent.prn}
                      onChangeText={t => setNewStudent({ ...newStudent, prn: t })}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.label}>Branch</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newStudent.branch}
                  onValueChange={v => setNewStudent({ ...newStudent, branch: v })}
                  style={isWeb ? { border: 'none', background: 'transparent' } : {}}
                >
                  {DISPLAY_BRANCHES.map(b => (
                    <Picker.Item key={b.value} label={b.label} value={b.value} />
                  ))}
                </Picker>
              </View>

              <View style={[styles.row, { marginTop: 10 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Year</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={newStudent.yearOfStudy}
                      onValueChange={v => setNewStudent({ ...newStudent, yearOfStudy: v })}
                      style={isWeb ? { border: 'none', background: 'transparent' } : {}}
                    >
                      {DISPLAY_YEARS.map(y => (
                        <Picker.Item key={y.value} label={y.label} value={y.value} />
                      ))}
                    </Picker>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Division</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={newStudent.division}
                      onValueChange={v => setNewStudent({ ...newStudent, division: v })}
                      style={isWeb ? { border: 'none', background: 'transparent' } : {}}
                    >
                      {['A', 'A1', 'A2', 'A3', 'B', 'B1', 'B2', 'B3', 'C', 'C1', 'C2', 'C3'].map(d => (
                        <Picker.Item key={d} label={d} value={d} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalBtn, styles.cancelBtn]}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddStudent} style={[styles.modalBtn, styles.saveBtn]}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Add Student</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={importModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Import Preview ({importPreview.length} students)</Text>
              <TouchableOpacity onPress={() => { setImportModalVisible(false); setImportPreview([]); }}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.helperText}>CSV/Excel should have columns: Full Name, Email, PRN</Text>
              {isWeb && (
                <TouchableOpacity onPress={downloadTemplate} style={{ marginBottom: 15 }}>
                  <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Download Template</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <View style={styles.previewTable}>
                <View style={[styles.previewRow, styles.previewHeader]}>
                  <Text style={[styles.previewCell, { flex: 1.5, color: '#fff' }]}>Full Name</Text>
                  <Text style={[styles.previewCell, { flex: 1.5, color: '#fff' }]}>Email</Text>
                  <Text style={[styles.previewCell, { flex: 1, color: '#fff' }]}>PRN</Text>
                </View>
                {importPreview.map((s, idx) => (
                  <View key={idx} style={styles.previewRow}>
                    <Text style={[styles.previewCell, { flex: 1.5 }]}>{s.fullName}</Text>
                    <Text style={[styles.previewCell, { flex: 1.5 }]}>{s.email}</Text>
                    <Text style={[styles.previewCell, { flex: 1 }]}>{s.prn}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => { setImportModalVisible(false); setImportPreview([]); }} style={[styles.modalBtn, styles.cancelBtn]}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleImportStudents} disabled={importing} style={[styles.modalBtn, styles.saveBtn]}>
                {importing ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>{importProgress}%</Text>
                  </View>
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Import All</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F6',
  },
  searchBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.text,
  },
  filterBtn: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  backBtn: {
    padding: 5,
  },
  addBtn: {
    padding: 5,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 5,
  },
  importBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  loader: {
    marginTop: 50,
  },
  listContent: {
    padding: 20,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: 15,
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  studentPrn: {
    fontSize: 13,
    color: COLORS.secondary,
    marginTop: 2,
  },
  studentDetails: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  studentEmail: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: COLORS.textLight,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B', // Slate color
    marginBottom: 2,
    marginTop: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F8FAFC',
    color: '#1E293B',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#fff', // Changed to white for better contrast with shadow
    paddingHorizontal: 15,
    height: 54,
    marginBottom: 8,
    // Subtle shadow
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 10,
    opacity: 0.5,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
    height: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: 25,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#fff', // Changed to white
    height: 54,
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  modalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelBtn: {
    backgroundColor: '#eee',
  },
  saveBtn: {
    backgroundColor: COLORS.secondary,
  },
  modalBtnText: {
    fontWeight: 'bold',
    color: COLORS.text,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 15,
  },
  previewTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  previewHeader: {
    backgroundColor: COLORS.primary,
  },
  previewCell: {
    padding: 10,
    fontSize: 12,
    color: COLORS.text,
  },
});
