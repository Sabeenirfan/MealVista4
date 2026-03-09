import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function NutritionalBreakdown() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const mealTitle = params.mealTitle as string || 'Recipe';
  const mealCalories = Number(params.mealCalories) || 0;
  const dailyCalorieTarget = Number(params.dailyCalorieTarget) || 2000;

  let macros: any = {};
  try { macros = params.macros ? JSON.parse(params.macros as string) : {}; } catch { }

  const calories = mealCalories || (
    (macros.protein || 0) * 4 +
    (macros.carbs || 0) * 4 +
    (macros.fat || 0) * 9
  );

  const pctOfDaily = dailyCalorieTarget > 0
    ? Math.round((calories / dailyCalorieTarget) * 100)
    : 0;

  // Color based on how much of daily target this meal covers
  const pctColor = pctOfDaily > 60 ? '#EF4444' : pctOfDaily > 35 ? '#F59E0B' : '#10B981';

  const handleViewMacros = () => {
    router.push({
      pathname: '/macronutrients',
      params: {
        mealTitle,
        macros: params.macros as string || '{}',
        micros: params.micros as string || '{}',
        mealCalories: String(calories),
        dailyCalorieTarget: String(dailyCalorieTarget),
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
        <Text style={styles.headerTitle}>Nutritional Breakdown</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* AI Badge */}
          <View style={styles.aiBadge}>
            <Feather name="cpu" size={13} color="#7C3AED" />
            <Text style={styles.aiBadgeText}>AI-Calculated Nutrition · For 1 Serving</Text>
          </View>

          <Text style={styles.recipeTitle}>{mealTitle}</Text>

          {/* Hero Calorie Card */}
          <View style={styles.calorieHeroCard}>
            <View style={styles.calorieHeroLeft}>
              <Text style={styles.calorieHeroLabel}>TOTAL CALORIES</Text>
              <Text style={styles.calorieHeroValue}>
                {calories > 0 ? calories.toLocaleString() : '—'}
              </Text>
              <Text style={styles.calorieHeroUnit}>kcal per serving</Text>
            </View>
            <View style={styles.calorieHeroRight}>
              <View style={[styles.pctRing, { borderColor: pctColor }]}>
                <Text style={[styles.pctValue, { color: pctColor }]}>{pctOfDaily}%</Text>
                <Text style={styles.pctLabel}>daily{'\n'}target</Text>
              </View>
            </View>
          </View>

          {/* Daily Target Context */}
          {dailyCalorieTarget > 0 && (
            <View style={styles.dailyContextCard}>
              <Feather name="target" size={16} color="#3C2253" />
              <Text style={styles.dailyContextText}>
                Your daily calorie target is{' '}
                <Text style={styles.dailyContextBold}>{dailyCalorieTarget.toLocaleString()} kcal</Text>
                {calories > 0 && (
                  <>
                    {' '}— this meal covers{' '}
                    <Text style={[styles.dailyContextBold, { color: pctColor }]}>{pctOfDaily}%</Text>
                    {' '}({(dailyCalorieTarget - calories).toLocaleString()} kcal remaining)
                  </>
                )}
              </Text>
            </View>
          )}

          {/* Quick Macro Overview */}
          {(macros.protein || macros.carbs || macros.fat) ? (
            <View style={styles.macrosOverview}>
              <Text style={styles.sectionTitle}>Quick Macros</Text>
              <View style={styles.macrosRow}>
                {[
                  { label: 'Protein', value: macros.protein, unit: 'g', color: '#3B82F6' },
                  { label: 'Carbs', value: macros.carbs, unit: 'g', color: '#10B981' },
                  { label: 'Fat', value: macros.fat, unit: 'g', color: '#F59E0B' },
                  { label: 'Fiber', value: macros.fiber, unit: 'g', color: '#8B5CF6' },
                ].filter(m => m.value != null).map((macro, i) => (
                  <View key={i} style={[styles.macroChip, { borderColor: macro.color }]}>
                    <Text style={[styles.macroChipValue, { color: macro.color }]}>
                      {macro.value}{macro.unit}
                    </Text>
                    <Text style={styles.macroChipLabel}>{macro.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Info note */}
          <View style={styles.infoBox}>
            <Feather name="info" size={15} color="#3C2253" />
            <Text style={styles.infoText}>
              These values are generated by OpenAI GPT-4o-mini based on real nutritional data for each ingredient and serving size.
            </Text>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity style={styles.primaryButton} onPress={handleViewMacros} activeOpacity={0.8}>
            <Feather name="pie-chart" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>Detailed Macronutrients</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push({
              pathname: '/micronutrients',
              params: { mealTitle, micros: params.micros as string || '{}' },
            })}
            activeOpacity={0.8}
          >
            <Feather name="layers" size={18} color="#3C2253" />
            <Text style={styles.secondaryButtonText}>Vitamins & Minerals</Text>
            <Feather name="arrow-right" size={16} color="#3C2253" />
          </TouchableOpacity>
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
  content: { padding: 20 },

  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F5F3FF', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    alignSelf: 'flex-start', marginBottom: 12,
    borderWidth: 1, borderColor: '#DDD6FE',
  },
  aiBadgeText: { fontSize: 12, color: '#7C3AED', fontWeight: '600' },

  recipeTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', marginBottom: 20, lineHeight: 28 },

  calorieHeroCard: {
    backgroundColor: '#3C2253', borderRadius: 20, padding: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
    shadowColor: '#3C2253', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 5,
  },
  calorieHeroLeft: { flex: 1 },
  calorieHeroLabel: { fontSize: 11, color: '#D8B4FE', fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  calorieHeroValue: { fontSize: 56, fontWeight: '800', color: '#fff', lineHeight: 64 },
  calorieHeroUnit: { fontSize: 14, color: '#D8B4FE' },
  calorieHeroRight: { marginLeft: 16 },
  pctRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 5, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  pctValue: { fontSize: 20, fontWeight: '800' },
  pctLabel: { fontSize: 9, color: '#fff', textAlign: 'center', lineHeight: 12 },

  dailyContextCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#F0EFFF', borderRadius: 12, padding: 14,
    marginBottom: 24, borderWidth: 1, borderColor: '#DDD6FE',
  },
  dailyContextText: { flex: 1, fontSize: 13, color: '#4B5563', lineHeight: 20 },
  dailyContextBold: { fontWeight: '700', color: '#3C2253' },

  macrosOverview: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 14 },
  macrosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  macroChip: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 2,
    paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', minWidth: 72,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
    elevation: 2,
  },
  macroChipValue: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  macroChipLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#F0EFFF', borderRadius: 12, padding: 14,
    marginBottom: 24,
  },
  infoText: { flex: 1, fontSize: 12, color: '#3C2253', lineHeight: 18 },

  primaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#3C2253', paddingVertical: 16, paddingHorizontal: 24,
    borderRadius: 12, gap: 8, marginBottom: 12,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },

  secondaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#3C2253',
    paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, gap: 8,
  },
  secondaryButtonText: { color: '#3C2253', fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },
});
