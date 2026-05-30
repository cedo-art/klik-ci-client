import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
    }
    return Promise.reject(error);
  },
);

export const authService = {
  sendOtp:   (phone: string) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, code: string) => api.post('/auth/verify-otp', { phone, code }),
  getMe:     () => api.get('/auth/me'),
};

export const catalogService = {
  getProducts:   () => api.get('/catalog/products'),
  getDepots:     (lat?: number, lng?: number) => api.get('/catalog/depots', { params: { lat, lng } }),
  getDepotStock: (depotId: string) => api.get(`/catalog/depots/${depotId}/stock`),
};

export const ordersService = {
  createOrder:  (data: any) => api.post('/orders', data),
  getMyOrders:  () => api.get('/orders'),
  getOrderById: (id: string) => api.get(`/orders/${id}`),
  cancelOrder:  (id: string) => api.delete(`/orders/${id}`),
};

export const deliveryService = {
  // Suivi livraison par orderId
  getOrderDelivery: (orderId: string) => api.get(`/delivery/order/${orderId}`),
};

export const usersService = {
  getProfile:    () => api.get('/users/profile'),
  getAddresses:  () => api.get('/users/addresses'),
  createAddress: (data: any) => api.post('/users/addresses', data),
  deleteAddress: (id: string) => api.delete(`/users/addresses/${id}`),
};

export const paymentsService = {
  getWallet:       () => api.get('/payments/wallet'),
  topUpWallet:     (amount: number) => api.post('/payments/wallet/topup', { amount }),
  initiatePayment: (data: any) => api.post('/payments/initiate', data),
  getTransactions: () => api.get('/payments/transactions'),
};

export default api;