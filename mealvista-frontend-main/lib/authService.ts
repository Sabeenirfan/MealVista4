import api from './api';
import { storeToken, clearToken } from './authStorage';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  isAdmin?: boolean;
  createdAt?: string;
  dietaryPreferences?: string[];
  allergens?: string[];
  height?: number;
  weight?: number;
  bmi?: number;
  bmiCategory?: string;
  healthGoal?: 'weight_loss' | 'weight_gain' | 'maintenance';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  isAdmin?: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: AuthUser;
}

export interface ProfileResponse {
  user: AuthUser;
}

export interface UsersResponse {
  users: User[];
  count?: number;
}

export interface InventoryItem {
  _id?: string;
  id?: string;
  name: string;
  category: string;
  subcategory?: string;
  stock: number;
  unit: string;
  status: string;
  image?: string;
  minStock?: number;
  maxStock?: number;
  price?: number;
  supplier?: string;
  lastRestocked?: string;
}

export interface InventoryResponse {
  items?: InventoryItem[];
  categories?: string[];
  count?: number;
  success?: boolean;
}

// Signup
export const signup = async (data: { name: string; email: string; password: string }): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>('/api/auth/signup', data);
    if (response.data.token) {
      await storeToken(response.data.token);
    }
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

// Login
export const login = async (data: { email: string; password: string }): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>('/api/auth/login', data);
    if (response.data.token) {
      await storeToken(response.data.token);
    }
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

// Login with Google
export const loginWithGoogle = async (data: { idToken?: string; accessToken?: string }): Promise<AuthResponse> => {
  try {
    const tokenType = data.idToken ? 'idToken' : 'accessToken';
    console.log('[authService] Calling /api/auth/google with', tokenType);
    const response = await api.post<AuthResponse>('/api/auth/google', data);
    console.log('[authService] Google auth successful, received token');
    if (response.data.token) {
      await storeToken(response.data.token);
    }
    return response.data;
  } catch (error: any) {
    console.error('[authService] Google auth error:', {
      status: error?.response?.status,
      message: error?.response?.data?.message,
      endpoint: error?.config?.url,
      errorMsg: error?.message
    });
    throw error;
  }
};

// Get user profile
export const getProfile = async (): Promise<ProfileResponse> => {
  try {
    const response = await api.get<ProfileResponse>('/api/auth/me');
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

// Update user profile
export const updateProfile = async (data: { 
  name?: string; 
  email?: string;
  dietaryPreferences?: string[];
  allergens?: string[];
  height?: number;
  weight?: number;
  bmi?: number;
  bmiCategory?: string;
  healthGoal?: 'weight_loss' | 'weight_gain' | 'maintenance';
}): Promise<ProfileResponse> => {
  try {
    const response = await api.put<ProfileResponse>('/api/auth/me', data);
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

// Logout
export const logout = async (): Promise<void> => {
  try {
    await clearToken();
  } catch (error: any) {
    console.error('Logout error:', error);
    // Clear token even if there's an error
    await clearToken();
  }
};

// Get all users (admin only)
export const getAllUsers = async (): Promise<UsersResponse> => {
  try {
    const response = await api.get<UsersResponse>('/api/admin/users');
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

// Delete user (admin only)
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    await api.delete(`/api/admin/users/${userId}`);
  } catch (error: any) {
    throw error;
  }
};

// Get inventory (admin only)
export const getInventory = async (category?: string, search?: string): Promise<InventoryResponse> => {
  try {
    const params: any = {};
    if (category && category !== 'all') params.category = category;
    if (search) params.search = search;
    
    const response = await api.get<InventoryResponse>('/api/admin/inventory', { params });
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

// Get single inventory item (admin only)
export const getInventoryItem = async (itemId: string): Promise<{ success: boolean; item: InventoryItem }> => {
  try {
    const response = await api.get(`/api/admin/inventory/${itemId}`);
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

// Add inventory item (admin only)
export const addInventoryItem = async (itemData: Partial<InventoryItem>): Promise<{ success: boolean; item: InventoryItem }> => {
  try {
    console.log('[addInventoryItem] Sending data:', itemData);
    const response = await api.post('/api/admin/inventory', itemData);
    console.log('[addInventoryItem] Response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[addInventoryItem] Error:', error.response?.data || error.message);
    throw error;
  }
};

// Alias for backward compatibility
export const createInventoryItem = addInventoryItem;

// Update inventory item (admin only)
export const updateInventoryItem = async (itemId: string, itemData: Partial<InventoryItem>): Promise<{ success: boolean; item: InventoryItem }> => {
  try {
    console.log('[updateInventoryItem] Updating item:', itemId, 'with data:', itemData);
    const response = await api.patch(`/api/admin/inventory/${itemId}`, itemData);
    console.log('[updateInventoryItem] Response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[updateInventoryItem] Error:', error.response?.data || error.message);
    throw error;
  }
};

// Delete inventory item (admin only)
export const deleteInventoryItem = async (itemId: string): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('[deleteInventoryItem] Deleting item:', itemId);
    const response = await api.delete(`/api/admin/inventory/${itemId}`);
    console.log('[deleteInventoryItem] Response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[deleteInventoryItem] Error:', error.response?.data || error.message);
    throw error;
  }
};
