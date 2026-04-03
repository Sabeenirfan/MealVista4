import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCart } from "../contexts/CartContext";
import api from "../lib/api";
import { getStoredToken } from "../lib/authStorage";

const PaymentMethodScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { getTotalPrice, cartItems } = useCart();
  const [selectedPayment, setSelectedPayment] = useState<"stripe_card" | "cash_on_delivery">("stripe_card");
  const [processing, setProcessing] = useState(false);

  const orderSummary = {
    subtotal: getTotalPrice(),
    deliveryFee: 30,
    total: getTotalPrice() + 30,
  };

  const deliveryAddress = {
    fullName: String(params.fullName || ""),
    phone: String(params.phone || ""),
    addressLine: String(params.addressLine || ""),
    city: String(params.city || ""),
    notes: String(params.notes || ""),
  };

  const placeOrder = async (paymentMethod: "stripe_card" | "cash_on_delivery") => {
    const token = await getStoredToken();
    if (!token) {
      Alert.alert("Sign In Required", "Please sign in to continue.");
      return;
    }

    const items = cartItems.map((item) => ({
      ingredientId: item.ingredientId || null,
      name: item.name,
      unitPrice: item.price,
      quantity: item.quantity,
      unit: item.unit || "unit",
      category: item.category || "",
      image: item.image || "",
    }));

    return api.post(
      "/api/orders",
      {
        items,
        paymentMethod,
        deliveryAddress,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  };

  const handleContinue = async () => {
    if (!deliveryAddress.fullName || !deliveryAddress.phone || !deliveryAddress.addressLine || !deliveryAddress.city) {
      Alert.alert("Missing Delivery Details", "Please complete delivery details first.");
      router.back();
      return;
    }

    if (selectedPayment === "stripe_card") {
      router.push({
        pathname: "/cardDetails",
        params: {
          fullName: deliveryAddress.fullName,
          phone: deliveryAddress.phone,
          addressLine: deliveryAddress.addressLine,
          city: deliveryAddress.city,
          notes: deliveryAddress.notes,
        },
      });
      return;
    }

    try {
      setProcessing(true);
      const res = await placeOrder("cash_on_delivery");
      if (res?.data?.success) {
        const order = res.data.order;
        router.replace({
          pathname: "/paymentSuccessful",
          params: {
            orderId: String(order.id),
            amountPaid: String(order.totalAmount),
            estimatedDelivery: String(order.estimatedDelivery || "Tomorrow, 2-4 PM"),
            transactionDate: String(order.createdAt || new Date().toISOString()),
            paymentMethod: "cash_on_delivery",
          },
        });
      }
    } catch (err: any) {
      Alert.alert("Order Failed", err?.response?.data?.message || "Could not place cash on delivery order.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Method</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Choose Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Payment Method</Text>
          <Text style={styles.sectionSubtitle}>
            Select how you'd like to pay for your order
          </Text>

          {/* Stripe Card Option */}
          <TouchableOpacity
            style={[
              styles.paymentCard,
              selectedPayment === "stripe_card" && styles.paymentCardSelected,
            ]}
            onPress={() => setSelectedPayment("stripe_card")}
          >
            <View style={styles.paymentCardHeader}>
              <View style={styles.paymentCardLeft}>
                <View style={styles.radioButton}>
                  {selectedPayment === "stripe_card" && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
                <Ionicons
                  name="card-outline"
                  size={24}
                  color="#2C1A3F"
                  style={styles.paymentIcon}
                />
                <View>
                  <Text style={styles.paymentTitle}>Stripe (Card)</Text>
                  <Text style={styles.paymentSubtitle}>
                    Visa, Mastercard, American Express
                  </Text>
                </View>
              </View>
              {selectedPayment === "stripe_card" && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>Secure</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Cash on Delivery Option */}
          <TouchableOpacity
            style={[
              styles.paymentCard,
              selectedPayment === "cash_on_delivery" && styles.paymentCardSelected,
              { marginTop: 12 },
            ]}
            onPress={() => setSelectedPayment("cash_on_delivery")}
          >
            <View style={styles.paymentCardHeader}>
              <View style={styles.paymentCardLeft}>
                <View style={styles.radioButton}>
                  {selectedPayment === "cash_on_delivery" && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
                <Ionicons
                  name="cash-outline"
                  size={24}
                  color="#2C1A3F"
                  style={styles.paymentIcon}
                />
                <View>
                  <Text style={styles.paymentTitle}>Cash on Delivery</Text>
                  <Text style={styles.paymentSubtitle}>
                    Pay in cash when your order arrives
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Payment Features */}
        <View style={styles.featuresSection}>
          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="flash" size={20} color="#9C7EC5" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Stripe</Text>
              <Text style={styles.featureDescription}>
                Secure payment processing
              </Text>
            </View>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Secure Payment</Text>
              <Text style={styles.featureDescription}>
                Your payment information is encrypted and secure. We never see
                your card details
              </Text>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>Rs. {orderSummary.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>
              Rs. {orderSummary.deliveryFee}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>Rs. {orderSummary.total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.continueButton, processing && { opacity: 0.7 }]}
          onPress={handleContinue}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.continueButtonText}>
              {selectedPayment === "stripe_card" ? "Continue to Stripe Card" : "Place COD Order"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#5A3D7A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#F5F3F7",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2C1A3F",
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#6B5B7F",
    marginBottom: 16,
    lineHeight: 18,
  },
  paymentCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5DFF0",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  paymentCardSelected: {
    borderColor: "#5A3D7A",
    backgroundColor: "#FAF8FC",
  },
  paymentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#5A3D7A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#5A3D7A",
  },
  paymentIcon: {
    marginRight: 12,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2C1A3F",
    marginBottom: 2,
  },
  paymentSubtitle: {
    fontSize: 12,
    color: "#8B7BA8",
    lineHeight: 16,
  },
  popularBadge: {
    backgroundColor: "#5A3D7A",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  featuresSection: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F3F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C1A3F",
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: "#6B5B7F",
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2C1A3F",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B5B7F",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C1A3F",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5DFF0",
    marginVertical: 12,
  },
  totalRow: {
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2C1A3F",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#5A3D7A",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5DFF0",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  continueButton: {
    backgroundColor: "#5A3D7A",
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});

export default PaymentMethodScreen;

