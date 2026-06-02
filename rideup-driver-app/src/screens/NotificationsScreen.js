import React, { useState, useEffect, useCallback } from 'react';
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

const COLORS = { 
  background: '#121212', surface: '#1E1E1E', primary: '#0ea5e9', 
  text: '#FFFFFF', textMuted: '#A0A0A0', error: '#FF4C4C', 
  border: '#333333', success: '#4ade80', info: '#60a5fa' 
};

const SIZES = { small: 12, font: 14, medium: 16, large: 20, title: 28 };

const NotificationItem = ({ item, onPress }) => {
  const isRead = item.isRead;
  const bgColor = isRead ? COLORS.surface : 'rgba(14, 165, 233, 0.08)';

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
      style={[styles.notiCard, { backgroundColor: bgColor }]} 
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.iconBox}>
        <Ionicons name={iconName} size={24} color={iconColor} />
        {!isRead && <View style={styles.unreadDot} />}
      </View>
      <View style={styles.contentBox}>
        <Text style={[styles.title, !isRead && styles.titleUnread]} numberOfLines={2}>
          {item.title || 'Thông báo mới'}
        </Text>
        <Text style={styles.message} numberOfLines={3}>
          {item.content || item.message || ''}
        </Text>
        <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const NotificationsScreen = ({ navigation }) => {
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

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handlePress = async (item) => {
    if (item.isRead) return;
    
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View>
            <Text style={styles.headerSub}>RIDEUP</Text>
            <Text style={styles.headerTitle}>Thông báo</Text>
          </View>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerSub: { color: COLORS.primary, fontSize: SIZES.small, fontWeight: 'bold', letterSpacing: 1 },
  headerTitle: { fontSize: SIZES.title, fontWeight: 'bold', color: COLORS.text, marginTop: 2 },
  markAllBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(14, 165, 233, 0.1)', alignItems: 'center', justifyContent: 'center' },

  // List
  listContainer: { paddingVertical: 10 },
  
  // Item
  notiCard: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  iconBox: { width: 48, alignItems: 'center', marginRight: 12, paddingTop: 2 },
  unreadDot: { position: 'absolute', top: 0, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.error, borderWidth: 2, borderColor: COLORS.background },
  contentBox: { flex: 1 },
  title: { color: COLORS.text, fontSize: SIZES.medium, fontWeight: '600', marginBottom: 4 },
  titleUnread: { color: COLORS.primary, fontWeight: 'bold' },
  message: { color: COLORS.textMuted, fontSize: SIZES.font, lineHeight: 20, marginBottom: 8 },
  time: { color: COLORS.textMuted, fontSize: 11, fontStyle: 'italic' },

  // Empty
  emptyBox: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { color: COLORS.text, fontSize: SIZES.large, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: COLORS.textMuted, fontSize: SIZES.font, textAlign: 'center', lineHeight: 22 },
});

export default NotificationsScreen;
