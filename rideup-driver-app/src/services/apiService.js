import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config/api';

// 1. Tạo instance của Axios dùng chung
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // Timeout 10s
});

// 2. Tự động đính kèm Token vào Header trước khi gửi API
apiClient.interceptors.request.use(
  async (config) => {
    // Không đính kèm token nếu đang gọi API đăng nhập hoặc đăng ký
    if (config.url && (config.url.includes('/auth/authentication') || config.url.includes('/auth/register'))) {
      return config;
    }

    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ==========================================
// ĐỊNH NGHĨA CÁC HÀM GỌI API Ở ĐÂY
// ==========================================

export const apiService = {
  // Identity Service
  login: async (email, password) => {
    return await apiClient.post('/api/identity/auth/authentication', { email, password });
  },
  register: async (payload) => {
    return await apiClient.post('/api/identity/auth/register', payload);
  },
  getMyUserInfo: async () => {
    return await apiClient.get('/api/identity/users/me');
  },
  updateMyUserInfo: async (payload) => {
    return await apiClient.put('/api/identity/users/me', payload);
  },
  updateAvatar: async (formData) => {
    return await apiClient.post('/api/identity/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getMyDriverProfile: async () => {
    return await apiClient.get('/api/identity/drivers/me');
  },
  getMyVehicle: async () => {
    return await apiClient.get('/api/identity/vehicles/me');
  },

  // Booking Service
  createBooking: async (payload) => {
    return await apiClient.post('/api/booking/bookings', payload);
  },
  getMyBookings: async () => {
    return await apiClient.get('/api/booking/bookings/my-bookings');
  },
  getBookingsByTripId: async (tripId) => {
    return await apiClient.get(`/api/booking/bookings/trip/${tripId}`);
  },
  rateTrip: async (bookingId, payload) => {
    return await apiClient.post(`/api/booking/bookings/${bookingId}/rate`, payload);
  },

  // Payment Service
  getPaymentUrl: async (bookingId) => {
    return await apiClient.get(`/api/payment/payments/booking/${bookingId}`);
  },

  // Trip Service
  getAllTrips: async (params) => {
    return await apiClient.get('/api/trip/trip', { params });
  },
  createTrip: async (payload) => {
    return await apiClient.post('/api/trip/trip', payload);
  },
  getDriverTrips: async (params) => {
    return await apiClient.get('/api/trip/trip/driver', { params });
  },

  // Location Service
  getAllProvinces: async () => {
    return await apiClient.get('/api/location/province');
  },
  getAllWards: async (provinceId) => {
    return await apiClient.get('/api/location/ward', { params: { provinceId } });
  },
  getWardById: async (wardId) => {
    return await apiClient.get(`/api/location/ward/${wardId}`);
  },

  // Notification Service
  getMyNotifications: async () => {
    return await apiClient.get('/api/notification/notifications/my');
  },
  markNotificationRead: async (id) => {
    return await apiClient.post(`/api/notification/notifications/${id}/read`);
  },
  markAllNotificationsRead: async () => {
    return await apiClient.post('/api/notification/notifications/read-all');
  },
  // Driver Chat Service
  createConversationByBookingId: async (bookingId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/chat/conversations/booking/${bookingId}`, {
        method: 'POST',
        headers: await getHeaders(),
      });
      return handleResponse(response);
    } catch (error) { throw error; }
  },
  listConversationMessages: async (conversationId, page = 0, size = 20) => {
    try {
      const response = await fetch(`${BASE_URL}/api/chat/conversations/${conversationId}/messages?page=${page}&size=${size}`, {
        method: 'GET',
        headers: await getHeaders(),
      });
      return handleResponse(response);
    } catch (error) { throw error; }
  }
};

export default apiClient;
