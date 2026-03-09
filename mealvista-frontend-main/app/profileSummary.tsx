import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getProfile, updateProfile } from '../lib/authService';

interface SummaryItem {
    label: string;
    value: string;
    icon: React.ComponentProps<typeof Feather>['name'];
    color: string;
}

function getBMIColor(bmiCategory: string | null) {
    switch (bmiCategory) {
        case 'Underweight': return '#3B82F6';
        case 'Normal': return '#10B981';
        case 'Overweight': return '#F59E0B';
        case 'Obese': return '#EF4444';
        default: return '#6B7280';
    }
}

function formatGoal(goal: string | null) {
    const m: Record<string, string> = {
        weight_loss: '🔥 Weight Loss',
        weight_gain: '💪 Weight Gain',
        maintenance: '⚖️ Maintenance',
    };
    return goal ? (m[goal] || goal) : 'Not set';
}

function formatExercise(level: string | null) {
    const m: Record<string, string> = {
        low: '🪑 Low (Sedentary)',
        moderate: '🚶 Moderate (Active)',
        high: '⚡ High (Very Active)',
    };
    return level ? (m[level] || level) : 'Not set';
}

// Mifflin-St Jeor — mirrors backend exactly
function calcCalories(profile: any): number | null {
    const { weight, height, age, gender, exerciseLevel, healthGoal } = profile;
    if (!weight || !height) return null;
    const w = Number(weight), h = Number(height), a = Number(age) || 25;
    let bmr = gender === 'female'
        ? 10 * w + 6.25 * h - 5 * a - 161
        : 10 * w + 6.25 * h - 5 * a + 5;
    const activityMap: Record<string, number> = { low: 1.2, moderate: 1.55, high: 1.725 };
    let tdee = bmr * (activityMap[exerciseLevel] || 1.55);
    if (healthGoal === 'weight_loss') tdee -= 500;
    else if (healthGoal === 'weight_gain') tdee += 500;
    return Math.round(tdee);
}

export default function ProfileSummaryScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const res = await getProfile();
            setProfile(res.user);
        } catch {
            Alert.alert('Error', 'Could not load your profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleStartCooking = async () => {
        try {
            setSaving(true);
            // Mark onboarding as complete
            await updateProfile({ onboardingComplete: true } as any);
            router.replace('/home');
        } catch (error: any) {
            Alert.alert('Error', 'Could not complete setup. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#3C2253" />
                <Text style={{ color: '#6B7280', marginTop: 12 }}>Loading your profile...</Text>
            </View>
        );
    }

    const dailyCalories = calcCalories(profile) || profile?.dailyCalorieTarget;
    const bmiColor = getBMIColor(profile?.bmiCategory);

    const summaryItems: SummaryItem[] = [
        {
            label: 'Dietary Preferences',
            value: profile?.dietaryPreferences?.length > 0 ? profile.dietaryPreferences.join(', ') : 'None selected',
            icon: 'list',
            color: '#8B5CF6',
        },
        {
            label: 'Allergens to Avoid',
            value: profile?.allergens?.length > 0 ? profile.allergens.join(', ') : 'None',
            icon: 'alert-triangle',
            color: '#EF4444',
        },
        {
            label: 'BMI',
            value: profile?.bmi ? `${profile.bmi.toFixed(1)} — ${profile.bmiCategory || ''}` : 'Not set',
            icon: 'activity',
            color: bmiColor,
        },
        {
            label: 'Health Goal',
            value: formatGoal(profile?.healthGoal),
            icon: 'target',
            color: '#10B981',
        },
        {
            label: 'Activity Level',
            value: formatExercise(profile?.exerciseLevel),
            icon: 'zap',
            color: '#3B82F6',
        },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#3C2253" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile Summary</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Progress — all done */}
            <View style={styles.progressBar}>
                {[0, 1, 2, 3, 4].map((i) => (
                    <View key={i} style={[styles.progressStep, styles.progressDone]} />
                ))}
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Greeting */}
                <View style={styles.greetingCard}>
                    <Text style={styles.greetingEmoji}>🎉</Text>
                    <Text style={styles.greetingTitle}>You're all set, {profile?.name?.split(' ')[0] || 'there'}!</Text>
                    <Text style={styles.greetingSubtitle}>
                        Here's a summary of your profile. Your meals will be personalized just for you.
                    </Text>
                </View>

                {/* Daily Calorie Target — hero card */}
                {dailyCalories && (
                    <View style={styles.calorieCard}>
                        <View style={styles.calorieLeft}>
                            <Text style={styles.calorieLabel}>Your Daily Calorie Target</Text>
                            <Text style={styles.calorieValue}>{dailyCalories.toLocaleString()}</Text>
                            <Text style={styles.calorieUnit}>kcal / day</Text>
                        </View>
                        <View style={styles.calorieRight}>
                            <View style={styles.caloriePieOuter}>
                                <View style={styles.caloriePieInner}>
                                    <Feather name="zap" size={28} color="#A78BFA" />
                                </View>
                            </View>
                            <Text style={styles.calorieHint}>
                                ≈ {Math.round(dailyCalories / 3)} kcal{'\n'}per meal
                            </Text>
                        </View>
                    </View>
                )}

                {/* Summary items */}
                <Text style={styles.sectionTitle}>Your Profile</Text>
                <View style={styles.summaryList}>
                    {summaryItems.map((item, idx) => (
                        <View key={idx} style={styles.summaryItem}>
                            <View style={[styles.summaryIcon, { backgroundColor: `${item.color}16` }]}>
                                <Feather name={item.icon} size={18} color={item.color} />
                            </View>
                            <View style={styles.summaryText}>
                                <Text style={styles.summaryLabel}>{item.label}</Text>
                                <Text style={styles.summaryValue}>{item.value}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Edit links */}
                <View style={styles.editSection}>
                    <Text style={styles.editTitle}>Want to change something?</Text>
                    <View style={styles.editLinks}>
                        {[
                            { label: 'Dietary Preferences', route: '/dietaryPreference' },
                            { label: 'Allergens', route: '/allergenPreference' },
                            { label: 'BMI', route: '/bmiCalculator' },
                            { label: 'Health Goal', route: '/healthGoal' },
                            { label: 'Activity Level', route: '/exerciseLevel' },
                        ].map((link) => (
                            <TouchableOpacity
                                key={link.route}
                                style={styles.editLink}
                                onPress={() => router.push(link.route as any)}
                            >
                                <Text style={styles.editLinkText}>{link.label}</Text>
                                <Feather name="edit-2" size={12} color="#3C2253" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* CTA Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.startButton}
                    onPress={handleStartCooking}
                    disabled={saving}
                >
                    {saving
                        ? <ActivityIndicator color="#fff" />
                        : (
                            <>
                                <Text style={styles.startButtonText}>Start Cooking! 🍽️</Text>
                                <Feather name="arrow-right" size={18} color="#fff" style={{ marginLeft: 8 }} />
                            </>
                        )
                    }
                </TouchableOpacity>
                <Text style={styles.footerHint}>
                    Your recommendations will improve as you log meals
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        backgroundColor: '#3C2253',
        paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    placeholder: { width: 40 },

    progressBar: {
        flexDirection: 'row', backgroundColor: '#3C2253',
        paddingHorizontal: 16, paddingBottom: 16, gap: 6,
    },
    progressStep: { flex: 1, height: 4, borderRadius: 2 },
    progressDone: { backgroundColor: '#A78BFA' },

    content: { flex: 1, padding: 20 },

    greetingCard: {
        backgroundColor: '#3C2253', borderRadius: 16, padding: 20,
        alignItems: 'center', marginBottom: 20,
    },
    greetingEmoji: { fontSize: 36, marginBottom: 8 },
    greetingTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 6 },
    greetingSubtitle: { fontSize: 14, color: '#D8B4FE', textAlign: 'center', lineHeight: 20 },

    calorieCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 20,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, elevation: 3,
        shadowColor: '#3C2253', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6,
    },
    calorieLeft: { flex: 1 },
    calorieLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    calorieValue: { fontSize: 48, fontWeight: '800', color: '#3C2253', lineHeight: 56 },
    calorieUnit: { fontSize: 14, color: '#6B7280' },
    calorieRight: { alignItems: 'center', gap: 8 },
    caloriePieOuter: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: '#F0EFFF', alignItems: 'center', justifyContent: 'center',
        borderWidth: 3, borderColor: '#DDD6FE',
    },
    caloriePieInner: { alignItems: 'center', justifyContent: 'center' },
    calorieHint: { fontSize: 12, color: '#6B7280', textAlign: 'center', lineHeight: 16 },

    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12 },

    summaryList: {
        backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
        marginBottom: 24, elevation: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
    },
    summaryItem: {
        flexDirection: 'row', alignItems: 'center', padding: 16,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    summaryIcon: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center', marginRight: 14,
    },
    summaryText: { flex: 1 },
    summaryLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '500', marginBottom: 2 },
    summaryValue: { fontSize: 14, color: '#1F2937', fontWeight: '600' },

    editSection: { marginBottom: 24 },
    editTitle: { fontSize: 14, color: '#6B7280', marginBottom: 10 },
    editLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    editLink: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#F0EFFF', paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1, borderColor: '#DDD6FE',
    },
    editLinkText: { fontSize: 12, color: '#3C2253', fontWeight: '600' },

    footer: {
        padding: 20, backgroundColor: '#fff',
        borderTopWidth: 1, borderTopColor: '#E5E7EB',
        alignItems: 'center', gap: 8,
    },
    startButton: {
        backgroundColor: '#3C2253', paddingVertical: 16, borderRadius: 12,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        width: '100%',
    },
    startButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    footerHint: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
});
