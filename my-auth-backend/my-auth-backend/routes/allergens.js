const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Optional auth helper — get user allergens if logged in
async function getUserAllergens(req) {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return [];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded.userId, isDeleted: { $ne: true } });
        return user?.allergens || [];
    } catch {
        return [];
    }
}

/**
 * POST /api/allergens/check
 * Analyzes a recipe's ingredients for allergens using OpenAI.
 * Body: { recipeName, ingredients: string[], userAllergens?: string[] }
 */
router.post('/check', async (req, res) => {
    try {
        const { recipeName, ingredients, userAllergens: bodyAllergens } = req.body;

        if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
            return res.status(400).json({ success: false, message: 'ingredients array is required' });
        }

        // Merge user allergens from token and body
        const tokenAllergens = await getUserAllergens(req);
        const userAllergens = [...new Set([...(bodyAllergens || []), ...tokenAllergens])];

        const prompt = `You are a certified food allergen analyst. Analyze the following recipe and its ingredients for ALL common food allergens.

Recipe: ${recipeName || 'Unknown Recipe'}
Ingredients: ${ingredients.join(', ')}
User's declared allergens: ${userAllergens.length > 0 ? userAllergens.join(', ') : 'None declared'}

Return a JSON object with this exact structure:
{
  "detectedAllergens": [
    {
      "name": "string (e.g. 'Dairy', 'Gluten', 'Eggs', 'Nuts', 'Shellfish', 'Soy', 'Sesame')",
      "severity": "high | medium | low",
      "emoji": "single emoji representing this allergen",
      "triggerIngredients": ["list of specific ingredients that contain this allergen"],
      "description": "brief explanation of why this is an allergen concern (1-2 sentences)",
      "affectsUser": true or false (true if in user's declared allergens list)
    }
  ],
  "safeForUser": true or false,
  "summary": "One sentence summary of allergen status for this recipe",
  "totalAllergens": number
}

Be comprehensive — check for the 14 major allergens: gluten/wheat, dairy/milk, eggs, fish, shellfish, tree nuts, peanuts, soy, sesame, mustard, celery, lupin, molluscs, sulphites.
Only include allergens actually present in the ingredients. Be accurate.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a food safety expert. Always respond with valid JSON only, no markdown or extra text.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.2,
            max_tokens: 1000,
            response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('No response from OpenAI');

        const result = JSON.parse(content);
        console.log(`✅ [Allergen Check] "${recipeName}" — ${result.totalAllergens || 0} allergen(s) detected`);

        res.json({
            success: true,
            recipeName,
            ...result,
            source: 'openai-gpt4o-mini',
        });

    } catch (error) {
        console.error('[Allergen Check] Error:', error.message);
        res.status(500).json({ success: false, message: 'Error analyzing allergens', error: error.message });
    }
});

/**
 * POST /api/allergens/substitute
 * Generates AI ingredient substitutions for detected allergens.
 * Body: { recipeName, ingredients: string[], allergenToReplace: string, userDietaryPreferences?: string[] }
 */
router.post('/substitute', async (req, res) => {
    try {
        const { recipeName, ingredients, allergenToReplace, allergenIngredients, userDietaryPreferences } = req.body;

        if (!allergenToReplace) {
            return res.status(400).json({ success: false, message: 'allergenToReplace is required' });
        }

        const prompt = `You are an expert chef and nutritionist specializing in allergen-free cooking. 

Recipe: ${recipeName || 'Recipe'}
Original ingredients: ${(ingredients || []).join(', ')}
Allergen to replace: ${allergenToReplace}
Specific ingredients containing this allergen: ${(allergenIngredients || []).join(', ')}
User's dietary preferences: ${(userDietaryPreferences || []).join(', ') || 'None specified'}

Generate 2-3 practical substitution options for replacing the ${allergenToReplace} allergen in this recipe.

Return a JSON object with this exact structure:
{
  "allergenBeingReplaced": "${allergenToReplace}",
  "substitutions": [
    {
      "originalIngredient": "the specific ingredient being replaced",
      "substitute": "name of substitute ingredient",
      "quantity": "same quantity as the original (e.g., '200ml', '2 cups')",
      "benefit": "short health/dietary benefit (e.g., 'dairy-free', 'high in calcium')",
      "tags": ["tag1", "tag2"],
      "description": "1-2 sentences on how to use it and how it affects the dish",
      "nutritionNote": "brief note on nutritional difference from original",
      "imageSearch": "simple search term to find this ingredient image (2-3 words)"
    }
  ],
  "cookingTip": "One practical cooking tip for making this substitution work well",
  "recipeNote": "Brief note on how the substitution might change the final dish's taste or texture"
}

Make substitutions practical, widely available, and genuinely allergen-free for ${allergenToReplace}.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a culinary expert specializing in allergen-free cooking. Always respond with valid JSON only.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.4,
            max_tokens: 1200,
            response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('No response from OpenAI');

        const result = JSON.parse(content);
        console.log(`✅ [Substitute] "${allergenToReplace}" in "${recipeName}" — ${result.substitutions?.length || 0} substitution(s) generated`);

        res.json({
            success: true,
            recipeName,
            ...result,
            source: 'openai-gpt4o-mini',
        });

    } catch (error) {
        console.error('[Substitute] Error:', error.message);
        res.status(500).json({ success: false, message: 'Error generating substitutions', error: error.message });
    }
});

module.exports = router;
