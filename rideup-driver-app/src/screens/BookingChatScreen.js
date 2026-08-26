import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Linking, Image, ActivityIndicator, ActionSheetIOS, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { chatSocket } from '../services/chatSocket';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';

const COLORS = { background: '#F8FAFC', surface: '#FFFFFF', primary: '#0ea5e9', text: '#0F172A', textMuted: '#64748B', error: '#ef4444', border: '#E2E8F0' };
const SIZES = { base: 8, small: 12, font: 14, medium: 16, large: 20, extraLarge: 24, title: 32 };

const getMediaUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('file://')) return path;
  return `https://tgbtragwxkulpittcjzw.supabase.co/storage/v1/object/public/Ride_Up_Micro/${path}`;
};

const BookingChatScreen = ({ route, navigation }) => {
  const { bookingId, passengerName, passengerPhone, passengerAvatar } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
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
        // Backend trả về cũ trước mới sau (ascending) — giữ nguyên là đúng
        setMessages(messages);
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
        setMessages(prev => {
          const existingTempIdx = prev.findIndex(m => m.id?.toString().startsWith('temp-') && m.content === newMsg.content);
          if (existingTempIdx !== -1) {
            const newArr = [...prev];
            newArr[existingTempIdx] = newMsg;
            return newArr;
          }
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg]; // Thêm vào cuối — hiển ở dưới cùng
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [conversation]);

  const sendMessage = async () => {
    if (inputMessage.trim() && conversation) {
      chatSocket.sendMessage(conversation.id, inputMessage.trim(), 'TEXT');
      
      const tempMsg = {
        id: `temp-${Date.now()}`,
        conversationId: conversation.id,
        senderId: 'ME', 
        content: inputMessage.trim(),
        type: 'TEXT',
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempMsg]);
      setInputMessage('');
    }
  };

  const handlePickMedia = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Hủy', 'Chọn ảnh từ thư viện', 'Chụp ảnh', 'Chọn video'], cancelButtonIndex: 0 },
        (idx) => {
          if (idx === 1) pickMedia('library', 'images');
          else if (idx === 2) pickMedia('camera', 'images');
          else if (idx === 3) pickMedia('library', 'videos');
        }
      );
    } else {
      Alert.alert('Gửi file', 'Chọn loại', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Chọn ảnh', onPress: () => pickMedia('library', 'images') },
        { text: 'Chụp ảnh', onPress: () => pickMedia('camera', 'images') },
        { text: 'Video', onPress: () => pickMedia('library', 'videos') },
      ]);
    }
  };

  const pickMedia = async (source, mediaTypes) => {
    const permResult = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) { Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền trong Cài đặt'); return; }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes, quality: 0.8, videoMaxDuration: 60 });

    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const isVideo = asset.type === 'video';
    const mimeType = isVideo ? 'video/mp4' : (asset.mimeType || 'image/jpeg');
    const fileName = asset.fileName || `chat_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;

    try {
      setUploading(true);
      const uploadRes = await apiService.uploadChatFile(asset.uri, fileName, mimeType);
      const mediaUrl = uploadRes?.data?.result;
      if (!mediaUrl) throw new Error('Upload thất bại');
      const msgType = isVideo ? 'VIDEO' : 'IMAGE';
      chatSocket.sendMessage(conversation.id, '', msgType, mediaUrl);
      setMessages(prev => [...prev, {
        id: `temp-${Date.now()}`, conversationId: conversation.id,
        senderId: 'ME', content: '', type: msgType,
        mediaUrl: asset.uri, createdAt: new Date().toISOString()
      }]);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể gửi file.');
    } finally {
      setUploading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = conversation?.otherUser?.id ? item.senderId !== conversation.otherUser.id : item.senderId !== 'Customer';
    const isImage = item.type === 'IMAGE';
    const isVideo = item.type === 'VIDEO';

    return (
      <View style={[styles.messageWrapper, isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
        {!isMyMessage && (
          <View style={styles.avatarMini}>
            {conversation?.otherUser?.avatarUrl || passengerAvatar ? (
              <Image source={{ uri: conversation?.otherUser?.avatarUrl || passengerAvatar }} style={styles.avatarMiniImage} />
            ) : (
              <Text style={styles.avatarMiniText}>{(conversation?.otherUser?.fullName || passengerName || 'K').charAt(0).toUpperCase()}</Text>
            )}
          </View>
        )}
        <View style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.otherMessage,
          (isImage || isVideo) && { padding: 4, backgroundColor: 'transparent', borderWidth: 0 }]}>
          {isImage && item.mediaUrl ? (
            <Image source={{ uri: getMediaUrl(item.mediaUrl) }} style={styles.mediaImage} resizeMode="cover" />
          ) : isVideo && item.mediaUrl ? (
            <Video source={{ uri: getMediaUrl(item.mediaUrl) }} style={styles.mediaVideo} useNativeControls resizeMode={ResizeMode.CONTAIN} isLooping={false} />
          ) : (
            <Text style={[styles.messageText, isMyMessage && { color: COLORS.background }]}>{item.content}</Text>
          )}
          <Text style={[styles.timeText, isMyMessage && { color: 'rgba(255,255,255,0.6)' },
            (isImage || isVideo) && { color: COLORS.textMuted }]}>
            {new Date(item.createdAt || item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const displayPassengerName = conversation?.otherUser?.fullName || (passengerName && passengerName !== 'Khách hàng' ? passengerName : null) || 'Khách hàng';
  const displayPassengerAvatar = conversation?.otherUser?.avatarUrl || passengerAvatar;
  const displayPassengerPhone = conversation?.otherUser?.phoneNumber || passengerPhone || '0987654321';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnWrapper}>
            <Ionicons name="chevron-back" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={styles.avatarContainer}>
              {displayPassengerAvatar ? (
                <Image source={{ uri: displayPassengerAvatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{displayPassengerName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.onlineBadge} />
            </View>
            <View>
              <Text style={styles.headerTitle}>{displayPassengerName}</Text>
              <Text style={styles.headerSubTitle}>Đang hoạt động</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => Linking.openURL(`tel:${displayPassengerPhone}`)}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderMessage}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', padding: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={true}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachBtn} onPress={handlePickMedia} disabled={uploading}>
            {uploading
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <Ionicons name="add-circle" size={28} color={COLORS.primary} />}
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
  avatarMiniImage: { width: '100%', height: '100%', borderRadius: 14 },
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
  mediaImage: { width: 220, height: 180, borderRadius: 14 },
  mediaVideo: { width: 220, height: 160, borderRadius: 14 },
});

export default BookingChatScreen;
