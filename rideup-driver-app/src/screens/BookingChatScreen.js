import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Linking, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { chatSocket } from '../services/chatSocket';

const COLORS = { background: '#121212', surface: '#1E1E1E', primary: '#0ea5e9', text: '#FFFFFF', textMuted: '#94a3b8', error: '#ef4444', border: '#334155' };
const SIZES = { base: 8, small: 12, font: 14, medium: 16, large: 20, extraLarge: 24, title: 32 };

const BookingChatScreen = ({ route, navigation }) => {
  const { bookingId, passengerName, passengerPhone, passengerAvatar } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadConversationAndConnect();
  }, []);

  const loadConversationAndConnect = async () => {
    try {
      // 1. Lấy hoặc tạo Conversation
      const convo = await apiService.createConversationByBookingId(bookingId);
      setConversation(convo);

      // 2. Lấy lịch sử tin nhắn
      if (convo && convo.id) {
        const historyRes = await apiService.listConversationMessages(convo.id, 0, 50);
        // API trả về mảng tin nhắn mới nhất, cần đảo ngược (hoặc FlatList tự xử lý nếu dùng inverted)
        setMessages(historyRes.reverse() || []);
      }

      // 3. Kết nối WebSocket toàn cục nếu chưa connect, sau đó subscribe
      if (!chatSocket.isConnected) {
        await chatSocket.connect();
      }
    } catch (err) {
      console.log('Load Conversation Error: ', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!conversation) return;

    // Đăng ký nhận tin nhắn mới
    const unsubscribe = chatSocket.subscribe((newMsg) => {
      if (newMsg.conversationId === conversation.id) {
        setMessages(prev => [...prev, newMsg]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [conversation]);

  const sendMessage = async () => {
    if (inputMessage.trim() && conversation) {
      chatSocket.sendMessage(conversation.id, inputMessage.trim());
      setInputMessage('');
    }
  };

  const renderMessage = ({ item }) => {
    // API trả về senderId, ta tạm định danh "Driver" là chính mình (nếu đúng ID sẽ tốt hơn)
    // Tạm giả định senderId là id của otherUser (khách hàng), nếu khác thì là mình
    const isMyMessage = conversation?.otherUser?.id ? item.senderId !== conversation.otherUser.id : item.senderId !== 'Customer';

    return (
      <View style={[styles.messageWrapper, isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
        {!isMyMessage && (
          <View style={styles.avatarMini}>
            <Text style={styles.avatarMiniText}>{(passengerName || 'K').charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.otherMessage]}>
          <Text style={[styles.messageText, isMyMessage && { color: COLORS.background }]}>{item.content}</Text>
          <Text style={[styles.timeText, isMyMessage && { color: 'rgba(0,0,0,0.5)' }]}>
            {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnWrapper}>
            <Ionicons name="chevron-back" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{(passengerName || 'K').charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>{passengerName || 'Khách hàng'}</Text>
              <Text style={styles.headerSubTitle}>Đang trực tuyến</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.callBtn}
            onPress={() => Linking.openURL(`tel:${passengerPhone || '0987654321'}`)}
          >
            <Ionicons name="call" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <FlatList 
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachBtn}>
            <Ionicons name="add-circle" size={28} color={COLORS.textMuted} />
          </TouchableOpacity>
          <View style={styles.inputWrapper}>
            <TextInput 
              style={styles.input}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor={COLORS.textMuted}
              value={inputMessage}
              onChangeText={setInputMessage}
              multiline
            />
          </View>
          <TouchableOpacity 
            style={[styles.sendBtn, !inputMessage.trim() && { opacity: 0.5 }]} 
            onPress={sendMessage}
            disabled={!inputMessage.trim()}
          >
            <Ionicons name="send" size={20} color={COLORS.background} style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtnWrapper: { padding: 4, marginRight: 8 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(14, 165, 233, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: COLORS.primary, fontSize: 18, fontWeight: 'bold' },
  headerTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  headerSubTitle: { color: COLORS.success || '#10b981', fontSize: 12, marginTop: 2 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(14, 165, 233, 0.1)', justifyContent: 'center', alignItems: 'center' },
  
  messageWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 },
  myMessageWrapper: { justifyContent: 'flex-end' },
  otherMessageWrapper: { justifyContent: 'flex-start' },
  avatarMini: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarMiniText: { color: COLORS.text, fontSize: 12, fontWeight: 'bold' },
  
  messageBubble: { maxWidth: '75%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  myMessage: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  otherMessage: { backgroundColor: COLORS.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  messageText: { color: COLORS.text, fontSize: 15, lineHeight: 22 },
  timeText: { fontSize: 10, color: COLORS.textMuted, alignSelf: 'flex-end', marginTop: 4 },
  
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  attachBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
  inputWrapper: { flex: 1, backgroundColor: COLORS.background, borderRadius: 24, minHeight: 44, maxHeight: 100, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 8, borderWidth: 1, borderColor: COLORS.border },
  input: { color: COLORS.text, fontSize: 15, paddingTop: 0, paddingBottom: 0 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
});

export default BookingChatScreen;
