import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { WEBSOCKET_URL } from '../config/api';

const COLORS = { background: '#121212', surface: '#1E1E1E', primary: '#FFD700', text: '#FFFFFF', textMuted: '#A0A0A0', error: '#FF4C4C', border: '#333333' };
const SIZES = { base: 8, small: 12, font: 14, medium: 16, large: 20, extraLarge: 24, title: 32 };

const BookingChatScreen = ({ route, navigation }) => {
  const { bookingId } = route.params || { bookingId: 'default' };
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [stompClient, setStompClient] = useState(null);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (stompClient) stompClient.disconnect();
    };
  }, []);

  const connectWebSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      // Kết nối tới API Gateway
      const socket = new SockJS(WEBSOCKET_URL);
      const client = Stomp.over(socket);

      client.connect({ Authorization: `Bearer ${token}` }, (frame) => {
        console.log('Connected: ' + frame);
        
        // Theo dõi topic (Ví dụ: public chat cho booking này)
        client.subscribe(`/topic/booking/${bookingId}`, (message) => {
          if (message.body) {
            const newMsg = JSON.parse(message.body);
            setMessages(prev => [...prev, newMsg]);
          }
        });
      });
      setStompClient(client);
    } catch (err) {
      console.log('Socket Error: ', err);
    }
  };

  const sendMessage = async () => {
    if (inputMessage.trim() && stompClient) {
      const token = await AsyncStorage.getItem('accessToken');
      
      const chatMessage = {
        bookingId: bookingId,
        content: inputMessage,
        senderId: 'Customer', // Thực tế sẽ lấy từ JWT token
        timestamp: new Date().toISOString()
      };

      stompClient.send(`/app/chat.sendMessage/${bookingId}`, { Authorization: `Bearer ${token}` }, JSON.stringify(chatMessage));
      setInputMessage('');
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.senderId === 'Customer';
    return (
      <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}>
        <Text style={styles.messageText}>{item.content}</Text>
        <Text style={styles.timeText}>{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnWrapper}>
            <Text style={styles.backBtn}>{'< Trở về'}</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Tài xế Nguyễn Văn B</Text>
            <Text style={styles.headerSubTitle}>Biển số: 29A-123.45</Text>
          </View>
          <TouchableOpacity 
            style={styles.callBtn}
            onPress={() => Linking.openURL('tel:0987654321')}
          >
            <Text style={styles.callText}>📞 Gọi</Text>
          </TouchableOpacity>
        </View>

        <FlatList 
          data={messages}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16 }}
        />

        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={COLORS.textMuted}
            value={inputMessage}
            onChangeText={setInputMessage}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <Text style={styles.sendText}>Gửi</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtnWrapper: { padding: 8 },
  backBtn: { color: COLORS.primary, fontSize: SIZES.medium, fontWeight: 'bold' },
  headerTitleBox: { alignItems: 'center' },
  headerTitle: { color: COLORS.text, fontSize: SIZES.medium, fontWeight: 'bold' },
  headerSubTitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  callBtn: { backgroundColor: 'rgba(76, 175, 80, 0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  callText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 14 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 10 },
  myMessage: { backgroundColor: COLORS.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  otherMessage: { backgroundColor: COLORS.surface, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  messageText: { color: '#000', fontSize: SIZES.font },
  timeText: { fontSize: 10, color: '#555', alignSelf: 'flex-end', marginTop: 4 },
  inputContainer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  input: { flex: 1, backgroundColor: COLORS.background, color: COLORS.text, paddingHorizontal: 16, borderRadius: 20, marginRight: 10 },
  sendBtn: { backgroundColor: COLORS.primary, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 20 },
  sendText: { color: COLORS.background, fontWeight: 'bold' }
});

export default BookingChatScreen;
