import { Client } from '@stomp/stompjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config/api';

class ChatSocketService {
  constructor() {
    this.client = null;
    this.subscribers = new Set();
    this.isConnected = false;
    this.messageQueue = [];
  }

  async connect() {
    if (this.client && this.isConnected) return;
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) return;

    try {
      const wsUrl = BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://') + '/api/chat/ws/chat/websocket';
      
      this.client = new Client({
        webSocketFactory: () => new WebSocket(wsUrl),
        connectHeaders: { Authorization: `Bearer ${token}` },
        forceBinaryWSFrames: true,
        appendMissingNULLonIncoming: true,
        debug: function (str) {
          // console.log(str);
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: (frame) => {
          console.log('Global Chat Socket Connected:', frame);
          this.isConnected = true;

          while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift();
            this.client.publish(msg);
          }
          
          this.client.subscribe(`/user/queue/messages`, (message) => {
            if (message.body) {
              try {
                const parsed = JSON.parse(message.body);
                this.subscribers.forEach(cb => cb(parsed));
              } catch (e) { console.error('Parse message error', e); }
            }
          });
        },
        onStompError: (frame) => {
          console.log('Socket STOMP Error: ', frame.headers['message']);
          this.isConnected = false;
        },
        onWebSocketClose: () => {
          console.log('Socket Closed');
          this.isConnected = false;
        },
        onWebSocketError: (error) => {
          console.log('Socket WS Error: ', error);
          this.isConnected = false;
        }
      });
      
      this.client.activate();
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

  sendMessage(conversationId, content, type = 'TEXT', mediaUrl = null) {
    const body = { conversationId, type, content };
    if (mediaUrl) body.mediaUrl = mediaUrl;

    const payload = {
      destination: '/app/chat.send',
      body: JSON.stringify(body)
    };

    if (this.client && this.isConnected) {
      this.client.publish(payload);
    } else {
      console.log('Socket not connected, queuing message...');
      this.messageQueue.push(payload);
      if (!this.client || !this.client.active) {
        this.connect();
      }
    }
  }
}

export const chatSocket = new ChatSocketService();
