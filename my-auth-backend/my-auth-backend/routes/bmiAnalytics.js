const express = require('express');
const router = express.Router();
const BMIRecord = require('../models/BMIRecord');
const MealPlan = require('../models/MealPlan');
const User = require('../models/User');
const auth = require('../middleware/auth');

const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Calculate BMI and category */
function calcBMI(weight, height) {
    if (!weight || !height) return null;
    const h = height / 100;
    const bmi = parseFloat((weight / (h * h)).toFixed(1));
    const category =
        bmi < 18.5 ? 'Underweight'
            : bmi < 25 ? 'Normal'
                : bmi < 30 ? 'Overweight'
                    : 'Obese';
    return { bmi, category };
}

/** Get average daily calories from MealPlan for last N days */
async function getCalorieContext(userId, days) {
    const plans = await MealPlan.find({ userId }).sort({ date: -1 }).limit(days).lean();
    const total = plans.reduce((s, p) => s + (p.totalCalories || 0), 0);
    const avg = plans.length > 0 ? Math.round(total / plans.length) : 0;
    const meals = plans.reduce((s, p) => s + (p.meals?.length || 0), 0);

    // Calculate period start/end dates
    const sorted = [...plans].sort((a, b) => a.date.localeCompare(b.date));
    const startDate = sorted[0]?.date || '';
    const endDate = sorted[sorted.length - 1]?.date || '';

    return { total, avg, meals, startDate, endDate };
}

// ─── GET /api/bmi/current ───────────────────────────────────────────────────
/** Get the user's current BMI (from profile) + latest record */
router.get('/current', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('bmi bmiCategory weight height healthGoal dailyCalorieTarget exerciseLevel age gender');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const latest = await BMIRecord.findOne({ userId: req.userId }).sort({ evaluatedAt: -1 }).lean();

        res.json({
            success: true,
            current: {
                bmi: user.bmi,
                bmiCategory: user.bmiCategory,
                weight: user.weight,
                height: user.height,
                healthGoal: user.healthGoal,
                dailyTarget: user.dailyCalorieTarget,
                exerciseLevel: user.exerciseLevel,
            },
            latestRecord: latest || null,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching BMI data', error: error.message });
    }
});

// ─── GET /api/bmi/history ───────────────────────────────────────────────────
/** Get historical BMI records with trend info */
router.get('/history', auth, async (req, res) => {
    try {
        const limit = parseInt(String(req.query.limit || '10')) || 10;
        const records = await BMIRecord.find({ userId: req.userId })
            .sort({ evaluatedAt: -1 })
            .limit(limit)
            .lean();

        res.json({
            success: true,
            records,
            count: records.length,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching history', error: error.message });
    }
});

// ─── GET /api/bmi/trend ─────────────────────────────────────────────────────
/** Aggregate trend over last N records */
router.get('/trend', auth, async (req, res) => {
    try {
        const records = await BMIRecord.find({ userId: req.userId })
            .sort({ evaluatedAt: 1 })
            .limit(10)
            .lean();

        if (records.length < 2) {
            return res.json({ success: true, trend: 'insufficient_data', records });
        }

        const first = records[0];
        const last = records[records.length - 1];
        const delta = parseFloat((last.bmi - first.bmi).toFixed(1));
        const user = await User.findById(req.userId).select('healthGoal');
        const goal = user?.healthGoal || 'maintenance';

        // "Improving" = moving toward goal
        let overallTrend = 'stable';
        if (Math.abs(delta) >= 0.5) {
            if (goal === 'weight_loss' && delta < 0) overallTrend = 'improving';
            if (goal === 'weight_gain' && delta > 0) overallTrend = 'improving';
            if (goal === 'maintenance' && Math.abs(delta) < 1) overallTrend = 'stable';
            else if (overallTrend !== 'improving') overallTrend = 'worsening';
        }

        res.json({
            success: true,
            trend: overallTrend,
            delta,
            firstBMI: first.bmi,
            latestBMI: last.bmi,
            firstDate: first.evaluatedAt,
            latestDate: last.evaluatedAt,
            records,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching trend', error: error.message });
    }
});

// ─── POST /api/bmi/evaluate ─────────────────────────────────────────────────
/**
 * Trigger a BMI evaluation (manual or auto).
 * Reads user profile for current BMI, reads last 7 days of meal plans,
 * generates an AI health insight, and saves a BMIRecord.
 */
router.post('/evaluate', auth, async (req, res) => {
    try {
        const periodDays = parseInt(req.body.periodDays || '7') || 7;

        const user = await User.findById(req.userId).select(
            'bmi bmiCategory weight height healthGoal dailyCalorieTarget exerciseLevel age gender'
        );

        if (!user || !user.bmi) {
            return res.status(400).json({ success: false, message: 'Complete your profile (height & weight) before evaluating BMI' });
        }

        const bmiData = calcBMI(user.weight, user.height);
        if (!bmiData) return res.status(400).json({ success: false, message: 'Invalid height or weight' });

        const calorieCtx = await getCalorieContext(req.userId, periodDays);

        // Compare vs last record
        const lastRecord = await BMIRecord.findOne({ userId: req.userId }).sort({ evaluatedAt: -1 }).lean();
        const bmiChange = lastRecord ? parseFloat((bmiData.bmi - lastRecord.bmi).toFixed(1)) : 0;
        const goal = user.healthGoal || 'maintenance';

        let trend = 'first';
        if (lastRecord) {
            if (Math.abs(bmiChange) < 0.2) trend = 'stable';
            else if ((goal === 'weight_loss' && bmiChange < 0) || (goal === 'weight_gain' && bmiChange > 0)) trend = 'improving';
            else trend = 'worsening';
        }

        // ── AI health insight ────────────────────────────────────────────
        let aiInsight = '';
        try {
            const prompt = `You are a nutrition and health coach. Provide a concise, encouraging but honest 2-3 sentence health insight for this user.

User profile:
- BMI: ${bmiData.bmi} (${bmiData.category})
- BMI change this period: ${bmiChange > 0 ? '+' : ''}${bmiChange}
- Health goal: ${goal.replace('_', ' ')}
- Average daily calories (last ${periodDays} days): ${calorieCtx.avg} kcal
- Daily calorie target: ${user.dailyCalorieTarget || 2000} kcal
- Meals logged in period: ${calorieCtx.meals}
- Exercise level: ${user.exerciseLevel || 'moderate'}
- Trend: ${trend}

Respond in plain text only (no markdown, no bullet points). Be specific, warm, and actionable.`;

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 120,
                temperature: 0.7,
            });
            aiInsight = completion.choices[0]?.message?.content?.trim() || '';
        } catch (aiError) {
            console.warn('[BMI] AI insight failed:', aiError.message);
            aiInsight = trend === 'improving'
                ? `Great work! Your BMI of ${bmiData.bmi} is trending in the right direction toward your ${goal.replace('_', ' ')} goal. Keep logging your meals and stay consistent.`
                : `Your current BMI is ${bmiData.bmi} (${bmiData.category}). Stay focused on your ${goal.replace('_', ' ')} goal — consistent meal logging is key to progress.`;
        }

        // Save record
        const record = await BMIRecord.create({
            userId: req.userId,
            bmi: bmiData.bmi,
            bmiCategory: bmiData.category,
            weight: user.weight,
            height: user.height,
            caloriesConsumed: calorieCtx.total,
            avgDailyCalories: calorieCtx.avg,
            dailyTarget: user.dailyCalorieTarget || 2000,
            mealsLogged: calorieCtx.meals,
            bmiChange,
            trend,
            aiInsight,
            period: `${periodDays}-day`,
            periodStartDate: calorieCtx.startDate,
            periodEndDate: calorieCtx.endDate,
            evaluatedAt: new Date(),
        });

        console.log(`📊 [BMI] Evaluated for user ${req.userId}: BMI ${bmiData.bmi} (${bmiData.category}), trend=${trend}`);

        res.status(201).json({
            success: true,
            message: 'BMI evaluation complete!',
            record,
        });
    } catch (error) {
        console.error('[BMI] evaluate error:', error.message);
        res.status(500).json({ success: false, message: 'Error evaluating BMI', error: error.message });
    }
});

module.exports = router;
