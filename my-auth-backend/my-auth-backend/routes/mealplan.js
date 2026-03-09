const express = require('express');
const router = express.Router();
const MealPlan = require('../models/MealPlan');
const User = require('../models/User');
const auth = require('../middleware/auth');

/** Utility: get today's date string in YYYY-MM-DD (server local) */
function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Get or create today's MealPlan document for the user */
async function getOrCreateToday(userId, dailyTarget) {
    const date = todayStr();
    let plan = await MealPlan.findOne({ userId, date });
    if (!plan) {
        plan = new MealPlan({ userId, date, meals: [], totalCalories: 0, dailyTarget: dailyTarget || 2000 });
        await plan.save();
    }
    return plan;
}

// ─── POST /api/mealplan/cook ────────────────────────────────────
/**
 * "I Cooked It" — log a recipe to today's meal plan.
 * Body: { recipeName, recipeId?, calories, macros?, image?, mealType? }
 */
router.post('/cook', auth, async (req, res) => {
    try {
        const { recipeName, recipeId, calories, macros, image, mealType } = req.body;

        if (!recipeName || calories === undefined) {
            return res.status(400).json({ success: false, message: 'recipeName and calories are required' });
        }

        // Get user's daily calorie target
        const user = await User.findById(req.userId).select('dailyCalorieTarget');
        const dailyTarget = user?.dailyCalorieTarget || 2000;

        const plan = await getOrCreateToday(req.userId, dailyTarget);

        // Add the meal entry
        plan.meals.push({
            recipeName,
            recipeId: recipeId || '',
            calories: Number(calories),
            macros: {
                protein: macros?.protein || 0,
                carbs: macros?.carbs || 0,
                fat: macros?.fat || 0,
                fiber: macros?.fiber || 0,
            },
            image: image || '',
            mealType: mealType || 'lunch',
            cookedAt: new Date(),
        });

        await plan.save();

        const remaining = Math.max(0, plan.dailyTarget - plan.totalCalories);
        const exceeded = plan.totalCalories > plan.dailyTarget;

        console.log(`✅ [MealPlan] User ${req.userId} cooked "${recipeName}" (${calories} kcal). Today total: ${plan.totalCalories}/${plan.dailyTarget}`);

        res.status(201).json({
            success: true,
            message: 'Meal logged successfully!',
            mealPlan: {
                id: plan._id,
                date: plan.date,
                totalCalories: plan.totalCalories,
                dailyTarget: plan.dailyTarget,
                remaining,
                exceeded,
                mealsCount: plan.meals.length,
            },
        });
    } catch (error) {
        console.error('[MealPlan] cook error:', error.message);
        res.status(500).json({ success: false, message: 'Error logging meal', error: error.message });
    }
});

// ─── GET /api/mealplan/today ────────────────────────────────────
/** Get today's full meal plan with calorie summary */
router.get('/today', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('dailyCalorieTarget');
        const dailyTarget = user?.dailyCalorieTarget || 2000;

        const plan = await getOrCreateToday(req.userId, dailyTarget);

        const remaining = Math.max(0, plan.dailyTarget - plan.totalCalories);
        const pct = Math.min(100, Math.round((plan.totalCalories / plan.dailyTarget) * 100));
        const status = plan.totalCalories > plan.dailyTarget
            ? 'exceeded'
            : pct >= 90 ? 'met'
                : pct >= 60 ? 'on_track'
                    : 'needs_more';

        // Aggregate macros
        const macros = plan.meals.reduce((acc, m) => ({
            protein: acc.protein + (m.macros?.protein || 0),
            carbs: acc.carbs + (m.macros?.carbs || 0),
            fat: acc.fat + (m.macros?.fat || 0),
            fiber: acc.fiber + (m.macros?.fiber || 0),
        }), { protein: 0, carbs: 0, fat: 0, fiber: 0 });

        res.json({
            success: true,
            plan: {
                id: plan._id,
                date: plan.date,
                meals: plan.meals,
                totalCalories: plan.totalCalories,
                dailyTarget: plan.dailyTarget,
                remaining,
                percentage: pct,
                status,
                macros,
                mealsCount: plan.meals.length,
            },
        });
    } catch (error) {
        console.error('[MealPlan] today error:', error.message);
        res.status(500).json({ success: false, message: 'Error fetching today\'s plan', error: error.message });
    }
});

// ─── DELETE /api/mealplan/entry/:mealId ────────────────────────
/** Remove a meal entry from today's plan */
router.delete('/entry/:mealId', auth, async (req, res) => {
    try {
        const date = todayStr();
        const plan = await MealPlan.findOne({ userId: req.userId, date });
        if (!plan) return res.status(404).json({ success: false, message: 'No meal plan found for today' });

        const before = plan.meals.length;
        plan.meals = plan.meals.filter(m => m._id.toString() !== req.params.mealId);
        if (plan.meals.length === before) {
            return res.status(404).json({ success: false, message: 'Meal entry not found' });
        }

        await plan.save();
        res.json({ success: true, message: 'Meal removed', totalCalories: plan.totalCalories });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error removing meal', error: error.message });
    }
});

// ─── GET /api/mealplan/history ─────────────────────────────────
/** Get meal history — last 14 days by default */
router.get('/history', auth, async (req, res) => {
    try {
        const days = parseInt(String(req.query.days || '14')) || 14;
        const plans = await MealPlan.find({ userId: req.userId })
            .sort({ date: -1 })
            .limit(days)
            .lean();

        const user = await User.findById(req.userId).select('dailyCalorieTarget');
        const dailyTarget = user?.dailyCalorieTarget || 2000;

        res.json({
            success: true,
            history: plans.map(p => ({
                id: p._id,
                date: p.date,
                mealsCount: p.meals.length,
                meals: p.meals,
                totalCalories: p.totalCalories,
                dailyTarget: p.dailyTarget || dailyTarget,
                percentage: Math.min(100, Math.round((p.totalCalories / (p.dailyTarget || dailyTarget)) * 100)),
            })),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching history', error: error.message });
    }
});

// ─── GET /api/mealplan/weekly-summary ─────────────────────────
/** Weekly calorie + macro summary */
router.get('/weekly-summary', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('dailyCalorieTarget');
        const dailyTarget = user?.dailyCalorieTarget || 2000;

        const plans = await MealPlan.find({ userId: req.userId }).sort({ date: -1 }).limit(7).lean();

        const totalCalories = plans.reduce((s, p) => s + p.totalCalories, 0);
        const avgCalories = plans.length > 0 ? Math.round(totalCalories / plans.length) : 0;
        const daysOnTrack = plans.filter(p => p.totalCalories >= dailyTarget * 0.8 && p.totalCalories <= dailyTarget * 1.15).length;
        const totalMeals = plans.reduce((s, p) => s + p.meals.length, 0);

        const macros = plans.reduce((acc, p) => {
            p.meals.forEach(m => {
                acc.protein += m.macros?.protein || 0;
                acc.carbs += m.macros?.carbs || 0;
                acc.fat += m.macros?.fat || 0;
                acc.fiber += m.macros?.fiber || 0;
            });
            return acc;
        }, { protein: 0, carbs: 0, fat: 0, fiber: 0 });

        res.json({
            success: true,
            summary: {
                daysTracked: plans.length,
                totalCalories,
                avgCalories,
                dailyTarget,
                daysOnTrack,
                totalMeals,
                macros,
                days: plans.map(p => ({
                    date: p.date,
                    totalCalories: p.totalCalories,
                    mealsCount: p.meals.length,
                })),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching weekly summary', error: error.message });
    }
});

module.exports = router;
