import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ActivityIndicator, FlatList, TouchableOpacity, RefreshControl, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';

const COLORS = {
  background: '#121212', surface: '#1E1E1E', primary: '#FFD700',
  text: '#FFFFFF', textMuted: '#A0A0A0', error: '#FF4C4C',
  border: '#333333', green: '#4ade80', blue: '#60a5fa',
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
const BookingCard = ({ item, onPress }) => {
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
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>

      {/* ── TOP: Mã + Trạng thái ── */}
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.cardLabel}>MÃ CHUYẾN</Text>
          <Text style={styles.cardCode}>#{shortId}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: status.bg, borderColor: status.color }]}>
          <Ionicons name={status.icon} size={13} color={status.color} />
          <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {/* ── ROUTE ── */}
      <View style={styles.routeSection}>
        {/* Điểm đón */}
        <View style={styles.routeRow}>
          <View style={styles.routeLeft}>
            <View style={styles.dotFrom} />
            <View style={styles.routeLine} />
          </View>
          <View style={styles.routeRight}>
            <Text style={styles.routeLabel}>ĐIỂM ĐÓN</Text>
            <Text style={styles.routeAddr} numberOfLines={2}>
              {item.pickupAddressText || 'Điểm đón'}
            </Text>
          </View>
        </View>

        {/* Điểm trả */}
        <View style={styles.routeRow}>
          <View style={styles.routeLeft}>
            <View style={styles.dotTo} />
          </View>
          <View style={styles.routeRight}>
            <Text style={styles.routeLabel}>ĐIỂM TRẢ</Text>
            <Text style={styles.routeAddr} numberOfLines={2}>
              {item.dropoffAddressText || 'Điểm đến'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── INFO ROW: Ngày + Ghế ── */}
      <View style={styles.infoRow}>
        <View style={styles.infoChip}>
          <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.infoChipText}>
            {formatDate(item.createdAt)} • {formatTime(item.createdAt)}
          </Text>
        </View>
        <View style={styles.infoChip}>
          <Ionicons name="people-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.infoChipText}>{item.seatCount || 1} chỗ</Text>
        </View>
        {item.paymentMethod && (
          <View style={styles.infoChip}>
            <Ionicons name={item.paymentMethod === 'VNPAY' ? 'card-outline' : 'cash-outline'} size={13} color={COLORS.textMuted} />
            <Text style={styles.infoChipText}>{item.paymentMethod === 'VNPAY' ? 'VNPay' : 'Tiền mặt'}</Text>
          </View>
        )}
      </View>

      {/* ── BOTTOM: Giá + Hành động ── */}
      <View style={styles.cardBottom}>
        <View>
          <Text style={styles.priceLabel}>TỔNG TIỀN</Text>
          <Text style={styles.priceValue}>{money(item.totalPriceVnd)}</Text>
        </View>
        <TouchableOpacity style={styles.detailBtn} onPress={onPress}>
          <Text style={styles.detailBtnText}>Chi tiết</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

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
          <Text style={styles.headerSub}>RideUp</Text>
          <Text style={styles.headerTitle}>Lịch sử chuyến</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchMyBookings(true)}>
          <Ionicons name="refresh" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* ── FILTER TABS ── */}
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
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 16 },
  headerSub: { color: COLORS.primary, fontSize: SIZES.small, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginTop: 2 },
  refreshBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,215,0,0.1)', alignItems: 'center', justifyContent: 'center' },

  // Filter tabs
  tabsScroll: { flexGrow: 0, marginBottom: 12, minHeight: 35, maxHeight: 35 },
  tabsContainer: { paddingHorizontal: 16, gap: 8, flexDirection: 'row', alignItems: 'center' },
  tab: { paddingHorizontal: 16, height: 32, justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { color: COLORS.textMuted, fontSize: SIZES.small, fontWeight: '600' },
  tabTextActive: { color: COLORS.background, fontWeight: 'bold' },

  // List
  listContainer: { paddingHorizontal: 16, paddingBottom: 24 },

  // Empty state
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { color: COLORS.text, fontSize: SIZES.large, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: COLORS.textMuted, fontSize: SIZES.font, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
  emptyBtn: { marginTop: 24, backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 24 },
  emptyBtnText: { color: COLORS.background, fontWeight: 'bold', fontSize: SIZES.medium },

  // ===== BOOKING CARD =====
  card: {
    backgroundColor: COLORS.surface, borderRadius: 16, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
  },

  // Card top
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, paddingBottom: 12 },
  cardLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: 'bold', letterSpacing: 0.8, marginBottom: 3 },
  cardCode: { color: COLORS.text, fontSize: SIZES.medium, fontWeight: 'bold', letterSpacing: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusLabel: { fontSize: 12, fontWeight: '700' },

  // Route
  routeSection: { backgroundColor: COLORS.background, marginHorizontal: 14, borderRadius: 12, padding: 14, marginBottom: 12 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  routeLeft: { width: 20, alignItems: 'center', paddingTop: 4 },
  dotFrom: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.green, borderWidth: 2, borderColor: '#166534' },
  routeLine: { width: 2, height: 24, backgroundColor: COLORS.border, marginVertical: 3 },
  dotTo: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.error, borderWidth: 2, borderColor: '#7f1d1d', marginTop: 4 },
  routeRight: { flex: 1, paddingLeft: 10 },
  routeLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 2 },
  routeAddr: { color: COLORS.text, fontSize: SIZES.font, fontWeight: '500', lineHeight: 20 },

  // Info chips
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingBottom: 12 },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  infoChipText: { color: COLORS.textMuted, fontSize: 12 },

  // Card bottom
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: 'rgba(255,215,0,0.04)' },
  priceLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 2 },
  priceValue: { color: COLORS.primary, fontSize: SIZES.large, fontWeight: 'bold' },
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary },
  detailBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: SIZES.small },
});

export default MyTripsScreen;
