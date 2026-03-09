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

export default function Macronutrients() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mealTitle = params.mealTitle as string || 'Recipe';
  const dailyCalorieTarget = Number(params.dailyCalorieTarget) || 2000;
  const mealCalories = Number(params.mealCalories) || 0;

  let macros: any = {};
  try { macros = params.macros ? JSON.parse(params.macros as string) : {}; } catch { }

  const calories = mealCalories ||
    (macros.protein || 0) * 4 + (macros.carbs || 0) * 4 + (macros.fat || 0) * 9;

  const proteinCal = (macros.protein || 0) * 4;
  const carbsCal = (macros.carbs || 0) * 4;
  const fatCal = (macros.fat || 0) * 9;
  const fiberCal = (macros.fiber || 0) * 2;
  const totalCal = proteinCal + carbsCal + fatCal;

  // Daily macro targets (rough standard — 30% protein, 45% carbs, 25% fat)
  const dailyProtein = Math.round((dailyCalorieTarget * 0.30) / 4);
  const dailyCarbs = Math.round((dailyCalorieTarget * 0.45) / 4);
  const dailyFat = Math.round((dailyCalorieTarget * 0.25) / 9);

  const hasData = macros.protein != null || macros.carbs != null || macros.fat != null;

  const macroItems = [
    {
      name: 'Protein',
      value: macros.protein,
      unit: 'g',
      color: '#3B82F6',
      bg: '#EFF6FF',
      calPercent: totalCal > 0 ? Math.round((proteinCal / totalCal) * 100) : 0,
      dailyTarget: dailyProtein,
      icon: 'shield' as const,
      role: 'Builds and repairs muscle tissue',
    },
    {
      name: 'Carbohydrates',
      value: macros.carbs,
      unit: 'g',
      color: '#10B981',
      bg: '#ECFDF5',
      calPercent: totalCal > 0 ? Math.round((carbsCal / totalCal) * 100) : 0,
      dailyTarget: dailyCarbs,
      icon: 'zap' as const,
      role: 'Primary energy source for body and brain',
    },
    {
      name: 'Total Fat',
      value: macros.fat,
      unit: 'g',
      color: '#F59E0B',
      bg: '#FFFBEB',
      calPercent: totalCal > 0 ? Math.round((fatCal / totalCal) * 100) : 0,
      dailyTarget: dailyFat,
      icon: 'droplet' as const,
      role: 'Supports hormones and vitamin absorption',
    },
    {
      name: 'Dietary Fiber',
      value: macros.fiber,
      unit: 'g',
      color: '#8B5CF6',
      bg: '#F5F3FF',
      calPercent: totalCal > 0 ? Math.round((fiberCal / totalCal) * 100) : 0,
      dailyTarget: 30, // 30g/day recommended
      icon: 'activity' as const,
      role: 'Aids digestion and gut health',
    },
  ].filter(m => m.value != null);

  const handleViewMicronutrients = () => {
    router.push({
      pathname: '/micronutrients',
      params: {
        mealTitle,
        micros: params.micros as string || '{}',
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
        <Text style={styles.headerTitle}>Macronutrients</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.recipeTitle}>{mealTitle}</Text>

          {/* Calories Summary */}
          {calories > 0 && (
            <View style={styles.calorieSummary}>
              <View style={styles.calorieSummaryLeft}>
                <Text style={styles.caloriesValue}>{calories.toLocaleString()}</Text>
                <Text style={styles.caloriesLabel}>Total Calories</Text>
              </View>
              {dailyCalorieTarget > 0 && (
                <View style={styles.calorieSummaryRight}>
                  <Text style={styles.dailyPct}>{Math.round((calories / dailyCalorieTarget) * 100)}%</Text>
                  <Text style={styles.dailyPctLabel}>of daily{'\n'}target</Text>
                </View>
              )}
            </View>
          )}

          {/* Macro breakdown bar */}
          {totalCal > 0 && (
            <View style={styles.breakdownBar}>
              <View style={[styles.barSegment, { flex: macros.protein || 1, backgroundColor: '#3B82F6' }]} />
              <View style={[styles.barSegment, { flex: macros.carbs || 1, backgroundColor: '#10B981' }]} />
              <View style={[styles.barSegment, { flex: macros.fat || 1, backgroundColor: '#F59E0B' }]} />
            </View>
          )}

          {!hasData && (
            <View style={styles.noDataBox}>
              <Feather name="info" size={18} color="#6B7280" />
              <Text style={styles.noDataText}>
                Macronutrient data is not available for this recipe. Try viewing a recipe generated by our AI.
              </Text>
            </View>
          )}

          {/* Macro Cards */}
          {macroItems.length > 0 && (
            <View style={styles.macrosList}>
              {macroItems.map((macro, index) => {
                const dailyPct = macro.dailyTarget > 0
                  ? Math.min(Math.round((macro.value / macro.dailyTarget) * 100), 100)
                  : 0;
                return (
                  <View key={index} style={[styles.macroCard, { borderLeftColor: macro.color }]}>
                    <View style={styles.macroCardTop}>
                      <View style={[styles.macroIconContainer, { backgroundColor: macro.bg }]}>
                        <Feather name={macro.icon} size={18} color={macro.color} />
                      </View>
                      <View style={styles.macroCardInfo}>
                        <Text style={styles.macroName}>{macro.name}</Text>
                        <Text style={styles.macroRole}>{macro.role}</Text>
                      </View>
                      <View style={styles.macroValueContainer}>
                        <Text style={[styles.macroValue, { color: macro.color }]}>{macro.value}</Text>
                        <Text style={styles.macroUnit}>{macro.unit}</Text>
                      </View>
                    </View>

                    {/* Stat row */}
                    <View style={styles.macroStats}>
                      <View style={styles.macroStat}>
                        <Text style={styles.macroStatValue}>{macro.calPercent}%</Text>
                        <Text style={styles.macroStatLabel}>of calories</Text>
                      </View>
                      <View style={styles.macroStat}>
                        <Text style={styles.macroStatValue}>{dailyPct}%</Text>
                        <Text style={styles.macroStatLabel}>of daily need</Text>
                      </View>
                      <View style={styles.macroStat}>
                        <Text style={styles.macroStatValue}>{macro.dailyTarget}{macro.unit}</Text>
                        <Text style={styles.macroStatLabel}>daily target</Text>
                      </View>
                    </View>

                    {/* Progress bar */}
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${dailyPct}%`, backgroundColor: macro.color },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <TouchableOpacity style={styles.actionButton} onPress={handleViewMicronutrients} activeOpacity={0.8}>
            <Feather name="layers" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>View Vitamins & Minerals</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
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

  recipeTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', marginBottom: 20, lineHeight: 28 },

  calorieSummary: {
    backgroundColor: '#3C2253', borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  calorieSummaryLeft: {},
  caloriesValue: { fontSize: 44, fontWeight: '800', color: '#fff' },
  caloriesLabel: { fontSize: 13, color: '#D8B4FE' },
  calorieSummaryRight: { alignItems: 'center' },
  dailyPct: { fontSize: 28, fontWeight: '800', color: '#A78BFA' },
  dailyPctLabel: { fontSize: 11, color: '#D8B4FE', textAlign: 'center', lineHeight: 14 },

  breakdownBar: {
    flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden',
    marginBottom: 24, gap: 2,
  },
  barSegment: { borderRadius: 3 },

  noDataBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, marginBottom: 20,
  },
  noDataText: { flex: 1, fontSize: 13, color: '#6B7280', lineHeight: 18 },

  macrosList: { gap: 14, marginBottom: 24 },
  macroCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
  },
  macroCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  macroIconContainer: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  macroCardInfo: { flex: 1 },
  macroName: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 2 },
  macroRole: { fontSize: 11, color: '#9CA3AF' },
  macroValueContainer: { alignItems: 'flex-end' },
  macroValue: { fontSize: 26, fontWeight: '800' },
  macroUnit: { fontSize: 12, color: '#6B7280' },

  macroStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  macroStat: { alignItems: 'center' },
  macroStatValue: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  macroStatLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 1 },

  progressBar: {
    height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },

  actionButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#3C2253', paddingVertical: 16, paddingHorizontal: 24,
    borderRadius: 12, gap: 8,
  },
  actionButtonText: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },
});
