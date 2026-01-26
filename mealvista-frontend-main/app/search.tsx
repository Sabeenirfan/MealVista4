import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../lib/api';
import { getProfile } from '../lib/authService';

interface Recipe {
  id: string;
  name: string;
  image: string;
  calories: number;
  prepTime: number;
  cookTime: number;
  difficulty: string;
  rating: string;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  micros: {
    calcium: number;
    iron: number;
    vitaminA: number;
    vitaminC: number;
  };
  ingredients: string[];
  instructions: any[];
  allergens: string[];
  dietTypes: string[];
  isAIGenerated?: boolean;
  personalizedFor?: any;
}

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      Alert.alert('Invalid Search', 'Please enter at least 2 characters');
      return;
    }

    try {
      setLoading(true);
      
      // Load user profile for personalization
      try {
        const profileResponse = await getProfile();
        setUserProfile(profileResponse.user);
      } catch (error) {
        console.log('Could not load user profile, using default');
      }
      
      console.log('[AI Search] Searching with query:', searchQuery);
      
      // Call AI-powered search endpoint
      const response = await api.get(`/api/recipes/search/${encodeURIComponent(searchQuery.trim())}`);

      if (response.data.success) {
        setRecipes(response.data.recipes || []);
        console.log(`[AI Search] Found ${response.data.recipes?.length || 0} personalized recipes`);
        
        if (response.data.personalized && response.data.recipes?.length > 0) {
          Alert.alert(
            'AI Personalized Recipes',
            `Found ${response.data.recipes.length} recipes personalized for your profile!`,
            [{ text: 'OK' }]
          );
        }
      } else {
        setRecipes([]);
      }
    } catch (error: any) {
      console.error('Search error:', error);
      Alert.alert(
        'Search Error',
        error.response?.data?.message || 'Failed to search recipes. Please try again.'
      );
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRecipePress = (recipe: Recipe) => {
    router.push({
      pathname: '/recipeDetails',
      params: {
        mealTitle: recipe.name,
        mealImage: recipe.image,
        mealTime: (recipe.prepTime + recipe.cookTime).toString(),
        mealCalories: recipe.calories.toString(),
        mealDifficulty: recipe.difficulty,
        mealRating: recipe.rating.toString(),
        recipeId: recipe.id,
        ingredients: JSON.stringify(recipe.ingredients || []),
        instructions: JSON.stringify(recipe.instructions || []),
        macros: JSON.stringify(recipe.macros || {}),
        micros: JSON.stringify(recipe.micros || {}),
        allergens: JSON.stringify(recipe.allergens || []),
      },
    });
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
        <Text style={styles.headerTitle}>AI Recipe Search</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Feather name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by recipe name or ingredient..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Feather name="x" size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={loading || searchQuery.length < 2}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="search" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* AI Info Banner */}
      {userProfile && (userProfile.bmi || userProfile.healthGoal || userProfile.dietaryPreferences?.length > 0) && (
        <View style={styles.aiInfoBanner}>
          <Feather name="sparkles" size={16} color="#3C2253" />
          <Text style={styles.aiInfoText}>
            Recipes personalized for your profile (BMI: {userProfile.bmiCategory}, Goal: {userProfile.healthGoal === 'weight_loss' ? 'Weight Loss' : userProfile.healthGoal === 'weight_gain' ? 'Weight Gain' : 'Maintenance'})
          </Text>
        </View>
      )}

      {/* Results */}
      <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3C2253" />
            <Text style={styles.loadingText}>Generating personalized recipes...</Text>
          </View>
        ) : recipes.length === 0 && searchQuery.length > 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="search" size={48} color="#999" />
            <Text style={styles.emptyText}>No recipes found</Text>
            <Text style={styles.emptySubtext}>
              Try searching with different keywords
            </Text>
          </View>
        ) : recipes.length > 0 ? (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsHeaderText}>
                {recipes.length} Personalized Recipe{recipes.length !== 1 ? 's' : ''}
              </Text>
              {recipes[0]?.isAIGenerated && (
                <View style={styles.aiBadge}>
                  <Feather name="sparkles" size={12} color="#3C2253" />
                  <Text style={styles.aiBadgeText}>AI Generated</Text>
                </View>
              )}
            </View>
            {recipes.map((recipe) => (
              <TouchableOpacity
                key={recipe.id}
                style={styles.recipeCard}
                onPress={() => handleRecipePress(recipe)}
                activeOpacity={0.8}
              >
                <Image 
                  source={{ uri: recipe.image }} 
                  style={styles.recipeImage}
                  resizeMode="cover"
                />
                <View style={styles.recipeInfo}>
                  <View style={styles.recipeHeader}>
                    <Text style={styles.recipeTitle} numberOfLines={2}>
                      {recipe.name}
                    </Text>
                    {recipe.isAIGenerated && (
                      <View style={styles.aiTag}>
                        <Feather name="sparkles" size={10} color="#3C2253" />
                      </View>
                    )}
                  </View>
                  <View style={styles.recipeMeta}>
                    <View style={styles.metaItem}>
                      <Feather name="clock" size={14} color="#666" />
                      <Text style={styles.metaText}>
                        {(recipe.prepTime + recipe.cookTime)} min
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Feather name="zap" size={14} color="#666" />
                      <Text style={styles.metaText}>{recipe.calories} kcal</Text>
                    </View>
                    <View
                      style={[
                        styles.difficultyBadge,
                        recipe.difficulty === 'Easy' && styles.easyBadge,
                        recipe.difficulty === 'Medium' && styles.mediumBadge,
                        recipe.difficulty === 'Hard' && styles.hardBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.difficultyText,
                          recipe.difficulty === 'Easy' && styles.easyText,
                          recipe.difficulty === 'Medium' && styles.mediumText,
                          recipe.difficulty === 'Hard' && styles.hardText,
                        ]}
                      >
                        {recipe.difficulty}
                      </Text>
                    </View>
                  </View>
                  {recipe.dietTypes && recipe.dietTypes.length > 0 && (
                    <View style={styles.dietTypes}>
                      {recipe.dietTypes.slice(0, 3).map((diet, idx) => (
                        <View key={idx} style={styles.dietTag}>
                          <Text style={styles.dietTagText}>{diet}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <View style={styles.placeholderContainer}>
            <Feather name="search" size={64} color="#D1D5DB" />
            <Text style={styles.placeholderText}>Search for AI-Powered Recipes</Text>
            <Text style={styles.placeholderSubtext}>
              Enter a recipe name or ingredient to get personalized recipe recommendations
            </Text>
          </View>
        )}
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
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: '#3C2253',
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F0EFFF',
    gap: 8,
  },
  aiInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#3C2253',
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  resultsHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  aiBadgeText: {
    fontSize: 11,
    color: '#3C2253',
    fontWeight: '600',
  },
  recipeCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recipeImage: {
    width: 120,
    height: 120,
  },
  recipeInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  recipeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  recipeTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  aiTag: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F0EFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
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
  dietTypes: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  dietTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dietTagText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  placeholderContainer: {
    padding: 60,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
});

