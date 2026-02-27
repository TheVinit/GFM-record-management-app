import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { getSession } from '../../services/session.service';
import { deleteAdmin, FacultyMember, getAdmins, saveAdmin } from '../../storage/sqlite';

const isWeb = Platform.OS === 'web';

export default function ManageAdmins() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [admins, setAdmins] = useState<FacultyMember[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [newAdmin, setNewAdmin] = useState({
        email: '',
        fullName: '',
        password: ''
    });

    useEffect(() => {
        checkAuth();
        loadAdmins();
    }, []);

    const checkAuth = async () => {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            router.replace('/');
        }
    };

    const loadAdmins = async () => {
        setLoading(true);
        try {
            const data = await getAdmins();
            setAdmins(data);
        } catch (error) {
            console.error('Error loading admins:', error);
            Alert.alert('Error', 'Failed to load admins');
        } finally {
            setLoading(false);
        }
    };

    const handleAddAdmin = async () => {
        if (!newAdmin.email || !newAdmin.fullName || !newAdmin.password) {
            Alert.alert('Error', 'Please enter Email, Full Name, and Password');
            return;
        }
        if (newAdmin.password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await saveAdmin(newAdmin.email.toLowerCase(), newAdmin.fullName, newAdmin.password);
            setModalVisible(false);
            setNewAdmin({ email: '', fullName: '', password: '' });
            await loadAdmins();
            Alert.alert('Success', 'Admin added successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to add admin');
            setLoading(false);
        }
    };

    const handleDeleteAdmin = (prn: string, email: string) => {
        // Prevent deleting oneself
        getSession().then((session) => {
            if (session && session.email === email) {
                Alert.alert('Error', 'You cannot delete your own admin account while logged in.');
                return;
            }

            Alert.alert(
                'Confirm Delete',
                `Are you sure you want to remove admin access for ${email}?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                setLoading(true);
                                await deleteAdmin(prn);
                                await loadAdmins();
                            } catch (error) {
                                Alert.alert('Error', 'Failed to delete admin');
                                setLoading(false);
                            }
                        }
                    }
                ]
            );
        });
    };

    const renderAdminItem = ({ item }: { item: FacultyMember }) => (
        <View style={styles.adminCard}>
            <View style={styles.adminInfo}>
                <Ionicons name="shield-checkmark-outline" size={40} color={COLORS.success} />
                <View style={styles.textContainer}>
                    <Text style={styles.adminName}>{item.fullName}</Text>
                    <Text style={styles.adminEmail}>{item.email}</Text>
                    <Text style={styles.adminDept}>System Administrator</Text>
                </View>
            </View>
            <TouchableOpacity onPress={() => handleDeleteAdmin(item.prn, item.email || '')} style={styles.deleteBtn}>
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
                <Text style={styles.headerTitle}>Manage Admins</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
            ) : (
                <FlatList
                    data={admins}
                    keyExtractor={(item) => item.prn}
                    renderItem={renderAdminItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No admin members found.</Text>
                    }
                />
            )}

            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add New Admin</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Full Name *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Admin Full Name"
                            value={newAdmin.fullName}
                            onChangeText={t => setNewAdmin({ ...newAdmin, fullName: t })}
                        />

                        <Text style={styles.label}>Email ID (used for login) *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="admin@college.edu"
                            value={newAdmin.email}
                            onChangeText={t => setNewAdmin({ ...newAdmin, email: t })}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <Text style={styles.label}>Secure Password *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Minimum 6 characters"
                            secureTextEntry
                            value={newAdmin.password}
                            onChangeText={t => setNewAdmin({ ...newAdmin, password: t })}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalBtn, styles.cancelBtn]}>
                                <Text style={styles.modalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAddAdmin} style={[styles.modalBtn, styles.saveBtn]}>
                                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Create Admin</Text>
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
    loader: {
        marginTop: 50,
    },
    listContent: {
        padding: 20,
    },
    adminCard: {
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
        borderLeftWidth: 4,
        borderLeftColor: COLORS.success
    },
    adminInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    textContainer: {
        marginLeft: 15,
        flex: 1,
    },
    adminName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    adminEmail: {
        fontSize: 13,
        color: '#555',
        marginTop: 2,
    },
    adminDept: {
        fontSize: 12,
        color: COLORS.success,
        marginTop: 2,
        fontWeight: '500'
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
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 25,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 5,
        marginTop: 15,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#f8fafc'
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 25,
    },
    modalBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    cancelBtn: {
        backgroundColor: '#eee',
    },
    saveBtn: {
        backgroundColor: COLORS.success,
    },
    modalBtnText: {
        fontWeight: 'bold',
        color: COLORS.text,
    }
});
