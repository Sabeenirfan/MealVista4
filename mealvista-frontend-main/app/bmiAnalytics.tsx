import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    StatusBar, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../lib/api';
import { getStoredToken } from '../lib/authStorage';

// ─── Types ──────────────────────────────────────────────────────────────────
type Trend = 'improving' | 'stable' | 'worsening' | 'first' | 'insufficient_data';
type BMICategory = 'Underweight' | 'Normal' | 'Overweight' | 'Obese';

interface CurrentBMI {
    bmi: number | null;
    bmiCategory: BMICategory | null;
    weight: number | null;
    height: number | null;
    healthGoal: string | null;
    dailyTarget: number | null;
}
interface BMIRecord {
    _id: string;
    bmi: number;
    bmiCategory: string;
    weight: number;
    bmiChange: number;
    trend: Trend;
    avgDailyCalories: number;
    dailyTarget: number;
    mealsLogged: number;
    aiInsight: string;
    period: string;
    periodStartDate: string;
    periodEndDate: string;
    evaluatedAt: string;
}

// ─── Config ─────────────────────────────────────────────────────────────────
const BMI_COLORS: Record<BMICategory, { bg: string; text: string; border: string }> = {
    Underweight: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
    Normal: { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
    Overweight: { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' },
    Obese: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
};
const TREND_CFG: Record<Trend, { icon: React.ComponentProps<typeof Feather>['name']; color: string; label: string }> = {
    improving: { icon: 'trending-up', color: '#10B981', label: 'Improving ↑' },
    stable: { icon: 'minus', color: '#6B7280', label: 'Stable →' },
    worsening: { icon: 'trending-down', color: '#EF4444', label: 'Worsening ↓' },
    first: { icon: 'star', color: '#8B5CF6', label: 'First Record' },
    insufficient_data: { icon: 'bar-chart-2', color: '#9CA3AF', label: 'Need More Data' },
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatShortDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function goalLabel(g: string | null) {
    return g === 'weight_loss' ? 'Weight Loss' : g === 'weight_gain' ? 'Weight Gain' : 'Maintenance';
}

export default function BMIAnalyticsDashboard() {
    const router = useRouter();
    const [currentBMI, setCurrentBMI] = useState<CurrentBMI | null>(null);
    const [latestRecord, setLatestRecord] = useState<BMIRecord | null>(null);
    const [history, setHistory] = useState<BMIRecord[]>([]);
    const [trend, setTrend] = useState<{ trend: Trend; delta: number; firstBMI: number; latestBMI: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [evaluating, setEvaluating] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            setError(null);
            const token = await getStoredToken();
            const headers = { Authorization: `Bearer ${token}` };

            const [currentRes, historyRes, trendRes] = await Promise.all([
                api.get('/api/bmi/current', { headers }),
                api.get('/api/bmi/history', { headers }),
                api.get('/api/bmi/trend', { headers }),
            ]);

            if (currentRes.data.success) {
                setCurrentBMI(currentRes.data.current);
                setLatestRecord(currentRes.data.latestRecord);
            }
            if (historyRes.data.success) setHistory(historyRes.data.records);
            if (trendRes.data.success) setTrend(trendRes.data);
        } catch (err: any) {
            setError('Could not load BMI data. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, []);

    const handleEvaluate = async () => {
        Alert.alert(
            '📊 Evaluate BMI',
            'This will analyse your last 7 days of meals and generate an AI health insight. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Evaluate',
                    onPress: async () => {
                        try {
                            setEvaluating(true);
                            const token = await getStoredToken();
                            const res = await api.post('/api/bmi/evaluate', { periodDays: 7 }, {
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            if (res.data.success) {
                                await fetchAll();
                                Alert.alert('✅ Evaluation Complete', res.data.record?.aiInsight || 'Your BMI has been recorded.');
                            }
                        } catch (err: any) {
                            Alert.alert('Error', err?.response?.data?.message || 'Could not evaluate BMI. Check your profile has height & weight.');
                        } finally {
                            setEvaluating(false);
                        }
                    },
                },
            ]
        );
    };

    // ── Mini bar chart (pure RN, no library) ────────────────────────────────
    const BarChart = ({ records }: { records: BMIRecord[] }) => {
        const sorted = [...records].reverse(); // oldest → newest
        const values = sorted.map(r => r.bmi);
        const max = Math.max(...values, 30);
        const min = Math.min(...values, 17);
        const range = max - min || 1;

        return (
            <View style={styles.chartWrapper}>
                {sorted.map((rec, i) => {
                    const pct = ((rec.bmi - min) / range) * 80 + 10; // 10-90% of chart height
                    const catColor = BMI_COLORS[rec.bmiCategory as BMICategory]?.text || '#3C2253';
                    return (
                        <View key={rec._id} style={styles.barCol}>
                            <Text style={[styles.barLabel, { color: catColor }]}>{rec.bmi}</Text>
                            <View style={styles.barTrack}>
                                <View style={[styles.barFill, { height: `${pct}%`, backgroundColor: catColor }]} />
                            </View>
                            <Text style={styles.barDate}>{formatShortDate(rec.evaluatedAt)}</Text>
                        </View>
                    );
                })}
            </View>
        );
    };

    const bmiCat = (currentBMI?.bmiCategory as BMICategory) || 'Normal';
    const colors = BMI_COLORS[bmiCat] || BMI_COLORS.Normal;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#3C2253" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>BMI Analytics</Text>
                    <Text style={styles.headerSub}>Track your health journey</Text>
                </View>
                <TouchableOpacity
                    style={[styles.evalBtn, evaluating && { opacity: 0.6 }]}
                    onPress={handleEvaluate}
                    disabled={evaluating}
                >
                    {evaluating
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Feather name="refresh-cw" size={18} color="#fff" />}
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#3C2253" />
                    <Text style={styles.loadingText}>Loading BMI data...</Text>
                </View>
            ) : error ? (
                <View style={styles.errorBox}>
                    <Feather name="wifi-off" size={32} color="#DC2626" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchAll(); }}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} colors={['#3C2253']} />}
                >
                    {/* Current BMI Card */}
                    {currentBMI?.bmi ? (
                        <View style={[styles.bmiCard, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                            <View style={styles.bmiCardTop}>
                                <View>
                                    <Text style={styles.bmiLabel}>Current BMI</Text>
                                    <Text style={[styles.bmiValue, { color: colors.text }]}>{currentBMI.bmi}</Text>
                                    <View style={[styles.catBadge, { backgroundColor: colors.border }]}>
                                        <Text style={[styles.catText, { color: colors.text }]}>{currentBMI.bmiCategory}</Text>
                                    </View>
                                </View>
                                <View style={styles.bmiMeta}>
                                    {currentBMI.weight && <Text style={styles.bmiMetaLine}>⚖️ {currentBMI.weight} kg</Text>}
                                    {currentBMI.height && <Text style={styles.bmiMetaLine}>📏 {currentBMI.height} cm</Text>}
                                    <Text style={styles.bmiMetaLine}>🎯 {goalLabel(currentBMI.healthGoal)}</Text>
                                </View>
                            </View>

                            {/* BMI scale bar */}
                            <View style={styles.scaleRow}>
                                {(['Underweight', 'Normal', 'Overweight', 'Obese'] as BMICategory[]).map(cat => (
                                    <View key={cat} style={[
                                        styles.scaleSegment,
                                        { backgroundColor: BMI_COLORS[cat].border },
                                        cat === bmiCat && styles.scaleSegmentActive,
                                    ]}>
                                        <Text style={[styles.scaleText, cat === bmiCat && { color: colors.text, fontWeight: '700' }]}>
                                            {cat === 'Underweight' ? '<18.5' : cat === 'Normal' ? '18.5–25' : cat === 'Overweight' ? '25–30' : '>30'}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ) : (
                        <View style={styles.noProfileCard}>
                            <Feather name="user" size={32} color="#9CA3AF" />
                            <Text style={styles.noProfileTitle}>No BMI data yet</Text>
                            <Text style={styles.noProfileText}>Complete your profile with height & weight to enable BMI tracking.</Text>
                            <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/editProfile' as any)}>
                                <Text style={styles.profileBtnText}>Go to Profile</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Trend Summary */}
                    {trend && trend.trend !== 'insufficient_data' && (
                        <View style={styles.trendCard}>
                            <Text style={styles.sectionTitle}>Overall Trend</Text>
                            {(() => {
                                const cfg = TREND_CFG[trend.trend];
                                return (
                                    <View style={styles.trendRow}>
                                        <View style={[styles.trendIcon, { backgroundColor: `${cfg.color}18` }]}>
                                            <Feather name={cfg.icon} size={22} color={cfg.color} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.trendLabel, { color: cfg.color }]}>{cfg.label}</Text>
                                            <Text style={styles.trendSub}>
                                                BMI changed {trend.delta > 0 ? '+' : ''}{trend.delta} over {history.length} evaluations
                                                {' '}({trend.firstBMI} → {trend.latestBMI})
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })()}
                        </View>
                    )}

                    {/* AI Insight */}
                    {latestRecord?.aiInsight ? (
                        <View style={styles.insightCard}>
                            <View style={styles.insightHeader}>
                                <Feather name="cpu" size={16} color="#8B5CF6" />
                                <Text style={styles.insightTitle}>AI Health Insight</Text>
                                <Text style={styles.insightDate}>{formatDate(latestRecord.evaluatedAt)}</Text>
                            </View>
                            <Text style={styles.insightText}>{latestRecord.aiInsight}</Text>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.evaluateCTA} onPress={handleEvaluate}>
                            <Feather name="cpu" size={18} color="#8B5CF6" />
                            <Text style={styles.evaluateCTAText}>Generate AI Health Insight</Text>
                        </TouchableOpacity>
                    )}

                    {/* BMI History Chart */}
                    {history.length > 1 && (
                        <View style={styles.chartCard}>
                            <Text style={styles.sectionTitle}>BMI History</Text>
                            <BarChart records={history.slice(0, 8).reverse()} />
                            <View style={styles.chartLegend}>
                                {(['Underweight', 'Normal', 'Overweight', 'Obese'] as BMICategory[]).map(cat => (
                                    <View key={cat} style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: BMI_COLORS[cat].text }]} />
                                        <Text style={styles.legendText}>{cat}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Past Records List */}
                    {history.length > 0 && (
                        <View style={styles.historySection}>
                            <Text style={styles.sectionTitle}>Evaluations ({history.length})</Text>
                            {history.map((rec, i) => {
                                const trendCfg = TREND_CFG[rec.trend] || TREND_CFG.stable;
                                const cat = rec.bmiCategory as BMICategory;
                                const c = BMI_COLORS[cat] || BMI_COLORS.Normal;
                                return (
                                    <View key={rec._id} style={styles.historyCard}>
                                        <View style={[styles.historyLeft, { backgroundColor: c.bg, borderColor: c.border }]}>
                                            <Text style={[styles.historyBmi, { color: c.text }]}>{rec.bmi}</Text>
                                            <Text style={[styles.historyBmiCat, { color: c.text }]}>{rec.bmiCategory}</Text>
                                        </View>
                                        <View style={styles.historyMid}>
                                            <Text style={styles.historyDate}>{formatDate(rec.evaluatedAt)}</Text>
                                            <View style={styles.historyMetaRow}>
                                                <Feather name={trendCfg.icon} size={12} color={trendCfg.color} />
                                                <Text style={[styles.historyTrend, { color: trendCfg.color }]}>{trendCfg.label}</Text>
                                            </View>
                                            <Text style={styles.historyCalColor}>
                                                Avg {rec.avgDailyCalories} kcal/day · {rec.mealsLogged} meals
                                            </Text>
                                        </View>
                                        <View style={styles.historyRight}>
                                            {rec.bmiChange !== 0 && (
                                                <Text style={[styles.historyDelta, { color: rec.bmiChange > 0 ? '#EF4444' : '#10B981' }]}>
                                                    {rec.bmiChange > 0 ? '+' : ''}{rec.bmiChange}
                                                </Text>
                                            )}
                                            <Text style={styles.historyPeriod}>{rec.period}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {history.length === 0 && currentBMI?.bmi && (
                        <View style={styles.noHistoryCTA}>
                            <Feather name="bar-chart-2" size={40} color="#D1D5DB" />
                            <Text style={styles.noHistoryTitle}>No evaluations yet</Text>
                            <Text style={styles.noHistoryText}>Tap the refresh button above to run your first BMI evaluation and get AI insights.</Text>
                        </View>
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
    evalBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#5B21B6', alignItems: 'center', justifyContent: 'center',
    },

    loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: '#6B7280' },
    errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
    errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
    retryBtn: { backgroundColor: '#3C2253', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
    retryText: { color: '#fff', fontWeight: '700' },

    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },

    // BMI Card
    bmiCard: {
        borderRadius: 20, padding: 20, marginBottom: 16,
        borderWidth: 1.5, shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    bmiCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    bmiLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 4 },
    bmiValue: { fontSize: 52, fontWeight: '900', lineHeight: 56 },
    catBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginTop: 6 },
    catText: { fontSize: 12, fontWeight: '700' },
    bmiMeta: { alignItems: 'flex-end', gap: 4 },
    bmiMetaLine: { fontSize: 13, color: '#374151' },

    scaleRow: { flexDirection: 'row', gap: 4 },
    scaleSegment: { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
    scaleSegmentActive: { borderWidth: 2, borderColor: '#3C2253' },
    scaleText: { fontSize: 9, color: '#6B7280', fontWeight: '500' },

    noProfileCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', gap: 10,
        marginBottom: 16, elevation: 1,
    },
    noProfileTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
    noProfileText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
    profileBtn: { backgroundColor: '#3C2253', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 4 },
    profileBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    // Trend
    trendCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    trendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
    trendIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    trendLabel: { fontSize: 16, fontWeight: '800' },
    trendSub: { fontSize: 12, color: '#6B7280', marginTop: 3 },

    // AI Insight
    insightCard: {
        backgroundColor: '#FAF5FF', borderRadius: 16, padding: 16, marginBottom: 16,
        borderWidth: 1, borderColor: '#DDD6FE',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    insightTitle: { fontSize: 13, fontWeight: '700', color: '#7C3AED', flex: 1 },
    insightDate: { fontSize: 11, color: '#9CA3AF' },
    insightText: { fontSize: 14, color: '#374151', lineHeight: 22 },
    evaluateCTA: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: '#FAF5FF', borderRadius: 14, paddingVertical: 16,
        borderWidth: 1.5, borderColor: '#DDD6FE', marginBottom: 16,
    },
    evaluateCTAText: { fontSize: 14, fontWeight: '700', color: '#7C3AED' },

    // Chart
    chartCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    chartWrapper: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 6, marginVertical: 12 },
    barCol: { flex: 1, alignItems: 'center', gap: 4 },
    barLabel: { fontSize: 10, fontWeight: '700' },
    barTrack: { flex: 1, width: '100%', backgroundColor: '#F3F4F6', borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
    barFill: { width: '100%', borderRadius: 6 },
    barDate: { fontSize: 9, color: '#9CA3AF' },
    chartLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, color: '#6B7280' },

    // History
    historySection: { gap: 10 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
    historyCard: {
        backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row', alignItems: 'center',
        padding: 14, gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
    },
    historyLeft: {
        width: 60, height: 60, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5,
    },
    historyBmi: { fontSize: 18, fontWeight: '900' },
    historyBmiCat: { fontSize: 9, fontWeight: '600' },
    historyMid: { flex: 1, gap: 3 },
    historyDate: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
    historyMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    historyTrend: { fontSize: 11, fontWeight: '600' },
    historyCalColor: { fontSize: 11, color: '#9CA3AF' },
    historyRight: { alignItems: 'flex-end', gap: 4 },
    historyDelta: { fontSize: 18, fontWeight: '800' },
    historyPeriod: { fontSize: 10, color: '#9CA3AF' },

    noHistoryCTA: {
        backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', gap: 10,
        elevation: 1,
    },
    noHistoryTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
    noHistoryText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
});
