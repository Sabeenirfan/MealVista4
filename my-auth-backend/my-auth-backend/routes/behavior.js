const express = require('express');
const router = express.Router();
const UserBehavior = require('../models/UserBehavior');
const auth = require('../middleware/auth');

// ─── POST /api/behavior/track ───────────────────────────────────────────────
/**
 * Log a user behavior event.
 * Body: { event: 'view'|'favorite'|'unfavorite'|'cook'|'search', recipeId?, recipeName?, query?, calories? }
 */
router.post('/track', auth, async (req, res) => {
    try {
        const { event, recipeId, recipeName, query, calories } = req.body;

        const validEvents = ['view', 'favorite', 'unfavorite', 'cook', 'search'];
        if (!validEvents.includes(event)) {
            return res.status(400).json({ success: false, message: `Invalid event. Must be one of: ${validEvents.join(', ')}` });
        }

        // Upsert the behavior document for this user
        let behavior = await UserBehavior.findOne({ userId: req.userId });
        if (!behavior) {
            behavior = new UserBehavior({ userId: req.userId });
        }

        switch (event) {
            case 'view': {
                if (!recipeId && !recipeName) break;
                const existing = behavior.viewedRecipes.find(r => r.recipeId === recipeId);
                if (existing) {
                    existing.viewCount += 1;
                    existing.viewedAt = new Date();
                } else {
                    behavior.viewedRecipes.push({ recipeId, recipeName, viewedAt: new Date() });
                }
                break;
            }

            case 'favorite': {
                if (!recipeId && !recipeName) break;
                const alreadyFav = behavior.favoriteRecipes.find(r => r.recipeId === recipeId);
                if (!alreadyFav) {
                    behavior.favoriteRecipes.push({ recipeId, recipeName, addedAt: new Date() });
                }
                break;
            }

            case 'unfavorite': {
                behavior.favoriteRecipes = behavior.favoriteRecipes.filter(r => r.recipeId !== recipeId);
                break;
            }

            case 'cook': {
                if (!recipeName) break;
                behavior.cookedRecipes.push({ recipeId, recipeName, cookedAt: new Date(), calories: calories || 0 });
                break;
            }

            case 'search': {
                if (!query || query.trim().length < 2) break;
                behavior.searchHistory.push({ query: query.trim(), searchedAt: new Date() });
                break;
            }
        }

        await behavior.save();

        res.json({ success: true, message: `Event "${event}" tracked` });
    } catch (error) {
        // Silent fail for behavior tracking — don't block the user
        console.error('[Behavior] track error:', error.message);
        res.json({ success: false, message: 'Tracking failed silently' });
    }
});

// ─── GET /api/behavior/profile ──────────────────────────────────────────────
/**
 * Get a summary of the current user's behavior for use in AI prompts.
 */
router.get('/profile', auth, async (req, res) => {
    try {
        const behavior = await UserBehavior.findOne({ userId: req.userId }).lean();

        if (!behavior) {
            return res.json({ success: true, profile: null, message: 'No behavior data yet' });
        }

        // Build a compact summary for AI ingestion
        const recentSearches = behavior.searchHistory.slice(-5).map(s => s.query);
        const topCooked = behavior.cookedRecipes
            .slice(-10)
            .map(r => r.recipeName)
            .filter(Boolean);
        const favorites = behavior.favoriteRecipes.slice(-10).map(r => r.recipeName).filter(Boolean);
        const recentViews = behavior.viewedRecipes
            .sort((a, b) => b.viewCount - a.viewCount)
            .slice(0, 5)
            .map(r => r.recipeName)
            .filter(Boolean);

        res.json({
            success: true,
            profile: {
                recentSearches,
                topCooked,
                favorites,
                recentViews,
                totalCooks: behavior.cookedRecipes.length,
                totalSearches: behavior.searchHistory.length,
                lastActive: behavior.lastActive,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching behavior profile', error: error.message });
    }
});

module.exports = router;
