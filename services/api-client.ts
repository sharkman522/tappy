import axios from 'axios';
import Constants from 'expo-constants';

// Create an axios instance for LTA DataMall API
const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_LTA_API_URL || 'https://datamall2.mytransport.sg/ltaodataservice',
  headers: {
    'AccountKey': process.env.EXPO_PUBLIC_LTA_API_KEY || '',
    'Accept': 'application/json'
  }
});

// Add request interceptor for logging in dev mode
apiClient.interceptors.request.use(config => {
  if (__DEV__) {
    console.log('API Request:', config.url);
  }
  return config;
});

// Add response interceptor for logging errors
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (__DEV__) {
      console.error('API Error:', error.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;