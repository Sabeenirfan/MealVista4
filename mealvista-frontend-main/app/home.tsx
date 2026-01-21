import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Feather } from "@expo/vector-icons";
import { useFavorites } from "../contexts/FavoritesContext";
import { useRouter } from 'expo-router';
import { useCart } from '../contexts/CartContext';
import axios from 'axios';
import { useState, useEffect } from 'react';

interface Meal {
  image: string;
  title: string;
  time: number;
  calories: number;
  difficulty: string;
  rating: number;
  trending?: boolean;
  featured?: boolean;
  category?: string;
}

interface MealCardProps {
  meal: Meal;
  size?: 'normal' | 'large';
  onPress?: () => void;
  onBookmarkPress?: () => void;
  favorited?: boolean;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

const MealCard = ({ meal, size = 'normal', onPress, onBookmarkPress, favorited = false }: MealCardProps) => {
  const isLarge = size === 'large';
  // Note: meal.id may not be present in sample data; compute fallback id using title
  const id = (meal as any).id ?? meal.title.replace(/\s+/g, '-').toLowerCase();

  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.mealCard, isLarge && styles.mealCardLarge]}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: meal.image }} style={styles.mealImage} />
        {meal.trending && (
          <View style={styles.trendingBadge}>
            <Feather name="trending-up" size={12} color="#fff" />
            <Text style={styles.trendingText}>Trending</Text>
          </View>
        )}
        <TouchableOpacity style={styles.bookmarkButton} onPress={onBookmarkPress}>
          <Feather name="bookmark" size={18} color={favorited ? '#FF6B6B' : '#3C2253'} />
        </TouchableOpacity>
      </View>
      <View style={styles.mealInfo}>
        <Text style={styles.mealTitle} numberOfLines={2}>
          {meal.title}
        </Text>
        <View style={styles.mealDetails}>
          <View style={styles.detailItem}>
            <Feather name="clock" size={12} color="#666" />
            <Text style={styles.detailText}>{meal.time} min</Text>
          </View>
          <Text style={styles.caloriesText}>{meal.calories} kcal</Text>
        </View>
        <View style={styles.mealFooter}>
          <View style={styles.rating}>
            <Feather name="star" size={12} color="#FFA500" />
            <Text style={styles.ratingText}>{meal.rating}</Text>
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
      </View>
    </TouchableOpacity>
  );
};

export default function Home() {
  const router = useRouter();
  const { getTotalItems } = useCart();
  const { favorites, toggleFavorite, isFavorited } = useFavorites();
  const [selectedCategory, setSelectedCategory] = useState<string>('Mediterranean');

  const categories: Category[] = [
    { id: 'pakistani', name: 'Pakistani', color: '#1F4788' },
    { id: 'italian', name: 'Italian', color: '#E8472B' },
    { id: 'chinese', name: 'Chinese', color: '#DE2910' },
    { id: 'mexican', name: 'Mexican', color: '#CE1126' },
    { id: 'thai', name: 'Thai', color: '#2D5016' },
    { id: 'mediterranean', name: 'Mediterranean', color: '#FF9500' },
  ];

  const recommendedMeals: Meal[] = [
    {
      image: "https://images.unsplash.com/photo-1687276287139-88f7333c8ca4?w=400",
      title: "Hummus",
      category: "Mediterranean",
      time: 10,
      calories: 320,
      difficulty: "Easy",
      rating: 4.7,
    },
    {
      image: "https://images.unsplash.com/photo-1609461098241-8f259e32bdb9?w=400",
      title: "Falafel",
      category: "Mediterranean",
      time: 25,
      calories: 450,
      difficulty: "Medium",
      rating: 4.9,
    },
    {
      image: "https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?w=400",
      title: "Greek Salad",
      category: "Mediterranean",
      time: 15,
      calories: 380,
      difficulty: "Easy",
      rating: 4.5,
    },
    {
      image: "https://images.unsplash.com/photo-1612152328178-4a6c83d96429?w=400",
      title: "Shawarma",
      category: "Mediterranean",
      time: 30,
      calories: 520,
      difficulty: "Medium",
      rating: 4.8,
    },
  ];

  const trendingMeals: Meal[] = [
    {
      image: "https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=800",
      title: "Moussaka",
      category: "Mediterranean",
      time: 35,
      calories: 290,
      difficulty: "Medium",
      rating: 4.8,
      trending: true,
      featured: true,
    },
    {
      image: "https://images.unsplash.com/photo-1664741662725-bd131742b7b7?w=400",
      title: "Lamb Kebab",
      category: "Mediterranean",
      time: 45,
      calories: 465,
      difficulty: "Hard",
      rating: 4.6,
      trending: true,
    },
    {
      image: "https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=400",
      title: "Baklava",
      category: "Mediterranean",
      time: 60,
      calories: 380,
      difficulty: "Hard",
      rating: 4.8,
      trending: true,
    },
  ];

  const filteredRecommendedMeals = recommendedMeals.filter(
    meal => !selectedCategory || meal.category?.toLowerCase() === selectedCategory.toLowerCase()
  );

  const filteredTrendingMeals = trendingMeals.filter(
    meal => !selectedCategory || meal.category?.toLowerCase() === selectedCategory.toLowerCase()
  );

  const handleMealPress = (meal: Meal) => {
    router.push({
      pathname: '/recipeDetails',
      params: {
        mealTitle: meal.title,
        mealImage: meal.image,
        mealTime: meal.time.toString(),
        mealCalories: meal.calories.toString(),
        mealDifficulty: meal.difficulty,
        mealRating: meal.rating.toString(),
      },
    });
  };

  const handleBookmarkPress = (meal: Meal) => {
    const id = (meal as any).id ?? meal.title.replace(/\s+/g, '-').toLowerCase();
    toggleFavorite({
      id,
      title: meal.title,
      image: meal.image,
      time: meal.time,
      calories: meal.calories,
      difficulty: meal.difficulty,
      rating: meal.rating,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2253" />
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>MealVista</Text>
          <Text style={styles.headerSubtitle}>Let's Discover ✨</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="search" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => router.push('/viewCart')}
          >
            <Feather name="shopping-cart" size={20} color="#fff" />
            {getTotalItems() > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{getTotalItems()}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => router.push('/profile')}
          >
            <Feather name="user" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <TouchableOpacity 
            style={styles.searchBarInput}
            onPress={() => router.push('/home')}
          >
            <Text style={styles.searchBarPlaceholder}>Search recipes...</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.searchBarButton}
            onPress={() => router.push('/home')}
          >
            <Text style={styles.searchBarIcon}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Categories Section */}
        <View style={styles.categoriesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScrollView}
            contentContainerStyle={styles.categoriesContainer}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => setSelectedCategory(category.name)}
                activeOpacity={0.8}
                style={[
                  styles.categoryPill,
                  selectedCategory === category.name && [
                    styles.categoryPillActive,
                    { backgroundColor: category.color }
                  ]
                ]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    selectedCategory === category.name && styles.categoryPillTextActive
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recommended Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended for You</Text>
          <Text style={styles.sectionSubtitle}>
            A curated selection from {selectedCategory}
          </Text>
        </View>
        <View style={styles.gridContainer}>
          {filteredRecommendedMeals.map((meal, index) => {
            const id = (meal as any).id ?? meal.title.replace(/\s+/g, '-').toLowerCase();
            const mealWithId = { ...(meal as any), id } as Meal & { id: string };
            return (
              <View key={index} style={styles.gridItem}>
                <MealCard
                  meal={mealWithId}
                  onPress={() => handleMealPress(mealWithId)}
                  onBookmarkPress={() => handleBookmarkPress(mealWithId)}
                  favorited={isFavorited(id)}
                />
              </View>
            );
          })}
        </View>
        {/* Trending Section */}
        <View style={styles.trendingHeader}>
          <Feather name="trending-up" size={20} color="#fff" />
          <View style={styles.trendingHeaderText}>
            <Text style={styles.trendingTitle}>Trending & Seasonal</Text>
            <Text style={styles.trendingSubtitle}>Popular this week</Text>
          </View>
        </View>
        {/* Featured Trending Meal */}
        {filteredTrendingMeals.length > 0 && (
          <View style={styles.featuredContainer}>
            {(() => {
              const meal = filteredTrendingMeals[0];
              const id = (meal as any).id ?? meal.title.replace(/\s+/g, '-').toLowerCase();
              const mealWithId = { ...(meal as any), id } as Meal & { id: string };
              return (
                <MealCard
                  meal={mealWithId}
                  size="large"
                  onPress={() => handleMealPress(mealWithId)}
                  onBookmarkPress={() => handleBookmarkPress(mealWithId)}
                  favorited={isFavorited(id)}
                />
              );
            })()}
          </View>
        )}
        {/* Other Trending Meals */}
        <View style={styles.gridContainer}>
          {filteredTrendingMeals.slice(1).map((meal, index) => {
            const id = (meal as any).id ?? meal.title.replace(/\s+/g, '-').toLowerCase();
            const mealWithId = { ...(meal as any), id } as Meal & { id: string };
            return (
              <View key={index} style={styles.gridItem}>
                <MealCard
                  meal={mealWithId}
                  onPress={() => handleMealPress(mealWithId)}
                  onBookmarkPress={() => handleBookmarkPress(mealWithId)}
                  favorited={isFavorited(id)}
                />
              </View>
            );
          })}
        </View>
        <View style={styles.bottomSpacer} />
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
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#D8B4FE',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
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
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#3C2253',
    gap: 10,
  },
  searchBarInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  searchBarPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  searchBarButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarIcon: {
    fontSize: 24,
    color: '#fff',
  },
  categoriesSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  categoriesScrollView: {
    flexGrow: 0,
  },
  categoriesContainer: {
    paddingEnd: 16,
    gap: 10,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  categoryPillActive: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryPillTextActive: {
    color: '#fff',
  },
  sectionHeader: {
    backgroundColor: '#3C2253',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#D8B4FE',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingTop: 16,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  mealCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  mealCardLarge: {
    width: '100%',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
  },
  mealImage: {
    width: '100%',
    height: '100%',
  },
  trendingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#3C2253',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trendingText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  bookmarkButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  mealInfo: {
    padding: 12,
  },
  mealTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  mealDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  caloriesText: {
    fontSize: 12,
    color: '#6B7280',
  },
  mealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
    fontSize: 11,
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
  trendingHeader: {
    backgroundColor: '#3C2253',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trendingHeaderText: {
    flex: 1,
  },
  trendingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  trendingSubtitle: {
    fontSize: 12,
    color: '#D8B4FE',
  },
  featuredContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  bottomSpacer: {
    height: 24,
  },
});
