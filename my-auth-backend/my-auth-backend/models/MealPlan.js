const mongoose = require('mongoose');

const mealEntrySchema = new mongoose.Schema({
    recipeName: { type: String, required: true },
    recipeId: { type: String, default: '' },
    mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'], default: 'lunch' },
    calories: { type: Number, required: true, default: 0 },
    macros: {
        protein: { type: Number, default: 0 },
        carbs: { type: Number, default: 0 },
        fat: { type: Number, default: 0 },
        fiber: { type: Number, default: 0 },
    },
    image: { type: String, default: '' },
    cookedAt: { type: Date, default: Date.now },
});

const mealPlanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true }, // 'YYYY-MM-DD' for easy daily lookup
    meals: [mealEntrySchema],
    totalCalories: { type: Number, default: 0 },
    dailyTarget: { type: Number, default: 2000 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// Compound index for efficient user+date lookup
mealPlanSchema.index({ userId: 1, date: 1 }, { unique: true });

mealPlanSchema.pre('save', function (next) {
    this.totalCalories = this.meals.reduce((sum, m) => sum + (m.calories || 0), 0);
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('MealPlan', mealPlanSchema);
