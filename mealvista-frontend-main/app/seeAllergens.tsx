import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getStoredToken } from '../lib/authStorage';
import api from '../lib/api';

interface DetectedAllergen {
  name: string;
  severity: 'high' | 'medium' | 'low';
  emoji: string;
  triggerIngredients: string[];
  description: string;
  affectsUser: boolean;
}

interface AllergenResult {
  detectedAllergens: DetectedAllergen[];
  safeForUser: boolean;
  summary: string;
  totalAllergens: number;
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  high: { bg: '#FFF1F2', border: '#FECDD3', text: '#BE123C', badge: '#FEE2E2' },
  medium: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', badge: '#FEF3C7' },
  low: { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', badge: '#D1FAE5' },
};

const SEVERITY_COLOR: Record<string, string> = {
  high: '#DC2626', medium: '#D97706', low: '#059669',
};

export default function SeeAllergens() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const mealTitle = params.mealTitle as string || 'Recipe';
  const mealImage = params.mealImage as string || '';

  let ingredientsList: string[] = [];
  try {
    const raw = params.ingredients as string;
    const parsed = raw ? JSON.parse(raw) : [];
    ingredientsList = Array.isArray(parsed)
      ? parsed.map((i: any) => typeof i === 'string' ? i : i.name || String(i))
      : [];
  } catch { }

  const [result, setResult] = useState<AllergenResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analyzeAllergens();
  }, []);

  const analyzeAllergens = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getStoredToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await api.post(
        '/api/allergens/check',
        { recipeName: mealTitle, ingredients: ingredientsList },
        { headers }
      );

      if (response.data.success) {
        setResult(response.data);
      } else {
        throw new Error(response.data.message || 'Analysis failed');
      }
    } catch (err: any) {
      console.error('[SeeAllergens] Error:', err.message);
      setError('Could not analyze allergens. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGetSubstitution = (allergen: DetectedAllergen) => {
    router.push({
      pathname: '/saveSubstitution',
      params: {
        mealTitle,
        mealImage,
        ingredients: JSON.stringify(ingredientsList),
        allergenToReplace: allergen.name,
        allergenIngredients: JSON.stringify(allergen.triggerIngredients),
      },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2253" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Allergen Analysis</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Recipe image */}
        {mealImage ? (
          <Image source={{ uri: mealImage }} style={styles.recipeImage} resizeMode="cover" />
        ) : null}

        <View style={styles.content}>
          <View style={styles.aiBadge}>
            <Feather name="cpu" size={13} color="#7C3AED" />
            <Text style={styles.aiBadgeText}>AI-Powered Analysis · GPT-4o-mini</Text>
          </View>
          <Text style={styles.recipeTitle}>{mealTitle}</Text>

          {/* Loading State */}
          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#3C2253" />
              <Text style={styles.loadingTitle}>Analyzing Allergens...</Text>
              <Text style={styles.loadingSubtitle}>
                OpenAI is checking {ingredientsList.length} ingredient{ingredientsList.length !== 1 ? 's' : ''} against 14 major allergen groups
              </Text>
            </View>
          )}

          {/* Error State */}
          {!loading && error && (
            <View style={styles.errorBox}>
              <Feather name="wifi-off" size={24} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={analyzeAllergens}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Results */}
          {!loading && result && (
            <>
              {/* Summary Banner */}
              <View style={[styles.summaryBanner, { backgroundColor: result.safeForUser ? '#F0FDF4' : '#FEF2F2', borderColor: result.safeForUser ? '#BBF7D0' : '#FECDD3' }]}>
                <Feather name={result.safeForUser ? 'check-circle' : 'alert-triangle'} size={20} color={result.safeForUser ? '#059669' : '#DC2626'} />
                <View style={styles.summaryText}>
                  <Text style={[styles.summaryTitle, { color: result.safeForUser ? '#166534' : '#991B1B' }]}>
                    {result.totalAllergens === 0 ? '✓ No allergens detected' : `⚠️ ${result.totalAllergens} allergen${result.totalAllergens !== 1 ? 's' : ''} detected`}
                  </Text>
                  <Text style={[styles.summarySub, { color: result.safeForUser ? '#166534' : '#991B1B' }]}>
                    {result.summary}
                  </Text>
                </View>
              </View>

              {/* No allergens */}
              {result.detectedAllergens.length === 0 && (
                <View style={styles.noAllergensBox}>
                  <Text style={styles.noAllergensEmoji}>🎉</Text>
                  <Text style={styles.noAllergensTitle}>This recipe appears allergen-free!</Text>
                  <Text style={styles.noAllergensText}>
                    No common allergens were detected in the ingredients list.
                  </Text>
                </View>
              )}

              {/* Allergen Cards */}
              {result.detectedAllergens.map((allergen, idx) => {
                const s = SEVERITY_STYLES[allergen.severity] || SEVERITY_STYLES.low;
                const color = SEVERITY_COLOR[allergen.severity] || '#059669';
                return (
                  <View key={idx} style={[styles.allergenCard, { backgroundColor: s.bg, borderColor: s.border }]}>
                    <View style={styles.allergenCardTop}>
                      <View style={[styles.allergenEmojiBubble, { backgroundColor: s.badge }]}>
                        <Text style={styles.allergenEmoji}>{allergen.emoji}</Text>
                      </View>
                      <View style={styles.allergenInfo}>
                        <View style={styles.allergenTitleRow}>
                          <Text style={[styles.allergenName, { color: s.text }]}>{allergen.name}</Text>
                          {allergen.affectsUser && (
                            <View style={styles.youBadge}>
                              <Text style={styles.youBadgeText}>⚠️ Affects You</Text>
                            </View>
                          )}
                        </View>
                        <View style={[styles.severityBadge, { backgroundColor: s.badge }]}>
                          <View style={[styles.severityDot, { backgroundColor: color }]} />
                          <Text style={[styles.severityText, { color }]}>
                            {allergen.severity.charAt(0).toUpperCase() + allergen.severity.slice(1)} Risk
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Text style={[styles.allergenDesc, { color: s.text }]}>{allergen.description}</Text>

                    {allergen.triggerIngredients.length > 0 && (
                      <View style={styles.triggerRow}>
                        <Text style={[styles.triggerLabel, { color: s.text }]}>Found in: </Text>
                        <Text style={[styles.triggerIngredients, { color: s.text }]}>
                          {allergen.triggerIngredients.join(', ')}
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.substituteBtn, { borderColor: color }]}
                      onPress={() => handleGetSubstitution(allergen)}
                    >
                      <Feather name="refresh-cw" size={14} color={color} />
                      <Text style={[styles.substituteBtnText, { color }]}>
                        Get AI Substitutions for {allergen.name}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              {/* Ingredients scanned */}
              {ingredientsList.length > 0 && (
                <View style={styles.ingredientsScanned}>
                  <Text style={styles.ingredientsScannedTitle}>
                    <Feather name="search" size={13} color="#6B7280" /> Ingredients Scanned ({ingredientsList.length})
                  </Text>
                  <Text style={styles.ingredientsScannedList}>
                    {ingredientsList.join(' · ')}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#3C2253', paddingHorizontal: 16,
    paddingTop: 50, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  placeholder: { width: 40 },

  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  recipeImage: { width: '100%', height: 200 },

  content: { padding: 20 },

  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F5F3FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    alignSelf: 'flex-start', marginBottom: 10, borderWidth: 1, borderColor: '#DDD6FE',
  },
  aiBadgeText: { fontSize: 12, color: '#7C3AED', fontWeight: '600' },

  recipeTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', marginBottom: 20, lineHeight: 28 },

  loadingBox: {
    alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 32,
    marginBottom: 20, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6,
    elevation: 2,
  },
  loadingTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  loadingSubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 18 },

  errorBox: {
    alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 14, padding: 24,
    marginBottom: 20, gap: 12, borderWidth: 1, borderColor: '#FECDD3',
  },
  errorText: { fontSize: 14, color: '#991B1B', textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#DC2626', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  summaryBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 20,
  },
  summaryText: { flex: 1 },
  summaryTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  summarySub: { fontSize: 13, lineHeight: 18 },

  noAllergensBox: {
    alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 16, padding: 28,
    marginBottom: 20, borderWidth: 1, borderColor: '#BBF7D0',
  },
  noAllergensEmoji: { fontSize: 40, marginBottom: 10 },
  noAllergensTitle: { fontSize: 18, fontWeight: '700', color: '#166534', marginBottom: 6 },
  noAllergensText: { fontSize: 13, color: '#166534', textAlign: 'center', lineHeight: 18 },

  allergenCard: {
    borderRadius: 14, borderWidth: 1.5, padding: 16, marginBottom: 14,
  },
  allergenCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  allergenEmojiBubble: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  allergenEmoji: { fontSize: 24 },
  allergenInfo: { flex: 1 },
  allergenTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  allergenName: { fontSize: 16, fontWeight: '700' },
  youBadge: {
    backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  youBadgeText: { fontSize: 11, fontWeight: '700', color: '#DC2626' },
  severityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, alignSelf: 'flex-start',
  },
  severityDot: { width: 7, height: 7, borderRadius: 4 },
  severityText: { fontSize: 12, fontWeight: '600' },

  allergenDesc: { fontSize: 13, lineHeight: 18, marginBottom: 10 },

  triggerRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  triggerLabel: { fontSize: 12, fontWeight: '600' },
  triggerIngredients: { fontSize: 12, flex: 1 },

  substituteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  substituteBtnText: { fontSize: 13, fontWeight: '600' },

  ingredientsScanned: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
    elevation: 1,
  },
  ingredientsScannedTitle: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  ingredientsScannedList: { fontSize: 12, color: '#9CA3AF', lineHeight: 18 },
});
