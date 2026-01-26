import axios from 'axios';
import Constants from 'expo-constants';

import { getStoredToken } from './authStorage';

/**
 * API Configuration
 * 
 * To configure the backend URL, set one of the following:
 * 1. Environment variable: EXPO_PUBLIC_API_URL (in .env file)
 * 2. app.json: Set "extra.apiUrl" to your backend server IP
 *    Example: "apiUrl": "http://192.168.1.100:5000"
 * 
 * For mobile/emulator testing:
 * - Use your computer's local IP address (not localhost)
 * - Find it with: ipconfig (Windows) or ifconfig (Mac/Linux)
 * - Ensure backend server is running on that IP
 * - Both device and computer must be on same network
 */
const getBaseURL = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL
    || Constants.expoConfig?.extra?.apiUrl
    || Constants.manifest2?.extra?.apiUrl;

  if (envUrl) {
    console.log('[API] Using baseURL from env:', envUrl);
    return envUrl;
  }

  // Default fallback for local development
  console.log('[API] Using default baseURL: http://localhost:5000');
  return 'http://localhost:5000';
};

const baseURL = getBaseURL();
const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await getStoredToken();

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  console.log('[API] Request:', config.method?.toUpperCase(), baseURL + config.url);
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('[API] Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('[API] Error:', {
      status: error?.response?.status,
      url: error?.config?.url,
      message: error?.message,
      baseURL: baseURL,
    });
    
    // Provide more helpful error messages for network issues
    if (error.code === 'ECONNREFUSED' || error.message === 'Network Error') {
      console.error('[API] Network Error - Check:');
      console.error('  1. Backend server is running on port 5000');
      console.error('  2. API URL configured correctly:', baseURL);
      console.error('  3. Device/emulator can reach the server IP');
      console.error('  4. Firewall allows connections on port 5000');
      
      // Enhance error message
      error.message = `Network Error: Cannot connect to ${baseURL}. Please check your backend server and network configuration.`;
    }
    
    return Promise.reject(error);
  }
);

export default api;









