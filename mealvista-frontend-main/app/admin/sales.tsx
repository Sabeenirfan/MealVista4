import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../lib/api';
import { getStoredToken } from '../../lib/authStorage';

interface Stats {
    total: { revenue: number; orders: number; items: number };
    today: { revenue: number; orders: number };
    week: { revenue: number; orders: number };
    month: { revenue: number; orders: number };
    growthPercent: string | null;
}

interface ByStatus {
    [key: string]: { count: number; revenue: number };
}

interface SalesData {
    stats: Stats;
    byStatus: ByStatus;
    recentOrders: Array<{ id: string; status: string; totalAmount: number; itemCount: number; createdAt: string }>;
    lowStockItems: Array<{ id: string; name: string; stock: number; minStock: number; unit: string; status: string }>;
}

const STATUS_COLORS: Record<string, string> = {
    pending: '#D97706', confirmed: '#2563EB', processing: '#7C3AED',
    ready: '#059669', delivered: '#10B981', cancelled: '#DC2626',
};

function formatCurrency(n: number) {
    if (n >= 1000000) return `Rs ${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `Rs ${(n / 1000).toFixed(1)}K`;
    return `Rs ${n.toFixed(2)}`;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

export default function SalesDashboard() {
    const router = useRouter();
    const [data, setData] = useState<SalesData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setError(null);
            const token = await getStoredToken();
            const headers = { Authorization: `Bearer ${token}` };

            const [salesRes, lowStockRes] = await Promise.all([
                api.get('/api/admin/sales', { headers }),
                api.get('/api/admin/inventory/low-stock', { headers }),
            ]);

            if (salesRes.data.success) {
                setData({
                    ...salesRes.data,
                    lowStockItems: lowStockRes.data.items || [],
                });
            }
        } catch (err: any) {
            setError('Failed to load sales data.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const StatCard = ({ icon, label, value, sub, color }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; value: string; sub?: string; color: string }) => (
        <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
                <Feather name={icon} size={20} color={color} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
            {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#3C2253" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Sales Dashboard</Text>
                    <Text style={styles.headerSub}>Revenue & Order Analytics</Text>
                </View>
                <TouchableOpacity onPress={() => { setLoading(true); fetchData(); }}>
                    <Feather name="refresh-cw" size={20} color="#D8B4FE" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#3C2253" />
                    <Text style={styles.loadingText}>Calculating sales data...</Text>
                </View>
            ) : error ? (
                <View style={styles.errorBox}>
                    <Feather name="alert-circle" size={32} color="#DC2626" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchData(); }}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : data && (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={['#3C2253']} />}
                >
                    {/* Growth banner */}
                    {data.stats.growthPercent !== null && (
                        <View style={[styles.growthBanner, { backgroundColor: parseFloat(data.stats.growthPercent) >= 0 ? '#F0FDF4' : '#FEF2F2', borderColor: parseFloat(data.stats.growthPercent) >= 0 ? '#BBF7D0' : '#FECDD3' }]}>
                            <Feather name={parseFloat(data.stats.growthPercent) >= 0 ? 'trending-up' : 'trending-down'} size={18} color={parseFloat(data.stats.growthPercent) >= 0 ? '#10B981' : '#DC2626'} />
                            <Text style={[styles.growthText, { color: parseFloat(data.stats.growthPercent) >= 0 ? '#166534' : '#991B1B' }]}>
                                {parseFloat(data.stats.growthPercent) >= 0 ? '+' : ''}{data.stats.growthPercent}% vs last month
                            </Text>
                        </View>
                    )}

                    {/* Period stats */}
                    <Text style={styles.sectionTitle}>Revenue Overview</Text>
                    <View style={styles.statsGrid}>
                        <StatCard icon="dollar-sign" label="All Time" value={formatCurrency(data.stats.total.revenue)} sub={`${data.stats.total.orders} orders`} color="#3C2253" />
                        <StatCard icon="sun" label="Today" value={formatCurrency(data.stats.today.revenue)} sub={`${data.stats.today.orders} orders`} color="#F59E0B" />
                        <StatCard icon="calendar" label="This Week" value={formatCurrency(data.stats.week.revenue)} sub={`${data.stats.week.orders} orders`} color="#3B82F6" />
                        <StatCard icon="activity" label="This Month" value={formatCurrency(data.stats.month.revenue)} sub={`${data.stats.month.orders} orders`} color="#10B981" />
                    </View>

                    {/* Total summary */}
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryRow}>
                            <Feather name="shopping-bag" size={16} color="#3C2253" />
                            <Text style={styles.summaryLabel}>Total Orders</Text>
                            <Text style={styles.summaryValue}>{data.stats.total.orders}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Feather name="package" size={16} color="#3C2253" />
                            <Text style={styles.summaryLabel}>Items Sold</Text>
                            <Text style={styles.summaryValue}>{data.stats.total.items}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Feather name="bar-chart-2" size={16} color="#3C2253" />
                            <Text style={styles.summaryLabel}>Avg. Order Value</Text>
                            <Text style={styles.summaryValue}>
                                {data.stats.total.orders > 0 ? formatCurrency(data.stats.total.revenue / data.stats.total.orders) : 'Rs 0'}
                            </Text>
                        </View>
                    </View>

                    {/* Orders by status */}
                    <Text style={styles.sectionTitle}>Orders by Status</Text>
                    <View style={styles.statusCard}>
                        {Object.entries(data.byStatus).length === 0 ? (
                            <Text style={styles.noDataText}>No order data yet</Text>
                        ) : Object.entries(data.byStatus).map(([status, d]) => {
                            const color = STATUS_COLORS[status] || '#6B7280';
                            const pct = data.stats.total.orders > 0 ? (d.count / data.stats.total.orders) * 100 : 0;
                            return (
                                <View key={status} style={styles.statusRow}>
                                    <View style={[styles.statusDot, { backgroundColor: color }]} />
                                    <Text style={styles.statusName}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                                    <View style={styles.statusBarWrap}>
                                        <View style={[styles.statusBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                                    </View>
                                    <Text style={styles.statusCount}>{d.count}</Text>
                                    <Text style={styles.statusRevenue}>{formatCurrency(d.revenue)}</Text>
                                </View>
                            );
                        })}
                    </View>

                    {/* Recent Orders */}
                    <Text style={styles.sectionTitle}>Recent Orders</Text>
                    <View style={styles.recentCard}>
                        {data.recentOrders.length === 0 ? (
                            <Text style={styles.noDataText}>No recent orders</Text>
                        ) : data.recentOrders.map((o, i) => {
                            const color = STATUS_COLORS[o.status] || '#6B7280';
                            return (
                                <View key={o.id} style={[styles.recentRow, i < data.recentOrders.length - 1 && styles.recentRowBorder]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.recentId}>#{String(o.id).slice(-8).toUpperCase()}</Text>
                                        <Text style={styles.recentDate}>{formatDate(o.createdAt)} · {o.itemCount} items</Text>
                                    </View>
                                    <View style={[styles.miniStatusBadge, { backgroundColor: `${color}18` }]}>
                                        <Text style={[styles.miniStatusText, { color }]}>{o.status}</Text>
                                    </View>
                                    <Text style={styles.recentAmount}>Rs {o.totalAmount.toFixed(2)}</Text>
                                </View>
                            );
                        })}
                    </View>

                    {/* Low Stock Alert */}
                    {data.lowStockItems.length > 0 && (
                        <>
                            <View style={styles.sectionTitleRow}>
                                <Text style={styles.sectionTitle}>⚠️ Low Stock Alert</Text>
                                <View style={styles.alertCountBadge}>
                                    <Text style={styles.alertCountText}>{data.lowStockItems.length}</Text>
                                </View>
                            </View>
                            <View style={styles.lowStockCard}>
                                {data.lowStockItems.slice(0, 8).map((item, i) => (
                                    <View key={String(item.id)} style={[styles.lowStockRow, i < Math.min(data.lowStockItems.length, 8) - 1 && styles.lowStockBorder]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.lowStockName}>{item.name}</Text>
                                            <Text style={styles.lowStockMeta}>{item.stock} / {item.minStock} {item.unit} (min)</Text>
                                        </View>
                                        <View style={[styles.lowStockBadge, { backgroundColor: item.status === 'out_of_stock' ? '#FEE2E2' : '#FEF3C7' }]}>
                                            <Text style={[styles.lowStockBadgeText, { color: item.status === 'out_of_stock' ? '#DC2626' : '#D97706' }]}>
                                                {item.status === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                                {data.lowStockItems.length > 8 && (
                                    <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push('/admin/inventory' as any)}>
                                        <Text style={styles.viewAllText}>View all {data.lowStockItems.length} low-stock items →</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        backgroundColor: '#3C2253', paddingHorizontal: 16,
        paddingTop: 50, paddingBottom: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    backBtn: { padding: 8 },
    headerText: { flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 12, color: '#D8B4FE', marginTop: 2 },

    loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: '#6B7280' },
    errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
    errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
    retryBtn: { backgroundColor: '#3C2253', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
    retryText: { color: '#fff', fontWeight: '700' },

    scrollView: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40 },

    growthBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 20,
    },
    growthText: { fontSize: 14, fontWeight: '700' },

    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    alertCountBadge: { backgroundColor: '#FEE2E2', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
    alertCountText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
    statCard: {
        width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 16,
        alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    statValue: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 4, textAlign: 'center' },
    statLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
    statSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

    summaryCard: {
        backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 20, gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    summaryLabel: { flex: 1, fontSize: 14, color: '#374151' },
    summaryValue: { fontSize: 15, fontWeight: '700', color: '#3C2253' },

    statusCard: {
        backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 20, gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    statusName: { width: 82, fontSize: 13, color: '#374151', fontWeight: '500' },
    statusBarWrap: { flex: 1, height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
    statusBarFill: { height: '100%', borderRadius: 4 },
    statusCount: { width: 28, fontSize: 13, fontWeight: '700', color: '#1F2937', textAlign: 'right' },
    statusRevenue: { width: 60, fontSize: 11, color: '#6B7280', textAlign: 'right' },
    noDataText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 8 },

    recentCard: {
        backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
    recentRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    recentId: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
    recentDate: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
    miniStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    miniStatusText: { fontSize: 10, fontWeight: '700' },
    recentAmount: { fontSize: 14, fontWeight: '700', color: '#3C2253' },

    lowStockCard: {
        backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    lowStockRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
    lowStockBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    lowStockName: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
    lowStockMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
    lowStockBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    lowStockBadgeText: { fontSize: 10, fontWeight: '700' },
    viewAllBtn: { paddingTop: 12, alignItems: 'center' },
    viewAllText: { fontSize: 13, color: '#3C2253', fontWeight: '600' },
});
