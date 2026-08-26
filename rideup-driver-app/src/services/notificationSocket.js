import { Client } from '@stomp/stompjs';
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
      const wsUrl = BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://') + '/api/notification/ws/notifications/websocket';
      
      this.client = new Client({
        webSocketFactory: () => new WebSocket(wsUrl),
        connectHeaders: { Authorization: `Bearer ${token}` },
        forceBinaryWSFrames: true,
        appendMissingNULLonIncoming: true,
        debug: function (str) {},
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: (frame) => {
          console.log('Global Notification Socket Connected:', frame);
          this.isConnected = true;
          
          this.client.subscribe(`/user/queue/notifications`, (message) => {
            if (message.body) {
              try {
                const parsed = JSON.parse(message.body);
                this.subscribers.forEach(cb => cb(parsed));
              } catch (e) { console.error('Parse notification error', e); }
            }
          });
        },
        onStompError: (frame) => {
          this.isConnected = false;
        },
        onWebSocketClose: () => {
          this.isConnected = false;
        }
      });
      
      this.client.activate();
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
