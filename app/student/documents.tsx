import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { getSession } from '../../services/session.service';
import { getAllDocuments } from '../../storage/sqlite';

const CATEGORIES = ['All', 'Fees', 'Achievement', 'Course', 'Co-curricular', 'Extra-curricular', 'Internship'];

export default function DocumentsScreen() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const router = useRouter();

  const loadDocuments = async () => {
    try {
      const session = await getSession();
      if (!session || !session.prn) {
        router.replace('/');
        return;
      }
      const data = await getAllDocuments(session.prn);
      setDocuments(data);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDocuments();
  };

  const filteredDocs = selectedCategory === 'All'
    ? documents
    : documents.filter(doc => doc.category === selectedCategory);

  const openDocument = (uri: string) => {
    if (!uri) return;
    Linking.openURL(uri).catch(err => {
      console.error("Couldn't load page", err);
      if (Platform.OS === 'web') alert('Could not open document link');
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student Repository</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerSub}>Access all your official documents and certificates in one place.</Text>
        </View>
      </View>

      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterTab, selectedCategory === cat && styles.filterTabActive]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, selectedCategory === cat && styles.filterTabTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentInner}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {filteredDocs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="folder-open-outline" size={60} color={`${COLORS.primary}20`} />
            </View>
            <Text style={styles.emptyTitle}>No Documents Yet</Text>
            <Text style={styles.emptyText}>We couldn't find any documents in the {selectedCategory} category.</Text>
          </View>
        ) : (
          <View style={styles.docGrid}>
            {filteredDocs.map((doc, index) => (
              <TouchableOpacity key={index} style={styles.docCard} onPress={() => openDocument(doc.uri)} activeOpacity={0.8}>
                <View style={[styles.docIconContainer, { backgroundColor: doc.category === 'Fees' ? '#FFFBEB' : '#F0F7FF' }]}>
                  <Ionicons
                    name={doc.category === 'Fees' ? 'receipt-outline' : (doc.category === 'Achievement' ? 'trophy-outline' : 'document-text-outline')}
                    size={28}
                    color={doc.category === 'Fees' ? '#D97706' : '#2563EB'}
                  />
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{doc.category}</Text>
                  </View>
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docTitle} numberOfLines={2}>{doc.title}</Text>
                  <Text style={styles.docDetails} numberOfLines={1}>{doc.details}</Text>
                  <View style={styles.docFooter}>
                    <Ionicons name="calendar-outline" size={12} color="#94A3B8" />
                    <Text style={styles.docDate}>{new Date(doc.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                    <View style={styles.dot} />
                    <Text style={styles.openNow}>Tap to View</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC'
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerContent: {
    marginTop: 5,
  },
  headerSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
    maxWidth: '90%',
  },
  filterWrapper: {
    backgroundColor: 'transparent',
    marginTop: -25,
    zIndex: 10,
  },
  filterScroll: {
    paddingHorizontal: 24,
    paddingBottom: 10,
    gap: 12
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700'
  },
  filterTabTextActive: {
    color: '#FFFFFF'
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  docGrid: {
    gap: 12,
  },
  docCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  docIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  categoryBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  docInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  docTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4
  },
  docDetails: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8
  },
  docFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  docDate: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500'
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
  },
  openNow: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700'
  }
});