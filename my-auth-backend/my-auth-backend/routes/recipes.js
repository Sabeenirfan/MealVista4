const express = require('express');
const router = express.Router();
const axios = require('axios');

const MEALDB_BASE_URL = 'https://www.themealdb.com/api/json/v1/1';
const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com/recipes';
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY || '663d8e3e38a645e5a8b2c8f9e1a0b2c3';
const USDA_BASE_URL = 'https://fdc.nal.usda.gov/api/foods/search';
const USDA_API_KEY = 'DEMO_KEY';

const categoryMappings = {
  italian: 'italian',
  pakistani: 'pakistani',
  indian: 'indian',
  chinese: 'chinese',
  mexican: 'mexican',
};

/**
 * Fetch nutrition from USDA with timeout (3 seconds)
 */
const fetchNutritionFromUSDA = async (ingredient) => {
  try {
    const response = await axios.get(USDA_BASE_URL, {
      params: {
        query: ingredient,
        pageSize: 1,
        api_key: USDA_API_KEY,
      },
      timeout: 3000,
    });

    if (response.data.foods && response.data.foods[0]) {
      const food = response.data.foods[0];
      const nutrients = {};

      food.foodNutrients?.forEach(nutrient => {
        const nutrientName = nutrient.nutrientName?.toLowerCase() || '';
        
        if (nutrientName.includes('energy') && nutrientName.includes('kcal')) {
          nutrients.calories = Math.round(nutrient.value || 0);
        } else if (nutrientName.includes('protein')) {
          nutrients.protein = Math.round(nutrient.value || 0);
        } else if (nutrientName.includes('carbohydrate')) {
          nutrients.carbs = Math.round(nutrient.value || 0);
        } else if (nutrientName.includes('total lipid') || nutrientName.includes('fat,')) {
          nutrients.fat = Math.round(nutrient.value || 0);
        } else if (nutrientName.includes('fiber')) {
          nutrients.fiber = Math.round(nutrient.value || 0);
        } else if (nutrientName.includes('calcium')) {
          nutrients.calcium = Math.round(nutrient.value || 0);
        } else if (nutrientName.includes('iron')) {
          nutrients.iron = Math.round(nutrient.value || 0);
        } else if (nutrientName.includes('vitamin a')) {
          nutrients.vitaminA = Math.round(nutrient.value || 0);
        } else if (nutrientName.includes('vitamin c')) {
          nutrients.vitaminC = Math.round(nutrient.value || 0);
        }
      });

      return nutrients;
    }
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Fallback nutritional data based on ingredient type
 */
const generateFallbackNutrition = (ingredient) => {
  const ing = ingredient.toLowerCase();
  
  if (ing.includes('chicken') || ing.includes('meat') || ing.includes('beef') || ing.includes('fish')) {
    return { calories: 165, protein: 26, carbs: 0, fat: 7, fiber: 0, calcium: 11, iron: 1, vitaminA: 6, vitaminC: 0 };
  } else if (ing.includes('tomato') || ing.includes('onion') || ing.includes('garlic') || ing.includes('pepper')) {
    return { calories: 18, protein: 1, carbs: 4, fat: 0, fiber: 1, calcium: 10, iron: 0, vitaminA: 42, vitaminC: 13 };
  } else if (ing.includes('rice') || ing.includes('wheat') || ing.includes('flour') || ing.includes('bread')) {
    return { calories: 130, protein: 3, carbs: 28, fat: 0, fiber: 0, calcium: 10, iron: 0, vitaminA: 0, vitaminC: 0 };
  } else if (ing.includes('oil') || ing.includes('butter') || ing.includes('ghee')) {
    return { calories: 120, protein: 0, carbs: 0, fat: 14, fiber: 0, calcium: 0, iron: 0, vitaminA: 0, vitaminC: 0 };
  } else if (ing.includes('milk') || ing.includes('cheese') || ing.includes('cream')) {
    return { calories: 61, protein: 3, carbs: 5, fat: 3, fiber: 0, calcium: 113, iron: 0, vitaminA: 28, vitaminC: 0 };
  } else if (ing.includes('spice') || ing.includes('salt') || ing.includes('pepper')) {
    return { calories: 3, protein: 0, carbs: 1, fat: 0, fiber: 0, calcium: 3, iron: 0, vitaminA: 0, vitaminC: 0 };
  }
  return { calories: 25, protein: 1, carbs: 5, fat: 0, fiber: 1, calcium: 25, iron: 0, vitaminA: 50, vitaminC: 10 };
};

/**
 * Calculate nutrition from ingredients (USDA + Fallback)
 */
const calculateNutrition = async (ingredients) => {
  let total = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    calcium: 0,
    iron: 0,
    vitaminA: 0,
    vitaminC: 0,
  };

  for (const ingredient of ingredients.slice(0, 8)) {
    const ingredientName = ingredient.replace(/^\d+\s*(?:cup|tbsp|tsp|g|kg|oz|ml|l|pinch|dash|slice|clove)?s?\s+/i, '').toLowerCase();
    
    let nutrition = await fetchNutritionFromUSDA(ingredientName);
    if (!nutrition) {
      nutrition = generateFallbackNutrition(ingredientName);
    }
    
    total.calories += Math.round((nutrition.calories || 0) / 2);
    total.protein += Math.round((nutrition.protein || 0) / 2);
    total.carbs += Math.round((nutrition.carbs || 0) / 2);
    total.fat += Math.round((nutrition.fat || 0) / 2);
    total.fiber += Math.round((nutrition.fiber || 0) / 2);
    total.calcium += Math.round((nutrition.calcium || 0) / 2);
    total.iron += Math.round((nutrition.iron || 0) / 2);
    total.vitaminA += Math.round((nutrition.vitaminA || 0) / 2);
    total.vitaminC += Math.round((nutrition.vitaminC || 0) / 2);
  }

  total.calories = Math.max(250, total.calories);
  total.protein = Math.max(10, total.protein);
  total.carbs = Math.max(20, total.carbs);
  total.fat = Math.max(8, total.fat);
  total.fiber = Math.max(1, total.fiber);

  return total;
};

/**
 * Transform TheMealDB to Recipe format with real nutrition
 */
const transformMeal = async (meal) => {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      ingredients.push(`${measure} ${ingredient}`.trim());
    }
  }

  const nutrition = await calculateNutrition(ingredients);

  return {
    id: `recipe-${meal.idMeal}`,
    name: meal.strMeal,
    image: meal.strMealThumb,
    calories: nutrition.calories,
    servings: 2,
    prepTime: Math.floor(Math.random() * 20) + 10,
    cookTime: Math.floor(Math.random() * 40) + 20,
    difficulty: ['Easy', 'Medium', 'Hard'][Math.floor(Math.random() * 3)],
    rating: (Math.random() * 1 + 4.5).toFixed(1),
    macros: {
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      fiber: nutrition.fiber,
    },
    micros: {
      calcium: nutrition.calcium,
      iron: nutrition.iron,
      vitaminA: nutrition.vitaminA,
      vitaminC: nutrition.vitaminC,
    },
    allergens: ingredients.slice(0, 3).map(ing => {
      const ing_lower = ing.toLowerCase();
      if (ing_lower.includes('dairy') || ing_lower.includes('cheese') || ing_lower.includes('milk')) return 'dairy';
      if (ing_lower.includes('egg')) return 'eggs';
      if (ing_lower.includes('gluten') || ing_lower.includes('wheat') || ing_lower.includes('flour')) return 'gluten';
      if (ing_lower.includes('peanut')) return 'peanuts';
      if (ing_lower.includes('nut')) return 'nuts';
      if (ing_lower.includes('soy')) return 'soy';
      if (ing_lower.includes('fish') || ing_lower.includes('shrimp')) return 'fish';
      return null;
    }).filter(a => a !== null).slice(0, 3),
    dietTypes: ingredients.some(i => i.toLowerCase().includes('meat') || i.toLowerCase().includes('chicken') || i.toLowerCase().includes('beef')) 
      ? ['omnivore'] 
      : ['vegetarian', 'vegan'],
    ingredients: ingredients.slice(0, 10),
  };
};

/**
 * Fetch meals from Spoonacular (free API with better images)
 */
const fetchMealsFromSpoonacular = async (cuisine) => {
  try {
    const category = categoryMappings[cuisine] || cuisine;
    console.log(`🍽️  Fetching ${cuisine} meals from Spoonacular...`);

    const response = await axios.get(`${SPOONACULAR_BASE_URL}/complexSearch`, {
      params: {
        cuisine: category,
        number: 6,
        addRecipeInformation: true,
        fillIngredients: true,
        apiKey: SPOONACULAR_API_KEY,
      },
      timeout: 10000,
    });

    const recipes = response.data.results || [];
    console.log(`✓ Found ${recipes.length} ${cuisine} recipes`);

    const transformedRecipes = recipes.map((recipe, index) => {
      const ingredients = recipe.extendedIngredients?.map(ing => `${ing.measures?.metric?.amount || 1} ${ing.measures?.metric?.unitShort || ''} ${ing.name}`.trim()) || [];
      
      return {
        id: `recipe-${recipe.id}`,
        name: recipe.title,
        image: recipe.image,
        calories: Math.round(recipe.nutrition?.nutrients?.[0]?.amount || 500),
        servings: recipe.servings || 2,
        prepTime: Math.floor(Math.random() * 20) + 10,
        cookTime: recipe.readyInMinutes || 30,
        difficulty: ['Easy', 'Medium', 'Hard'][index % 3],
        rating: (Math.random() * 1 + 4.5).toFixed(1),
        macros: {
          protein: Math.round(recipe.nutrition?.nutrients?.find(n => n.name === 'Protein')?.amount || 20),
          carbs: Math.round(recipe.nutrition?.nutrients?.find(n => n.name === 'Carbohydrates')?.amount || 50),
          fat: Math.round(recipe.nutrition?.nutrients?.find(n => n.name === 'Fat')?.amount || 15),
          fiber: Math.round(recipe.nutrition?.nutrients?.find(n => n.name === 'Fiber')?.amount || 5),
        },
        micros: {
          calcium: 100,
          iron: 2,
          vitaminA: 50,
          vitaminC: 30,
        },
        allergens: recipe.extendedIngredients?.slice(0, 3).map(ing => {
          const name = ing.name?.toLowerCase() || '';
          if (name.includes('dairy') || name.includes('cheese') || name.includes('milk')) return 'dairy';
          if (name.includes('egg')) return 'eggs';
          if (name.includes('gluten') || name.includes('wheat')) return 'gluten';
          if (name.includes('peanut')) return 'peanuts';
          if (name.includes('nut')) return 'nuts';
          if (name.includes('soy')) return 'soy';
          if (name.includes('fish') || name.includes('shrimp')) return 'fish';
          return null;
        }).filter(a => a !== null).slice(0, 3) || [],
        dietTypes: recipe.vegetarian ? ['vegetarian'] : recipe.vegan ? ['vegan'] : ['omnivore'],
        ingredients: ingredients.slice(0, 10),
      };
    });

    return transformedRecipes;
  } catch (error) {
    console.error(`Error fetching from Spoonacular:`, error.message);
    throw error;
  }
};

// Cache (1 hour)
const mealCache = {};
const CACHE_DURATION = 60 * 60 * 1000;

/**
 * GET /api/recipes/category/:category
 */
router.get('/category/:category', async (req, res) => {
  try {
    const category = req.params.category.toLowerCase();

    if (!categoryMappings[category]) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
        availableCategories: Object.keys(categoryMappings),
      });
    }

    if (mealCache[category] && Date.now() - mealCache[category].timestamp < CACHE_DURATION) {
      console.log(`✓ Serving ${category} from cache`);
      return res.json({
        success: true,
        category,
        recipes: mealCache[category].data,
        count: mealCache[category].data.length,
        source: 'cache (themealdb + usda)',
      });
    }

    const meals = await fetchMealsFromSpoonacular(category);

    mealCache[category] = {
      data: meals,
      timestamp: Date.now(),
    };

    res.json({
      success: true,
      category,
      recipes: meals,
      count: meals.length,
      source: 'themealdb + usda',
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching recipes',
      error: error.message,
    });
  }
});

/**
 * GET /api/recipes/categories
 */
router.get('/categories', (req, res) => {
  try {
    res.json({
      success: true,
      categories: Object.keys(categoryMappings),
      count: Object.keys(categoryMappings).length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message,
    });
  }
});

/**
 * GET /api/recipes/:id
 */
router.get('/:id', (req, res) => {
  try {
    const recipeId = req.params.id;

    for (const category in mealCache) {
      const meal = mealCache[category].data.find(r => r.id === recipeId);
      if (meal) {
        return res.json({
          success: true,
          recipe: meal,
          category,
        });
      }
    }

    res.status(404).json({
      success: false,
      message: 'Recipe not found',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching recipe',
      error: error.message,
    });
  }
});

/**
 * GET /api/recipes/search/:query
 */
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters',
      });
    }

    console.log(`🔍 Searching for meals: "${query}"`);

    const response = await axios.get(`${MEALDB_BASE_URL}/search.php`, {
      params: { s: query },
      timeout: 10000,
    });

    const meals = response.data.meals || [];
    console.log(`✓ Found ${meals.length} meals matching "${query}"`);

    const detailedMeals = [];
    for (const meal of meals.slice(0, 8)) {
      try {
        console.log(`📊 Processing nutrition for search result: ${meal.strMeal}`);
        const transformed = await transformMeal(meal);
        detailedMeals.push(transformed);
      } catch (err) {
        console.warn(`Failed to transform search meal`);
      }
    }

    res.json({
      success: true,
      query,
      recipes: detailedMeals,
      count: detailedMeals.length,
      source: 'themealdb + usda',
    });
  } catch (error) {
    console.error('Error searching recipes:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error searching recipes',
      error: error.message,
    });
  }
});

module.exports = router;
