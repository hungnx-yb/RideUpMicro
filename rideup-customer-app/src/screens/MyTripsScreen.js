import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ActivityIndicator, FlatList, TouchableOpacity, RefreshControl, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';

const COLORS = {
  background: '#F8FAFC', surface: '#FFFFFF', primary: '#0ea5e9',
  text: '#0F172A', textMuted: '#64748B', error: '#ef4444',
  border: '#E2E8F0', green: '#10b981', blue: '#3b82f6',
};
const SIZES = { small: 12, font: 14, medium: 16, large: 20, extraLarge: 24 };

// ===== STATUS CONFIG =====
const STATUS_CONFIG = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', color: '#f97316', icon: 'time-outline', bg: 'rgba(249,115,22,0.12)' },
  RESERVED:        { label: 'Đã đặt chỗ',     color: COLORS.blue,   icon: 'checkmark-circle-outline', bg: 'rgba(96,165,250,0.12)' },
  CONFIRMED:       { label: 'Đã xác nhận',    color: COLORS.green,  icon: 'shield-checkmark-outline', bg: 'rgba(74,222,128,0.12)' },
  CANCELLED:       { label: 'Đã huỷ',         color: COLORS.error,  icon: 'close-circle-outline',     bg: 'rgba(255,76,76,0.12)' },
  COMPLETED:       { label: 'Hoàn thành',     color: COLORS.green,  icon: 'checkmark-done-outline',   bg: 'rgba(74,222,128,0.12)' },
};

const getStatus = (status) =>
  STATUS_CONFIG[status] || { label: status || 'Không rõ', color: COLORS.textMuted, icon: 'ellipse-outline', bg: 'rgba(160,160,160,0.1)' };

// ===== TRIP CARD =====
const BookingCard = ({ item, onPress, onChatPress }) => {
  const status = getStatus(item.status);
  const money = (val) => `${Number(val || 0).toLocaleString('vi-VN')}đ`;
  const shortId = (item.bookingCode || item.id || '').slice(0, 8).toUpperCase();

  const formatDate = (iso) => {
    if (!iso) return '--';
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const formatTime = (iso) => {
    if (!iso) return '--';
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <TouchableOpacity 
      style={[styles.card, { borderLeftColor: status.color }]} 
      onPress={onPress} 
      activeOpacity={0.9}
    >
      {/* ── TOP: Thời gian + Trạng thái ── */}
      <View style={styles.cardHeader}>
        <View style={styles.timeWrap}>
          <View style={styles.iconCircle}>
            <Ionicons name="time" size={14} color={COLORS.primary} />
          </View>
          <Text style={styles.timeText}>
            {formatTime(item.createdAt)} • {formatDate(item.createdAt)}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
          <Ionicons name={status.icon} size={14} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      {/* ── ROUTE ── */}
      <View style={styles.cardBody}>
        {/* Điểm đón */}
        <View style={styles.routeRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="location" size={20} color={COLORS.primary} />
          </View>
          <View style={[styles.textColumn, { marginBottom: 12 }]}>
            <Text style={styles.routeLabel}>ĐIỂM ĐÓN</Text>
            <Text style={styles.routeAddr} numberOfLines={1}>
              {item.pickupAddressText || 'Điểm đón'}
            </Text>
          </View>
        </View>

        {/* Điểm trả */}
        <View style={styles.routeRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="flag" size={20} color="#F59E0B" />
          </View>
          <View style={styles.textColumn}>
            <Text style={styles.routeLabel}>ĐIỂM ĐẾN</Text>
            <Text style={styles.routeAddr} numberOfLines={1}>
              {item.dropoffAddressText || 'Điểm đến'}
            </Text>
          </View>
        </View>
        
        {/* Dòng kẻ nối 2 icon */}
        <View style={styles.routeLine} />
      </View>

      {/* ── FOOTER: Chat Action ── */}
      {(item.status === 'CONFIRMED' || item.status === 'RESERVED' || item.status === 'PENDING_PAYMENT') && (
        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={styles.chatBtn} 
            onPress={onChatPress}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-ellipses" size={16} color={COLORS.primary} />
            <Text style={styles.chatBtnText}>Nhắn tin tài xế</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ===== FILTER TAB =====
const TABS = [
  { key: null, label: 'Tất cả' },
  { key: 'CONFIRMED', label: 'Xác nhận' },
  { key: 'CANCELLED', label: 'Đã huỷ' },
];

// ===== MAIN SCREEN =====
const MyTripsScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(null);

  const fetchMyBookings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await apiService.getMyBookings();
      const data = response?.data?.result ?? (Array.isArray(response?.data) ? response.data : []);
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('Fetch bookings error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchMyBookings(); }, []);

  const filtered = activeTab ? bookings.filter(b => b.status === activeTab) : bookings;

  return (
    <SafeAreaView style={styles.container}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>RIDEUP</Text>
          <Text style={styles.headerTitle}>Lịch sử chuyến</Text>
        </View>
      </View>

      {/* ── FILTER TABS ── */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          style={styles.tabsScroll}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={String(tab.key)}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── CONTENT ── */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookingCard
              item={item}
              onPress={() => navigation.navigate('Map', { booking: item })}
              onChatPress={() => navigation.navigate('BookingChat', { 
                bookingId: item.id, 
                driverName: item.trip?.driverName || 'Tài xế', 
                driverAvatar: item.trip?.driverAvatar,
                vehicleInfo: item.trip?.vehicleType || 'Xe máy'
              })}
            />
          )}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchMyBookings(true)}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="car-outline" size={60} color={COLORS.border} />
              <Text style={styles.emptyTitle}>Chưa có chuyến nào</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab ? 'Không có chuyến nào trong trạng thái này.' : 'Hãy đặt chuyến đầu tiên của bạn!'}
              </Text>
              {!activeTab && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => navigation.navigate('Search')}
                >
                  <Text style={styles.emptyBtnText}>Tìm chuyến ngay</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, backgroundColor: COLORS.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4, zIndex: 10 },
  headerSub: { color: COLORS.primary, fontSize: SIZES.small, fontWeight: 'bold', letterSpacing: 1, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },

  // Filter tabs
  tabsWrapper: { backgroundColor: COLORS.surface, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabsScroll: { flexGrow: 0 },
  tabsContainer: { paddingHorizontal: 16, gap: 10, flexDirection: 'row', alignItems: 'center' },
  tab: { paddingHorizontal: 20, height: 38, justifyContent: 'center', borderRadius: 20, backgroundColor: '#F1F5F9' },
  tabActive: { backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  tabText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF', fontWeight: 'bold' },

  // List
  listContainer: { paddingHorizontal: 0, paddingVertical: 16, paddingBottom: 24 },

  // Empty state
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { color: COLORS.text, fontSize: SIZES.large, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: COLORS.textMuted, fontSize: SIZES.font, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
  emptyBtn: { marginTop: 24, backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 24 },
  emptyBtnText: { color: COLORS.background, fontWeight: 'bold', fontSize: SIZES.medium },

  // ===== BOOKING CARD =====
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginHorizontal: 14,
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4,
    borderWidth: 1, borderColor: '#F1F5F9',
    borderLeftWidth: 5, // Hiển thị màu trạng thái ở viền trái
  },

  // Card Header
  cardHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC'
  },
  timeWrap: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(14, 165, 233, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  timeText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '800', marginLeft: 4 },

  // Card Body (Route)
  cardBody: { padding: 14, paddingLeft: 10, position: 'relative' },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', zIndex: 2 },
  iconWrap: { width: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, paddingVertical: 2 },
  textColumn: { flex: 1, paddingLeft: 8, justifyContent: 'center' },
  routeLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 2 },
  routeAddr: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  
  routeLine: { position: 'absolute', left: 23, top: 35, width: 2, height: 26, backgroundColor: '#E2E8F0', borderStyle: 'dashed', zIndex: 1 },

  // Footer Card
  cardFooter: { borderTopWidth: 1, borderTopColor: '#F8FAFC', padding: 12 },
  chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(14, 165, 233, 0.1)', paddingVertical: 8, borderRadius: 8, gap: 8 },
  chatBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
});

export default MyTripsScreen;
