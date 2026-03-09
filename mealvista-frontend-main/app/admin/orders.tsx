import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, StatusBar, ActivityIndicator,
    Alert, RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../lib/api';
import { getStoredToken } from '../../lib/authStorage';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'ready' | 'delivered' | 'cancelled';

interface OrderItem { name: string; quantity: number; unitPrice: number }
interface AdminOrder {
    id: string;
    status: OrderStatus;
    totalAmount: number;
    itemCount: number;
    items: OrderItem[];
    paymentMethod: string;
    createdAt: string;
    user: { name: string; email: string };
}

const STATUS_CFG: Record<OrderStatus, { color: string; bg: string; label: string }> = {
    pending: { color: '#D97706', bg: '#FEF3C7', label: 'Pending' },
    confirmed: { color: '#2563EB', bg: '#DBEAFE', label: 'Confirmed' },
    processing: { color: '#7C3AED', bg: '#F5F3FF', label: 'Processing' },
    ready: { color: '#059669', bg: '#D1FAE5', label: 'Ready' },
    delivered: { color: '#10B981', bg: '#DCFCE7', label: 'Delivered' },
    cancelled: { color: '#DC2626', bg: '#FEE2E2', label: 'Cancelled' },
};

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'processing', 'ready', 'delivered', 'cancelled'];

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AdminOrders() {
    const router = useRouter();
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const tabs = ['all', 'pending', 'processing', 'ready', 'delivered', 'cancelled'];

    const fetchOrders = useCallback(async (status?: string) => {
        try {
            setError(null);
            const token = await getStoredToken();
            const params: any = {};
            const s = status ?? selectedStatus;
            if (s && s !== 'all') params.status = s;

            const res = await api.get('/api/admin/orders', {
                headers: { Authorization: `Bearer ${token}` },
                params,
            });
            if (res.data.success) setOrders(res.data.orders);
        } catch (err: any) {
            setError('Failed to load orders.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedStatus]);

    useEffect(() => { fetchOrders(); }, []);

    const handleTabChange = (tab: string) => {
        setSelectedStatus(tab);
        setLoading(true);
        fetchOrders(tab);
    };

    const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
        Alert.alert(
            'Update Order Status',
            `Change status to "${STATUS_CFG[newStatus]?.label}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            setUpdatingId(orderId);
                            const token = await getStoredToken();
                            await api.patch(
                                `/api/admin/orders/${orderId}`,
                                { status: newStatus },
                                { headers: { Authorization: `Bearer ${token}` } }
                            );
                            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
                        } catch {
                            Alert.alert('Error', 'Could not update order status.');
                        } finally {
                            setUpdatingId(null);
                        }
                    },
                },
            ]
        );
    };

    const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
    const pendingCount = orders.filter(o => o.status === 'pending').length;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#3C2253" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Order Management</Text>
                    <Text style={styles.headerSub}>{orders.length} orders loaded</Text>
                </View>
            </View>

            {/* Quick stats strip */}
            <View style={styles.statsStrip}>
                <View style={styles.statChip}>
                    <Text style={styles.statChipNum}>Rs {totalRevenue.toFixed(0)}</Text>
                    <Text style={styles.statChipLabel}>Revenue</Text>
                </View>
                <View style={styles.statChipDivider} />
                <View style={styles.statChip}>
                    <Text style={[styles.statChipNum, pendingCount > 0 && { color: '#D97706' }]}>{pendingCount}</Text>
                    <Text style={styles.statChipLabel}>Pending</Text>
                </View>
                <View style={styles.statChipDivider} />
                <View style={styles.statChip}>
                    <Text style={styles.statChipNum}>{orders.filter(o => o.status === 'delivered').length}</Text>
                    <Text style={styles.statChipLabel}>Delivered</Text>
                </View>
            </View>

            {/* Status Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>
                {tabs.map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, selectedStatus === tab && styles.tabActive]}
                        onPress={() => handleTabChange(tab)}
                    >
                        <Text style={[styles.tabText, selectedStatus === tab && styles.tabTextActive]}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#3C2253" />
                    <Text style={styles.loadingText}>Loading orders...</Text>
                </View>
            ) : error ? (
                <View style={styles.errorBox}>
                    <Feather name="alert-circle" size={32} color="#DC2626" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchOrders(); }}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} colors={['#3C2253']} />}
                >
                    {orders.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Feather name="inbox" size={48} color="#D1D5DB" />
                            <Text style={styles.emptyText}>No orders found</Text>
                        </View>
                    ) : orders.map(order => {
                        const cfg = STATUS_CFG[order.status] || STATUS_CFG.pending;
                        const isExpanded = expandedId === order.id;
                        const currentIdx = STATUS_FLOW.indexOf(order.status);
                        const nextStatuses = STATUS_FLOW.filter((s, i) => i > currentIdx && s !== 'cancelled');

                        return (
                            <View key={order.id} style={styles.orderCard}>
                                {/* Card header */}
                                <TouchableOpacity
                                    style={styles.orderCardHeader}
                                    onPress={() => setExpandedId(isExpanded ? null : order.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.orderCardLeft}>
                                        <Text style={styles.orderId}>#{String(order.id).slice(-8).toUpperCase()}</Text>
                                        <Text style={styles.orderUser}>{order.user?.name || 'User'}</Text>
                                        <Text style={styles.orderMeta}>{formatDate(order.createdAt)} · {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}</Text>
                                    </View>
                                    <View style={styles.orderCardRight}>
                                        <Text style={styles.orderAmount}>Rs {order.totalAmount.toFixed(2)}</Text>
                                        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                                            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                                        </View>
                                        <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" style={{ marginTop: 4 }} />
                                    </View>
                                </TouchableOpacity>

                                {/* Expanded content */}
                                {isExpanded && (
                                    <View style={styles.expandedContent}>
                                        {/* Items list */}
                                        <Text style={styles.expandedLabel}>Items</Text>
                                        {order.items.slice(0, 5).map((item, i) => (
                                            <View key={i} style={styles.itemRow}>
                                                <Text style={styles.itemName}>{item.name}</Text>
                                                <Text style={styles.itemQty}>×{item.quantity}</Text>
                                                <Text style={styles.itemPrice}>Rs {(item.unitPrice * item.quantity).toFixed(2)}</Text>
                                            </View>
                                        ))}
                                        {order.items.length > 5 && (
                                            <Text style={styles.moreItems}>+{order.items.length - 5} more items</Text>
                                        )}

                                        {/* Customer email */}
                                        <Text style={styles.userEmail}>📧 {order.user?.email}</Text>

                                        {/* Status update buttons */}
                                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                            <View style={styles.statusActions}>
                                                <Text style={styles.expandedLabel}>Update Status</Text>
                                                <View style={styles.statusButtonsRow}>
                                                    {nextStatuses.map(s => {
                                                        const scfg = STATUS_CFG[s];
                                                        const isUpdating = updatingId === order.id;
                                                        return (
                                                            <TouchableOpacity
                                                                key={s}
                                                                style={[styles.statusUpdateBtn, { borderColor: scfg.color, backgroundColor: scfg.bg }]}
                                                                onPress={() => handleStatusUpdate(order.id, s)}
                                                                disabled={isUpdating}
                                                            >
                                                                {isUpdating ? <ActivityIndicator size="small" color={scfg.color} /> : (
                                                                    <Text style={[styles.statusUpdateBtnText, { color: scfg.color }]}>→ {scfg.label}</Text>
                                                                )}
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                    {/* Cancel button */}
                                                    <TouchableOpacity
                                                        style={[styles.statusUpdateBtn, { borderColor: '#DC2626', backgroundColor: '#FEE2E2' }]}
                                                        onPress={() => handleStatusUpdate(order.id, 'cancelled')}
                                                    >
                                                        <Text style={[styles.statusUpdateBtnText, { color: '#DC2626' }]}>✗ Cancel</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        );
                    })}
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

    statsStrip: {
        backgroundColor: '#3C2253', flexDirection: 'row',
        paddingHorizontal: 20, paddingBottom: 16, gap: 0,
    },
    statChip: { flex: 1, alignItems: 'center' },
    statChipNum: { fontSize: 18, fontWeight: '800', color: '#fff' },
    statChipLabel: { fontSize: 11, color: '#D8B4FE', marginTop: 2 },
    statChipDivider: { width: 1, backgroundColor: '#6D3A8A', marginHorizontal: 4 },

    tabs: { maxHeight: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    tabsContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent' },
    tabActive: { backgroundColor: '#3C2253', borderColor: '#3C2253' },
    tabText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
    tabTextActive: { color: '#fff' },

    loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: '#6B7280' },
    errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
    errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
    retryBtn: { backgroundColor: '#3C2253', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
    retryText: { color: '#fff', fontWeight: '700' },
    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 10 },
    emptyText: { fontSize: 15, color: '#9CA3AF' },

    list: { flex: 1 },
    listContent: { padding: 16, paddingBottom: 32 },

    orderCard: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
    orderCardHeader: { flexDirection: 'row', padding: 14, gap: 8 },
    orderCardLeft: { flex: 1 },
    orderId: { fontSize: 13, fontWeight: '700', color: '#1F2937', marginBottom: 2 },
    orderUser: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 2 },
    orderMeta: { fontSize: 12, color: '#9CA3AF' },
    orderCardRight: { alignItems: 'flex-end', gap: 4 },
    orderAmount: { fontSize: 16, fontWeight: '800', color: '#3C2253' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusText: { fontSize: 11, fontWeight: '700' },

    expandedContent: { borderTopWidth: 1, borderTopColor: '#F3F4F6', padding: 14 },
    expandedLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    itemName: { flex: 1, fontSize: 13, color: '#374151' },
    itemQty: { fontSize: 13, color: '#9CA3AF', marginRight: 8 },
    itemPrice: { fontSize: 13, fontWeight: '600', color: '#3C2253' },
    moreItems: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
    userEmail: { fontSize: 12, color: '#6B7280', marginTop: 6, marginBottom: 12 },
    statusActions: { marginTop: 4 },
    statusButtonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statusUpdateBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
    statusUpdateBtnText: { fontSize: 12, fontWeight: '700' },
});
