import React, { createContext, useContext, useState, ReactNode } from 'react';
import api from '../lib/api';
import { getStoredToken } from '../lib/authStorage';

export interface RecipeItem {
  id: string;
  title: string;
  image?: string;
  time?: number;
  calories?: number;
  difficulty?: string;
  rating?: number;
}

interface FavoritesContextType {
  favorites: RecipeItem[];
  addFavorite: (item: RecipeItem) => void;
  removeFavorite: (id: string) => void;
  toggleFavorite: (item: RecipeItem) => void;
  isFavorited: (id: string) => boolean;
  trackView: (recipeId: string, recipeName: string) => void;
  trackSearch: (query: string) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

/** Fire-and-forget behavior tracker — never throws */
async function track(event: string, payload: Record<string, any>) {
  try {
    const token = await getStoredToken();
    if (!token) return;
    await api.post(
      '/api/behavior/track',
      { event, ...payload },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch {
    // Silently ignore — behavior tracking must never break UX
  }
}

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<RecipeItem[]>([]);

  const addFavorite = (item: RecipeItem) => {
    setFavorites((prev) => {
      if (prev.find((f) => f.id === item.id)) return prev;
      return [item, ...prev];
    });
    track('favorite', { recipeId: item.id, recipeName: item.title });
  };

  const removeFavorite = (id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    track('unfavorite', { recipeId: id });
  };

  const toggleFavorite = (item: RecipeItem) => {
    setFavorites((prev) => {
      const exists = prev.find((f) => f.id === item.id);
      if (exists) {
        track('unfavorite', { recipeId: item.id });
        return prev.filter((f) => f.id !== item.id);
      }
      track('favorite', { recipeId: item.id, recipeName: item.title });
      return [item, ...prev];
    });
  };

  const isFavorited = (id: string) => favorites.some((f) => f.id === id);

  /** Call when a recipe detail screen is opened */
  const trackView = (recipeId: string, recipeName: string) => {
    track('view', { recipeId, recipeName });
  };

  /** Call when a search query is submitted */
  const trackSearch = (query: string) => {
    track('search', { query });
  };

  return (
    <FavoritesContext.Provider
      value={{ favorites, addFavorite, removeFavorite, toggleFavorite, isFavorited, trackView, trackSearch }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used within FavoritesProvider');
  return context;
};

export default FavoritesContext;
