import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type CheckedSteps = {
  [key: number]: boolean;
};

const CookingInstructionsScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mealTitle = params.mealTitle as string || "Recipe";
  const [checkedSteps, setCheckedSteps] = useState<CheckedSteps>({});

  const toggleStep = (stepId: number) => {
    setCheckedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const handleBack = () => {
    router.back();
  };

  const instructions = [
    {
      id: 1,
      text: "Bring a large pot of salted water to boil and add pasta. Cook according to package directions until al dente.",
      time: "8-10 minutes",
      note: "Use salt the water generously - it should taste like sea water",
    },
    {
      id: 2,
      text: "Heat olive oil in a large skillet and cook chicken breast until golden brown.",
      details: [
        "Heat olive oil in a large skillet or pan over medium high heat",
        "Season chicken breast with salt and pepper and add to the hot pan. Cook and golden brown on both sides",
      ],
    },
    {
      id: 3,
      text: "Add broccoli florets to the pan with chicken. Stir and cook until broccoli is tender crisp",
    },
    {
      id: 4,
      text: "Drain pasta and add it to the pan. Toss everything together and season with more salt, pepper, and parmesan cheese",
    },
    {
      id: 5,
      text: "Serve immediately while hot, garnished with fresh herbs and extra parmesan if desired.",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cooking Instructions</Text>
          <TouchableOpacity style={styles.homeButton} onPress={() => router.push('/home')}>
            <Ionicons name="home" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.recipeCard}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800",
            }}
            style={styles.recipeImage}
          />
          <View style={styles.recipeInfo}>
            <Text style={styles.recipeTitle}>{mealTitle}</Text>
            <Text style={styles.recipeSteps}>Step 1 of 4</Text>
          </View>
        </View>
        <View style={styles.instructionsSection}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          {instructions.map((instruction) => (
            <View key={instruction.id} style={styles.stepContainer}>
              <TouchableOpacity
                style={styles.stepNumber}
                onPress={() => toggleStep(instruction.id)}
              >
                {checkedSteps[instruction.id] ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <Text style={styles.stepNumberText}>{instruction.id}</Text>
                )}
              </TouchableOpacity>
              <View style={styles.stepContent}>
                <Text
                  style={[
                    styles.stepText,
                    checkedSteps[instruction.id] && styles.stepTextChecked,
                  ]}
                >
                  {instruction.text}
                </Text>
                {instruction.time && (
                  <View style={styles.timeContainer}>
                    <Ionicons name="time-outline" size={14} color="#8B7BA8" />
                    <Text style={styles.timeText}>{instruction.time}</Text>
                  </View>
                )}
                {instruction.note && (
                  <Text style={styles.noteText}>{instruction.note}</Text>
                )}
                {instruction.details &&
                  instruction.details.map((detail, idx) => (
                    <Text key={idx} style={styles.detailText}>
                      • {detail}
                    </Text>
                  ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
        <View style={styles.bottomButtons}>
        <TouchableOpacity style={styles.readButton}>
          <Ionicons name="volume-medium" size={20} color="#fff" />
          <Text style={styles.readButtonText}>Read instructions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButtonBottom} onPress={() => {}} disabled>
          <Ionicons name="arrow-back" size={20} color="#5A3D7A" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton}>
          <Text style={styles.nextButtonText}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#5A3D7A" },
  scrollView: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 8,
    justifyContent: 'space-between',
  },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 18, color: "#fff", fontWeight: "500", flex: 1, textAlign: 'center' },
  homeButton: { marginLeft: 12 },
  recipeCard: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recipeImage: { width: "100%", height: 180 },
  recipeInfo: { padding: 16, alignItems: "center" },
  recipeTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2C1A3F",
    marginBottom: 4,
  },
  recipeSteps: { fontSize: 14, color: "#8B7BA8" },
  instructionsSection: {
    backgroundColor: "#F5F3F7",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C1A3F",
    marginBottom: 16,
  },
  stepContainer: { flexDirection: "row", marginBottom: 20 },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#5A3D7A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  stepContent: { flex: 1 },
  stepText: { fontSize: 15, color: "#2C1A3F", lineHeight: 22, marginBottom: 8 },
  stepTextChecked: { textDecorationLine: "line-through", color: "#8B7BA8" },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  timeText: { fontSize: 13, color: "#8B7BA8", marginLeft: 6 },
  noteText: {
    fontSize: 13,
    color: "#8B7BA8",
    fontStyle: "italic",
    lineHeight: 18,
  },
  detailText: { fontSize: 14, color: "#6B5B7F", lineHeight: 20, marginTop: 4 },
  bottomButtons: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    gap: 12,
  },
  readButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5A3D7A",
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
  },
  readButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  backButtonBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F3F7",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 6,
  },
  backButtonText: { color: "#5A3D7A", fontSize: 14, fontWeight: "600" },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5A3D7A",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 6,
  },
  nextButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});

export default CookingInstructionsScreen;
