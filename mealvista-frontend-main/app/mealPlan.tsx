import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    StatusBar, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../lib/api';
import { getStoredToken } from '../lib/authStorage';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type PlanStatus = 'exceeded' | 'met' | 'on_track' | 'needs_more';

interface MacroData { protein: number; carbs: number; fat: number; fiber: number }
interface MealEntry {
    _id: string;
    recipeName: string;
    mealType: MealType;
    calories: number;
    macros: MacroData;
    image?: string;
    cookedAt: string;
}
interface TodayPlan {
    date: string;
    meals: MealEntry[];
    totalCalories: number;
    dailyTarget: number;
    remaining: number;
    percentage: number;
    status: PlanStatus;
    macros: MacroData;
    mealsCount: number;
}

const MEAL_TYPE_CFG: Record<MealType, { label: string; icon: React.ComponentProps<typeof Feather>['name']; color: string }> = {
    breakfast: { label: 'Breakfast', icon: 'sun', color: '#F59E0B' },
    lunch: { label: 'Lunch', icon: 'coffee', color: '#10B981' },
    dinner: { label: 'Dinner', icon: 'moon', color: '#3C2253' },
    snack: { label: 'Snack', icon: 'zap', color: '#EC4899' },
};

const STATUS_CFG: Record<PlanStatus, { label: string; color: string; bg: string; icon: React.ComponentProps<typeof Feather>['name'] }> = {
    exceeded: { label: 'Over Daily Target', color: '#DC2626', bg: '#FEE2E2', icon: 'alert-triangle' },
    met: { label: 'Goal Achieved! 🎉', color: '#059669', bg: '#D1FAE5', icon: 'check-circle' },
    on_track: { label: 'On Track', color: '#2563EB', bg: '#DBEAFE', icon: 'trending-up' },
    needs_more: { label: 'Needs More Calories', color: '#D97706', bg: '#FEF3C7', icon: 'arrow-up-circle' },
};

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function MealPlanDashboard() {
    const router = useRouter();
    const [plan, setPlan] = useState<TodayPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);

    const fetchTodayPlan = useCallback(async () => {
        try {
            setError(null);
            const token = await getStoredToken();
            const res = await api.get('/api/mealplan/today', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data.success) setPlan(res.data.plan);
        } catch (err: any) {
            setError('Could not load your meal plan. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchTodayPlan(); }, []);

    const handleRemoveMeal = (meal: MealEntry) => {
        Alert.alert(
            'Remove Meal',
            `Remove "${meal.recipeName}" from today's plan?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setRemovingId(meal._id);
                            const token = await getStoredToken();
                            await api.delete(`/api/mealplan/entry/${meal._id}`, {
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            fetchTodayPlan();
                        } catch {
                            Alert.alert('Error', 'Could not remove meal.');
                        } finally {
                            setRemovingId(null);
                        }
                    },
                },
            ]
        );
    };

    // Calorie ring dimensions
    const ringSize = 160;
    const strokeWidth = 14;
    const radius = (ringSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const fillFraction = plan ? Math.min(1, plan.percentage / 100) : 0;

    const MacroBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => {
        const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
        return (
            <View style={styles.macroBarRow}>
                <Text style={styles.macroLabel}>{label}</Text>
                <View style={styles.macroBarTrack}>
                    <View style={[styles.macroBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                </View>
                <Text style={styles.macroValue}>{Math.round(value)}g</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#3C2253" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Meal Plan</Text>
                    <Text style={styles.headerSub}>{plan ? formatDate(plan.date) : 'Today'}</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/home' as any)}>
                    <Feather name="plus-circle" size={24} color="#D8B4FE" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#3C2253" />
                    <Text style={styles.loadingText}>Loading your meal plan...</Text>
                </View>
            ) : error ? (
                <View style={styles.errorBox}>
                    <Feather name="wifi-off" size={32} color="#DC2626" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchTodayPlan(); }}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : plan && (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTodayPlan(); }} colors={['#3C2253']} />}
                >
                    {/* Calorie Ring Card */}
                    <View style={styles.ringCard}>
                        <Text style={styles.ringCardTitle}>Daily Calories</Text>
                        {/* SVG-free ring: use border-radius layer */}
                        <View style={styles.ringWrapper}>
                            <View style={[styles.ringOuter, { borderColor: '#E5E7EB' }]}>
                                <View style={[styles.ringFill, {
                                    borderColor: plan.percentage >= 100 ? '#DC2626' : plan.percentage >= 80 ? '#10B981' : '#3C2253',
                                    transform: [{ rotate: `${fillFraction * 360}deg` }],
                                }]} />
                                <View style={styles.ringInner}>
                                    <Text style={styles.ringCalories}>{plan.totalCalories}</Text>
                                    <Text style={styles.ringUnit}>kcal</Text>
                                    <Text style={styles.ringTarget}>/ {plan.dailyTarget}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Status badge */}
                        {(() => {
                            const cfg = STATUS_CFG[plan.status];
                            return (
                                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                                    <Feather name={cfg.icon} size={14} color={cfg.color} />
                                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                                </View>
                            );
                        })()}

                        {/* 3-stat row */}
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statNum}>{plan.totalCalories}</Text>
                                <Text style={styles.statLbl}>Consumed</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statBox}>
                                <Text style={[styles.statNum, { color: plan.remaining === 0 ? '#DC2626' : '#10B981' }]}>{plan.remaining}</Text>
                                <Text style={styles.statLbl}>Remaining</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statBox}>
                                <Text style={styles.statNum}>{plan.percentage}%</Text>
                                <Text style={styles.statLbl}>Progress</Text>
                            </View>
                        </View>

                        {/* Progress bar */}
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, {
                                width: `${plan.percentage}%`,
                                backgroundColor: plan.percentage > 105 ? '#DC2626' : plan.percentage >= 90 ? '#10B981' : '#3C2253',
                            }]} />
                        </View>
                    </View>

                    {/* Macros */}
                    <View style={styles.macrosCard}>
                        <Text style={styles.sectionTitle}>Macros Today</Text>
                        <MacroBar label="Protein" value={plan.macros.protein} max={120} color="#3C2253" />
                        <MacroBar label="Carbs" value={plan.macros.carbs} max={300} color="#F59E0B" />
                        <MacroBar label="Fat" value={plan.macros.fat} max={80} color="#EF4444" />
                        <MacroBar label="Fiber" value={plan.macros.fiber} max={35} color="#10B981" />
                    </View>

                    {/* Meals List */}
                    <View style={styles.mealsSection}>
                        <Text style={styles.sectionTitle}>Meals Today ({plan.mealsCount})</Text>
                        {plan.mealsCount === 0 ? (
                            <View style={styles.emptyMeals}>
                                <Feather name="coffee" size={40} color="#D1D5DB" />
                                <Text style={styles.emptyMealsTitle}>No meals logged yet</Text>
                                <Text style={styles.emptyMealsText}>Open a recipe and tap "I Cooked It!" to log your first meal.</Text>
                                <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/home' as any)}>
                                    <Text style={styles.browseBtnText}>Browse Recipes</Text>
                                </TouchableOpacity>
                            </View>
                        ) : plan.meals.map((meal, i) => {
                            const cfg = MEAL_TYPE_CFG[meal.mealType] || MEAL_TYPE_CFG.lunch;
                            const isRemoving = removingId === meal._id;
                            return (
                                <View key={meal._id} style={styles.mealCard}>
                                    <View style={[styles.mealTypeIcon, { backgroundColor: `${cfg.color}18` }]}>
                                        <Feather name={cfg.icon} size={18} color={cfg.color} />
                                    </View>
                                    <View style={styles.mealInfo}>
                                        <Text style={styles.mealName} numberOfLines={1}>{meal.recipeName}</Text>
                                        <View style={styles.mealMeta}>
                                            <Text style={[styles.mealTypeBadge, { color: cfg.color }]}>{cfg.label}</Text>
                                            <Text style={styles.mealMetaDot}>·</Text>
                                            <Text style={styles.mealTime}>{formatTime(meal.cookedAt)}</Text>
                                        </View>
                                        {(meal.macros.protein > 0 || meal.macros.carbs > 0) && (
                                            <Text style={styles.mealMacros}>
                                                P:{Math.round(meal.macros.protein)}g · C:{Math.round(meal.macros.carbs)}g · F:{Math.round(meal.macros.fat)}g
                                            </Text>
                                        )}
                                    </View>
                                    <View style={styles.mealRight}>
                                        <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
                                        <TouchableOpacity
                                            onPress={() => handleRemoveMeal(meal)}
                                            disabled={isRemoving}
                                            style={styles.removeBtn}
                                        >
                                            {isRemoving ? <ActivityIndicator size="small" color="#EF4444" /> : <Feather name="x" size={16} color="#9CA3AF" />}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* CTA if meals logged */}
                    {plan.mealsCount > 0 && (
                        <TouchableOpacity style={styles.addMoreBtn} onPress={() => router.push('/home' as any)}>
                            <Feather name="plus" size={16} color="#3C2253" />
                            <Text style={styles.addMoreText}>Add Another Meal</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            )}
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
    backBtn: { padding: 8 },
    headerText: { flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 12, color: '#D8B4FE', marginTop: 2 },

    loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: '#6B7280' },
    errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
    errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
    retryBtn: { backgroundColor: '#3C2253', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
    retryText: { color: '#fff', fontWeight: '700' },

    scrollView: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },

    ringCard: {
        backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    },
    ringCardTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 16 },
    ringWrapper: { marginBottom: 16 },
    ringOuter: {
        width: 150, height: 150, borderRadius: 75, borderWidth: 14,
        alignItems: 'center', justifyContent: 'center',
        position: 'relative',
    },
    ringFill: {
        position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 14,
        borderTopColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'transparent',
        borderLeftColor: '#3C2253',
    },
    ringInner: { alignItems: 'center' },
    ringCalories: { fontSize: 28, fontWeight: '800', color: '#1F2937' },
    ringUnit: { fontSize: 13, color: '#6B7280', marginTop: -2 },
    ringTarget: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginBottom: 16,
    },
    statusText: { fontSize: 13, fontWeight: '700' },

    statsRow: { flexDirection: 'row', width: '100%', marginBottom: 12 },
    statBox: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
    statLbl: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
    statDivider: { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 8 },

    progressTrack: { width: '100%', height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },

    macrosCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
    macroBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    macroLabel: { width: 48, fontSize: 12, color: '#6B7280', fontWeight: '500' },
    macroBarTrack: { flex: 1, height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
    macroBarFill: { height: '100%', borderRadius: 4 },
    macroValue: { width: 36, fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'right' },

    mealsSection: { marginBottom: 16 },
    emptyMeals: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', gap: 10, elevation: 1 },
    emptyMealsTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
    emptyMealsText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
    browseBtn: { backgroundColor: '#3C2253', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 4 },
    browseBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    mealCard: {
        backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row', alignItems: 'center',
        padding: 14, marginBottom: 10, gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
    },
    mealTypeIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    mealInfo: { flex: 1 },
    mealName: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 3 },
    mealMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    mealTypeBadge: { fontSize: 11, fontWeight: '600' },
    mealMetaDot: { fontSize: 11, color: '#D1D5DB' },
    mealTime: { fontSize: 11, color: '#9CA3AF' },
    mealMacros: { fontSize: 11, color: '#9CA3AF', marginTop: 3 },
    mealRight: { alignItems: 'flex-end', gap: 6 },
    mealCalories: { fontSize: 14, fontWeight: '800', color: '#3C2253' },
    removeBtn: { padding: 4 },

    addMoreBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#EDE9FE', borderRadius: 14, paddingVertical: 14, borderWidth: 1.5, borderColor: '#3C2253',
    },
    addMoreText: { fontSize: 14, fontWeight: '700', color: '#3C2253' },
});
