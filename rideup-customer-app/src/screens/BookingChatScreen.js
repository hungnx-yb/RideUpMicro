import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Linking, Image, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { chatSocket } from '../services/chatSocket';

const COLORS = { background: '#F8FAFC', surface: '#FFFFFF', primary: '#0ea5e9', text: '#0F172A', textMuted: '#64748B', border: '#E2E8F0', success: '#10b981' };

const BookingChatScreen = ({ route, navigation }) => {
  const { bookingId, driverName, driverPhone, driverAvatar, vehicleInfo } = route.params || {};
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
      // 1. Lấy hoặc tạo Conversation — backend trả về ApiResponse<ConversationResponse>, lấy .data.result
      const convoRes = await apiService.createConversationByBookingId(bookingId);
      const convo = convoRes?.data?.result;
      setConversation(convo);

      // 2. Lấy lịch sử tin nhắn — backend trả về ApiResponse<List<MessageResponse>>, lấy .data.result
      if (convo && convo.id) {
        const historyRes = await apiService.listConversationMessages(convo.id, 0, 50);
        const messages = historyRes?.data?.result || [];
        setMessages([...messages].reverse());
      }

      // 3. Kết nối WebSocket toàn cục nếu chưa connect
      if (!chatSocket.isConnected) {
        await chatSocket.connect();
      }
    } catch (err) {
      console.log('Customer Chat Setup Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!conversation) return;

    // Đăng ký nhận tin nhắn mới
    const unsubscribe = chatSocket.subscribe((newMsg) => {
      if (newMsg.conversationId === conversation.id) {
        setMessages(prev => {
          // Tránh trùng lặp tin nhắn thật từ socket với tin nhắn tạm (optimistic)
          const existingTempIdx = prev.findIndex(m => m.id?.toString().startsWith('temp-') && m.content === newMsg.content);
          if (existingTempIdx !== -1) {
            const newArr = [...prev];
            newArr[existingTempIdx] = newMsg;
            return newArr;
          }
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [conversation]);

  const sendMessage = () => {
    if (inputMessage.trim() && conversation) {
      chatSocket.sendMessage(conversation.id, inputMessage.trim());
      
      // Optimistic UI: Hiển thị tin nhắn ngay lập tức
      const tempMsg = {
        id: `temp-${Date.now()}`,
        conversationId: conversation.id,
        senderId: 'ME', 
        content: inputMessage.trim(),
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempMsg]);
      
      setInputMessage('');
    }
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = conversation?.otherUser?.id ? item.senderId !== conversation.otherUser.id : item.senderId !== 'Driver';

    return (
      <View style={[styles.messageWrapper, isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
        {!isMyMessage && (
          <View style={styles.avatarMini}>
            <Text style={styles.avatarMiniText}>{(driverName || 'T').charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.otherMessage]}>
          <Text style={[styles.messageText, isMyMessage && { color: COLORS.background }]}>{item.content}</Text>
          <Text style={[styles.timeText, isMyMessage && { color: 'rgba(0,0,0,0.5)' }]}>
            {new Date(item.createdAt || item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.textMuted, marginTop: 12, fontSize: 14 }}>Đang kết nối cuộc trò chuyện...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnWrapper}>
            <Ionicons name="chevron-back" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={styles.avatarContainer}>
              {driverAvatar ? (
                <Image source={{ uri: driverAvatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{(driverName || 'T').charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.onlineBadge} />
            </View>
            <View>
              <Text style={styles.headerTitle}>{driverName || 'Tài xế'}</Text>
              <Text style={styles.headerSubTitle}>{vehicleInfo || 'Đang hoạt động'}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => Linking.openURL(`tel:${driverPhone || '0987654321'}`)}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4, zIndex: 10
  },
  backBtnWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { position: 'relative', marginRight: 12 },
  avatarPlaceholder: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(14, 165, 233, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(14, 165, 233, 0.3)' },
  avatarImage: { width: 42, height: 42, borderRadius: 21 },
  avatarText: { color: COLORS.primary, fontSize: 18, fontWeight: 'bold' },
  onlineBadge: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.success || '#10b981', position: 'absolute', bottom: 0, right: 0, borderWidth: 2, borderColor: COLORS.surface },
  headerTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  headerSubTitle: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500' },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.success || '#10b981', justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.success || '#10b981', shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },

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
