import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import {
    getAllActivitiesByFilter,
    getAllInternshipsByFilter,
    getFeeAnalytics,
    getFeePaymentsByFilter
} from '../../storage/sqlite';
import { styles } from './dashboard.styles';

export const AnalyticsRowComp = ({ label, verified, total, color }: any) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginRight: 10 }} />
        <Text style={{ flex: 1, fontSize: 13, color: COLORS.text }}>{label}</Text>
        <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 13, color }}>{verified} / {total}</Text>
            <Text style={{ fontSize: 10, color: COLORS.textLight }}>Verified</Text>
        </View>
    </View>
);

export const AnalyticsManagement = ({ students, filters }: any) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>({
        total: 0,
        verified: 0,
        pending: 0,
        deptWise: {},
        feeStats: { total: 0, paid: 0 },
        moduleStats: {
            activities: { total: 0, verified: 0 },
            internships: { total: 0, verified: 0 },
            fees: { total: 0, verified: 0 }
        }
    });

    useEffect(() => {
        if (students && filters) {
            loadAnalytics();
        }
    }, [students, filters]);

    const loadAnalytics = async () => {
        setLoading(true);
        const total = students.length;
        const verified = students.filter((s: any) => s.verificationStatus === 'Verified').length;
        const pending = total - verified;

        const deptWise: Record<string, number> = {};
        students.forEach((s: any) => {
            deptWise[s.branch] = (deptWise[s.branch] || 0) + 1;
        });

        const dept = filters?.dept || 'All';
        const year = filters?.year || 'All';
        const div = filters?.div || 'All';
        const sem = filters?.sem || 'All';
        const activityType = filters?.activityType || 'All';

        const acts = await getAllActivitiesByFilter(dept, year, div, sem, activityType);
        const interns = await getAllInternshipsByFilter(dept, year, div);
        const fees = await getFeePaymentsByFilter(dept, year, div);
        const feeAnalytics = await getFeeAnalytics(dept, year, div);

        setStats({
            total, verified, pending, deptWise,
            feeStats: {
                total: (feeAnalytics?.totalRemainingAmount || 0) + (fees.reduce((acc: number, f: any) => acc + (f.paidAmount || 0), 0)),
                paid: fees.reduce((acc: number, f: any) => acc + (f.paidAmount || 0), 0)
            },
            moduleStats: {
                activities: { total: acts.length, verified: acts.filter((a: any) => a.verificationStatus === 'Verified').length },
                internships: { total: interns.length, verified: interns.filter((i: any) => i.verificationStatus === 'Verified').length },
                fees: { total: fees.length, verified: fees.filter((f: any) => f.verificationStatus === 'Verified').length }
            }
        });
        setLoading(false);
    };

    if (loading) return <ActivityIndicator size="small" color={COLORS.secondary} />;

    return (
        <View>
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Students</Text>
                    <Text style={styles.statValue}>{stats.total}</Text>
                </View>
                <View style={[styles.statCard, { borderLeftWidth: 4, borderLeftColor: COLORS.success }]}>
                    <Text style={styles.statLabel}>Verified (Profiles)</Text>
                    <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.verified}</Text>
                </View>
                <View style={[styles.statCard, { borderLeftWidth: 4, borderLeftColor: COLORS.warning }]}>
                    <Text style={styles.statLabel}>Pending (Profiles)</Text>
                    <Text style={[styles.statValue, { color: COLORS.warning }]}>{stats.pending}</Text>
                </View>
            </View>

            <View style={styles.row}>
                <View style={[styles.moduleCard, { flex: 1 }]}>
                    <Text style={styles.moduleTitle}>Fee Collection Progress</Text>
                    <View style={{ marginTop: 20, alignItems: 'center' }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.success }}>
                            {stats.feeStats.total > 0 ? ((stats.feeStats.paid / stats.feeStats.total) * 100).toFixed(1) : 0}%
                        </Text>
                        <Text style={styles.helperText}>Collected of Total ₹{stats.feeStats.total}</Text>
                        <View style={{ width: '100%', height: 12, backgroundColor: '#eee', borderRadius: 6, overflow: 'hidden', marginTop: 10 }}>
                            <View style={{ height: '100%', backgroundColor: COLORS.success, width: `${(stats.feeStats.paid / (stats.feeStats.total || 1)) * 100}%` }} />
                        </View>
                    </View>
                </View>

                <View style={[styles.moduleCard, { flex: 1 }]}>
                    <Text style={styles.moduleTitle}>Verification Status</Text>
                    <View style={{ marginTop: 10 }}>
                        <AnalyticsRowComp label="Activities" verified={stats.moduleStats.activities.verified} total={stats.moduleStats.activities.total} color={COLORS.secondary} />
                        <AnalyticsRowComp label="Internships" verified={stats.moduleStats.internships.verified} total={stats.moduleStats.internships.total} color={COLORS.warning} />
                        <AnalyticsRowComp label="Fee Payments" verified={stats.moduleStats.fees.verified} total={stats.moduleStats.fees.total} color={COLORS.success} />
                    </View>
                </View>
            </View>

            <View style={styles.moduleCard}>
                <Text style={styles.moduleTitle}>Department Distribution</Text>
                <View style={{ marginTop: 20 }}>
                    {Object.entries(stats.deptWise).map(([dept, count]: any) => (
                        <View key={dept} style={{ marginBottom: 15 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                                <Text style={{ fontWeight: '500', color: COLORS.text }}>{dept}</Text>
                                <Text style={{ color: COLORS.textLight }}>{count} Students</Text>
                            </View>
                            <View style={{ height: 10, backgroundColor: '#eee', borderRadius: 5, overflow: 'hidden' }}>
                                <View style={{
                                    height: '100%',
                                    backgroundColor: COLORS.secondary,
                                    width: `${(count / (stats.total || 1)) * 100}%`
                                }} />
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
};
