import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    ScrollView,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getProfile, updateProfile } from '../lib/authService';

const exerciseLevels = [
    {
        id: 'low',
        title: 'Low Activity',
        subtitle: 'Sedentary',
        icon: 'coffee' as const,
        description: 'Little or no exercise. Desk job or mostly sitting throughout the day.',
        color: '#10B981',
        multiplier: '×1.2',
    },
    {
        id: 'moderate',
        title: 'Moderate Activity',
        subtitle: 'Lightly Active',
        icon: 'wind' as const,
        description: 'Light exercise 1–3 days/week or a job that involves some walking.',
        color: '#3B82F6',
        multiplier: '×1.55',
    },
    {
        id: 'high',
        title: 'High Activity',
        subtitle: 'Very Active',
        icon: 'zap' as const,
        description: 'Hard exercise 4–7 days/week or a physically demanding job.',
        color: '#8B5CF6',
        multiplier: '×1.73',
    },
];

export default function ExerciseLevelScreen() {
    const router = useRouter();
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadCurrentLevel();
    }, []);

    const loadCurrentLevel = async () => {
        try {
            const response = await getProfile();
            if ((response.user as any)?.exerciseLevel) {
                setSelectedLevel((response.user as any).exerciseLevel);
            }
        } catch {
            // ignore
        }
    };

    const handleNext = async () => {
        if (!selectedLevel) {
            Alert.alert('Please select your activity level to continue.');
            return;
        }
        try {
            setLoading(true);
            await updateProfile({ exerciseLevel: selectedLevel as any });
            router.push('/profileSummary' as any);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to save. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#3C2253" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Activity Level</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Progress indicator */}
            <View style={styles.progressBar}>
                <View style={[styles.progressStep, styles.progressDone]} />
                <View style={[styles.progressStep, styles.progressDone]} />
                <View style={[styles.progressStep, styles.progressDone]} />
                <View style={[styles.progressStep, styles.progressDone]} />
                <View style={[styles.progressStep, styles.progressActive]} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.introContainer}>
                    <Text style={styles.introTitle}>How Active Are You?</Text>
                    <Text style={styles.introText}>
                        Your activity level helps us calculate your precise daily calorie target
                        so your meal recommendations are perfectly on point.
                    </Text>
                </View>

                <View style={styles.levelsContainer}>
                    {exerciseLevels.map((level) => {
                        const isSelected = selectedLevel === level.id;
                        return (
                            <TouchableOpacity
                                key={level.id}
                                style={[
                                    styles.levelCard,
                                    isSelected && styles.levelCardSelected,
                                    isSelected && { borderColor: level.color },
                                ]}
                                onPress={() => setSelectedLevel(level.id)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: `${level.color}18` }]}>
                                    <Feather name={level.icon} size={30} color={level.color} />
                                </View>
                                <View style={styles.levelContent}>
                                    <View style={styles.levelTitleRow}>
                                        <Text style={styles.levelTitle}>{level.title}</Text>
                                        <View style={[styles.multiplierBadge, { backgroundColor: `${level.color}18` }]}>
                                            <Text style={[styles.multiplierText, { color: level.color }]}>{level.multiplier}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.levelSubtitle}>{level.subtitle}</Text>
                                    <Text style={styles.levelDescription}>{level.description}</Text>
                                </View>
                                {isSelected && (
                                    <View style={[styles.checkmark, { backgroundColor: level.color }]}>
                                        <Feather name="check" size={18} color="#fff" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.infoBox}>
                    <Feather name="info" size={18} color="#3C2253" />
                    <Text style={styles.infoText}>
                        The activity multiplier is used with your BMR to calculate your Total Daily Energy Expenditure (TDEE) — the calories you need each day.
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.nextButton, !selectedLevel && styles.nextButtonDisabled]}
                    onPress={handleNext}
                    disabled={!selectedLevel || loading}
                >
                    <Text style={styles.nextButtonText}>
                        {loading ? 'Saving...' : 'Next — See Summary'}
                    </Text>
                    {!loading && <Feather name="arrow-right" size={18} color="#fff" style={{ marginLeft: 8 }} />}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        backgroundColor: '#3C2253',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    placeholder: { width: 40 },

    progressBar: {
        flexDirection: 'row',
        backgroundColor: '#3C2253',
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 6,
    },
    progressStep: {
        flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)',
    },
    progressDone: { backgroundColor: '#A78BFA' },
    progressActive: { backgroundColor: '#fff' },

    content: { flex: 1, padding: 20 },
    introContainer: { marginBottom: 24 },
    introTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
    introText: { fontSize: 15, color: '#6B7280', lineHeight: 22 },

    levelsContainer: { gap: 14, marginBottom: 24 },
    levelCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    levelCardSelected: { borderWidth: 2, elevation: 4 },
    iconContainer: {
        width: 56, height: 56, borderRadius: 28,
        alignItems: 'center', justifyContent: 'center', marginRight: 14,
    },
    levelContent: { flex: 1 },
    levelTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
    levelTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
    multiplierBadge: {
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
    },
    multiplierText: { fontSize: 12, fontWeight: '700' },
    levelSubtitle: { fontSize: 12, color: '#9CA3AF', marginBottom: 4, fontWeight: '500' },
    levelDescription: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
    checkmark: {
        width: 28, height: 28, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center', marginLeft: 10, marginTop: 2,
    },

    infoBox: {
        flexDirection: 'row', backgroundColor: '#F0EFFF',
        padding: 14, borderRadius: 12, gap: 10, marginBottom: 20,
    },
    infoText: { flex: 1, fontSize: 13, color: '#3C2253', lineHeight: 18 },

    footer: {
        padding: 20, backgroundColor: '#fff',
        borderTopWidth: 1, borderTopColor: '#E5E7EB',
    },
    nextButton: {
        backgroundColor: '#3C2253', paddingVertical: 16, borderRadius: 12,
        alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
    },
    nextButtonDisabled: { backgroundColor: '#D1D5DB' },
    nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
