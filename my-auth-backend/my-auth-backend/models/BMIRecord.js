const mongoose = require('mongoose');

const bmiRecordSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },

    // Snapshot of vitals at time of evaluation
    bmi: { type: Number, required: true },
    bmiCategory: { type: String, required: true }, // Underweight, Normal, Overweight, Obese
    weight: { type: Number, default: null },  // kg
    height: { type: Number, default: null },  // cm

    // Calorie context at the time of evaluation
    caloriesConsumed: { type: Number, default: 0 },   // total kcal in period
    avgDailyCalories: { type: Number, default: 0 },   // avg kcal/day in period
    dailyTarget: { type: Number, default: 2000 }, // user's target at the time
    mealsLogged: { type: Number, default: 0 },   // meals logged in period

    // Trend vs previous record
    bmiChange: { type: Number, default: 0 },   // delta vs last record (+ = gain, - = loss)
    trend: { type: String, enum: ['improving', 'stable', 'worsening', 'first'], default: 'first' },

    // AI-generated health insight for this period
    aiInsight: { type: String, default: '' },

    // Evaluation period
    period: { type: String, enum: ['7-day', '3-day', 'manual'], default: '7-day' },
    periodStartDate: { type: String, default: '' },  // YYYY-MM-DD
    periodEndDate: { type: String, default: '' },  // YYYY-MM-DD

    evaluatedAt: { type: Date, default: Date.now },
});

bmiRecordSchema.index({ userId: 1, evaluatedAt: -1 });

module.exports = mongoose.model('BMIRecord', bmiRecordSchema);
