import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather } from "@expo/vector-icons";
import { useFavorites } from "../contexts/FavoritesContext";
import { useRouter } from 'expo-router';
import { useCart } from '../contexts/CartContext';
import { useMealPlan } from '../contexts/MealPlanContext';
import api from '../lib/api';
import { getStoredToken } from '../lib/authStorage';
import { CATEGORY_RECIPES, SEASONAL_RECIPES } from '../lib/hardcodedRecipes';

interface Meal {
  id?: string;
  image: string;
  title: string;
  time: number;
  calories: number;
  difficulty: string;
  rating: number;
  trending?: boolean;
  featured?: boolean;
  category?: string;
  recipeData?: any;
  isAIGenerated?: boolean;
}

interface MealCardProps {
  meal: Meal;
  size?: 'normal' | 'large';
  onPress?: () => void;
  onBookmarkPress?: () => void;
  favorited?: boolean;
  showAIBadge?: boolean;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

// ─── Meal Card ────────────────────────────────────────────────────────────────
const MealCard = ({ meal, size = 'normal', onPress, onBookmarkPress, favorited = false, showAIBadge = false }: MealCardProps) => {
  const isLarge = size === 'large';
  const id = (meal as any).id ?? meal.title.replace(/\s+/g, '-').toLowerCase();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.mealCard, isLarge && styles.mealCardLarge]}
    >
      <View style={[styles.imageContainer, isLarge && styles.imageContainerLarge]}>
        <Image source={{ uri: meal.image }} style={styles.mealImage} />
        {meal.trending && (
          <View style={styles.trendingBadge}>
            <Feather name="trending-up" size={12} color="#fff" />
            <Text style={styles.trendingText}>Trending</Text>
          </View>
        )}
        {showAIBadge && meal.isAIGenerated && (
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>✨ AI</Text>
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

// ─── Helper: map API recipe → Meal card shape ──────────────────────────────
function toMeal(recipe: any, idx: number, category?: string): Meal | null {
  if (!recipe) return null;
  return {
    id: recipe.id || `recipe-${idx}`,
    image: recipe.image || 'https://via.placeholder.com/400',
    title: recipe.name || recipe.title || 'Unknown Recipe',
    category,
    time: (recipe.prepTime || 0) + (recipe.cookTime || 0) || 30,
    calories: recipe.calories || 0,
    difficulty: recipe.difficulty || 'Medium',
    rating: parseFloat(recipe.rating) || 4.5,
    trending: false,
    featured: false,
    recipeData: recipe,
    isAIGenerated: recipe.isAIGenerated ?? false,
  };
}

// ─── Loading skeleton row ──────────────────────────────────────────────────
const SkeletonRow = () => (
  <View style={styles.gridContainer}>
    {[0, 1].map(i => (
      <View key={i} style={[styles.gridItem, styles.skeletonCard]}>
        <View style={styles.skeletonImage} />
        <View style={{ padding: 10 }}>
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: '60%', marginTop: 6 }]} />
        </View>
      </View>
    ))}
  </View>
);

// ─── Main Component ────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const { getTotalItems } = useCart();
  const { toggleFavorite, isFavorited } = useFavorites();
  const { todayPlan } = useMealPlan();

  // Category browsing state
  const [selectedCategory, setSelectedCategory] = useState<string>('Pakistani');
  const [categoryRecipes, setCategoryRecipes] = useState<Meal[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);

  // AI sections state
  const [recommendedRecipes, setRecommendedRecipes] = useState<Meal[]>([]);
  const [seasonalRecipes, setSeasonalRecipes] = useState<Meal[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(true);
  const [seasonalLoading, setSeasonalLoading] = useState(true);
  const [season, setSeason] = useState('');

  const [refreshing, setRefreshing] = useState(false);

  const categories: Category[] = [
    { id: 'pakistani', name: 'Pakistani', color: '#1F4788' },
    { id: 'italian', name: 'Italian', color: '#E8472B' },
    { id: 'chinese', name: 'Chinese', color: '#DE2910' },
    { id: 'mexican', name: 'Mexican', color: '#CE1126' },
    { id: 'thai', name: 'Thai', color: '#2D5016' },
    { id: 'mediterranean', name: 'Mediterranean', color: '#FF9500' },
  ];

  // ── Fetch AI recommended recipes ────────────────────────────────────────
  const fetchRecommended = useCallback(async () => {
    try {
      setRecommendedLoading(true);
      const token = await getStoredToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await api.get('/api/recipes/recommended', { headers });
      if (response.data?.success) {
        const meals = (response.data.recipes || [])
          .map((r: any, idx: number) => toMeal(r, idx, 'Recommended'))
          .filter(Boolean) as Meal[];
        setRecommendedRecipes(meals);
      }
    } catch (error) {
      console.error('[Home] Recommended fetch error:', error);
    } finally {
      setRecommendedLoading(false);
    }
  }, []);

  // ── Fetch AI seasonal recipes ───────────────────────────────────────────
  const fetchSeasonal = useCallback(async () => {
    // Immediately load hardcoded seasonal recipes
    setSeasonalLoading(true);
    setTimeout(() => {
      setSeasonalRecipes(SEASONAL_RECIPES as any);
      setSeason('Spring');
      setSeasonalLoading(false);
    }, 500); // Small delay for UX transition
  }, []);

  // ── Fetch category recipes ─────────────────────────────
  const fetchCategoryRecipes = useCallback(async () => {
    setCategoryLoading(true);
    const categoryKey = selectedCategory.toLowerCase();

    // Simulate slight network delay for smooth UX transition
    setTimeout(() => {
      const hardcodedMeals = CATEGORY_RECIPES[categoryKey] || CATEGORY_RECIPES['pakistani'];
      setCategoryRecipes(hardcodedMeals as any);
      setCategoryLoading(false);
    }, 400);

  }, [selectedCategory]);

  // Initial loads
  useEffect(() => { fetchRecommended(); fetchSeasonal(); }, []);
  useEffect(() => { fetchCategoryRecipes(); }, [selectedCategory]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchRecommended(), fetchSeasonal(), fetchCategoryRecipes()]);
    setRefreshing(false);
  }, [fetchRecommended, fetchSeasonal, fetchCategoryRecipes]);

  // ── Navigation helpers ──────────────────────────────────────────────────
  const handleMealPress = (meal: Meal) => {
    const recipeData = (meal as any).recipeData;
    router.push({
      pathname: '/recipeDetails',
      params: {
        mealTitle: meal.title,
        mealImage: meal.image,
        mealTime: meal.time.toString(),
        mealCalories: meal.calories.toString(),
        mealDifficulty: meal.difficulty,
        mealRating: meal.rating.toString(),
        recipeId: recipeData?.id || '',
        ingredients: recipeData ? JSON.stringify(recipeData.ingredients || []) : '[]',
        instructions: recipeData ? JSON.stringify(recipeData.instructions || []) : '[]',
        macros: recipeData ? JSON.stringify(recipeData.macros || {}) : '{}',
        micros: recipeData ? JSON.stringify(recipeData.micros || {}) : '{}',
        allergens: recipeData ? JSON.stringify(recipeData.allergens || []) : '[]',
      },
    });
  };

  const handleBookmarkPress = (meal: Meal) => {
    const id = (meal as any).id ?? meal.title.replace(/\s+/g, '-').toLowerCase();
    toggleFavorite({ id, title: meal.title, image: meal.image, time: meal.time, calories: meal.calories, difficulty: meal.difficulty, rating: meal.rating });
  };

  // ── Render recipe grid ──────────────────────────────────────────────────
  const renderGrid = (meals: Meal[], showAI = false) => (
    <View style={styles.gridContainer}>
      {meals.map((meal, index) => {
        const id = (meal as any).id ?? meal.title.replace(/\s+/g, '-').toLowerCase();
        const mealWithId = { ...(meal as any), id } as Meal & { id: string };
        return (
          <View key={meal.id || index} style={styles.gridItem}>
            <MealCard
              meal={mealWithId}
              onPress={() => handleMealPress(mealWithId)}
              onBookmarkPress={() => handleBookmarkPress(mealWithId)}
              favorited={isFavorited(id)}
              showAIBadge={showAI}
            />
          </View>
        );
      })}
    </View>
  );

  // ── JSX ─────────────────────────────────────────────────────────────────
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
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/search')}>
            <Feather name="search" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/mealPlan' as any)}>
            <Feather name="pie-chart" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/viewCart')}>
            <Feather name="shopping-cart" size={20} color="#fff" />
            {getTotalItems() > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{getTotalItems()}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/profile')}>
            <Feather name="user" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3C2253" colors={['#3C2253']} />}
      >
        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <TouchableOpacity style={styles.searchBarInput} onPress={() => router.push('/search')}>
            <Text style={styles.searchBarPlaceholder}>Search AI recipes...</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchBarButton} onPress={() => router.push('/search')}>
            <Text style={styles.searchBarIcon}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* ─── CALORIE SUMMARY CARD ──────────────────────────────── */}
        {todayPlan && (
          <TouchableOpacity
            style={[
              styles.calorieSummaryCard,
              todayPlan.status === 'exceeded' && styles.calorieSummaryExceeded,
              todayPlan.status === 'met' && styles.calorieSummaryMet,
            ]}
            onPress={() => router.push('/mealPlan' as any)}
            activeOpacity={0.85}
          >
            <View style={styles.calorieSummaryLeft}>
              <View style={styles.calorieIconRow}>
                <Text style={styles.calorieEmoji}>
                  {todayPlan.status === 'exceeded' ? '⚠️'
                    : todayPlan.status === 'met' ? '🎉'
                      : '🔥'}
                </Text>
                <Text style={styles.calorieSummaryTitle}>Today's Calories</Text>
              </View>
              <View style={styles.calorieNumbersRow}>
                <Text style={styles.calorieConsumed}>{todayPlan.totalCalories}</Text>
                <Text style={styles.calorieSlash}> / </Text>
                <Text style={styles.calorieTarget}>{todayPlan.dailyTarget} kcal</Text>
              </View>
              {/* Progress bar */}
              <View style={styles.caloriePrgTrack}>
                <View style={[
                  styles.caloriePrgFill,
                  {
                    width: `${todayPlan.percentage}%` as any,
                    backgroundColor:
                      todayPlan.percentage > 105 ? '#DC2626'
                        : todayPlan.percentage >= 90 ? '#10B981'
                          : '#F59E0B',
                  },
                ]} />
              </View>
              <Text style={styles.calorieStatusText}>
                {todayPlan.status === 'exceeded'
                  ? `${todayPlan.totalCalories - todayPlan.dailyTarget} kcal over target`
                  : todayPlan.status === 'met'
                    ? 'Daily goal achieved! 🎉'
                    : `${todayPlan.remaining} kcal remaining · ${todayPlan.mealsCount} meal${todayPlan.mealsCount !== 1 ? 's' : ''} logged`}
              </Text>

              {/* Macros Row */}
              <View style={styles.macroRow}>
                <View style={styles.macroPill}>
                  <Text style={styles.macroValue}>{todayPlan.macros?.protein || 0}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroPill}>
                  <Text style={styles.macroValue}>{todayPlan.macros?.carbs || 0}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroPill}>
                  <Text style={styles.macroValue}>{todayPlan.macros?.fat || 0}g</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
              </View>
            </View>
            <View style={styles.calorieSummaryRight}>
              <Text style={styles.caloriePct}>{todayPlan.percentage}%</Text>
              <Feather name="chevron-right" size={16} color="#9CA3AF" style={{ marginTop: 4 }} />
            </View>
          </TouchableOpacity>
        )}

        {/* ─── SECTION 1: Recommended for You (AI) ─────────────────── */}
        <View style={styles.sectionHeaderAI}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
            <Text style={styles.sectionSubtitle}>✨ Personalized by AI for your health goal</Text>
          </View>
        </View>

        {recommendedLoading ? (
          <SkeletonRow />
        ) : recommendedRecipes.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="cpu" size={32} color="#9CA3AF" />
            <Text style={styles.emptyText}>AI is generating your recommendations...</Text>
          </View>
        ) : (
          renderGrid(recommendedRecipes, true)
        )}

        {/* ─── SECTION 2: Traditional & Seasonal (AI) ──────────────── */}
        <View style={[styles.trendingHeader, { marginTop: 8 }]}>
          <Text style={styles.trendingHeaderEmoji}>🌿</Text>
          <View style={styles.trendingHeaderText}>
            <Text style={styles.trendingTitle}>Traditional & Seasonal</Text>
            <Text style={styles.trendingSubtitle}>
              {season ? `Perfect for ${season}` : 'Curated for this season'}
            </Text>
          </View>
          <View style={styles.aiBadgePill}>
            <Text style={styles.aiBadgePillText}>AI ✨</Text>
          </View>
        </View>

        {seasonalLoading ? (
          <SkeletonRow />
        ) : seasonalRecipes.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="wind" size={32} color="#9CA3AF" />
            <Text style={styles.emptyText}>Loading seasonal picks...</Text>
          </View>
        ) : (
          renderGrid(seasonalRecipes, true)
        )}

        {/* ─── SECTION 3: Category Browsing ────────────────────────── */}
        <View style={[styles.sectionHeaderAI, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Browse by Cuisine</Text>
        </View>

        {/* Category pills */}
        <View style={styles.categoriesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScrollView}
            contentContainerStyle={styles.categoriesContainer}
          >
            {categories.map((category) => {
              const isSelected = selectedCategory === category.name;
              return (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => setSelectedCategory(category.name)}
                  activeOpacity={0.8}
                  style={[
                    styles.categoryPill,
                    isSelected && [styles.categoryPillActive, { backgroundColor: category.color }],
                  ]}
                >
                  <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Category recipes grid */}
        {categoryLoading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#3C2253" />
            <Text style={{ color: '#666', marginTop: 12 }}>Loading {selectedCategory} recipes...</Text>
          </View>
        ) : categoryRecipes.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={48} color="#999" />
            <Text style={styles.emptyText}>No recipes found for {selectedCategory}</Text>
          </View>
        ) : (
          <>
            {/* First 4 as "Category Picks" */}
            {renderGrid(categoryRecipes.slice(0, 4))}

            {/* Next 4 as featured/trending */}
            {categoryRecipes.length > 4 && (
              <>
                <View style={[styles.trendingHeader, { marginTop: 8 }]}>
                  <Feather name="trending-up" size={20} color="#fff" />
                  <View style={styles.trendingHeaderText}>
                    <Text style={styles.trendingTitle}>More {selectedCategory}</Text>
                    <Text style={styles.trendingSubtitle}>Top picks this week</Text>
                  </View>
                </View>
                {categoryRecipes.length > 5 && (
                  <View style={styles.featuredContainer}>
                    <MealCard
                      meal={{ ...categoryRecipes[4], trending: true } as Meal & { id: string }}
                      size="large"
                      onPress={() => handleMealPress(categoryRecipes[4])}
                      onBookmarkPress={() => handleBookmarkPress(categoryRecipes[4])}
                      favorited={isFavorited((categoryRecipes[4] as any).id ?? categoryRecipes[4].title)}
                    />
                  </View>
                )}
                {renderGrid(categoryRecipes.slice(5, 8).map(m => ({ ...m, trending: true })))}
              </>
            )}
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
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
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#D8B4FE' },
  headerActions: { flexDirection: 'row', gap: 12 },
  iconButton: { padding: 8, borderRadius: 8, position: 'relative' },
  cartBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#FF6B6B', borderRadius: 10,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  cartBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  scrollView: { flex: 1 },
  searchBarContainer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16,
    backgroundColor: '#3C2253', gap: 10,
  },
  searchBarInput: {
    flex: 1, borderWidth: 2, borderColor: '#fff',
    borderRadius: 30, paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#fff', justifyContent: 'center',
  },
  searchBarPlaceholder: { fontSize: 16, color: '#999' },
  searchBarButton: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#000', justifyContent: 'center', alignItems: 'center',
  },
  searchBarIcon: { fontSize: 24, color: '#fff' },

  // Section headers
  sectionHeaderAI: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#3C2253', paddingHorizontal: 16, paddingVertical: 12,
  },
  sectionHeaderLeft: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  sectionSubtitle: { fontSize: 12, color: '#D8B4FE' },

  // Grids
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingTop: 16 },
  gridItem: { width: '50%', paddingHorizontal: 8, marginBottom: 16 },

  // Meal card
  mealCard: {
    backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden',
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  mealCardLarge: { width: '100%' },
  imageContainer: { position: 'relative', width: '100%', height: 120 },
  imageContainerLarge: { height: 180 },
  mealImage: { width: '100%', height: '100%' },
  trendingBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: '#3C2253', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4,
  },
  trendingText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  aiBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(60,34,83,0.85)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  aiBadgeText: { color: '#E9D5FF', fontSize: 10, fontWeight: '700' },
  bookmarkButton: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: '#fff', width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2,
  },
  mealInfo: { padding: 12 },
  mealTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  mealDetails: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, color: '#6B7280' },
  caloriesText: { fontSize: 12, color: '#6B7280' },
  mealFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, color: '#1F2937', fontWeight: '600' },
  difficultyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  easyBadge: { backgroundColor: '#D1FAE5' },
  mediumBadge: { backgroundColor: '#FEF3C7' },
  hardBadge: { backgroundColor: '#FEE2E2' },
  difficultyText: { fontSize: 11, fontWeight: '600' },
  easyText: { color: '#059669' },
  mediumText: { color: '#D97706' },
  hardText: { color: '#DC2626' },

  // Trending / Seasonal header
  trendingHeader: {
    backgroundColor: '#3C2253',
    marginHorizontal: 16, marginTop: 24, marginBottom: 16,
    padding: 12, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  trendingHeaderEmoji: { fontSize: 20 },
  trendingHeaderText: { flex: 1 },
  trendingTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  trendingSubtitle: { fontSize: 12, color: '#D8B4FE' },
  aiBadgePill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  aiBadgePillText: { color: '#E9D5FF', fontSize: 11, fontWeight: '700' },

  // Categories
  categoriesSection: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F9FAFB' },
  categoriesScrollView: { flexGrow: 0 },
  categoriesContainer: { paddingEnd: 16, gap: 10 },
  categoryPill: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24,
    backgroundColor: '#E5E7EB', borderWidth: 1, borderColor: '#D1D5DB',
  },
  categoryPillActive: {
    backgroundColor: '#FF9500', borderColor: '#FF9500',
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3,
  },
  categoryPillText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  categoryPillTextActive: { color: '#fff' },

  // Featured
  featuredContainer: { paddingHorizontal: 16, marginBottom: 16 },

  // Skeleton
  skeletonCard: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 1 },
  skeletonImage: { width: '100%', height: 120, backgroundColor: '#E5E7EB' },
  skeletonLine: { height: 12, backgroundColor: '#E5E7EB', borderRadius: 6, width: '80%' },

  // Empty states
  emptyState: { padding: 40, alignItems: 'center', gap: 8 },
  emptyText: { color: '#6B7280', textAlign: 'center', fontSize: 14 },

  bottomSpacer: { height: 24 },

  // ── Calorie Summary Card ────────────────────────────────────
  calorieSummaryCard: {
    marginHorizontal: 16, marginBottom: 16, borderRadius: 16,
    backgroundColor: '#fff', padding: 16,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  calorieSummaryExceeded: { borderColor: '#FECACA', backgroundColor: '#FFF7F7' },
  calorieSummaryMet: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  calorieSummaryLeft: { flex: 1 },
  calorieSummaryRight: { alignItems: 'center', marginLeft: 12 },
  calorieIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  calorieEmoji: { fontSize: 16 },
  calorieSummaryTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  calorieNumbersRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 8 },
  calorieConsumed: { fontSize: 26, fontWeight: '900', color: '#1F2937' },
  calorieSlash: { fontSize: 16, color: '#9CA3AF' },
  calorieTarget: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  caloriePrgTrack: { height: 7, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginBottom: 7 },
  caloriePrgFill: { height: '100%', borderRadius: 4 },
  calorieStatusText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  caloriePct: { fontSize: 20, fontWeight: '800', color: '#3C2253' },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, backgroundColor: '#F3F4F6', padding: 8, borderRadius: 8 },
  macroPill: { flex: 1, alignItems: 'center' },
  macroValue: { fontSize: 13, fontWeight: '700', color: '#3C2253' },
  macroLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  macroDivider: { width: 1, height: 16, backgroundColor: '#D1D5DB' },
});
