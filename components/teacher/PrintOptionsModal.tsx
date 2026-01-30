import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { Student } from '../../storage/sqlite';
import { Checkbox } from './Checkbox';
import { styles } from './dashboard.styles';

interface PrintOptionsModalProps {
    visible: boolean;
    onClose: () => void;
    student: Student | null;
    printOptions: any;
    setPrintOptions: (options: any) => void;
    onGenerate: () => void;
}

export const PrintOptionsModal = ({ visible, onClose, student, printOptions, setPrintOptions, onGenerate }: PrintOptionsModalProps) => {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalBody, { maxWidth: 450 }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>PDF Report Options</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.helperText, { marginBottom: 20 }]}>Select modules to include in the report for {student?.fullName || 'the student'}</Text>

                    <View style={{ marginBottom: 20 }}>
                        <Checkbox label="Personal Details (Always included)" value={true} onValueChange={() => { }} disabled={true} />
                        <Checkbox label="Academic Performance" value={!!printOptions?.academic || !!printOptions?.all} onValueChange={(v) => setPrintOptions({ ...printOptions, academic: v, all: false })} />
                        <Checkbox label="Fee Payment Details" value={!!printOptions?.fees || !!printOptions?.all} onValueChange={(v) => setPrintOptions({ ...printOptions, fees: v, all: false })} />
                        <Checkbox label="Activities & Achievements" value={!!printOptions?.activities || !!printOptions?.all} onValueChange={(v) => setPrintOptions({ ...printOptions, activities: v, all: false })} />
                        <Checkbox label="Internship Details" value={!!printOptions?.internships || !!printOptions?.all} onValueChange={(v) => setPrintOptions({ ...printOptions, internships: v, all: false })} />
                        <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 10 }} />
                        <Checkbox label="Select All Modules" value={!!printOptions?.all} onValueChange={(v) => setPrintOptions({
                            personal: true, academic: v, fees: v, activities: v, internships: v, all: v
                        })} />
                    </View>

                    <View style={styles.row}>
                        <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
                            <Text style={[styles.btnText, { color: COLORS.text }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btn, styles.saveBtn]}
                            onPress={onGenerate}
                        >
                            <Ionicons name="print-outline" size={20} color="#fff" />
                            <Text style={[styles.btnText, { marginLeft: 8 }]}>Generate PDF</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};
