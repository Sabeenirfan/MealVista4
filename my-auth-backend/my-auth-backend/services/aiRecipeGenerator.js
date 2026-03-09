const OpenAI = require('openai');

/**
 * AI Recipe Generator Service — Powered by OpenAI GPT-4o-mini
 * 
 * Generates accurate, personalized recipes with:
 * - Real nutritional values (macros + micros)
 * - Correct allergen detection
 * - Single-person servings tailored to user's health profile
 * - Cuisine-aware, culturally authentic recipes
 */
class AIRecipeGenerator {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = 'gpt-4o-mini';
  }

  /**
   * Calculate daily calorie target using Mifflin-St Jeor equation
   */
  calculateDailyCalories(userProfile) {
    const { bmi, bmiCategory, healthGoal, weight, height, age, gender, exerciseLevel } = userProfile;

    // If we have enough data, use Mifflin-St Jeor
    if (weight && height) {
      const w = weight; // kg
      const h = height; // cm
      const a = age || 25; // default age
      let bmr;
      if (gender === 'female') {
        bmr = 10 * w + 6.25 * h - 5 * a - 161;
      } else {
        bmr = 10 * w + 6.25 * h - 5 * a + 5;
      }

      // Activity multiplier
      let activityMultiplier = 1.55; // moderate default
      if (exerciseLevel === 'low') activityMultiplier = 1.2;
      else if (exerciseLevel === 'high') activityMultiplier = 1.725;

      let tdee = bmr * activityMultiplier;

      // Adjust for health goal
      if (healthGoal === 'weight_loss') tdee -= 500;
      else if (healthGoal === 'weight_gain') tdee += 500;

      return Math.round(tdee);
    }

    // Fallback: estimate from BMI category
    let base = 2000;
    if (bmiCategory === 'Underweight' || (bmi && bmi < 18.5)) base = 2400;
    else if (bmiCategory === 'Overweight' || (bmi && bmi >= 25 && bmi < 30)) base = 1800;
    else if (bmiCategory === 'Obese' || (bmi && bmi >= 30)) base = 1600;

    if (healthGoal === 'weight_loss') base -= 400;
    else if (healthGoal === 'weight_gain') base += 400;

    return base;
  }

  /**
   * Format health goal for display
   */
  formatHealthGoal(goal) {
    const goals = {
      'weight_loss': 'Weight Loss',
      'weight_gain': 'Weight Gain',
      'maintenance': 'Weight Maintenance'
    };
    return goals[goal] || 'Weight Maintenance';
  }

  /**
   * Build the system prompt for recipe generation
   */
  buildSystemPrompt() {
    return `You are an expert nutritionist and chef. You generate ACCURATE, REAL recipes with correct nutritional information.

CRITICAL RULES:
1. ALL recipes must be for EXACTLY 1 person (single serving).
2. Nutritional values MUST be realistic and accurate for the ingredients and quantities listed.
3. Allergens MUST be correctly identified — only list allergens that are ACTUALLY present in the ingredients. Common allergens: dairy, eggs, gluten, nuts, peanuts, soy, fish, shellfish, sesame.
4. Ingredient quantities must be realistic for 1 person.
5. Instructions must be clear, detailed, and practical.
6. Calorie count must match the actual ingredients and quantities (not arbitrary).
7. If the user has dietary restrictions, the recipe MUST respect them — do not include restricted ingredients.
8. If the user wants to gain weight, suggest calorie-dense, nutritious meals. If losing weight, suggest lighter but satisfying meals.

You MUST respond with ONLY a valid JSON object, no markdown, no explanation, no code blocks. Just raw JSON.`;
  }

  /**
   * Build the user prompt for a specific recipe search
   */
  buildRecipePrompt(userProfile, searchQuery, variation = 0) {
    const {
      dietaryPreferences = [],
      allergens = [],
      bmi,
      bmiCategory,
      healthGoal = 'maintenance',
    } = userProfile;

    const dailyCalories = this.calculateDailyCalories(userProfile);
    const perMealCalories = Math.round(dailyCalories / 3); // 3 meals per day

    let prompt = `Generate a recipe for "${searchQuery}" for 1 person.\n\n`;

    prompt += `USER HEALTH PROFILE:\n`;
    prompt += `- Daily calorie target: ${dailyCalories} kcal\n`;
    prompt += `- Per-meal calorie target: ~${perMealCalories} kcal\n`;
    prompt += `- BMI: ${bmi || 'unknown'} (${bmiCategory || 'Normal'})\n`;
    prompt += `- Health goal: ${this.formatHealthGoal(healthGoal)}\n`;

    if (dietaryPreferences.length > 0) {
      prompt += `- Dietary preferences: ${dietaryPreferences.join(', ')}\n`;
    }

    if (allergens.length > 0) {
      prompt += `- MUST AVOID these allergens: ${allergens.join(', ')}\n`;
      prompt += `  (Do NOT include ANY ingredient containing these allergens)\n`;
    }

    if (healthGoal === 'weight_gain') {
      prompt += `\nSince the user wants to GAIN WEIGHT, make this recipe calorie-dense and protein-rich. Use generous portions, healthy fats, and nutrient-dense ingredients. Target ${perMealCalories}-${perMealCalories + 200} calories.\n`;
    } else if (healthGoal === 'weight_loss') {
      prompt += `\nSince the user wants to LOSE WEIGHT, make this recipe lower-calorie but filling. Use lean proteins, vegetables, and fiber-rich ingredients. Target ${perMealCalories - 100}-${perMealCalories} calories.\n`;
    }

    if (variation > 0) {
      prompt += `\nThis is variation #${variation + 1}. Make it DIFFERENT from a standard "${searchQuery}" recipe — use different ingredients, cooking methods, or cultural variations.\n`;
    }

    prompt += `\nRespond with this EXACT JSON structure:
{
  "name": "Recipe Name",
  "prepTime": 15,
  "cookTime": 25,
  "difficulty": "Easy",
  "servings": 1,
  "ingredients": [
    "200g chicken breast, diced",
    "1 tbsp olive oil",
    "..."
  ],
  "instructions": [
    "Step 1 description",
    "Step 2 description",
    "..."
  ],
  "nutrition": {
    "calories": 450,
    "protein": 35,
    "carbs": 40,
    "fat": 15,
    "fiber": 6
  },
  "micros": {
    "calcium": 120,
    "iron": 4,
    "vitaminA": 500,
    "vitaminC": 25,
    "potassium": 600,
    "vitaminD": 2
  },
  "allergens": ["dairy", "gluten"],
  "dietTypes": ["high-protein"],
  "cuisineType": "Italian"
}

IMPORTANT: 
- "allergens" array must ONLY contain allergens that are ACTUALLY in the ingredients. If no allergens, use empty array [].
- "difficulty" must be one of: "Easy", "Medium", "Hard"
- All nutrition values must be realistic for the actual ingredients and quantities listed
- Quantities must be for exactly 1 person`;

    return prompt;
  }

  /**
   * Generate a single personalized recipe using OpenAI GPT-4o-mini
   */
  async generatePersonalizedRecipe(userProfile, searchQuery, variation = 0) {
    try {
      console.log(`🤖 [OpenAI] Generating recipe for: "${searchQuery}" (variation ${variation})`);

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: this.buildSystemPrompt() },
          { role: 'user', content: this.buildRecipePrompt(userProfile, searchQuery, variation) },
        ],
        temperature: 0.7 + (variation * 0.1), // Slightly increase temp for variations
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error('❌ [OpenAI] Empty response');
        return null;
      }

      // Parse the JSON response
      let recipeData;
      try {
        recipeData = JSON.parse(content);
      } catch (parseError) {
        console.error('❌ [OpenAI] Failed to parse JSON:', parseError.message);
        console.error('Raw response:', content.substring(0, 200));
        return null;
      }

      // Validate essential fields
      if (!recipeData.name || !recipeData.ingredients || !recipeData.instructions) {
        console.error('❌ [OpenAI] Missing required fields in response');
        return null;
      }

      // Get an image for this recipe
      const imageUrl = await this.getRecipeImage(searchQuery, recipeData.name);

      // Transform to app format
      const recipe = {
        id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: recipeData.name,
        image: imageUrl,
        calories: recipeData.nutrition?.calories || 0,
        prepTime: recipeData.prepTime || 15,
        cookTime: recipeData.cookTime || 25,
        difficulty: recipeData.difficulty || 'Medium',
        rating: '4.5',
        servings: 1, // Always 1 person
        macros: {
          protein: recipeData.nutrition?.protein || 0,
          carbs: recipeData.nutrition?.carbs || 0,
          fat: recipeData.nutrition?.fat || 0,
          fiber: recipeData.nutrition?.fiber || 0,
        },
        micros: {
          calcium: recipeData.micros?.calcium || 0,
          iron: recipeData.micros?.iron || 0,
          vitaminA: recipeData.micros?.vitaminA || 0,
          vitaminC: recipeData.micros?.vitaminC || 0,
        },
        ingredients: recipeData.ingredients || [],
        instructions: (recipeData.instructions || []).map((text, idx) => ({
          id: idx + 1,
          text: typeof text === 'string' ? text : text.text || String(text),
        })),
        allergens: recipeData.allergens || [],
        dietTypes: recipeData.dietTypes || [],
        isAIGenerated: true,
        personalizedFor: {
          healthGoal: this.formatHealthGoal(userProfile.healthGoal),
          bmiCategory: userProfile.bmiCategory,
          dietaryPreferences: userProfile.dietaryPreferences || [],
        },
      };

      console.log(`✅ [OpenAI] Generated: "${recipe.name}" (${recipe.calories} kcal, ${recipe.macros.protein}g protein)`);
      return recipe;

    } catch (error) {
      console.error(`❌ [OpenAI] Error generating recipe:`, error.message);
      if (error.code === 'insufficient_quota') {
        console.error('❌ OpenAI API quota exceeded. Check your billing.');
      }
      return null;
    }
  }

  /**
   * Generate multiple recipes for a search query
   */
  async generateRecipesForSearch(userProfile, searchQuery, count = 5) {
    console.log(`🔍 [OpenAI] Generating ${count} recipes for: "${searchQuery}"`);

    const recipes = [];
    const promises = [];

    // Generate recipes in parallel (up to 3 at a time to avoid rate limits)
    for (let i = 0; i < count; i++) {
      promises.push(
        this.generatePersonalizedRecipe(userProfile, searchQuery, i)
          .catch(err => {
            console.warn(`⚠️ Recipe ${i + 1} failed:`, err.message);
            return null;
          })
      );

      // Send in batches of 3
      if (promises.length >= 3 || i === count - 1) {
        const results = await Promise.all(promises);
        recipes.push(...results.filter(r => r !== null));
        promises.length = 0;
      }
    }

    // Deduplicate by name
    const seen = new Set();
    const unique = recipes.filter(r => {
      const key = r.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`✅ [OpenAI] Generated ${unique.length} unique recipes for "${searchQuery}"`);
    return unique;
  }

  /**
   * Generate recipes by cuisine category using OpenAI
   */
  async generateCategoryRecipes(cuisine, userProfile, count = 6) {
    const prompt = `Generate ${count} DIFFERENT ${cuisine} recipes. Each must be authentic ${cuisine} cuisine.`;

    try {
      console.log(`🍽️ [OpenAI] Generating ${count} ${cuisine} recipes...`);

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: this.buildSystemPrompt() },
          {
            role: 'user',
            content: `Generate exactly ${count} different, authentic ${cuisine} recipes. Each recipe must be for 1 person.

${userProfile ? `USER PROFILE:
- Health goal: ${this.formatHealthGoal(userProfile.healthGoal || 'maintenance')}
- BMI category: ${userProfile.bmiCategory || 'Normal'}
- Dietary preferences: ${(userProfile.dietaryPreferences || []).join(', ') || 'none'}
- Allergens to avoid: ${(userProfile.allergens || []).join(', ') || 'none'}` : ''}

Respond with this EXACT JSON structure:
{
  "recipes": [
    {
      "name": "Recipe Name",
      "prepTime": 15,
      "cookTime": 25,
      "difficulty": "Easy",
      "servings": 1,
      "ingredients": ["200g ingredient", "..."],
      "instructions": ["Step 1", "Step 2", "..."],
      "nutrition": { "calories": 450, "protein": 35, "carbs": 40, "fat": 15, "fiber": 6 },
      "micros": { "calcium": 120, "iron": 4, "vitaminA": 500, "vitaminC": 25 },
      "allergens": [],
      "dietTypes": []
    }
  ]
}

Make each recipe DIFFERENT — vary proteins, cooking styles, and sub-cuisines within ${cuisine}. All nutrition values must be accurate for the ingredients listed. Allergens must be correctly identified.`,
          },
        ],
        temperature: 0.8,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return [];

      const data = JSON.parse(content);
      const recipesData = data.recipes || [];

      const recipes = await Promise.all(
        recipesData.map(async (r, idx) => {
          const imageUrl = await this.getRecipeImage(cuisine, r.name);
          return {
            id: `ai-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 6)}`,
            name: r.name,
            image: imageUrl,
            calories: r.nutrition?.calories || 0,
            prepTime: r.prepTime || 15,
            cookTime: r.cookTime || 25,
            difficulty: r.difficulty || 'Medium',
            rating: '4.5',
            servings: 1,
            macros: {
              protein: r.nutrition?.protein || 0,
              carbs: r.nutrition?.carbs || 0,
              fat: r.nutrition?.fat || 0,
              fiber: r.nutrition?.fiber || 0,
            },
            micros: {
              calcium: r.micros?.calcium || 0,
              iron: r.micros?.iron || 0,
              vitaminA: r.micros?.vitaminA || 0,
              vitaminC: r.micros?.vitaminC || 0,
            },
            ingredients: r.ingredients || [],
            instructions: (r.instructions || []).map((text, i) => ({
              id: i + 1,
              text: typeof text === 'string' ? text : text.text || String(text),
            })),
            allergens: r.allergens || [],
            dietTypes: r.dietTypes || [],
            isAIGenerated: true,
          };
        })
      );

      console.log(`✅ [OpenAI] Generated ${recipes.length} ${cuisine} recipes`);
      return recipes;

    } catch (error) {
      console.error(`❌ [OpenAI] Error generating ${cuisine} recipes:`, error.message);
      return [];
    }
  }

  /**
   * Get recipe image from TheMealDB or use Unsplash fallback
   */
  async getRecipeImage(searchQuery, recipeName) {
    const axios = require('axios');
    try {
      // Try TheMealDB first for real food images
      const searchTerm = recipeName || searchQuery;
      const response = await axios.get('https://www.themealdb.com/api/json/v1/1/search.php', {
        params: { s: searchTerm.split(' ').slice(0, 3).join(' ') },
        timeout: 10000,
      });

      if (response.data.meals && response.data.meals[0]?.strMealThumb) {
        return response.data.meals[0].strMealThumb;
      }

      // Try with just the first keyword
      const firstWord = searchQuery.split(' ')[0];
      const response2 = await axios.get('https://www.themealdb.com/api/json/v1/1/search.php', {
        params: { s: firstWord },
        timeout: 10000,
      });

      if (response2.data.meals && response2.data.meals[0]?.strMealThumb) {
        return response2.data.meals[0].strMealThumb;
      }
    } catch (error) {
      // Silently fail
    }
    // Fallback to high-quality curated food images since source.unsplash is deprecated
    const fallbackImages = [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800', // healthy bowl
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800', // pizza
      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800', // healthy setup
      'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800', // pasta
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800', // salad bowl
      'https://images.unsplash.com/photo-1481070555726-e2fe8347714c?w=800', // general food spread
      'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800', // meat
      'https://images.unsplash.com/photo-1606914501449-5a96b6ce24ca?w=800', // soup/curry
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',     // grill/steak
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800'      // asian dish
    ];

    // Use the name hash to deterministically pick a related-looking fallback picture
    let hash = 0;
    for (let i = 0; i < searchQuery.length; i++) hash = searchQuery.charCodeAt(i) + ((hash << 5) - hash);
    return fallbackImages[Math.abs(hash) % fallbackImages.length];
  }
}

module.exports = new AIRecipeGenerator();
