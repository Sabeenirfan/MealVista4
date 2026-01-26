import { Stack } from "expo-router";
import { CartProvider } from "../contexts/CartContext";
import { FavoritesProvider } from "../contexts/FavoritesContext";

export default function Layout() {
  return (
    <CartProvider>
      <FavoritesProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" /> {/* Splash */}
          <Stack.Screen name="signup" /> {/* Sign Up */}
          <Stack.Screen name="signIn" /> {/* Sign In */}
          <Stack.Screen name="forgotPassword" /> {/* Forgot Password */}
          <Stack.Screen name="verifyOTP" /> {/* Verify OTP */}
          <Stack.Screen name="verifyEmailOTP" /> {/* Verify Email OTP */}
          <Stack.Screen name="resetPassword" /> {/* Reset Password */}
          <Stack.Screen name="googleSignIn" /> {/* Google Sign In */}
          <Stack.Screen name="dietaryPreference" /> {/* Dietary Preference */}
          <Stack.Screen name="bmiCalculator" /> {/* BMI Calculator */}
          <Stack.Screen name="healthGoal" /> {/* Health Goal */}
          <Stack.Screen name="allergenPreference" /> {/* Allergen Preference */}
          <Stack.Screen name="home" /> {/* Home Screen */}
          <Stack.Screen name="search" /> {/* AI Search Screen */}
          <Stack.Screen name="profile" /> {/* Profile Screen */}
          <Stack.Screen name="favorites" /> {/* Favorites */}
          <Stack.Screen name="editProfile" /> {/* Edit Profile */}
          <Stack.Screen name="recipeDetails" /> {/* Recipe Details */}
          <Stack.Screen name="instructions" /> {/* Instructions */}
          <Stack.Screen name="nutritionalBreakdown" /> {/* Nutritional Breakdown */}
          <Stack.Screen name="macronutrients" /> {/* Macronutrients */}
          <Stack.Screen name="micronutrients" /> {/* Micronutrients */}
          <Stack.Screen name="seeAllergens" /> {/* See Allergens */}
          <Stack.Screen name="saveSubstitution" /> {/* Save Substitution */}
          <Stack.Screen name="viewCart" /> {/* View Cart */}
          <Stack.Screen name="checkoutSummary" /> {/* Checkout Summary */}
          <Stack.Screen name="paymentMethod" /> {/* Payment Method */}
          <Stack.Screen name="cardDetails" /> {/* Card Details */}
          <Stack.Screen name="paymentSuccessful" /> {/* Payment Successful */}
          <Stack.Screen name="orderHistory" /> {/* Order History */}
          <Stack.Screen name="admin" /> {/* Admin Panel */}
        </Stack>
      </FavoritesProvider>
    </CartProvider>
  );
}
