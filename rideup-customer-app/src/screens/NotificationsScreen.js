import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NotificationContext } from '../context/NotificationContext';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { notificationSocket } from '../services/notificationSocket';

const COLORS = { 
  background: '#F8FAFC', surface: '#FFFFFF', primary: '#0ea5e9', 
  text: '#0F172A', textMuted: '#64748B', error: '#ef4444', 
  border: '#E2E8F0', success: '#10b981', info: '#3b82f6' 
};

const SIZES = { small: 12, font: 14, medium: 16, large: 20, title: 28 };

const NotificationItem = ({ item, onPress }) => {
  const isRead = item.isRead;

  // Pick icon based on some keywords or type if available
  let iconName = 'notifications';
  let iconColor = COLORS.primary;
  const titleLower = (item.title || '').toLowerCase();
  
  if (titleLower.includes('đặt') || titleLower.includes('booking')) {
    iconName = 'car-sport';
    iconColor = COLORS.info;
  } else if (titleLower.includes('thành công') || titleLower.includes('hoàn thành')) {
    iconName = 'checkmark-circle';
    iconColor = COLORS.success;
  } else if (titleLower.includes('hủy')) {
    iconName = 'close-circle';
    iconColor = COLORS.error;
  } else if (titleLower.includes('thanh toán')) {
    iconName = 'card';
    iconColor = COLORS.primary;
  }

  const formatTime = (iso) => {
    if (!iso) return 'Gần đây';
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.round(diffMs / 60000);
    const diffHrs = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHrs < 24) return `${diffHrs} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  return (
    <TouchableOpacity 
      style={[styles.notiCard, !isRead && styles.notiCardUnread]} 
      onPress={() => onPress(item)}
      activeOpacity={0.85}
    >
      <View style={[styles.iconBox, { backgroundColor: 'rgba(14, 165, 233, 0.1)' }]}>
        <Ionicons name={iconName} size={22} color={iconColor} />
      </View>
      <View style={styles.contentBox}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, !isRead && styles.titleUnread]} numberOfLines={1}>
            {item.title || 'Thông báo hệ thống'}
          </Text>
          <Text style={[styles.time, !isRead && styles.timeUnread]}>{formatTime(item.createdAt)}</Text>
        </View>
        <Text style={[styles.message, !isRead && styles.messageUnread]} numberOfLines={2}>
          {item.content || item.message || ''}
        </Text>
      </View>
      {!isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

const NotificationsScreen = () => {
  const { decrementUnreadCount, clearUnreadCount, fetchUnreadCount } = useContext(NotificationContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await apiService.getMyNotifications();
      const data = res?.data?.result ?? res?.data ?? [];
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('Fetch notifications error', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let unsubscribe = null;
      
      fetchNotifications();
      fetchUnreadCount(); // Đảm bảo số lượng luôn mới nhất khi mở lại tab này
      
      // Lắng nghe socket để update list realtime khi đang mở tab này
      if (notificationSocket.isConnected) {
        unsubscribe = notificationSocket.subscribe((newNoti) => {
          setNotifications(prev => [newNoti, ...prev]);
        });
      }

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }, [fetchNotifications, fetchUnreadCount])
  );

  const handlePress = async (item) => {
    if (item.isRead) return;
    
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
    decrementUnreadCount();

    try {
      await apiService.markNotificationRead(item.id);
    } catch (error) {
      console.log('Mark read error', error);
      // Revert if failed
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: false } : n));
    }
  };

  const handleMarkAllRead = async () => {
    if (notifications.every(n => n.isRead)) return;
    
    Alert.alert("Đánh dấu đã đọc", "Đánh dấu tất cả thông báo là đã đọc?", [
      { text: "Hủy", style: "cancel" },
      { 
        text: "Đồng ý", 
        onPress: async () => {
          const old = [...notifications];
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
          clearUnreadCount();
          
          try {
            await apiService.markAllNotificationsRead();
          } catch (error) {
            setNotifications(old);
            Alert.alert("Lỗi", "Không thể cập nhật. Vui lòng thử lại.");
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>RIDEUP</Text>
          <Text style={styles.headerTitle}>Thông báo</Text>
        </View>
        <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
          <Ionicons name="checkmark-done-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <NotificationItem item={item} onPress={handlePress} />}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="notifications-off-outline" size={60} color={COLORS.border} />
              <Text style={styles.emptyTitle}>Chưa có thông báo nào</Text>
              <Text style={styles.emptySubtitle}>Khi có cập nhật mới về chuyến đi, chúng tôi sẽ báo cho bạn tại đây.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, backgroundColor: COLORS.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4, zIndex: 10 },
  headerSub: { color: COLORS.primary, fontSize: SIZES.small, fontWeight: 'bold', letterSpacing: 1, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  markAllBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(14, 165, 233, 0.1)', alignItems: 'center', justifyContent: 'center' },

  // List
  listContainer: { padding: 16, paddingBottom: 40 },
  
  // Item
  notiCard: { flexDirection: 'row', padding: 16, paddingRight: 24, marginBottom: 16, borderRadius: 20, backgroundColor: COLORS.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  notiCardUnread: { backgroundColor: '#F0F9FF', borderColor: 'rgba(14, 165, 233, 0.2)', borderWidth: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  unreadDot: { position: 'absolute', top: 22, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  contentBox: { flex: 1, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: '700', paddingRight: 8 },
  titleUnread: { color: '#0369a1', fontWeight: '900' },
  message: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20 },
  messageUnread: { color: '#0F172A' },
  time: { color: '#94A3B8', fontSize: 12, fontWeight: '500' },
  timeUnread: { color: COLORS.primary, fontWeight: 'bold' },

  // Empty
  emptyBox: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { color: COLORS.text, fontSize: SIZES.large, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: COLORS.textMuted, fontSize: SIZES.font, textAlign: 'center', lineHeight: 22 },
});

export default NotificationsScreen;
