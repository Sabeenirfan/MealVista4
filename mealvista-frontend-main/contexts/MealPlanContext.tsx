import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from 'react';
import api from '../lib/api';
import { getStoredToken } from '../lib/authStorage';

// ─── Types ─────────────────────────────────────────────────────────────────

export type PlanStatus = 'exceeded' | 'met' | 'on_track' | 'needs_more';

export interface MacroData {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
}

export interface MealEntry {
    _id: string;
    recipeName: string;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    calories: number;
    macros: MacroData;
    image?: string;
    cookedAt: string;
}

export interface TodayPlan {
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

interface MealPlanContextType {
    todayPlan: TodayPlan | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    /** Call this after logging a new meal to update global state without a full refetch */
    updateAfterCook: (addedCalories: number) => void;
}

// ─── Context ────────────────────────────────────────────────────────────────

const MealPlanContext = createContext<MealPlanContextType | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────

export const MealPlanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [todayPlan, setTodayPlan] = useState<TodayPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            setError(null);
            const token = await getStoredToken();
            if (!token) {
                setLoading(false);
                return; // not signed in — don't show error
            }
            const res = await api.get('/api/mealplan/today', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data.success) {
                setTodayPlan(res.data.plan);
            }
        } catch (err: any) {
            // Silent fail — calorie card just won't show
            setError('unavailable');
        } finally {
            setLoading(false);
        }
    }, []);

    /** Optimistic update after cooking a recipe — reflects immediately on home screen */
    const updateAfterCook = useCallback((addedCalories: number) => {
        setTodayPlan(prev => {
            if (!prev) return prev;
            const newTotal = prev.totalCalories + addedCalories;
            const newRemaining = Math.max(0, prev.dailyTarget - newTotal);
            const newPct = Math.min(100, Math.round((newTotal / prev.dailyTarget) * 100));
            const newStatus: PlanStatus =
                newTotal > prev.dailyTarget ? 'exceeded'
                    : newPct >= 90 ? 'met'
                        : newPct >= 60 ? 'on_track'
                            : 'needs_more';
            return {
                ...prev,
                totalCalories: newTotal,
                remaining: newRemaining,
                percentage: newPct,
                status: newStatus,
                mealsCount: prev.mealsCount + 1,
            };
        });
    }, []);

    // Fetch on mount
    useEffect(() => { refresh(); }, [refresh]);

    return (
        <MealPlanContext.Provider value={{ todayPlan, loading, error, refresh, updateAfterCook }}>
            {children}
        </MealPlanContext.Provider>
    );
};

// ─── Hook ───────────────────────────────────────────────────────────────────

export const useMealPlan = () => {
    const context = useContext(MealPlanContext);
    if (!context) {
        throw new Error('useMealPlan must be used within a MealPlanProvider');
    }
    return context;
};
