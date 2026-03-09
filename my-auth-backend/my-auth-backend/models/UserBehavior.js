const mongoose = require('mongoose');

const userBehaviorSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true,
    },

    /** Recipe IDs/names the user has marked as favorite */
    favoriteRecipes: [{
        recipeId: { type: String },
        recipeName: { type: String },
        addedAt: { type: Date, default: Date.now },
    }],

    /** Recipes the user has opened (deduplicated by recipeId) */
    viewedRecipes: [{
        recipeId: { type: String },
        recipeName: { type: String },
        viewedAt: { type: Date, default: Date.now },
        viewCount: { type: Number, default: 1 },
    }],

    /** Recipes the user has actually cooked via "I Cooked It" */
    cookedRecipes: [{
        recipeId: { type: String },
        recipeName: { type: String },
        cookedAt: { type: Date, default: Date.now },
        calories: { type: Number, default: 0 },
    }],

    /** AI search queries the user has run */
    searchHistory: [{
        query: { type: String },
        searchedAt: { type: Date, default: Date.now },
    }],

    lastActive: { type: Date, default: Date.now },
}, { timestamps: true });

// Keep arrays bounded so documents don't grow unbounded
userBehaviorSchema.pre('save', function (next) {
    if (this.viewedRecipes.length > 50) this.viewedRecipes = this.viewedRecipes.slice(-50);
    if (this.cookedRecipes.length > 100) this.cookedRecipes = this.cookedRecipes.slice(-100);
    if (this.searchHistory.length > 30) this.searchHistory = this.searchHistory.slice(-30);
    if (this.favoriteRecipes.length > 50) this.favoriteRecipes = this.favoriteRecipes.slice(-50);
    this.lastActive = new Date();
    next();
});

module.exports = mongoose.model('UserBehavior', userBehaviorSchema);
