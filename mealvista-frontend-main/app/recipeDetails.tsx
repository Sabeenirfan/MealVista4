import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCart } from '../contexts/CartContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useMealPlan } from '../contexts/MealPlanContext';
import { addCatalogIngredientToCart, getProfile } from '../lib/authService';
import api from '../lib/api';
import { getStoredToken } from '../lib/authStorage';

interface Ingredient {
  id: string;
  rawName: string;
  name: string;
  category: string;
  price: number;
  inventoryId?: string;
  stock?: number;
  recipeQty?: string;
}

export default function RecipeDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { getTotalItems, addToCart, cartItems } = useCart();
  const { trackView } = useFavorites();
  const { refresh: refreshMealPlan } = useMealPlan();
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState<number>(2000);
  const [cookingState, setCookingState] = useState<'idle' | 'cooking' | 'cooked'>('idle');
  const [ingredientsList, setIngredientsList] = useState<Ingredient[]>([]);

  // Load user's daily calorie target from profile + track view
  useEffect(() => {
    getProfile()
      .then(res => {
        const target = (res.user as any)?.dailyCalorieTarget;
        if (target) setDailyCalorieTarget(target);
      })
      .catch(() => { });
    // Track this recipe view for behavioral learning
    const recipeId = params.recipeId as string || params.mealTitle as string || '';
    const recipeName = params.mealTitle as string || '';
    if (recipeName) trackView(recipeId, recipeName);
  }, []);

  const meal = {
    title: params.mealTitle as string || 'Creamy Pumpkin Soup',
    image: params.mealImage as string || 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=800',
    time: params.mealTime as string || '35',
    calories: params.mealCalories as string || '290',
    difficulty: params.mealDifficulty as string || 'Medium',
    rating: params.mealRating as string || '4.8',
  };

  const cleanIngredientName = (value: string) => {
    return value
      .toLowerCase()
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\b\d+([./]\d+)?\s*(kg|g|mg|ml|l|tbsp|tsp|cup|cups|oz|lb|packet|packets|piece|pieces|clove|cloves)\b/g, ' ')
      .replace(/[,/-]/g, ' ')
      .replace(/\b(chopped|diced|minced|sliced|fresh|ground|whole|boneless|skinless)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Keep recipe quantity for display only (not pricing)
  const extractRecipeQty = (value: string) => {
    const match = value
      .trim()
      .match(/^(\d+([./]\d+)?\s*(kg|g|mg|ml|l|tbsp|tsp|cup|cups|oz|lb|packet|packets|piece|pieces|clove|cloves)?)/i);
    return match?.[1]?.trim() || '';
  };

  useEffect(() => {
    const loadMappedIngredients = async () => {
      try {
        const passedIngredientsRaw = params.ingredients as string | undefined;
        const rawNames: string[] = passedIngredientsRaw
          ? JSON.parse(passedIngredientsRaw)
          : [
              'Pumpkin Puree',
              'Onion',
              'Garlic',
              'Vegetable Broth',
              'Heavy Cream',
              'Ground Cinnamon',
              'Nutmeg',
              'Olive Oil',
            ];

        const catalogRes = await api.get('/api/ingredients/catalog', {
          params: { limit: 1000, page: 1 },
        });
        const catalogItems: any[] = catalogRes?.data?.items || [];

        const mapped = rawNames.map((rawName, i) => {
          const normalizedRaw = cleanIngredientName(rawName);
          const recipeQty = extractRecipeQty(rawName);
          const exact = catalogItems.find((item) => cleanIngredientName(item.name) === normalizedRaw);
          const partial = catalogItems.find((item) => {
            const normalizedItem = cleanIngredientName(item.name);
            return (
              normalizedItem.includes(normalizedRaw) ||
              normalizedRaw.includes(normalizedItem)
            );
          });

          const match = exact || partial;
          if (!match) {
            return {
              id: `recipe-${i + 1}`,
              rawName,
              name: rawName,
              category: 'Not in Inventory',
              price: 0,
              stock: 0,
              recipeQty,
            };
          }

          return {
            id: `recipe-${i + 1}`,
            rawName,
            name: match.name,
            category: match.category,
            price: Number(match.price) || 0,
            inventoryId: match.id,
            stock: Number(match.stock) || 0,
            recipeQty,
          };
        });

        setIngredientsList(mapped);
      } catch {
        setIngredientsList([]);
      }
    };

    loadMappedIngredients();
  }, [params.ingredients]);

  const handleToggleIngredient = (id: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddToCart = async () => {
    if (selectedIngredients.length === 0) {
      Alert.alert('No Selection', 'Please select at least one ingredient to add to cart');
      return;
    }

    let addedCount = 0;
    let notFoundCount = 0;
    let outOfStockCount = 0;

    for (const id of selectedIngredients) {
      const ingredient = ingredientsList.find((ing) => ing.id === id);
      if (!ingredient || !ingredient.inventoryId) {
        notFoundCount += 1;
        continue;
      }

      if ((ingredient.stock || 0) <= 0) {
        outOfStockCount += 1;
        continue;
      }

      try {
        const response = await addCatalogIngredientToCart(ingredient.inventoryId);
        addToCart({
          id: `catalog-${response.item.id}`,
          ingredientId: response.item.id,
          name: response.item.name,
          price: response.item.price,
          unit: response.item.unit,
          category: response.item.category,
          image: response.item.image,
        });
        addedCount += 1;
      } catch (error: any) {
        const message = error?.response?.data?.message?.toLowerCase() || '';
        if (message.includes('out of stock')) outOfStockCount += 1;
        else notFoundCount += 1;
      }
    }

    Alert.alert(
      'Cart Update',
      [
        addedCount > 0 ? `${addedCount} ingredient(s) added from inventory.` : '',
        outOfStockCount > 0 ? `${outOfStockCount} ingredient(s) are out of stock.` : '',
        notFoundCount > 0 ? `${notFoundCount} ingredient(s) not found in inventory.` : '',
      ].filter(Boolean).join('\n') || 'No ingredients were added.',
      [
        {
          text: 'OK',
          onPress: () => setSelectedIngredients([]),
        },
      ]
    );
  };

  const handleViewInstructions = () => {
    router.push({
      pathname: '/instructions',
      params: {
        mealTitle: meal.title,
        mealImage: meal.image,
        instructions: params.instructions as string || '[]',
      },
    });
  };

  const handleViewNutrients = () => {
    router.push({
      pathname: '/nutritionalBreakdown',
      params: {
        mealTitle: meal.title,
        mealCalories: meal.calories,
        macros: params.macros as string || '{}',
        micros: params.micros as string || '{}',
        dailyCalorieTarget: String(dailyCalorieTarget),
      },
    });
  };

  const handleViewAllergens = () => {
    router.push({
      pathname: '/seeAllergens',
      params: {
        mealTitle: meal.title,
        mealImage: meal.image,
        allergens: params.allergens as string || '[]',
        ingredients: params.ingredients as string || '[]',
      },
    });
  };

  const handleCartPress = () => {
    router.push('/viewCart');
  };

  const handleICookedIt = () => {
    if (cookingState === 'cooked') {
      Alert.alert('Already Logged', 'This recipe has already been added to your meal plan for today.');
      return;
    }

    // Ask meal type first
    Alert.alert(
      '🍴 Log Meal',
      'Which meal is this?',
      [
        { text: 'Breakfast', onPress: () => logMeal('breakfast') },
        { text: 'Lunch', onPress: () => logMeal('lunch') },
        { text: 'Dinner', onPress: () => logMeal('dinner') },
        { text: 'Snack', onPress: () => logMeal('snack') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const logMeal = async (mealType: string) => {
    try {
      setCookingState('cooking');
      const token = await getStoredToken();
      if (!token) {
        Alert.alert('Sign In Required', 'Please sign in to track your meals.');
        setCookingState('idle');
        return;
      }

      // Parse macros if available
      let macros = {};
      try {
        const raw = params.macros as string;
        if (raw) macros = JSON.parse(raw);
      } catch { }

      const res = await api.post(
        '/api/mealplan/cook',
        {
          recipeName: meal.title,
          calories: Number(meal.calories) || 0,
          macros,
          image: meal.image,
          mealType,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setCookingState('cooked');

        // Track cook event for AI behavioral learning (fire-and-forget)
        try {
          const token = await getStoredToken();
          if (token) {
            api.post(
              '/api/behavior/track',
              { event: 'cook', recipeId: params.recipeId || meal.title, recipeName: meal.title, calories: Number(meal.calories) || 0 },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
        } catch { }

        const { totalCalories, dailyTarget, remaining, exceeded } = res.data.mealPlan;

        // Refresh the global meal plan context so the dashboard macro tracking updates immediately
        await refreshMealPlan();

        Alert.alert(
          '✅ Meal Logged!',
          `${meal.title} added to your meal plan.\n\nToday: ${totalCalories} / ${dailyTarget} kcal\n${exceeded ? '⚠️ You exceeded your daily target!' : `${remaining} kcal remaining`}`,
          [
            { text: 'View Meal Plan', onPress: () => router.push('/mealPlan' as any) },
            { text: 'OK' },
          ]
        );
      }
    } catch (err: any) {
      setCookingState('idle');
      Alert.alert('Error', err?.response?.data?.message || 'Could not log meal. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2253" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recipe Details</Text>
        <TouchableOpacity
          onPress={handleCartPress}
          style={styles.cartButton}
        >
          <Feather name="shopping-cart" size={24} color="#fff" />
          {getTotalItems() > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{getTotalItems()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Recipe Image */}
        <Image
          source={{ uri: meal.image }}
          style={styles.recipeImage}
          resizeMode="cover"
        />

        {/* Recipe Info */}
        <View style={styles.content}>
          <Text style={styles.recipeTitle}>{meal.title}</Text>

          <View style={styles.recipeMeta}>
            <View style={styles.metaBadge}>
              <Feather name="clock" size={14} color="#666" />
              <Text style={styles.metaText}>{meal.time} min</Text>
            </View>
            <View style={styles.metaBadge}>
              <Feather name="zap" size={14} color="#666" />
              <Text style={styles.metaText}>{meal.calories} kcal</Text>
            </View>
            <View
              style={[
                styles.difficultyBadge,
                meal.difficulty === "Easy" && styles.easyBadge,
                meal.difficulty === "Medium" && styles.mediumBadge,
                meal.difficulty === "Hard" && styles.hardBadge,
              ]}
            >
              <Text
                style={[
                  styles.difficultyText,
                  meal.difficulty === "Easy" && styles.easyText,
                  meal.difficulty === "Medium" && styles.mediumText,
                  meal.difficulty === "Hard" && styles.hardText,
                ]}
              >
                {meal.difficulty}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleViewInstructions}
              activeOpacity={0.8}
            >
              <Feather name="book-open" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>View Instructions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleViewNutrients}
              activeOpacity={0.8}
            >
              <Feather name="pie-chart" size={18} color="#3C2253" />
              <Text style={styles.secondaryButtonText}>View Nutrients</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tertiaryButton}
              onPress={handleViewAllergens}
              activeOpacity={0.8}
            >
              <Feather name="alert-triangle" size={18} color="#3C2253" />
              <Text style={styles.tertiaryButtonText}>View Allergens</Text>
            </TouchableOpacity>

            {/* I Cooked It Button */}
            <TouchableOpacity
              style={[
                styles.cookedItButton,
                cookingState === 'cooked' && styles.cookedItButtonDone,
                cookingState === 'cooking' && { opacity: 0.7 },
              ]}
              onPress={handleICookedIt}
              activeOpacity={0.8}
              disabled={cookingState === 'cooking'}
            >
              {cookingState === 'cooking' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather
                  name={cookingState === 'cooked' ? 'check-circle' : 'check-square'}
                  size={18}
                  color="#fff"
                />
              )}
              <Text style={styles.cookedItText}>
                {cookingState === 'cooked' ? 'Logged Today ✓' : cookingState === 'cooking' ? 'Adding...' : 'I Cooked It!'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Description Section */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>
              A warm and comforting soup perfect for autumn. This creamy pumpkin
              soup combines the natural sweetness of pumpkin with aromatic spices
              for a delightful culinary experience.
            </Text>
          </View>

          {/* Ingredients Section */}
          <View style={styles.ingredientsSection}>
            <View style={styles.ingredientsHeader}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {selectedIngredients.length > 0 && (
                  <TouchableOpacity
                    style={[styles.addToCartButton, { backgroundColor: '#ef4444', paddingHorizontal: 12 }]}
                    onPress={() => setSelectedIngredients([])}
                  >
                    <Feather name="x" size={16} color="#fff" />
                    <Text style={styles.addToCartButtonText}>
                      Clear
                    </Text>
                  </TouchableOpacity>
                )}
                {selectedIngredients.length > 0 ? (
                  <TouchableOpacity
                    style={styles.addToCartButton}
                    onPress={handleAddToCart}
                  >
                    <Feather name="shopping-cart" size={16} color="#fff" />
                    <Text style={styles.addToCartButtonText}>
                      Add ({selectedIngredients.length})
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.addToCartButton, { backgroundColor: '#3B82F6' }]}
                    onPress={() => setSelectedIngredients(ingredientsList.map(i => i.id))}
                  >
                    <Feather name="check-square" size={16} color="#fff" />
                    <Text style={styles.addToCartButtonText}>
                      Select All
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {ingredientsList.map((ingredient) => {
              const isSelected = selectedIngredients.includes(ingredient.id);
              return (
                <TouchableOpacity
                  key={ingredient.id}
                  style={[
                    styles.ingredientCard,
                    isSelected && styles.ingredientCardSelected,
                  ]}
                  onPress={() => handleToggleIngredient(ingredient.id)}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && (
                      <Feather name="check" size={14} color="#fff" />
                    )}
                  </View>
                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>{ingredient.name}</Text>
                    {!!ingredient.recipeQty && (
                      <Text style={styles.ingredientCategory}>Recipe Qty: {ingredient.recipeQty}</Text>
                    )}
                    <Text style={styles.ingredientCategory}>{ingredient.category}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.ingredientPrice}>
                      {ingredient.inventoryId ? `Rs ${ingredient.price.toFixed(2)}` : 'Not Mapped'}
                    </Text>
                    <Text style={styles.ingredientCategory}>
                      {ingredient.inventoryId ? `${ingredient.stock || 0} in stock` : 'No stock data'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#3C2253',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  cartButton: {
    padding: 8,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  recipeImage: {
    width: '100%',
    height: 280,
  },
  content: {
    padding: 20,
  },
  recipeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  recipeMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  easyBadge: {
    backgroundColor: '#D1FAE5',
  },
  mediumBadge: {
    backgroundColor: '#FEF3C7',
  },
  hardBadge: {
    backgroundColor: '#FEE2E2',
  },
  difficultyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  easyText: {
    color: '#059669',
  },
  mediumText: {
    color: '#D97706',
  },
  hardText: {
    color: '#DC2626',
  },
  actionButtons: {
    gap: 12,
    marginBottom: 32,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3C2253',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#3C2253',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#3C2253',
    fontSize: 15,
    fontWeight: '600',
  },
  tertiaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#3C2253',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  tertiaryButtonText: {
    color: '#3C2253',
    fontSize: 15,
    fontWeight: '600',
  },
  descriptionSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  ingredientsSection: {
    marginBottom: 16,
  },
  ingredientsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3C2253',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  ingredientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ingredientCardSelected: {
    borderColor: '#3C2253',
    backgroundColor: '#F0EFFF',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#3C2253',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: '#3C2253',
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  ingredientCategory: {
    fontSize: 13,
    color: '#6B7280',
  },
  ingredientPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3C2253',
  },
  cookedItButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginTop: 4,
  },
  cookedItButtonDone: {
    backgroundColor: '#6B7280',
  },
  cookedItText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
