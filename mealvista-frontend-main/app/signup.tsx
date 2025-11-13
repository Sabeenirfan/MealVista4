import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { signup, loginWithGoogle } from "../lib/authService";
import {
  buildGoogleAuthRequestConfig,
  getGoogleClientIdIssue,
  getGoogleClientIds,
} from "../lib/googleAuth";
import { isValidGmail, isStrongPassword, isNonEmpty } from "../lib/validators";
import { getOnboardingStatus } from "../lib/onboardingStorage";

WebBrowser.maybeCompleteAuthSession();

export default function MealVistaSignUp() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  const googleClientIds = useMemo(() => getGoogleClientIds(), []);
  const googleConfig = useMemo(
    () => buildGoogleAuthRequestConfig(Platform.OS, googleClientIds),
    [googleClientIds]
  );
  const googleClientIdIssue = useMemo(
    () => getGoogleClientIdIssue(Platform.OS, googleClientIds),
    [googleClientIds]
  );

  // Google Auth Button Component
  function GoogleAuthButton() {
    const [request, response, promptAsync] = Google.useAuthRequest(googleConfig as any);

    useEffect(() => {
      const handleGoogleResponse = async () => {
        if (!response) return;

        if (response.type === "success" && response.authentication?.idToken) {
          try {
            setGoogleLoading(true);
            const authResponse = await loginWithGoogle({ idToken: response.authentication.idToken });
            setErrorMessage(null);
            // Route based on user role
            if (authResponse.user?.isAdmin === true || authResponse.user?.role === 'admin') {
              router.replace("/admin/dashboard");
            } else {
              // Check if onboarding is complete (for existing Google users)
              const onboardingComplete = await getOnboardingStatus();
              if (onboardingComplete) {
                router.replace("/home");
              } else {
                router.replace("/dietaryPreference");
              }
            }
          } catch (error: unknown) {
            console.error('[Google Sign-Up] Backend error:', error);
            const message =
              typeof error === "object" && error !== null && "response" in error
                ? (error as any).response?.data?.message ?? "Google sign-up failed"
                : "Google sign-up failed";
            setErrorMessage(message);
          } finally {
            setGoogleLoading(false);
          }
        } else if (response.type === "error") {
          console.error('[Google Sign-Up] OAuth error:', response.error);
          const errorMsg = response.error?.message || "Google sign-up failed. Please try again.";
          setErrorMessage(errorMsg);
          setGoogleLoading(false);
        } else if (response.type === "cancel") {
          setErrorMessage("Google sign-up was cancelled.");
          setGoogleLoading(false);
        }
      };

      handleGoogleResponse();
    }, [response, router]);

    return (
      <TouchableOpacity
        style={
          (googleLoading || googleClientIdIssue) ? [styles.googleButton, styles.googleButtonDisabled] : styles.googleButton
        }
        onPress={async () => {
          if (googleClientIdIssue) {
            setErrorMessage(googleClientIdIssue);
            return;
          }

          if (!request) {
            setErrorMessage("Google Sign-Up is not available right now. Please try again.");
            return;
          }

          try {
            setErrorMessage(null);
            setGoogleLoading(true);
            const result = await promptAsync();
            if (result.type !== "success") {
              setGoogleLoading(false);
              if (result.type === "cancel") {
                setErrorMessage("Google sign-up was cancelled.");
              }
            }
          } catch (error) {
            console.error("Google sign-up error", error);
            setErrorMessage("Google sign-up failed. Please try again.");
            setGoogleLoading(false);
          }
        }}
        disabled={googleLoading || Boolean(googleClientIdIssue)}
      >
        {googleLoading ? (
          <View style={styles.googleLoadingContent}>
            <ActivityIndicator size="small" color="#DB4437" />
            <Text style={styles.googleButtonText}>Connecting...</Text>
          </View>
        ) : (
          <View style={styles.googleContent}>
            <Ionicons name="logo-google" size={20} color="#DB4437" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  const validateForm = () => {
    const errors: { name?: string; email?: string; password?: string } = {};

    if (!isNonEmpty(fullName)) {
      errors.name = "Full name is required";
    }

    if (!isNonEmpty(email)) {
      errors.email = "Email is required";
    } else if (!isValidGmail(email)) {
      errors.email = "Email must be a valid Gmail address";
    }

    if (!isNonEmpty(password)) {
      errors.password = "Password is required";
    } else if (!isStrongPassword(password)) {
      errors.password = "Password must be at least 8 characters and include uppercase, lowercase, and a number";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignUp = async () => {
    setErrorMessage(null);
    setValidationErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const response = await signup({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      // Immediately navigate to login after successful signup
      router.replace("/signIn");
    } catch (error: unknown) {
      console.error('Signup error:', error);
      let message = "Unable to sign up";

      if (typeof error === "object" && error !== null) {
        if ("response" in error) {
          // Server returned an error response
          message = (error as any).response?.data?.message ?? "Unable to sign up";
        } else if ((error as any).message === "Network Error") {
          // Network error (server not reachable)
          message = "Unable to connect to server. Please check your internet connection and try again.";
        } else if (error instanceof Error) {
          message = error.message;
        }
      }

      Alert.alert(
        "Sign Up Failed",
        message,
        [{ text: "OK" }]
      );
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => router.push("/googleSignIn");

  const handleLogin = () => router.push("/signIn");

  const handleNameChange = (value: string) => {
    if (validationErrors.name) {
      setValidationErrors({ ...validationErrors, name: undefined });
    }
    if (errorMessage) {
      setErrorMessage(null);
    }
    setFullName(value);
  };

  const handleEmailChange = (value: string) => {
    if (validationErrors.email) {
      setValidationErrors({ ...validationErrors, email: undefined });
    }
    if (errorMessage) {
      setErrorMessage(null);
    }
    setEmail(value);
  };

  const handlePasswordChange = (value: string) => {
    if (validationErrors.password) {
      setValidationErrors({ ...validationErrors, password: undefined });
    }
    if (errorMessage) {
      setErrorMessage(null);
    }
    setPassword(value);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Back Arrow */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#3C2253" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.purpleHeader}>
          <Text style={styles.title}>Sign Up</Text>
          <Text style={styles.subtitle}>Create your MealVista account</Text>
        </View>

        {/* Card & Inputs */}
        <View style={styles.card}>
          {/* Full Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <View style={[
              styles.inputWrapper,
              validationErrors.name && styles.inputWrapperError
            ]}>
              <Ionicons name="person-outline" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#9CA3AF"
                value={fullName}
                onChangeText={handleNameChange}
                autoCapitalize="words"
              />
            </View>
            {validationErrors.name && (
              <Text style={styles.errorText}>{validationErrors.name}</Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <View style={[
              styles.inputWrapper,
              validationErrors.email && styles.inputWrapperError
            ]}>
              <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {validationErrors.email && (
              <Text style={styles.errorText}>{validationErrors.email}</Text>
            )}
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={[
              styles.inputWrapper,
              validationErrors.password && styles.inputWrapperError
            ]}>
              <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Create a strong password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.passwordHint}>
              Must contain uppercase, lowercase, number and 8+ characters
            </Text>
            {validationErrors.password && (
              <Text style={styles.errorText}>{validationErrors.password}</Text>
            )}
          </View>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          {/* Buttons */}
          <TouchableOpacity 
            style={styles.signUpButton} 
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.signUpButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign Up Button */}
          {googleClientIdIssue ? (
            <>
              <TouchableOpacity style={[styles.googleButton, styles.googleButtonDisabled]} disabled>
                <View style={styles.googleContent}>
                  <Ionicons name="logo-google" size={20} color="#DB4437" />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.helperText}>{googleClientIdIssue}</Text>
            </>
          ) : (
            <GoogleAuthButton />
          )}

          <Text style={styles.termsText}>
            By signing up, you agree to our{" "}
            <Text style={styles.link}>Terms of Service</Text> and{" "}
            <Text style={styles.link}>Privacy Policy</Text>
          </Text>
        </View>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={handleLogin}>
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { flexGrow: 1 },
  backButton: { position: "absolute", top: 40, left: 20, zIndex: 10 },
  purpleHeader: {
    backgroundColor: "#3C2253",
    alignItems: "center",
    justifyContent: "center",
    height: 156,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  subtitle: { fontSize: 14, color: "#FFFFFF", opacity: 0.9 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    marginTop: -30,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "500", color: "#374151", marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  input: { flex: 1, fontSize: 14, color: "#111827" },
  passwordInput: { paddingRight: 40 },
  eyeIcon: { position: "absolute", right: 14, padding: 4 },
  passwordHint: { fontSize: 11, color: "#6B7280", marginTop: 6 },
  inputWrapperError: {
    borderWidth: 1,
    borderColor: "#DC2626",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    color: "#6B7280",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
  },
  signUpButton: {
    backgroundColor: "#3C2253",
    borderRadius: 25,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  signUpButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  dividerText: { marginHorizontal: 12, fontSize: 12, color: "#6B7280" },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    height: 48,
    marginBottom: 20,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleLoadingContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  googleContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  googleButtonText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  termsText: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 16,
  },
  link: { color: "#3C2253", textDecorationLine: "underline" },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  loginText: { fontSize: 13, color: "#6B7280" },
  loginLink: { fontSize: 13, color: "#3C2253", fontWeight: "600" },
});
