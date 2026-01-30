import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { styles } from './dashboard.styles';

export const AdminReportsManagement = ({ filters }: any) => {
    const [reportType, setReportType] = useState('attendance');

    // MOCK DATA - For presentation only
    const attendanceData = [
        { label: 'Computer Engineering', value: 85, color: '#4CAF50' },
        { label: 'Electronics & Telecommunication', value: 72, color: '#2196F3' },
        { label: 'Mechanical Engineering', value: 65, color: '#FFC107' },
        { label: 'Civil Engineering', value: 60, color: '#FF5722' },
        { label: 'AI & Data Science', value: 78, color: '#9C27B0' },
    ];

    const feeData = [
        { label: 'Paid', value: 65, color: COLORS.success, count: 450 },
        { label: 'Partial', value: 25, color: COLORS.warning, count: 175 },
        { label: 'Unpaid', value: 10, color: COLORS.error, count: 70 },
    ];

    const academicData = [
        { label: 'Distinction', value: 40, color: '#3F51B5' },
        { label: 'First Class', value: 35, color: '#00BCD4' },
        { label: 'Higher Second', value: 15, color: '#8BC34A' },
        { label: 'Second Class', value: 8, color: '#FFEB3B' },
        { label: 'Fail', value: 2, color: '#F44336' },
    ];

    const renderBarChart = (data: any[], title: string, unit: string = '%') => (
        <View style={styles.moduleCard}>
            <Text style={styles.moduleTitle}>{title}</Text>
            <View style={{ marginTop: 20 }}>
                {data.map((item, index) => (
                    <View key={index} style={{ marginBottom: 15 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                            <Text style={{ fontWeight: '600', color: COLORS.text }}>{item.label}</Text>
                            <Text style={{ color: COLORS.textLight }}>{item.value}{unit}</Text>
                        </View>
                        <View style={{ height: 12, backgroundColor: '#f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
                            <View style={{
                                height: '100%',
                                backgroundColor: item.color,
                                width: `${item.value}%`,
                                borderRadius: 6
                            }} />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );

    const renderDonutChart = (data: any[], title: string) => (
        <View style={styles.moduleCard}>
            <Text style={styles.moduleTitle}>{title}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 20, gap: 10 }}>
                {data.map((item, index) => (
                    <View key={index} style={{
                        flex: 1, minWidth: '30%',
                        backgroundColor: item.color + '15',
                        padding: 15,
                        borderRadius: 12,
                        borderLeftWidth: 4,
                        borderLeftColor: item.color,
                        alignItems: 'center'
                    }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: item.color }}>{item.value}%</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: 4 }}>{item.label}</Text>
                        {item.count && <Text style={{ fontSize: 11, color: COLORS.textLight }}>{item.count} Students</Text>}
                    </View>
                ))}
            </View>
            <View style={{ marginTop: 20, height: 15, flexDirection: 'row', borderRadius: 8, overflow: 'hidden' }}>
                {data.map((item, index) => (
                    <View key={index} style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                ))}
            </View>
        </View>
    );

    return (
        <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    {['Attendance', 'Academics', 'Fees'].map((type) => (
                        <TouchableOpacity
                            key={type}
                            onPress={() => setReportType(type.toLowerCase())}
                            style={{
                                paddingHorizontal: 20,
                                paddingVertical: 10,
                                borderRadius: 20,
                                backgroundColor: reportType === type.toLowerCase() ? COLORS.primary : COLORS.white,
                                borderWidth: 1,
                                borderColor: reportType === type.toLowerCase() ? COLORS.primary : '#eee'
                            }}
                        >
                            <Text style={{
                                color: reportType === type.toLowerCase() ? '#fff' : COLORS.text,
                                fontWeight: '600'
                            }}>{type}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {reportType === 'attendance' && renderBarChart(attendanceData, 'Department-wise Attendance Analysis', '%')}
            {reportType === 'academics' && renderBarChart(academicData, 'Overall Academic Performance Distribution', '%')}
            {reportType === 'fees' && renderDonutChart(feeData, 'Fee Collection Status')}

            <View style={styles.moduleCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.moduleTitle}>Export Report</Text>
                    <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
                </View>
                <Text style={{ color: COLORS.textLight, marginTop: 5, marginBottom: 15 }}>
                    Download detailed analysis report for {reportType} in PDF format.
                </Text>
                <TouchableOpacity
                    style={{
                        backgroundColor: COLORS.primary,
                        padding: 15,
                        borderRadius: 8,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 10
                    }}
                    onPress={() => Alert.alert('Export', `Downloading ${reportType} report... (Simulation)`)}
                >
                    <Ionicons name="download-outline" size={20} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Download PDF Report</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};
