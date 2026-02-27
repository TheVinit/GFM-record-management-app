import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/colors';
import { BottomSheet } from './BottomSheet';

interface FilterOption {
    label: string;
    value: string;
}

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: () => void;
    onReset: () => void;

    // Department
    department: string;
    onDepartmentChange: (value: string) => void;
    departments: FilterOption[];

    // Year
    year: string;
    onYearChange: (value: string) => void;
    years: FilterOption[];

    // Division
    division: string;
    onDivisionChange: (value: string) => void;
    divisions: FilterOption[];

    // Sub-Batch (optional)
    subBatch?: string;
    onSubBatchChange?: (value: string) => void;
    showSubBatch?: boolean;

    // Disabled items
    disabledDivisions?: string[];
}

export const FilterModal: React.FC<FilterModalProps> = ({
    visible,
    onClose,
    onApply,
    onReset,
    department,
    onDepartmentChange,
    departments,
    year,
    onYearChange,
    years,
    division,
    onDivisionChange,
    divisions,
    subBatch = '',
    onSubBatchChange,
    showSubBatch = false,
    disabledDivisions = [],
}) => {
    const handleApply = () => {
        onApply();
        onClose();
    };

    const handleReset = () => {
        onReset();
    };

    return (
        <BottomSheet visible={visible} onClose={onClose}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Filters</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                </View>

                {/* Filters */}
                <ScrollView style={styles.filtersContainer} showsVerticalScrollIndicator={false}>
                    {/* Department Filter */}
                    <View style={styles.filterSection}>
                        <Text style={styles.filterLabel}>Department</Text>
                        <View style={styles.pickerWrapper}>
                            <Picker
                                selectedValue={department}
                                onValueChange={onDepartmentChange}
                                style={styles.picker}
                            >
                                {departments.map((dept) => (
                                    <Picker.Item key={dept.value} label={dept.label} value={dept.value} />
                                ))}
                            </Picker>
                        </View>
                    </View>

                    {/* Year Filter */}
                    <View style={styles.filterSection}>
                        <Text style={styles.filterLabel}>Year</Text>
                        <View style={styles.pickerWrapper}>
                            <Picker
                                selectedValue={year}
                                onValueChange={onYearChange}
                                style={styles.picker}
                            >
                                {years.map((y) => (
                                    <Picker.Item key={y.value} label={y.label} value={y.value} />
                                ))}
                            </Picker>
                        </View>
                    </View>

                    {/* Division Filter */}
                    <View style={styles.filterSection}>
                        <Text style={styles.filterLabel}>Division</Text>
                        <View style={styles.pickerWrapper}>
                            <Picker
                                selectedValue={division}
                                onValueChange={onDivisionChange}
                                style={styles.picker}
                            >
                                {divisions.map((div) => {
                                    const isDisabled = disabledDivisions.includes(div.value);
                                    return (
                                        <Picker.Item
                                            key={div.value}
                                            label={isDisabled ? `${div.label} (Done)` : div.label}
                                            value={div.value}
                                            color={isDisabled ? COLORS.textMuted : COLORS.text}
                                        />
                                    );
                                })}
                            </Picker>
                        </View>
                    </View>

                    {/* Sub-Batch Filter (Optional) */}
                    {showSubBatch && onSubBatchChange && (
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Sub-Batch</Text>
                            <View style={styles.pickerWrapper}>
                                <Picker
                                    selectedValue={subBatch}
                                    onValueChange={onSubBatchChange}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Whole Division" value="" />
                                    <Picker.Item label={`${division}1`} value="1" />
                                    <Picker.Item label={`${division}2`} value="2" />
                                    <Picker.Item label={`${division}3`} value="3" />
                                </Picker>
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                        <Text style={styles.resetButtonText}>Reset All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                        <Text style={styles.applyButtonText}>Apply Filters</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    title: {
        ...TYPOGRAPHY.h3,
        color: COLORS.text,
    },
    closeButton: {
        padding: SPACING.sm,
    },
    filtersContainer: {
        flex: 1,
        paddingHorizontal: SPACING.lg,
    },
    filterSection: {
        marginTop: SPACING.lg,
    },
    filterLabel: {
        ...TYPOGRAPHY.bodySmall,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
        fontWeight: '600',
    },
    pickerWrapper: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
    },
    footer: {
        flexDirection: 'row',
        gap: SPACING.md,
        padding: SPACING.lg,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        ...SHADOWS.md,
    },
    resetButton: {
        flex: 1,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resetButtonText: {
        ...TYPOGRAPHY.button,
        color: COLORS.text,
    },
    applyButton: {
        flex: 1,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.md,
    },
    applyButtonText: {
        ...TYPOGRAPHY.button,
        color: COLORS.white,
    },
});
