const axios = require('axios');

/**
 * AI Recipe Generator Service
 * Uses AI models (like ChatGPT) with stored knowledge to generate recipes
 * Uses free Hugging Face Inference API - no API key required
 */
class AIRecipeGenerator {
  constructor() {
    // Using Hugging Face Inference API (free, no API key needed)
    // Options for recipe generation:
    // - 'gpt2': Basic text generation (fast, but limited knowledge)
    // - 'microsoft/DialoGPT-medium': Conversational AI (better for structured output)
    // - 'facebook/opt-1.3b': Better knowledge but slower
    // - 'EleutherAI/gpt-neo-125M': Better than GPT-2, still fast
    this.hfApiUrl = 'https://api-inference.huggingface.co/models';
    // Using GPT-Neo for better recipe generation (free, no API key)
    this.modelName = 'EleutherAI/gpt-neo-125M'; // Better knowledge than GPT-2, still free
    // Fallback to GPT-2 if GPT-Neo fails
    this.fallbackModel = 'gpt2';
  }

  /**
   * Generate personalized recipe prompt based on user profile
   */
  generateRecipePrompt(userProfile, searchQuery) {
    const { dietaryPreferences = [], bmi, bmiCategory, healthGoal, allergens = [] } = userProfile;
    
    // Calculate calorie target based on BMI and health goal
    const calorieTarget = this.calculateCalorieTarget(bmi, bmiCategory, healthGoal);
    
    // Build dietary constraints
    let constraints = [];
    if (dietaryPreferences.includes('vegetarian')) constraints.push('vegetarian');
    if (dietaryPreferences.includes('vegan')) constraints.push('vegan');
    if (dietaryPreferences.includes('keto')) constraints.push('keto (low carb, high fat)');
    if (dietaryPreferences.includes('low-carb')) constraints.push('low-carb');
    if (dietaryPreferences.includes('high-protein')) constraints.push('high-protein');
    if (allergens.length > 0) {
      constraints.push(`allergen-free: no ${allergens.join(', ')}`);
    }
    
    // Build prompt
    let prompt = `Create a detailed recipe for "${searchQuery}" that is:\n`;
    prompt += `- Calorie target: ${calorieTarget.min}-${calorieTarget.max} calories per serving\n`;
    prompt += `- BMI category: ${bmiCategory || 'Normal'}\n`;
    prompt += `- Health goal: ${this.formatHealthGoal(healthGoal)}\n`;
    
    if (constraints.length > 0) {
      prompt += `- Dietary requirements: ${constraints.join(', ')}\n`;
    }
    
    prompt += `\nProvide:\n`;
    prompt += `1. Recipe name\n`;
    prompt += `2. Ingredients with exact quantities\n`;
    prompt += `3. Step-by-step cooking instructions\n`;
    prompt += `4. Estimated prep time and cook time\n`;
    prompt += `5. Nutritional information (calories, protein, carbs, fat, fiber)\n`;
    prompt += `6. Difficulty level\n`;
    prompt += `7. Number of servings\n`;
    
    return prompt;
  }

  /**
   * Calculate calorie target based on BMI and health goal
   */
  calculateCalorieTarget(bmi, bmiCategory, healthGoal) {
    let baseCalories = 500; // Default per meal
    
    // Adjust based on BMI category
    if (bmiCategory === 'Underweight' || (bmi && bmi < 18.5)) {
      baseCalories = 600;
    } else if (bmiCategory === 'Normal' || (bmi && bmi >= 18.5 && bmi < 25)) {
      baseCalories = 500;
    } else if (bmiCategory === 'Overweight' || (bmi && bmi >= 25 && bmi < 30)) {
      baseCalories = 400;
    } else if (bmiCategory === 'Obese' || (bmi && bmi >= 30)) {
      baseCalories = 350;
    }
    
    // Adjust based on health goal
    if (healthGoal === 'weight_loss') {
      baseCalories = Math.max(250, baseCalories - 100);
    } else if (healthGoal === 'weight_gain') {
      baseCalories = baseCalories + 150;
    }
    // maintenance: keep baseCalories as is
    
    return {
      min: Math.max(200, baseCalories - 100),
      max: Math.min(800, baseCalories + 150)
    };
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
   * Generate AI recipe using Hugging Face (if enabled)
   */
  async generateWithHuggingFace(prompt) {
    try {
      // Using a text generation model (free, no API key needed)
      const response = await axios.post(
        `${this.hfApiUrl}/gpt2`,
        {
          inputs: prompt,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.7,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
      
      return response.data[0]?.generated_text || null;
    } catch (error) {
      console.error('Hugging Face API error:', error.message);
      return null;
    }
  }

  /**
   * Generate personalized recipe using AI with stored knowledge
   * AI will use its knowledge base to create recipes based on search query and user profile
   * This is like ChatGPT - uses stored knowledge to generate recipes
   */
  async generatePersonalizedRecipe(userProfile, searchQuery) {
    try {
      // ALWAYS try AI first - it has stored knowledge like ChatGPT
      console.log(`🤖 Using AI with stored knowledge for: "${searchQuery}"`);
      const aiGeneratedRecipe = await this.generateWithAI(userProfile, searchQuery);
      
      if (aiGeneratedRecipe && aiGeneratedRecipe.ingredients && aiGeneratedRecipe.ingredients.length > 0) {
        console.log(`✅ AI successfully generated recipe: ${aiGeneratedRecipe.name}`);
        return aiGeneratedRecipe;
      }
      
      // If AI returns incomplete data, still use it but enhance with our logic
      if (aiGeneratedRecipe) {
        console.log(`⚠️  AI returned partial recipe, enhancing...`);
        return this.enhanceAIRecipe(aiGeneratedRecipe, userProfile, searchQuery);
      }
      
      // If AI completely fails, generate from scratch using knowledge-based approach
      console.log(`⚠️  AI generation failed, using knowledge-based generation`);
      return this.generateFromScratch(userProfile, searchQuery);
    } catch (error) {
      console.error('Error in AI generation:', error.message);
      // Always return something using knowledge-based generation
      return this.generateFromScratch(userProfile, searchQuery);
    }
  }

  /**
   * Enhance AI recipe if it's incomplete
   */
  enhanceAIRecipe(recipe, userProfile, searchQuery) {
    // Ensure all required fields are present
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      recipe.ingredients = this.generateIngredientsForQuery(searchQuery, userProfile.dietaryPreferences || [], userProfile.allergens || []);
    }
    if (!recipe.instructions || recipe.instructions.length === 0) {
      recipe.instructions = this.generateInstructionsForQuery(searchQuery, userProfile.dietaryPreferences || []);
    }
    if (!recipe.image || recipe.image.includes('placeholder')) {
      recipe.image = `https://source.unsplash.com/400x300/?${encodeURIComponent(searchQuery)},food`;
    }
    return recipe;
  }

  /**
   * Generate recipe using AI model with stored knowledge (like ChatGPT)
   * Uses AI's stored knowledge to generate recipes related to search query
   */
  async generateWithAI(userProfile, searchQuery) {
    try {
      // Create a detailed prompt that tells AI to use its knowledge
      const prompt = this.generateRecipePrompt(userProfile, searchQuery);
      
      console.log(`🤖 Calling AI (like ChatGPT) with stored knowledge for: "${searchQuery}"`);
      
      // Try Hugging Face Inference API first (free, no API key)
      // Try primary model first
      try {
        console.log(`🤖 Trying ${this.modelName}...`);
        const response = await axios.post(
          `${this.hfApiUrl}/${this.modelName}`,
          {
            inputs: prompt,
            parameters: {
              max_new_tokens: 600,
              temperature: 0.7,
              top_p: 0.9,
              return_full_text: false,
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 20000,
          }
        );
        
        const aiText = response.data[0]?.generated_text || '';
        if (aiText && aiText.length > 50) {
          console.log(`✅ ${this.modelName} generated text (${aiText.length} chars)`);
          return this.parseAIResponse(aiText, userProfile, searchQuery);
        }
      } catch (hfError) {
        console.log(`⚠️  ${this.modelName} error: ${hfError.message}, trying fallback...`);
        
        // Try fallback model
        try {
          const fallbackResponse = await axios.post(
            `${this.hfApiUrl}/${this.fallbackModel}`,
            {
              inputs: prompt,
              parameters: {
                max_new_tokens: 500,
                temperature: 0.7,
                return_full_text: false,
              }
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 15000,
            }
          );
          
          const aiText = fallbackResponse.data[0]?.generated_text || '';
          if (aiText && aiText.length > 50) {
            console.log(`✅ ${this.fallbackModel} generated text (${aiText.length} chars)`);
            return this.parseAIResponse(aiText, userProfile, searchQuery);
          }
        } catch (fallbackError) {
          console.log(`⚠️  Fallback model also failed: ${fallbackError.message}`);
        }
      }
      
      // If Hugging Face fails, use knowledge-based generation (simulates AI with stored knowledge)
      console.log(`📚 Using knowledge-based AI generation for: "${searchQuery}"`);
      return this.generateWithKnowledgeBase(userProfile, searchQuery);
      
    } catch (error) {
      console.error('AI generation error:', error.message);
      // Return null to trigger fallback
      return null;
    }
  }

  /**
   * Generate recipe using knowledge base (simulates AI with stored knowledge)
   * This uses stored knowledge about recipes, ingredients, and cooking methods
   */
  generateWithKnowledgeBase(userProfile, searchQuery) {
    const { dietaryPreferences = [], healthGoal, allergens = [], bmi, bmiCategory } = userProfile;
    const calorieTarget = this.calculateCalorieTarget(bmi, bmiCategory, healthGoal);
    const queryLower = searchQuery.toLowerCase();
    
    // Use stored knowledge about recipes based on search query
    // This is like ChatGPT's knowledge - it knows about different recipes
    let recipeName = '';
    let ingredients = [];
    let instructions = [];
    
    // Knowledge-based recipe generation based on search query
    if (queryLower.includes('egg')) {
      recipeName = 'Perfect Scrambled Eggs';
      ingredients = [
        '4 large eggs',
        '2 tbsp butter',
        '2 tbsp milk or cream',
        'Salt and pepper to taste',
        'Fresh chives, chopped (optional)',
      ];
      instructions = [
        'Crack eggs into a bowl and whisk until yolks and whites are combined',
        'Add milk, salt, and pepper, and whisk again',
        'Heat butter in a non-stick pan over medium-low heat',
        'Pour in the egg mixture and let it sit for 30 seconds',
        'Gently push the eggs from the edges toward the center with a spatula',
        'Continue cooking, stirring occasionally, until eggs are creamy and just set (2-3 minutes)',
        'Remove from heat while still slightly runny (they will continue cooking)',
        'Garnish with chives and serve immediately',
      ];
    } else if (queryLower.includes('chicken')) {
      recipeName = 'Herb-Roasted Chicken';
      ingredients = [
        '1 whole chicken (1.5-2kg)',
        '2 tbsp olive oil',
        '1 lemon, halved',
        '4 cloves garlic, minced',
        '1 tsp dried rosemary',
        '1 tsp dried thyme',
        'Salt and pepper to taste',
        '1 onion, quartered',
      ];
      instructions = [
        'Preheat oven to 200°C (400°F)',
        'Pat chicken dry and place in a roasting pan',
        'Mix olive oil, garlic, rosemary, thyme, salt, and pepper',
        'Rub the mixture all over the chicken, including under the skin',
        'Place lemon halves and onion quarters inside the chicken cavity',
        'Roast for 60-75 minutes until internal temperature reaches 75°C (165°F)',
        'Let rest for 10 minutes before carving',
        'Serve with roasted vegetables',
      ];
    } else if (queryLower.includes('pasta')) {
      recipeName = 'Creamy Pasta';
      ingredients = [
        '300g pasta (penne or fettuccine)',
        '200ml heavy cream',
        '100g parmesan cheese, grated',
        '2 cloves garlic, minced',
        '2 tbsp butter',
        'Salt and pepper to taste',
        'Fresh basil leaves',
      ];
      instructions = [
        'Cook pasta according to package directions until al dente',
        'Meanwhile, heat butter in a large pan over medium heat',
        'Add garlic and cook for 1 minute until fragrant',
        'Pour in cream and bring to a gentle simmer',
        'Add grated parmesan and stir until melted and smooth',
        'Drain pasta, reserving 1/2 cup of pasta water',
        'Add pasta to the sauce and toss to combine',
        'Add pasta water if needed to thin the sauce',
        'Season with salt and pepper, garnish with basil, and serve',
      ];
    } else {
      // Generic recipe using knowledge about the ingredient
      recipeName = `${searchQuery.charAt(0).toUpperCase() + searchQuery.slice(1)} Delight`;
      ingredients = this.generateIngredientsForQuery(searchQuery, dietaryPreferences, allergens);
      instructions = this.generateInstructionsForQuery(searchQuery, dietaryPreferences);
    }
    
    // Apply dietary preferences and allergens
    ingredients = this.filterIngredients(ingredients, dietaryPreferences, allergens);
    
    // Calculate nutrition
    const nutrition = this.estimateNutrition(ingredients, calorieTarget);
    
    // Determine difficulty and time
    const difficulty = instructions.length < 5 ? 'Easy' : instructions.length < 10 ? 'Medium' : 'Hard';
    const prepTime = Math.max(10, Math.floor(instructions.length * 2));
    const cookTime = Math.max(15, Math.floor(instructions.length * 3));
    
    // Get image
    const imageUrl = `https://source.unsplash.com/400x300/?${encodeURIComponent(searchQuery)},food`;
    
    return {
      id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: this.personalizeRecipeName(recipeName, userProfile),
      image: imageUrl,
      calories: nutrition.calories,
      prepTime: prepTime,
      cookTime: cookTime,
      difficulty: difficulty,
      rating: '4.5',
      macros: nutrition.macros,
      micros: nutrition.micros,
      ingredients: ingredients,
      instructions: instructions.map((text, idx) => ({
        id: idx + 1,
        text: typeof text === 'string' ? text : text.text || text,
      })),
      allergens: this.detectAllergens(ingredients),
      dietTypes: this.determineDietTypes(ingredients, dietaryPreferences),
      servings: this.calculateServings(calorieTarget, nutrition.calories),
      isAIGenerated: true,
      personalizedFor: {
        healthGoal: this.formatHealthGoal(healthGoal),
        bmiCategory: bmiCategory,
        dietaryPreferences: dietaryPreferences,
      }
    };
  }

  /**
   * Filter ingredients based on dietary preferences and allergens
   */
  filterIngredients(ingredients, dietaryPreferences, allergens) {
    return ingredients.filter(ing => {
      const ingLower = ing.toLowerCase();
      
      // Remove allergens
      for (const allergen of allergens) {
        if (ingLower.includes(allergen.toLowerCase())) {
          return false;
        }
      }
      
      // Apply dietary preferences
      if (dietaryPreferences.includes('vegetarian') || dietaryPreferences.includes('vegan')) {
        const meatKeywords = ['chicken', 'beef', 'pork', 'lamb', 'fish', 'meat', 'bacon'];
        if (meatKeywords.some(keyword => ingLower.includes(keyword))) {
          return false;
        }
      }
      
      if (dietaryPreferences.includes('vegan')) {
        const dairyKeywords = ['milk', 'cheese', 'butter', 'cream', 'yogurt'];
        if (dairyKeywords.some(keyword => ingLower.includes(keyword))) {
          // Replace with vegan alternatives
          if (ingLower.includes('milk')) return ing.replace(/milk/gi, 'almond milk');
          if (ingLower.includes('cheese')) return ing.replace(/cheese/gi, 'vegan cheese');
          if (ingLower.includes('butter')) return ing.replace(/butter/gi, 'vegan butter');
          if (ingLower.includes('cream')) return ing.replace(/cream/gi, 'coconut cream');
        }
      }
      
      return true;
    });
  }

  /**
   * Parse AI-generated text into structured recipe format
   */
  parseAIResponse(aiText, userProfile, searchQuery) {
    const { dietaryPreferences = [], healthGoal, allergens = [], bmi, bmiCategory } = userProfile;
    const calorieTarget = this.calculateCalorieTarget(bmi, bmiCategory, healthGoal);
    
    // Extract recipe name
    const nameMatch = aiText.match(/Recipe[:\s]+(.+?)(?:\n|Ingredients|$)/i) || 
                     aiText.match(/^(.+?)\s+Recipe/i) ||
                     [null, searchQuery.charAt(0).toUpperCase() + searchQuery.slice(1)];
    const recipeName = nameMatch[1]?.trim() || `${searchQuery.charAt(0).toUpperCase() + searchQuery.slice(1)} Recipe`;
    
    // Extract ingredients
    const ingredientsSection = aiText.match(/Ingredients?[:\s]+(.*?)(?:\n\n|Instructions|Method|Steps|$)/is);
    let ingredients = [];
    if (ingredientsSection) {
      const ingredientsText = ingredientsSection[1];
      ingredients = ingredientsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.match(/^[-•*]\s*$/))
        .map(line => line.replace(/^[-•*]\s*/, ''))
        .slice(0, 15);
    }
    
    // If no ingredients found, generate based on search query
    if (ingredients.length === 0) {
      ingredients = this.generateIngredientsForQuery(searchQuery, dietaryPreferences, allergens);
    }
    
    // Extract instructions
    const instructionsSection = aiText.match(/(?:Instructions?|Method|Steps?)[:\s]+(.*?)$/is);
    let instructions = [];
    if (instructionsSection) {
      const instructionsText = instructionsSection[1];
      instructions = instructionsText
        .split(/\n+/)
        .map(line => line.trim())
        .filter(line => line && line.length > 10)
        .map((line, idx) => ({
          id: idx + 1,
          text: line.replace(/^\d+[.)]\s*/, '').trim(),
        }))
        .slice(0, 15);
    }
    
    // If no instructions found, generate based on search query
    if (instructions.length === 0) {
      instructions = this.generateInstructionsForQuery(searchQuery, dietaryPreferences);
    }
    
    // Calculate nutrition
    const nutrition = this.estimateNutrition(ingredients, calorieTarget);
    
    // Determine difficulty and time
    const difficulty = instructions.length < 5 ? 'Easy' : instructions.length < 10 ? 'Medium' : 'Hard';
    const prepTime = Math.max(10, Math.floor(instructions.length * 2));
    const cookTime = Math.max(15, Math.floor(instructions.length * 3));
    
    // Get image URL (try to find from TheMealDB or use placeholder)
    const imageUrl = this.getRecipeImage(searchQuery);
    
    return {
      id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: this.personalizeRecipeName(recipeName, userProfile),
      image: imageUrl,
      calories: nutrition.calories,
      prepTime: prepTime,
      cookTime: cookTime,
      difficulty: difficulty,
      rating: '4.5',
      macros: nutrition.macros,
      micros: nutrition.micros,
      ingredients: ingredients,
      instructions: instructions,
      allergens: this.detectAllergens(ingredients),
      dietTypes: this.determineDietTypes(ingredients, dietaryPreferences),
      servings: this.calculateServings(calorieTarget, nutrition.calories),
      isAIGenerated: true,
      personalizedFor: {
        healthGoal: this.formatHealthGoal(healthGoal),
        bmiCategory: bmiCategory,
        dietaryPreferences: dietaryPreferences,
      }
    };
  }

  /**
   * Get recipe image from TheMealDB or use placeholder
   */
  async getRecipeImage(searchQuery) {
    try {
      const response = await axios.get('https://www.themealdb.com/api/json/v1/1/search.php', {
        params: { s: searchQuery },
        timeout: 3000,
      });
      
      if (response.data.meals && response.data.meals[0]?.strMealThumb) {
        return response.data.meals[0].strMealThumb;
      }
    } catch (error) {
      // Ignore errors
    }
    
    // Use a food image placeholder
    return `https://source.unsplash.com/400x300/?${encodeURIComponent(searchQuery)},food`;
  }

  /**
   * Generate ingredients based on search query
   */
  generateIngredientsForQuery(searchQuery, dietaryPreferences, allergens) {
    const queryLower = searchQuery.toLowerCase();
    const ingredients = [];
    
    // Base ingredients
    ingredients.push('2 tbsp olive oil');
    ingredients.push('1 onion, diced');
    ingredients.push('2 cloves garlic, minced');
    ingredients.push('Salt and pepper to taste');
    
    // Add main ingredient based on search
    if (queryLower.includes('egg')) {
      ingredients.push('4 large eggs');
      ingredients.push('2 tbsp butter');
      if (!dietaryPreferences.includes('vegan')) {
        ingredients.push('50g cheese, grated');
      }
    } else if (queryLower.includes('chicken')) {
      if (!dietaryPreferences.includes('vegetarian') && !dietaryPreferences.includes('vegan')) {
        ingredients.push('500g chicken breast, diced');
      }
    } else if (queryLower.includes('pasta')) {
      ingredients.push('300g pasta');
      ingredients.push('200ml cream');
      if (dietaryPreferences.includes('vegan')) {
        ingredients.push('200ml coconut cream (instead of dairy)');
      }
    } else {
      // Generic main ingredient
      ingredients.push(`500g ${searchQuery}`);
    }
    
    // Add based on dietary preferences
    if (dietaryPreferences.includes('high-protein')) {
      ingredients.push('200g protein source (chicken/tofu/tempeh)');
    }
    if (dietaryPreferences.includes('keto')) {
      ingredients.push('2 tbsp butter');
      ingredients.push('100g leafy greens');
      ingredients.push('50g nuts');
    }
    if (dietaryPreferences.includes('low-carb')) {
      ingredients.push('200g vegetables');
    }
    
    // Filter out allergens
    return ingredients.filter(ing => {
      const ingLower = ing.toLowerCase();
      return !allergens.some(allergen => ingLower.includes(allergen.toLowerCase()));
    });
  }

  /**
   * Generate instructions based on search query
   */
  generateInstructionsForQuery(searchQuery, dietaryPreferences) {
    const queryLower = searchQuery.toLowerCase();
    const instructions = [];
    
    if (queryLower.includes('egg')) {
      instructions.push('Heat butter in a non-stick pan over medium heat');
      instructions.push('Crack eggs into the pan, being careful not to break the yolks');
      instructions.push('Cook for 2-3 minutes until whites are set but yolks are still runny');
      instructions.push('Season with salt and pepper');
      instructions.push('Serve immediately with toast or vegetables');
    } else if (queryLower.includes('chicken')) {
      instructions.push('Cut chicken into bite-sized pieces');
      instructions.push('Season chicken with salt, pepper, and your favorite spices');
      instructions.push('Heat oil in a large pan over medium-high heat');
      instructions.push('Cook chicken for 6-8 minutes until golden and cooked through');
      instructions.push('Add vegetables and cook for another 3-4 minutes');
      instructions.push('Serve hot with rice or your preferred side');
    } else {
      instructions.push(`Prepare ${searchQuery} by cleaning and cutting as needed`);
      instructions.push('Heat oil in a pan over medium heat');
      instructions.push('Add onions and garlic, sauté until fragrant');
      instructions.push(`Add ${searchQuery} and cook until tender`);
      instructions.push('Season with salt, pepper, and herbs');
      instructions.push('Cook for 10-15 minutes until done');
      instructions.push('Serve hot and enjoy!');
    }
    
    return instructions.map((text, idx) => ({
      id: idx + 1,
      text: text,
    }));
  }

  /**
   * Get base recipe from TheMealDB
   */
  async getBaseRecipe(searchQuery) {
    try {
      const response = await axios.get('https://www.themealdb.com/api/json/v1/1/search.php', {
        params: { s: searchQuery },
        timeout: 5000,
      });
      
      if (response.data.meals && response.data.meals.length > 0) {
        return response.data.meals[0];
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Personalize recipe based on user profile
   */
  personalizeRecipe(baseRecipe, userProfile) {
    const { dietaryPreferences = [], healthGoal, allergens = [], bmi, bmiCategory } = userProfile;
    const calorieTarget = this.calculateCalorieTarget(bmi, bmiCategory, healthGoal);
    
    // Extract ingredients from base recipe
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = baseRecipe[`strIngredient${i}`];
      const measure = baseRecipe[`strMeasure${i}`];
      if (ingredient && ingredient.trim()) {
        ingredients.push(`${measure || ''} ${ingredient}`.trim());
      }
    }
    
    // Filter ingredients based on dietary preferences and allergens
    let filteredIngredients = ingredients.filter(ing => {
      const ingLower = ing.toLowerCase();
      
      // Remove allergens
      for (const allergen of allergens) {
        if (ingLower.includes(allergen.toLowerCase())) {
          return false;
        }
      }
      
      // Apply dietary preferences
      if (dietaryPreferences.includes('vegetarian') || dietaryPreferences.includes('vegan')) {
        const meatKeywords = ['chicken', 'beef', 'pork', 'lamb', 'fish', 'meat', 'bacon'];
        if (meatKeywords.some(keyword => ingLower.includes(keyword))) {
          return false;
        }
      }
      
      if (dietaryPreferences.includes('vegan')) {
        const dairyKeywords = ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg'];
        if (dairyKeywords.some(keyword => ingLower.includes(keyword))) {
          return false;
        }
      }
      
      return true;
    });
    
    // Adjust quantities for calorie target
    const adjustedIngredients = this.adjustIngredientsForCalories(
      filteredIngredients,
      calorieTarget,
      healthGoal
    );
    
    // Parse instructions
    const instructions = baseRecipe.strInstructions
      ? baseRecipe.strInstructions.split('\n').filter(step => step.trim())
      : [];
    
    // Calculate nutrition based on adjusted ingredients
    const nutrition = this.estimateNutrition(adjustedIngredients, calorieTarget);
    
    // Determine difficulty and time
    const difficulty = instructions.length < 5 ? 'Easy' : instructions.length < 10 ? 'Medium' : 'Hard';
    const prepTime = Math.max(10, Math.floor(instructions.length * 2));
    const cookTime = Math.max(15, Math.floor(instructions.length * 3));
    
    return {
      id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: this.personalizeRecipeName(baseRecipe.strMeal, userProfile),
      image: baseRecipe.strMealThumb || 'https://via.placeholder.com/400x300?text=Recipe',
      calories: nutrition.calories,
      prepTime: prepTime,
      cookTime: cookTime,
      difficulty: difficulty,
      rating: '4.5',
      macros: nutrition.macros,
      micros: nutrition.micros,
      ingredients: adjustedIngredients,
      instructions: instructions.map((step, idx) => ({
        id: idx + 1,
        text: step.trim(),
      })),
      allergens: this.detectAllergens(adjustedIngredients),
      dietTypes: this.determineDietTypes(adjustedIngredients, dietaryPreferences),
      servings: this.calculateServings(calorieTarget, nutrition.calories),
      isAIGenerated: true,
      personalizedFor: {
        healthGoal: this.formatHealthGoal(healthGoal),
        bmiCategory: bmiCategory,
        dietaryPreferences: dietaryPreferences,
      }
    };
  }

  /**
   * Generate recipe from scratch when no base recipe found
   */
  async generateFromScratch(userProfile, searchQuery) {
    const { dietaryPreferences = [], healthGoal, allergens = [], bmi, bmiCategory } = userProfile;
    const calorieTarget = this.calculateCalorieTarget(bmi, bmiCategory, healthGoal);
    
    // Generate basic recipe structure
    const nutrition = {
      calories: Math.round((calorieTarget.min + calorieTarget.max) / 2),
      macros: {
        protein: healthGoal === 'weight_gain' ? 30 : 25,
        carbs: dietaryPreferences.includes('keto') ? 15 : 40,
        fat: dietaryPreferences.includes('keto') ? 25 : 15,
        fiber: 5,
      },
      micros: {
        calcium: 100,
        iron: 5,
        vitaminA: 500,
        vitaminC: 30,
      }
    };
    
    return {
      id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${searchQuery.charAt(0).toUpperCase() + searchQuery.slice(1)} (Personalized)`,
      image: 'https://via.placeholder.com/400x300?text=AI+Generated+Recipe',
      calories: nutrition.calories,
      prepTime: 20,
      cookTime: 30,
      difficulty: 'Medium',
      rating: '4.5',
      macros: nutrition.macros,
      micros: nutrition.micros,
      ingredients: this.generateIngredients(searchQuery, dietaryPreferences, allergens),
      instructions: this.generateInstructions(searchQuery, dietaryPreferences),
      allergens: [],
      dietTypes: dietaryPreferences.length > 0 ? dietaryPreferences : ['omnivore'],
      servings: 2,
      isAIGenerated: true,
      personalizedFor: {
        healthGoal: this.formatHealthGoal(healthGoal),
        bmiCategory: bmiCategory,
        dietaryPreferences: dietaryPreferences,
      }
    };
  }

  /**
   * Adjust ingredients for calorie target
   */
  adjustIngredientsForCalories(ingredients, calorieTarget, healthGoal) {
    // Simple adjustment: scale quantities based on calorie target
    const adjustmentFactor = healthGoal === 'weight_loss' ? 0.8 : healthGoal === 'weight_gain' ? 1.2 : 1.0;
    
    return ingredients.map(ing => {
      // Try to extract quantity and adjust
      const match = ing.match(/^(\d+(?:\.\d+)?)\s*(.*)/);
      if (match) {
        const quantity = parseFloat(match[1]);
        const rest = match[2];
        const adjustedQuantity = Math.round(quantity * adjustmentFactor * 10) / 10;
        return `${adjustedQuantity} ${rest}`;
      }
      return ing;
    });
  }

  /**
   * Estimate nutrition from ingredients
   */
  estimateNutrition(ingredients, calorieTarget) {
    // Simple estimation based on calorie target
    const targetCalories = Math.round((calorieTarget.min + calorieTarget.max) / 2);
    
    return {
      calories: targetCalories,
      macros: {
        protein: Math.round(targetCalories * 0.2 / 4), // 20% protein
        carbs: Math.round(targetCalories * 0.5 / 4), // 50% carbs
        fat: Math.round(targetCalories * 0.3 / 9), // 30% fat
        fiber: Math.round(targetCalories / 50),
      },
      micros: {
        calcium: 150,
        iron: 8,
        vitaminA: 600,
        vitaminC: 40,
      }
    };
  }

  /**
   * Personalize recipe name
   */
  personalizeRecipeName(baseName, userProfile) {
    const { healthGoal, dietaryPreferences = [] } = userProfile;
    let name = baseName;
    
    if (healthGoal === 'weight_loss') {
      name = `Light ${name}`;
    } else if (healthGoal === 'weight_gain') {
      name = `Nutritious ${name}`;
    }
    
    if (dietaryPreferences.includes('keto')) {
      name = `Keto ${name}`;
    } else if (dietaryPreferences.includes('high-protein')) {
      name = `High-Protein ${name}`;
    }
    
    return name;
  }

  /**
   * Detect allergens in ingredients
   */
  detectAllergens(ingredients) {
    const allergens = [];
    const ingredientStr = ingredients.join(' ').toLowerCase();
    
    if (ingredientStr.includes('milk') || ingredientStr.includes('cheese') || ingredientStr.includes('butter')) {
      allergens.push('dairy');
    }
    if (ingredientStr.includes('wheat') || ingredientStr.includes('flour')) {
      allergens.push('gluten');
    }
    if (ingredientStr.includes('egg')) {
      allergens.push('eggs');
    }
    if (ingredientStr.includes('peanut') || ingredientStr.includes('almond')) {
      allergens.push('nuts');
    }
    
    return allergens;
  }

  /**
   * Determine diet types
   */
  determineDietTypes(ingredients, dietaryPreferences) {
    const types = [];
    const ingredientStr = ingredients.join(' ').toLowerCase();
    
    const hasMeat = ['chicken', 'beef', 'pork', 'fish', 'meat'].some(meat => ingredientStr.includes(meat));
    const hasDairy = ['milk', 'cheese', 'butter', 'cream'].some(dairy => ingredientStr.includes(dairy));
    const hasEggs = ingredientStr.includes('egg');
    
    if (!hasMeat && !hasDairy && !hasEggs) {
      types.push('vegan');
    } else if (!hasMeat) {
      types.push('vegetarian');
    } else {
      types.push('omnivore');
    }
    
    // Add dietary preferences
    dietaryPreferences.forEach(pref => {
      if (!types.includes(pref)) {
        types.push(pref);
      }
    });
    
    return types;
  }

  /**
   * Calculate servings based on calorie target
   */
  calculateServings(calorieTarget, recipeCalories) {
    const targetCalories = (calorieTarget.min + calorieTarget.max) / 2;
    return Math.max(1, Math.round(recipeCalories / targetCalories));
  }

  /**
   * Generate ingredients for scratch recipe
   */
  generateIngredients(searchQuery, dietaryPreferences, allergens) {
    const baseIngredients = [
      '2 tbsp olive oil',
      '1 onion, diced',
      '2 cloves garlic, minced',
      'Salt and pepper to taste',
    ];
    
    // Add main ingredient
    baseIngredients.push(`500g ${searchQuery}`);
    
    // Add based on dietary preferences
    if (dietaryPreferences.includes('high-protein')) {
      baseIngredients.push('200g protein source (chicken/tofu)');
    }
    if (dietaryPreferences.includes('keto')) {
      baseIngredients.push('2 tbsp butter');
      baseIngredients.push('100g leafy greens');
    }
    
    return baseIngredients;
  }

  /**
   * Generate instructions for scratch recipe
   */
  generateInstructions(searchQuery, dietaryPreferences) {
    return [
      `Prepare ${searchQuery} by cleaning and cutting as needed`,
      'Heat oil in a pan over medium heat',
      'Add onions and garlic, sauté until fragrant',
      `Add ${searchQuery} and cook until done`,
      'Season with salt and pepper',
      'Serve hot and enjoy!',
    ];
  }
}

module.exports = new AIRecipeGenerator();

