import React from "react";
import { Stack } from "expo-router";
import { CartProvider } from "../contexts/CartContext";
import { FavoritesProvider } from "../contexts/FavoritesContext";
import { MealPlanProvider } from "../contexts/MealPlanContext";

export default function LayoutStack() {
  return (
    <CartProvider>
      <FavoritesProvider>
        <MealPlanProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="signIn" />
            <Stack.Screen name="forgotPassword" />
            <Stack.Screen name="verifyOTP" />
            <Stack.Screen name="verifyEmailOTP" />
            <Stack.Screen name="resetPassword" />
            <Stack.Screen name="googleSignIn" />
            <Stack.Screen name="dietaryPreference" />
            <Stack.Screen name="bmiCalculator" />
            <Stack.Screen name="healthGoal" />
            <Stack.Screen name="allergenPreference" />
            <Stack.Screen name="home" />
            <Stack.Screen name="search" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="favorites" />
            <Stack.Screen name="editProfile" />
            <Stack.Screen name="recipeDetails" />
            <Stack.Screen name="instructions" />
            <Stack.Screen name="nutritionalBreakdown" />
            <Stack.Screen name="macronutrients" />
            <Stack.Screen name="micronutrients" />
            <Stack.Screen name="seeAllergens" />
            <Stack.Screen name="saveSubstitution" />
            <Stack.Screen name="viewCart" />
            <Stack.Screen name="checkoutSummary" />
            <Stack.Screen name="paymentMethod" />
            <Stack.Screen name="cardDetails" />
            <Stack.Screen name="paymentSuccessful" />
            <Stack.Screen name="orderHistory" />
            <Stack.Screen name="ingredientCatalog" />
            <Stack.Screen name="mealPlan" />
            <Stack.Screen name="bmiAnalytics" />
            <Stack.Screen name="admin" />
          </Stack>
        </MealPlanProvider>
      </FavoritesProvider>
    </CartProvider>
  );
}
