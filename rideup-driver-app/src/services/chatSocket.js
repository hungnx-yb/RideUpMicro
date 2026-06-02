import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config/api';

class ChatSocketService {
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
      const socket = new SockJS(`${BASE_URL}/api/chat/ws/chat`);
      this.client = Stomp.over(socket);
      
      this.client.connect({ Authorization: `Bearer ${token}` }, (frame) => {
        console.log('Global Chat Socket Connected:', frame);
        this.isConnected = true;
        
        this.client.subscribe(`/user/queue/messages`, (message) => {
          if (message.body) {
            try {
              const parsed = JSON.parse(message.body);
              this.subscribers.forEach(cb => cb(parsed));
            } catch (e) { console.error('Parse message error', e); }
          }
        });
      }, (error) => {
         console.log('Socket Connection Error: ', error);
         this.isConnected = false;
      });
    } catch (err) {
      console.log('Socket Init Error:', err);
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

  sendMessage(conversationId, content) {
    if (this.client && this.isConnected) {
      this.client.send('/app/chat.send', {}, JSON.stringify({
        conversationId,
        type: 'TEXT',
        content
      }));
    } else {
      console.log('Socket not connected, cannot send message');
    }
  }
}

export const chatSocket = new ChatSocketService();
