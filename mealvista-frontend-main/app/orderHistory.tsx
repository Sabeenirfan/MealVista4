import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../lib/api';
import { getStoredToken } from '../lib/authStorage';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'ready' | 'delivered' | 'cancelled';

interface OrderItem { name: string; quantity: number; unitPrice: number; category?: string }

interface Order {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  itemCount: number;
  items: OrderItem[];
  paymentMethod: string;
  estimatedDelivery?: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<OrderStatus, { color: string; bg: string; label: string; icon: React.ComponentProps<typeof Feather>['name'] }> = {
  pending: { color: '#D97706', bg: '#FEF3C7', label: 'Pending', icon: 'clock' },
  confirmed: { color: '#2563EB', bg: '#DBEAFE', label: 'Confirmed', icon: 'check-circle' },
  processing: { color: '#7C3AED', bg: '#F5F3FF', label: 'Processing', icon: 'loader' },
  ready: { color: '#059669', bg: '#D1FAE5', label: 'Ready', icon: 'package' },
  delivered: { color: '#10B981', bg: '#D1FAE5', label: 'Delivered', icon: 'check-circle' },
  cancelled: { color: '#DC2626', bg: '#FEE2E2', label: 'Cancelled', icon: 'x-circle' },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function OrderHistoryScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>('All');
  const tabs = ['All', 'pending', 'processing', 'delivered', 'cancelled'];

  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      const token = await getStoredToken();
      if (!token) {
        setError('Please sign in to view your orders.');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const res = await api.get('/api/orders/my-orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setOrders(res.data.orders);
      }
    } catch (err: any) {
      setError('Could not load orders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, []);

  const filtered = selectedTab === 'All'
    ? orders
    : orders.filter(o => o.status === selectedTab);

  const totalSpent = orders.reduce((s, o) => s + o.totalAmount, 0);
  const delivered = orders.filter(o => o.status === 'delivered').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order History</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.tabsBar} contentContainerStyle={styles.tabsContent}
      >
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.tabActive]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchOrders(); }}
            colors={['#3C2253']}
          />
        }
      >
        {/* Stats */}
        {!loading && !error && orders.length > 0 && (
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{orders.length}</Text>
              <Text style={styles.statLabel}>Total Orders</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{delivered}</Text>
              <Text style={styles.statLabel}>Delivered</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>Rs {totalSpent.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#3C2253" />
            <Text style={styles.loadingText}>Loading your orders...</Text>
          </View>
        )}

        {/* Error */}
        {!loading && error && (
          <View style={styles.errorBox}>
            <Feather name="wifi-off" size={32} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchOrders(); }}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <View style={styles.emptyBox}>
            <Feather name="package" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>
              {orders.length === 0 ? 'No orders yet' : `No ${selectedTab} orders`}
            </Text>
            <Text style={styles.emptyText}>
              {orders.length === 0
                ? 'Browse ingredients and place your first order!'
                : 'Try a different filter tab.'}
            </Text>
            {orders.length === 0 && (
              <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/ingredientCatalog' as any)}>
                <Text style={styles.shopBtnText}>Browse Ingredients</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Orders List */}
        {!loading && !error && filtered.map(order => {
          const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
          const shortId = String(order.id).slice(-8).toUpperCase();
          const firstItems = order.items.slice(0, 3).map(i => i.name);
          const extra = order.items.length - 3;

          return (
            <View key={order.id} style={styles.orderCard}>
              {/* Order header */}
              <View style={styles.orderHeader}>
                <View style={styles.orderHeaderLeft}>
                  <Feather name="shopping-bag" size={14} color="#6B7280" />
                  <Text style={styles.orderId}>ORD-{shortId}</Text>
                </View>
                <Text style={styles.orderAmount}>Rs {order.totalAmount.toFixed(2)}</Text>
              </View>

              {/* Date & item count */}
              <View style={styles.orderMeta}>
                <Feather name="calendar" size={13} color="#9CA3AF" />
                <Text style={styles.orderMetaText}>{formatDate(order.createdAt)}</Text>
                <Text style={styles.orderMetaDot}>·</Text>
                <Text style={styles.orderMetaText}>{order.itemCount} item{order.itemCount !== 1 ? 's' : ''}</Text>
              </View>

              {/* Status badge */}
              <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                <Feather name={cfg.icon} size={13} color={cfg.color} />
                <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>

              {/* Estimated delivery */}
              {order.estimatedDelivery && order.status !== 'delivered' && order.status !== 'cancelled' && (
                <Text style={styles.deliveryDate}>
                  <Feather name="truck" size={11} color="#6B7280" /> Est. {formatDate(order.estimatedDelivery)}
                </Text>
              )}

              {/* Items preview */}
              <View style={styles.itemsRow}>
                {firstItems.map((name, i) => (
                  <View key={i} style={styles.itemTag}>
                    <Text style={styles.itemTagText}>{name}</Text>
                  </View>
                ))}
                {extra > 0 && (
                  <View style={styles.itemTag}>
                    <Text style={styles.itemTagText}>+{extra} more</Text>
                  </View>
                )}
              </View>

              {/* Payment */}
              <Text style={styles.paymentText}>
                💳 {order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : order.paymentMethod}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#3C2253' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingTop: 16, paddingBottom: 16,
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', flex: 1 },
  headerSpacer: { width: 36 },

  tabsBar: { maxHeight: 52, backgroundColor: '#fff' },
  tabsContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  tabActive: { backgroundColor: '#3C2253', borderColor: '#3C2253' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#fff' },

  scrollView: { flex: 1, backgroundColor: '#F5F3F7' },
  scrollContent: { padding: 16, paddingBottom: 40 },

  statsCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    flexDirection: 'row', marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#9CA3AF' },
  statDivider: { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 8 },

  loadingBox: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 14, color: '#6B7280' },

  errorBox: { alignItems: 'center', paddingVertical: 40, gap: 16 },
  errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
  retryBtn: { backgroundColor: '#3C2253', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  retryText: { color: '#fff', fontWeight: '700' },

  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151' },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  shopBtn: { backgroundColor: '#3C2253', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, marginTop: 4 },
  shopBtnText: { color: '#fff', fontWeight: '700' },

  orderCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  orderHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderId: { fontSize: 13, fontWeight: '600', color: '#374151' },
  orderAmount: { fontSize: 16, fontWeight: '800', color: '#3C2253' },
  orderMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  orderMetaText: { fontSize: 12, color: '#9CA3AF' },
  orderMetaDot: { fontSize: 12, color: '#D1D5DB' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 8,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  deliveryDate: { fontSize: 12, color: '#6B7280', marginBottom: 10 },
  itemsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  itemTag: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  itemTagText: { fontSize: 11, color: '#374151', fontWeight: '500' },
  paymentText: { fontSize: 12, color: '#9CA3AF' },
});
