import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config/api';

class NotificationSocketService {
  constructor() {
    this.client = null;
    this.subscribers = new Set();
    this.isConnected = false;
  }

  async connect() {
    if (this.client && this.isConnected) return;
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) return;

    try {
      const socket = new SockJS(`${BASE_URL}/api/notification/ws/notifications`);
      this.client = Stomp.over(socket);
      this.client.debug = () => {};
      
      this.client.connect({ Authorization: `Bearer ${token}` }, (frame) => {
        console.log('Customer Notification Socket Connected');
        this.isConnected = true;
        
        this.client.subscribe(`/user/queue/notifications`, (message) => {
          if (message.body) {
            try {
              const parsed = JSON.parse(message.body);
              this.subscribers.forEach(cb => cb(parsed));
            } catch (e) { console.error('Parse notification message error', e); }
          }
        });
      }, (error) => {
         console.log('Notification Socket Connection Error: ', error);
         this.isConnected = false;
      });
    } catch (err) {
      console.log('Notification Socket Init Error:', err);
    }
  }

  disconnect() {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
      this.isConnected = false;
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
}

export const notificationSocket = new NotificationSocketService();
