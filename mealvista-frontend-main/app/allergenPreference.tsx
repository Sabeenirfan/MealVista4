import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { setOnboardingComplete } from "../lib/onboardingStorage";

interface Allergen {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "main" | "other";
}

const allergens: Allergen[] = [
  {
    id: "eggs",
    name: "Eggs",
    description: "Chicken eggs and egg-based products",
    icon: "🥚",
    category: "main",
  },
  {
    id: "soy",
    name: "Soy",
    description: "Soybeans, soy sauce, tofu, tempeh",
    icon: "🫘",
    category: "main",
  },
  {
    id: "fish",
    name: "Fish",
    description: "Salmon, tuna cod, bass, trout",
    icon: "🐟",
    category: "main",
  },
  {
    id: "peanuts",
    name: "Peanuts",
    description: "Peanuts and peanut-based products",
    icon: "🥜",
    category: "main",
  },
  {
    id: "sesame",
    name: "Sesame",
    description: "Sesame seeds, tahini, sesame oil",
    icon: "🌰",
    category: "other",
  },
  {
    id: "sulfites",
    name: "Sulfites",
    description: "Wine, dried fruits, processed foods",
    icon: "🍃",
    category: "other",
  },
  {
    id: "mustard",
    name: "Mustard",
    description: "Mustard seeds, mustard powder, prepared mustard",
    icon: "🌭",
    category: "other",
  },
  {
    id: "celery",
    name: "Celery",
    description: "Celery stalks, celery seeds",
    icon: "🥬",
    category: "other",
  },
];

export default function AllergenPreferenceScreen() {
  const router = useRouter();
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);

  const handleToggleAllergen = (id: string) => {
    setSelectedAllergens((prev) =>
      prev.includes(id) ? prev.filter((allergenId) => allergenId !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    const selectedNames = allergens
      .filter((a) => selectedAllergens.includes(a.id))
      .map((a) => a.name)
      .join(", ");

    // Here you would save preferences to backend
    console.log("Allergen preferences saved:", selectedAllergens);
    
    try {
      // Save preferences to backend (you would add API call here)
      console.log("Allergen preferences saved:", selectedAllergens);
      
      // Mark onboarding as complete - this should happen BEFORE navigation
      await setOnboardingComplete();
      
      // Navigate to home screen immediately without waiting for alert
      router.push({
        pathname: "/home",
        replace: true
      } as any);
      
      // Show success message after trying to navigate
      Alert.alert(
        "Success",
        selectedAllergens.length === 0
          ? "No allergen restrictions saved"
          : `Allergen preferences saved: ${selectedNames}`
      );
    } catch (error) {
      console.error("Error saving preferences:", error);
      Alert.alert(
        "Error",
        "There was a problem saving your preferences. Please try again."
      );
    }
  };

  const handleBack = () => {
    router.back();
  };

  const mainAllergens = allergens.filter((a) => a.category === "main");
  const otherAllergens = allergens.filter((a) => a.category === "other");

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2253" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Allergen Preferences</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.description}>
          Select ingredients you want to avoid:
        </Text>

        {/* Main Allergens */}
        <View style={styles.section}>
          {mainAllergens.map((allergen) => (
            <AllergenItem
              key={allergen.id}
              allergen={allergen}
              isSelected={selectedAllergens.includes(allergen.id)}
              onToggle={() => handleToggleAllergen(allergen.id)}
            />
          ))}
        </View>

        {/* Other Allergens */}
        {otherAllergens.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Other Allergens</Text>
            {otherAllergens.map((allergen) => (
              <AllergenItem
                key={allergen.id}
                allergen={allergen}
                isSelected={selectedAllergens.includes(allergen.id)}
                onToggle={() => handleToggleAllergen(allergen.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Preferences</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AllergenItem({
  allergen,
  isSelected,
  onToggle,
}: {
  allergen: Allergen;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.allergenItem}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{allergen.icon}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.allergenName}>{allergen.name}</Text>
        <Text style={styles.allergenDescription}>{allergen.description}</Text>
      </View>
      <View style={styles.checkboxContainer}>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && (
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    backgroundColor: "#3C2253",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
    height: 116,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "400",
    color: "#FFFFFF",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  description: {
    fontSize: 14,
    color: "#333333",
    marginTop: 16,
    marginBottom: 8,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333333",
    marginBottom: 12,
  },
  allergenItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  allergenName: {
    fontSize: 16,
    fontWeight: "400",
    color: "#333333",
    marginBottom: 2,
  },
  allergenDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 17,
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: "#3C2253",
    borderColor: "#3C2253",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  saveButton: {
    backgroundColor: "#3C2253",
    borderRadius: 100,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "400",
    color: "#FFFFFF",
  },
});

