import React from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFavorites } from '../contexts/FavoritesContext';

export default function FavoritesScreen() {
  const router = useRouter();
  const { favorites, removeFavorite } = useFavorites();

  const handleOpenRecipe = (item: any) => {
    router.push({
      pathname: '/recipeDetails',
      params: {
        mealTitle: item.title,
        mealImage: item.image,
        mealTime: (item.time ?? '').toString(),
        mealCalories: (item.calories ?? '').toString(),
        mealDifficulty: item.difficulty ?? '',
        mealRating: (item.rating ?? '').toString(),
      },
    });
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleOpenRecipe(item)}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <View style={styles.row}>
          <View style={styles.meta}>
            <Feather name="clock" size={12} color="#6B7280" />
            <Text style={styles.metaText}>{item.time ?? '-'} min</Text>
          </View>
          <TouchableOpacity onPress={() => removeFavorite(item.id)} style={styles.unbookmarkButton}>
            <Feather name="trash-2" size={16} color="#DC2626" />
            <Text style={styles.unbookmarkText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2253" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorites</Text>
      </View>

      {favorites.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="heart" size={64} color="#E5E7EB" />
          <Text style={styles.emptyText}>You have no favorite recipes yet</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#3C2253',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: { padding: 8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#6B7280', marginTop: 12 },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  image: { width: 100, height: 100, backgroundColor: '#E5E7EB' },
  content: { flex: 1, padding: 12, justifyContent: 'space-between' },
  title: { fontSize: 14, fontWeight: '600', color: '#111827' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#6B7280' },
  unbookmarkButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unbookmarkText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },
});
