import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { logout, getProfile, getAllUsers, getInventory } from "../../lib/authService";
import { AuthUser } from "../../lib/authService";
import api from "../../lib/api";
import { getStoredToken } from "../../lib/authStorage";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCount, setUserCount] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [salesRevenue, setSalesRevenue] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const token = await getStoredToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [profileResponse, usersResponse, inventoryResponse, ordersResponse, salesResponse] = await Promise.all([
        getProfile(),
        getAllUsers(),
        getInventory(),
        api.get('/api/admin/orders?limit=1', { headers }).catch(() => ({ data: { total: 0 } })),
        api.get('/api/admin/sales', { headers }).catch(() => ({ data: { stats: { total: { revenue: 0 } } } })),
      ]);
      setUser(profileResponse.user);
      setUserCount(usersResponse.count || 0);
      setInventoryCount(inventoryResponse.count || 0);
      setOrderCount(ordersResponse.data?.total || 0);
      setSalesRevenue(salesResponse.data?.stats?.total?.revenue || 0);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/signIn");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const menuItems = [
    {
      id: "users",
      title: "User Management",
      description: "Manage users, view profiles, and handle accounts",
      icon: "people-outline",
      color: "#3C2253",
      route: "/admin/users",
    },
    {
      id: "inventory",
      title: "Inventory Management",
      description: "Manage meals, ingredients, and stock",
      icon: "restaurant-outline",
      color: "#10B981",
      route: "/admin/inventory",
    },
    {
      id: "orders",
      title: "Order Management",
      description: "View all orders, update delivery status",
      icon: "receipt-outline",
      color: "#F59E0B",
      route: "/admin/orders",
    },
    {
      id: "sales",
      title: "Sales Dashboard",
      description: "Revenue analytics, order stats, low-stock alerts",
      icon: "bar-chart-outline",
      color: "#3B82F6",
      route: "/admin/sales",
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2253" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              {user?.name || "Welcome back"}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={32} color="#3C2253" />
            {loading ? (
              <ActivityIndicator size="small" color="#3C2253" style={{ marginTop: 8 }} />
            ) : (
              <>
                <Text style={styles.statNumber}>{userCount}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </>
            )}
          </View>
          <View style={styles.statCard}>
            <Ionicons name="restaurant" size={32} color="#10B981" />
            {loading ? (
              <ActivityIndicator size="small" color="#10B981" style={{ marginTop: 8 }} />
            ) : (
              <>
                <Text style={styles.statNumber}>{inventoryCount}</Text>
                <Text style={styles.statLabel}>Inventory Items</Text>
              </>
            )}
          </View>
          <View style={styles.statCard}>
            <Ionicons name="receipt" size={32} color="#F59E0B" />
            {loading ? (
              <ActivityIndicator size="small" color="#F59E0B" style={{ marginTop: 8 }} />
            ) : (
              <>
                <Text style={styles.statNumber}>{orderCount}</Text>
                <Text style={styles.statLabel}>Orders</Text>
              </>
            )}
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={32} color="#3B82F6" />
            {loading ? (
              <ActivityIndicator size="small" color="#3B82F6" style={{ marginTop: 8 }} />
            ) : (
              <>
                <Text style={[styles.statNumber, { fontSize: salesRevenue >= 1000 ? 20 : 32 }]}>
                  Rs {salesRevenue >= 1000 ? `${(salesRevenue / 1000).toFixed(1)}K` : salesRevenue.toFixed(0)}
                </Text>
                <Text style={styles.statLabel}>Revenue</Text>
              </>
            )}
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon as any} size={32} color={item.color} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    backgroundColor: "#3C2253",
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  logoutButton: {
    padding: 8,
  },
  scrollContent: {
    padding: 20,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  menuContainer: {
    gap: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  menuIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 13,
    color: "#6B7280",
  },
});

