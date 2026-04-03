import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCart } from "../contexts/CartContext";
import api from "../lib/api";
import { getStoredToken } from "../lib/authStorage";
import { useStripe } from "@stripe/stripe-react-native";

const CardDetailsNativeScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { cartItems, getTotalPrice, getTotalItems, clearCart } = useCart();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [paying, setPaying] = useState(false);

  const deliveryFee = 30;
  const orderSubtotal = getTotalPrice();
  const orderTotal = useMemo(() => orderSubtotal + deliveryFee, [orderSubtotal]);

  const deliveryAddress = {
    fullName: String(params.fullName || ""),
    phone: String(params.phone || ""),
    addressLine: String(params.addressLine || ""),
    city: String(params.city || ""),
    notes: String(params.notes || ""),
  };

  const handlePayNow = async () => {
    if (cartItems.length === 0) {
      Alert.alert("Cart Empty", "Please add items to cart before payment.");
      return;
    }

    if (!deliveryAddress.fullName || !deliveryAddress.phone || !deliveryAddress.addressLine || !deliveryAddress.city) {
      Alert.alert("Missing Delivery Details", "Please complete delivery details before paying.");
      return;
    }

    try {
      setPaying(true);
      const token = await getStoredToken();
      if (!token) {
        Alert.alert("Sign In Required", "Please sign in to complete payment.");
        return;
      }

      // 1) Create Stripe PaymentIntent on backend
      const paymentIntentRes = await api.post(
        "/api/payments/create-intent",
        {
          amount: orderTotal,
          currency: process.env.EXPO_PUBLIC_STRIPE_CURRENCY || "usd",
          metadata: { itemCount: String(getTotalItems()) },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!paymentIntentRes.data?.success || !paymentIntentRes.data?.clientSecret) {
        Alert.alert("Payment Failed", "Could not initialize Stripe payment.");
        return;
      }

      // 2) Show Stripe PaymentSheet
      const initResult = await initPaymentSheet({
        merchantDisplayName: "MealVista",
        paymentIntentClientSecret: paymentIntentRes.data.clientSecret,
      });

      if (initResult.error) {
        Alert.alert("Stripe Error", initResult.error.message);
        return;
      }

      const paymentResult = await presentPaymentSheet();
      if (paymentResult.error) {
        Alert.alert("Payment Cancelled", paymentResult.error.message);
        return;
      }

      // 3) Create real order in backend
      const items = cartItems.map((item) => ({
        ingredientId: item.ingredientId || null,
        name: item.name,
        unitPrice: item.price,
        quantity: item.quantity,
        unit: item.unit || "unit",
        category: item.category || "",
        image: item.image || "",
      }));

      const orderRes = await api.post(
        "/api/orders",
        {
          items,
          paymentMethod: "stripe_card",
          deliveryAddress,
          notes: `StripePaymentIntent:${paymentIntentRes.data.paymentIntentId || ""}`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (orderRes.data?.success) {
        const order = orderRes.data.order;
        clearCart();
        router.replace({
          pathname: "/paymentSuccessful",
          params: {
            orderId: String(order.id),
            amountPaid: String(order.totalAmount),
            estimatedDelivery: String(order.estimatedDelivery || "Tomorrow, 2-4 PM"),
            transactionDate: String(order.createdAt || new Date().toISOString()),
            paymentMethod: "stripe_card",
          },
        });
      } else {
        Alert.alert("Order Failed", orderRes.data?.message || "Could not create order after payment.");
      }
    } catch (err: any) {
      Alert.alert("Payment Failed", err?.response?.data?.message || err?.message || "Please try again.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stripe Payment</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <Ionicons name="card-outline" size={22} color="#5A3D7A" />
          <Text style={styles.title}>Pay Rs {orderTotal.toFixed(2)}</Text>
          <Text style={styles.subtitle}>Confirm payment using Stripe.</Text>
        </View>

        <TouchableOpacity
          style={[styles.payButton, paying && { opacity: 0.7 }]}
          onPress={handlePayNow}
          disabled={paying}
        >
          {paying ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.payButtonText}>Pay with Stripe</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#5A3D7A" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: { padding: 4, marginRight: 12 },
  headerTitle: { fontSize: 20, color: "#fff", fontWeight: "700" },
  body: { flex: 1, padding: 16, justifyContent: "center", gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  title: { marginTop: 8, fontSize: 18, fontWeight: "800", color: "#2C1A3F" },
  subtitle: { marginTop: 4, fontSize: 13, color: "#6B5B7F", lineHeight: 18 },
  payButton: {
    backgroundColor: "#5A3D7A",
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#fff",
  },
  payButtonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});

export default CardDetailsNativeScreen;

