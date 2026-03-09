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

// Reference daily intakes (WHO/FDA standard adults)
const DAILY_REF: Record<string, { value: number; unit: string; label: string; icon: React.ComponentProps<typeof Feather>['name']; color: string }> = {
  vitaminA: { value: 900, unit: 'µg', label: 'Vitamin A', icon: 'sun', color: '#F59E0B' },
  vitaminC: { value: 90, unit: 'mg', label: 'Vitamin C', icon: 'shield', color: '#EF4444' },
  vitaminD: { value: 20, unit: 'µg', label: 'Vitamin D', icon: 'sun', color: '#F97316' },
  vitaminE: { value: 15, unit: 'mg', label: 'Vitamin E', icon: 'feather', color: '#84CC16' },
  vitaminK: { value: 120, unit: 'µg', label: 'Vitamin K', icon: 'activity', color: '#10B981' },
  calcium: { value: 1000, unit: 'mg', label: 'Calcium', icon: 'box', color: '#3B82F6' },
  iron: { value: 18, unit: 'mg', label: 'Iron', icon: 'anchor', color: '#DC2626' },
  potassium: { value: 3500, unit: 'mg', label: 'Potassium', icon: 'heart', color: '#8B5CF6' },
  magnesium: { value: 400, unit: 'mg', label: 'Magnesium', icon: 'grid', color: '#06B6D4' },
  zinc: { value: 11, unit: 'mg', label: 'Zinc', icon: 'zap', color: '#6366F1' },
  sodium: { value: 2300, unit: 'mg', label: 'Sodium', icon: 'alert-circle', color: '#9CA3AF' },
  folate: { value: 400, unit: 'µg', label: 'Folate', icon: 'layers', color: '#A78BFA' },
};

function getBarColor(pct: number, key: string) {
  if (key === 'sodium') return pct > 80 ? '#EF4444' : '#9CA3AF'; // sodium: less is better
  if (pct >= 100) return '#10B981';
  if (pct >= 50) return '#3B82F6';
  if (pct >= 25) return '#F59E0B';
  return '#EF4444';
}

function getStatusLabel(pct: number, key: string) {
  if (key === 'sodium') {
    if (pct > 80) return '⚠️ High';
    if (pct > 40) return '✓ Moderate';
    return '✓ Low';
  }
  if (pct >= 100) return '✓ Excellent';
  if (pct >= 50) return '✓ Good';
  if (pct >= 25) return '~ Fair';
  return '↑ Low';
}

export default function Micronutrients() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mealTitle = params.mealTitle as string || 'Recipe';

  let microsData: any = {};
  try { microsData = params.micros ? JSON.parse(params.micros as string) : {}; } catch { }

  // Build only nutrients that have real data
  const nutrients = Object.entries(DAILY_REF)
    .filter(([key]) => microsData[key] != null)
    .map(([key, ref]) => {
      const amount = microsData[key];
      const pct = Math.round((amount / ref.value) * 100);
      const { value: dailyRef, ...refRest } = ref;
      return { key, value: amount, dailyRef, pct, ...refRest };
    });

  const hasData = nutrients.length > 0;

  // Split into vitamins and minerals
  const vitamins = nutrients.filter(n => n.key.startsWith('vitamin') || n.key === 'folate');
  const minerals = nutrients.filter(n => !n.key.startsWith('vitamin') && n.key !== 'folate');

  const renderNutrientCard = (nutrient: typeof nutrients[0]) => (
    <View key={nutrient.key} style={styles.nutrientCard}>
      <View style={styles.nutrientCardTop}>
        <View style={[styles.nutrientIcon, { backgroundColor: `${nutrient.color}16` }]}>
          <Feather name={nutrient.icon} size={16} color={nutrient.color} />
        </View>
        <View style={styles.nutrientInfo}>
          <Text style={styles.nutrientName}>{nutrient.label}</Text>
          <Text style={[styles.statusLabel, {
            color: nutrient.pct >= 50 ? '#10B981' : nutrient.pct >= 25 ? '#F59E0B' : '#EF4444'
          }]}>
            {getStatusLabel(nutrient.pct, nutrient.key)}
          </Text>
        </View>
        <View style={styles.nutrientValues}>
          <Text style={[styles.nutrientValue, { color: nutrient.color }]}>
            {nutrient.value} <Text style={styles.nutrientUnit}>{nutrient.unit}</Text>
          </Text>
          <Text style={styles.nutrientDV}>{Math.min(nutrient.pct, 999)}% DV</Text>
        </View>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(nutrient.pct, 100)}%`,
              backgroundColor: getBarColor(nutrient.pct, nutrient.key),
            },
          ]}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2253" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vitamins & Minerals</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* AI Badge */}
          <View style={styles.aiBadge}>
            <Feather name="cpu" size={13} color="#7C3AED" />
            <Text style={styles.aiBadgeText}>AI-Calculated · % of Daily Value (DV)</Text>
          </View>

          <Text style={styles.recipeTitle}>{mealTitle}</Text>

          {!hasData && (
            <View style={styles.noDataBox}>
              <Feather name="info" size={20} color="#6B7280" />
              <Text style={styles.noDataText}>
                No micronutrient data available for this recipe. View an AI-generated recipe to see detailed vitamin and mineral content.
              </Text>
            </View>
          )}

          {hasData && (
            <>
              {/* Legend */}
              <View style={styles.legend}>
                {[
                  { color: '#10B981', label: '≥100% DV (Excellent)' },
                  { color: '#3B82F6', label: '50–99% DV (Good)' },
                  { color: '#F59E0B', label: '25–49% DV (Fair)' },
                  { color: '#EF4444', label: '<25% DV (Low)' },
                ].map((l, i) => (
                  <View key={i} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                    <Text style={styles.legendText}>{l.label}</Text>
                  </View>
                ))}
              </View>

              {/* Vitamins */}
              {vitamins.length > 0 && (
                <>
                  <Text style={styles.groupTitle}>Vitamins</Text>
                  <View style={styles.nutrientsList}>{vitamins.map(renderNutrientCard)}</View>
                </>
              )}

              {/* Minerals */}
              {minerals.length > 0 && (
                <>
                  <Text style={styles.groupTitle}>Minerals</Text>
                  <View style={styles.nutrientsList}>{minerals.map(renderNutrientCard)}</View>
                </>
              )}

              {/* Sodium note */}
              {microsData.sodium != null && (
                <View style={styles.sodiumNote}>
                  <Feather name="alert-circle" size={14} color="#9CA3AF" />
                  <Text style={styles.sodiumNoteText}>
                    Daily sodium limit is 2300 mg. Lower is generally healthier.
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
  content: { padding: 20 },

  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F5F3FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    alignSelf: 'flex-start', marginBottom: 12, borderWidth: 1, borderColor: '#DDD6FE',
  },
  aiBadgeText: { fontSize: 12, color: '#7C3AED', fontWeight: '600' },

  recipeTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', marginBottom: 20, lineHeight: 28 },

  noDataBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#F3F4F6', borderRadius: 14, padding: 18, marginBottom: 20,
  },
  noDataText: { flex: 1, fontSize: 14, color: '#6B7280', lineHeight: 20 },

  legend: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 24, gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
    elevation: 1,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#6B7280' },

  groupTitle: { fontSize: 15, fontWeight: '700', color: '#3C2253', marginBottom: 10, marginTop: 4 },

  nutrientsList: { gap: 10, marginBottom: 20 },
  nutrientCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
    elevation: 2,
  },
  nutrientCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  nutrientIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  nutrientInfo: { flex: 1 },
  nutrientName: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  statusLabel: { fontSize: 11, fontWeight: '600' },
  nutrientValues: { alignItems: 'flex-end' },
  nutrientValue: { fontSize: 15, fontWeight: '700' },
  nutrientUnit: { fontSize: 11, fontWeight: '400', color: '#9CA3AF' },
  nutrientDV: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  progressBar: {
    height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },

  sodiumNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, marginTop: -10,
  },
  sodiumNoteText: { flex: 1, fontSize: 11, color: '#9CA3AF' },
});
