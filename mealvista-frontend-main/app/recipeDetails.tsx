import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCart } from '../contexts/CartContext';

interface Ingredient {
  id: string;
  name: string;
  category: string;
  price: number;
}

export default function RecipeDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { getTotalItems, addToCart, cartItems } = useCart();
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);

  const meal = {
    title: params.mealTitle as string || 'Creamy Pumpkin Soup',
    image: params.mealImage as string || 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=800',
    time: params.mealTime as string || '35',
    calories: params.mealCalories as string || '290',
    difficulty: params.mealDifficulty as string || 'Medium',
    rating: params.mealRating as string || '4.8',
  };

  // Use ingredients passed via params (from backend) when available
  const passedIngredientsRaw = params.ingredients as string | undefined;
  const ingredientsList: Ingredient[] = passedIngredientsRaw
    ? JSON.parse(passedIngredientsRaw).map((name: string, i: number) => ({
        id: String(i + 1),
        name,
        category: 'Pantry',
        price: 0,
      }))
    : [
        { id: '1', name: 'Pumpkin Puree', category: 'Canned Goods', price: 3.99 },
        { id: '2', name: 'Onion', category: 'Vegetables', price: 1.49 },
        { id: '3', name: 'Garlic', category: 'Vegetables', price: 0.99 },
        { id: '4', name: 'Vegetable Broth', category: 'Canned Goods', price: 2.99 },
        { id: '5', name: 'Heavy Cream', category: 'Dairy', price: 4.99 },
        { id: '6', name: 'Ground Cinnamon', category: 'Spices', price: 2.49 },
        { id: '7', name: 'Nutmeg', category: 'Spices', price: 2.99 },
        { id: '8', name: 'Olive Oil', category: 'Oils', price: 5.99 },
      ];

  const handleToggleIngredient = (id: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddToCart = () => {
    if (selectedIngredients.length === 0) {
      Alert.alert('No Selection', 'Please select at least one ingredient to add to cart');
      return;
    }

    let addedCount = 0;
    selectedIngredients.forEach((id) => {
      const ingredient = ingredientsList.find((ing) => ing.id === id);
      if (ingredient) {
        const itemId = `ingredient-${ingredient.id}`;
        const alreadyInCart = cartItems.some((c) => c.id === itemId);
        if (!alreadyInCart) {
          addToCart({
            id: itemId,
            name: ingredient.name,
            price: ingredient.price,
            category: ingredient.category,
          });
          addedCount += 1;
        }
      }
    });

    Alert.alert(
      'Success',
      addedCount > 0
        ? `${addedCount} ingredient(s) added to cart`
        : 'Selected ingredient(s) are already in your cart',
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
      },
    });
  };

  const handleViewNutrients = () => {
    const paramsToSend: any = { mealTitle: meal.title };
    if (params.macros) paramsToSend.macros = params.macros;
    if (params.micros) paramsToSend.micros = params.micros;
    router.push({ pathname: '/nutritionalBreakdown', params: paramsToSend });
  };

  const handleViewAllergens = () => {
    router.push({
      pathname: '/seeAllergens',
      params: {
        mealTitle: meal.title,
        mealImage: meal.image,
      },
    });
  };

  const handleCartPress = () => {
    router.push('/viewCart');
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
              {selectedIngredients.length > 0 && (
                <TouchableOpacity
                  style={styles.addToCartButton}
                  onPress={handleAddToCart}
                >
                  <Feather name="shopping-cart" size={16} color="#fff" />
                  <Text style={styles.addToCartButtonText}>
                    Add to Cart ({selectedIngredients.length})
                  </Text>
                </TouchableOpacity>
              )}
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
                    <Text style={styles.ingredientCategory}>{ingredient.category}</Text>
                  </View>
                  <Text style={styles.ingredientPrice}>Rs {ingredient.price.toFixed(2)}</Text>
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
});
