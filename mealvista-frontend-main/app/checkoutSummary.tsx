import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCart } from "../contexts/CartContext";

const CheckoutSummaryScreen = () => {
  const router = useRouter();
  const { cartItems, getTotalPrice } = useCart();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [errors, setErrors] = useState<{
    fullName?: string;
    phone?: string;
    addressLine?: string;
    city?: string;
  }>({});

  const subtotal = getTotalPrice();
  const deliveryFee = 30;
  const total = subtotal + deliveryFee;
  const itemCount = cartItems.length;

  const validateDeliveryDetails = () => {
    const nextErrors: {
      fullName?: string;
      phone?: string;
      addressLine?: string;
      city?: string;
    } = {};

    const cleanedName = fullName.trim();
    const cleanedPhone = phone.trim();
    const cleanedAddress = addressLine.trim();
    const cleanedCity = city.trim();
    const cityRegex = /^[A-Za-z\s.-]{2,50}$/;
    const phoneDigits = cleanedPhone.replace(/\D/g, "");

    if (!cleanedName) nextErrors.fullName = "Full name is required";
    else if (cleanedName.length < 3 || cleanedName.length > 60) {
      nextErrors.fullName = "Name must be 3 to 60 characters";
    }

    if (!cleanedPhone) nextErrors.phone = "Phone number is required";
    else if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      nextErrors.phone = "Phone must contain 10 to 15 digits";
    }

    if (!cleanedAddress) nextErrors.addressLine = "Address is required";
    else if (cleanedAddress.length < 8 || cleanedAddress.length > 150) {
      nextErrors.addressLine = "Address must be 8 to 150 characters";
    }

    if (!cleanedCity) nextErrors.city = "City is required";
    else if (!cityRegex.test(cleanedCity)) {
      nextErrors.city = "City format is invalid";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleProceedToPayment = () => {
    const isValid = validateDeliveryDetails();
    if (!isValid) {
      Alert.alert("Invalid Details", "Please correct delivery details before continuing.");
      return;
    }

    router.push({
      pathname: "/paymentMethod",
      params: {
        fullName: fullName.trim(),
        phone: phone.trim(),
        addressLine: addressLine.trim(),
        city: city.trim(),
        notes: deliveryNotes.trim(),
      },
    });
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
        <Text style={styles.headerTitle}>Checkout Summary</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Items Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cart-outline" size={18} color="#5A3D7A" />
            <Text style={styles.cardTitle}>Your Order ({itemCount} items)</Text>
          </View>
          {cartItems.map((item, index) => (
            <View key={item.id}>
              <View style={styles.orderItem}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>Rs. {(item.price * item.quantity).toFixed(2)}</Text>
              </View>
              {index < cartItems.length - 1 && <View style={styles.itemDivider} />}
            </View>
          ))}

          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>Rs. {subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>Rs. {deliveryFee}</Text>
            </View>
            <View style={styles.divider} />
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>Rs. {total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Delivery Information Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={(value) => {
                setFullName(value);
                if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
              }}
              placeholder="Enter full name"
              placeholderTextColor="#9CA3AF"
            />
            {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(value) => {
                setPhone(value);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              placeholder="03xx-xxxxxxx"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address</Text>
            <TextInput
              style={styles.input}
              value={addressLine}
              onChangeText={(value) => {
                setAddressLine(value);
                if (errors.addressLine) setErrors((prev) => ({ ...prev, addressLine: undefined }));
              }}
              placeholder="House / street / area"
              placeholderTextColor="#9CA3AF"
            />
            {errors.addressLine ? <Text style={styles.errorText}>{errors.addressLine}</Text> : null}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>City</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={(value) => {
                setCity(value);
                if (errors.city) setErrors((prev) => ({ ...prev, city: undefined }));
              }}
              placeholder="Enter city"
              placeholderTextColor="#9CA3AF"
            />
            {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 70, textAlignVertical: "top" }]}
              value={deliveryNotes}
              onChangeText={setDeliveryNotes}
              placeholder="Landmark, instructions, etc."
              placeholderTextColor="#9CA3AF"
              multiline
            />
          </View>
        </View>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#4CAF50" />
          <Text style={styles.securityText}>
            Your payment information is secure and encrypted
          </Text>
        </View>
      </ScrollView>

      {/* Proceed Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.proceedButton}
          onPress={handleProceedToPayment}
        >
          <Text style={styles.proceedButtonText}>
            Continue • Rs. {total.toFixed(2)}
          </Text>
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#5A3D7A",
    marginLeft: 8,
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 10,
  },
  itemLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    color: "#2C1A3F",
    fontWeight: "500",
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 13,
    color: "#8B7BA8",
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2C1A3F",
    marginLeft: 16,
  },
  itemDivider: {
    height: 1,
    backgroundColor: "#F0EDF5",
  },
  summarySection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5DFF0",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
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
    marginVertical: 10,
  },
  totalRow: {
    marginBottom: 0,
    marginTop: 4,
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2C1A3F",
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B5B7F",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: 6,
  },
  infoValue: {
    fontSize: 14,
    color: "#2C1A3F",
    lineHeight: 20,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
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
    marginRight: 8,
  },
  paymentText: {
    fontSize: 15,
    color: "#2C1A3F",
    fontWeight: "500",
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 8,
  },
  securityText: {
    fontSize: 12,
    color: "#6B5B7F",
    marginLeft: 6,
    flex: 1,
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
  proceedButton: {
    backgroundColor: "#5A3D7A",
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});

export default CheckoutSummaryScreen;

