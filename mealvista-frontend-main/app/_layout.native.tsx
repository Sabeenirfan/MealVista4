import React from "react";
import { StripeProvider } from "@stripe/stripe-react-native";
import LayoutStack from "./LayoutStack";

export default function NativeLayout() {
  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""}>
      <LayoutStack />
    </StripeProvider>
  );
}
