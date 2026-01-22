import React, { useEffect, useState } from 'react';
import { 
  getAcademicRecordsByStudent, 
  AcademicRecord, 
  getStudentInfo 
} from '../../storage/sqlite';
import { getSession } from '../../services/session.service';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { 
  View, 
  Text, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  RefreshControl, 
  StyleSheet,
  useWindowDimensions,
  Platform
} from 'react-native';
import { COLORS } from '../../constants/colors';

export default function AcademicRecordsScreen() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadRecords = async () => {
    try {
      const session = await getSession();
      if (!session) {
        router.replace('/');
        return;
      }
      const data = await getAcademicRecordsByStudent(session.prn);
      setRecords(data);
    } catch (error) {
      console.error('Error loading academic records:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadRecords();
  };

  const groupedRecords = records.reduce((acc: any, record) => {
    const sem = `Semester ${record.semester}`;
    if (!acc[sem]) acc[sem] = [];
    acc[sem].push(record);
    return acc;
  }, {});

  const styles = createStyles(width, isLargeScreen);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading academic records...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Academic Records</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={isLargeScreen ? { maxWidth: 1000, alignSelf: 'center', width: '100%' } : undefined}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {Object.keys(groupedRecords).length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="school-outline" size={64} color={COLORS.textLight} />
            </View>
            <Text style={styles.emptyText}>No academic records found yet</Text>
          </View>
        ) : (
          Object.keys(groupedRecords).map((sem) => (
            <View key={sem} style={styles.semesterSection}>
              <View style={styles.semesterHeader}>
                <Ionicons name="bookmark-outline" size={20} color={COLORS.primary} />
                <Text style={styles.semesterTitle}>{sem}</Text>
              </View>
              <View style={styles.recordsGrid}>
                {groupedRecords[sem].map((record: any, index: number) => (
                  <View key={index} style={[styles.recordCard, isLargeScreen && { width: '48%' }]}>
                    <View style={styles.recordMain}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.courseName}>{record.courseName}</Text>
                        <View style={styles.courseMeta}>
                          <Text style={styles.courseCode}>{record.courseCode}</Text>
                          <View style={styles.metaDivider} />
                          <Text style={styles.creditsText}>{record.credits} Credits</Text>
                        </View>
                      </View>
                      <View style={styles.gradeBadge}>
                        <Text style={styles.gradeText}>{record.grade || 'N/A'}</Text>
                      </View>
                    </View>

                    <View style={styles.marksSection}>
                      <View style={styles.marksGrid}>
                        <MarkItem label="MSE" score={record.mseMarks} max={record.mseMax || 30} />
                        <View style={styles.verticalDivider} />
                        <MarkItem label="ESE" score={record.eseMarks} max={record.eseMax || 50} />
                      </View>
                      <View style={styles.progressBarBg}>
                        <View 
                          style={[
                            styles.progressBarFill, 
                            { width: `${((record.mseMarks + record.eseMarks) / ((record.mseMax || 30) + (record.eseMax || 50))) * 100}%` }
                          ]} 
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const MarkItem = ({ label, score, max }: any) => (
  <View style={styles.markItem}>
    <Text style={styles.markLabel}>{label}</Text>
    <View style={styles.scoreContainer}>
      <Text style={styles.markScore}>{score ?? '-'}</Text>
      <Text style={styles.markMax}>/{max}</Text>
    </View>
  </View>
);

const createStyles = (width: number, isLargeScreen: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 16, fontSize: 16, color: COLORS.textSecondary },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.white },
  content: { flex: 1, padding: 20, marginTop: -25 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyIconContainer: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: COLORS.white, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4
  },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '500' },
  semesterSection: { marginBottom: 30 },
  semesterHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16, 
    gap: 8,
    paddingHorizontal: 4
  },
  semesterTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  recordsGrid: { 
    flexDirection: isLargeScreen ? 'row' : 'column', 
    flexWrap: 'wrap', 
    gap: 16 
  },
  recordCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary
  },
  recordMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20
  },
  courseName: { fontSize: 17, fontWeight: 'bold', color: COLORS.text, marginBottom: 6 },
  courseMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  courseCode: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  metaDivider: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  creditsText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  gradeBadge: {
    backgroundColor: `${COLORS.primary}10`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`
  },
  gradeText: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  marksSection: { gap: 12 },
  marksGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.background,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center'
  },
  markItem: { alignItems: 'center', flex: 1 },
  markLabel: { fontSize: 11, color: COLORS.textLight, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  scoreContainer: { flexDirection: 'row', alignItems: 'baseline' },
  markScore: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  markMax: { fontSize: 12, color: COLORS.textLight, fontWeight: '500' },
  verticalDivider: { width: 1, height: 30, backgroundColor: COLORS.border },
  progressBarBg: { height: 6, backgroundColor: COLORS.borderLight, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 }
});
