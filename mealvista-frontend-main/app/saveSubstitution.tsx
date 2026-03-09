import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../lib/api';
import { useCart } from '../contexts/CartContext';

interface Substitution {
  originalIngredient: string;
  substitute: string;
  quantity: string;
  benefit: string;
  tags: string[];
  description: string;
  nutritionNote: string;
  imageSearch?: string;
}

interface SubstitutionResult {
  allergenBeingReplaced: string;
  substitutions: Substitution[];
  cookingTip?: string;
  recipeNote?: string;
}

export default function SaveSubstitution() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addToCart, getTotalItems } = useCart();

  const mealTitle = params.mealTitle as string || 'Recipe';
  const allergenToReplace = params.allergenToReplace as string || 'Allergen';

  let ingredientsList: string[] = [];
  try {
    const raw = params.ingredients as string;
    const parsed = raw ? JSON.parse(raw) : [];
    ingredientsList = Array.isArray(parsed)
      ? parsed.map((i: any) => typeof i === 'string' ? i : i.name || String(i))
      : [];
  } catch { }

  let allergenIngredients: string[] = [];
  try {
    allergenIngredients = params.allergenIngredients
      ? JSON.parse(params.allergenIngredients as string)
      : [];
  } catch { }

  const [result, setResult] = useState<SubstitutionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    fetchSubstitutions();
  }, []);

  const fetchSubstitutions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/api/allergens/substitute', {
        recipeName: mealTitle,
        ingredients: ingredientsList,
        allergenToReplace,
        allergenIngredients,
      });

      if (response.data.success) {
        setResult(response.data);
      } else {
        throw new Error(response.data.message || 'Could not generate substitutions');
      }
    } catch (err: any) {
      console.error('[SaveSubstitution] Error:', err.message);
      setError('Could not generate substitutions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (idx: number) => {
    setSelected(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleAddToCart = () => {
    if (selected.length === 0) {
      Alert.alert('No Selection', 'Please select at least one substitution.');
      return;
    }
    selected.forEach(idx => {
      const sub = result?.substitutions[idx];
      if (sub) {
        addToCart({
          id: `sub-${sub.substitute.replace(/\s+/g, '-').toLowerCase()}`,
          name: sub.substitute,
          price: 0,
          category: 'Substitution',
        });
      }
    });
    Alert.alert(
      '✅ Added to Cart',
      `${selected.length} substitution ingredient${selected.length !== 1 ? 's' : ''} added to your cart.`,
      [{ text: 'View Cart', onPress: () => router.push('/viewCart') }, { text: 'OK' }]
    );
    setSelected([]);
  };

  // Tag color helper
  const tagColor = (tag: string) => {
    const t = tag.toLowerCase();
    if (t.includes('free')) return { bg: '#D1FAE5', text: '#065F46' };
    if (t.includes('high') || t.includes('rich')) return { bg: '#DBEAFE', text: '#1E40AF' };
    if (t.includes('low')) return { bg: '#FEF3C7', text: '#92400E' };
    return { bg: '#F3F4F6', text: '#374151' };
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2253" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>AI Substitutions</Text>
          <Text style={styles.headerSub}>Replace {allergenToReplace} allergen</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/viewCart')} style={styles.cartBtn}>
          <Feather name="shopping-cart" size={20} color="#fff" />
          {getTotalItems() > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{getTotalItems()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Context banner */}
          <View style={styles.contextBanner}>
            <Feather name="refresh-cw" size={16} color="#3C2253" />
            <Text style={styles.contextText}>
              Replacing <Text style={styles.contextBold}>{allergenToReplace}</Text> in{' '}
              <Text style={styles.contextBold}>{mealTitle}</Text>
            </Text>
          </View>

          {/* Loading */}
          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#3C2253" />
              <Text style={styles.loadingTitle}>Generating AI Substitutions…</Text>
              <Text style={styles.loadingSubtitle}>
                OpenAI is finding the best safe alternatives for {allergenToReplace}
              </Text>
            </View>
          )}

          {/* Error */}
          {!loading && error && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={24} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchSubstitutions}>
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Results */}
          {!loading && result && (
            <>
              <Text style={styles.sectionTitle}>
                {result.substitutions.length} Substitute{result.substitutions.length !== 1 ? 's' : ''} Found
              </Text>
              <Text style={styles.sectionSubtitle}>
                Tap a card to select, then add to cart or apply below
              </Text>

              {result.substitutions.map((sub, idx) => {
                const isSelected = selected.includes(idx);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.subCard, isSelected && styles.subCardSelected]}
                    onPress={() => toggleSelect(idx)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.subCardTop}>
                      <View style={styles.subTextBlock}>
                        <Text style={styles.subName}>{sub.substitute}</Text>
                        <Text style={styles.subQuantity}>
                          <Feather name="package" size={11} color="#9CA3AF" /> {sub.quantity}
                        </Text>
                      </View>
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Feather name="check" size={14} color="#fff" />}
                      </View>
                    </View>

                    {/* Benefit badge */}
                    <View style={styles.benefitBadge}>
                      <Feather name="zap" size={11} color="#7C3AED" />
                      <Text style={styles.benefitText}>{sub.benefit}</Text>
                    </View>

                    <Text style={styles.subDesc}>{sub.description}</Text>

                    {/* Tags */}
                    {sub.tags && sub.tags.length > 0 && (
                      <View style={styles.tagsRow}>
                        {sub.tags.map((tag, ti) => {
                          const tc = tagColor(tag);
                          return (
                            <View key={ti} style={[styles.tag, { backgroundColor: tc.bg }]}>
                              <Text style={[styles.tagText, { color: tc.text }]}>{tag}</Text>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* Nutrition note */}
                    {sub.nutritionNote && (
                      <View style={styles.nutritionNote}>
                        <Feather name="info" size={12} color="#6B7280" />
                        <Text style={styles.nutritionNoteText}>{sub.nutritionNote}</Text>
                      </View>
                    )}

                    {/* Replace label */}
                    <View style={styles.replaceRow}>
                      <Text style={styles.replaceLabel}>Replaces:</Text>
                      <Text style={styles.replaceValue}>{sub.originalIngredient}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Cooking tip */}
              {result.cookingTip && (
                <View style={styles.tipBox}>
                  <Feather name="star" size={16} color="#D97706" />
                  <View style={styles.tipText}>
                    <Text style={styles.tipTitle}>Chef's Tip</Text>
                    <Text style={styles.tipBody}>{result.cookingTip}</Text>
                  </View>
                </View>
              )}

              {/* Recipe note */}
              {result.recipeNote && (
                <View style={styles.recipeNoteBox}>
                  <Feather name="file-text" size={14} color="#6B7280" />
                  <Text style={styles.recipeNoteText}>{result.recipeNote}</Text>
                </View>
              )}

              {/* Action Buttons */}
              {selected.length > 0 && (
                <TouchableOpacity style={styles.addToCartBtn} onPress={handleAddToCart} activeOpacity={0.8}>
                  <Feather name="shopping-cart" size={18} color="#fff" />
                  <Text style={styles.addToCartText}>
                    Add {selected.length} to Cart
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Feather name="check" size={18} color="#3C2253" />
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
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
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backButton: { padding: 8 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: '#D8B4FE', marginTop: 2 },
  cartBtn: { padding: 8 },
  cartBadge: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: '#FF6B6B', borderRadius: 8,
    minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  content: { padding: 20 },

  contextBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F5F3FF', borderRadius: 12, padding: 14,
    marginBottom: 24, borderWidth: 1, borderColor: '#DDD6FE',
  },
  contextText: { flex: 1, fontSize: 13, color: '#4B5563', lineHeight: 18 },
  contextBold: { fontWeight: '700', color: '#3C2253' },

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

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 6 },
  sectionSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 20 },

  subCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 2, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
    elevation: 2,
  },
  subCardSelected: { borderColor: '#3C2253', backgroundColor: '#F5F3FF' },

  subCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  subTextBlock: { flex: 1 },
  subName: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 3 },
  subQuantity: { fontSize: 12, color: '#9CA3AF' },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#3C2253',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  checkboxSelected: { backgroundColor: '#3C2253' },

  benefitBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F5F3FF', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, alignSelf: 'flex-start', marginBottom: 10,
  },
  benefitText: { fontSize: 12, fontWeight: '600', color: '#7C3AED' },

  subDesc: { fontSize: 13, color: '#4B5563', lineHeight: 18, marginBottom: 10 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText: { fontSize: 11, fontWeight: '600' },

  nutritionNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#F9FAFB', borderRadius: 8, padding: 8, marginBottom: 10,
  },
  nutritionNoteText: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 16 },

  replaceRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  replaceLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  replaceValue: { fontSize: 12, color: '#6B7280', fontStyle: 'italic' },

  tipBox: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#FDE68A',
  },
  tipText: { flex: 1 },
  tipTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 4 },
  tipBody: { fontSize: 13, color: '#92400E', lineHeight: 18 },

  recipeNoteBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, marginBottom: 20,
  },
  recipeNoteText: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 16 },

  addToCartBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#3C2253', paddingVertical: 16, borderRadius: 12, gap: 8, marginBottom: 12,
    shadowColor: '#3C2253', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6,
    elevation: 3,
  },
  addToCartText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  doneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', paddingVertical: 16, borderRadius: 12,
    gap: 8, borderWidth: 1.5, borderColor: '#3C2253',
  },
  doneBtnText: { color: '#3C2253', fontSize: 16, fontWeight: '600' },
});
