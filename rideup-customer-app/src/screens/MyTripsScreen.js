import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ActivityIndicator, FlatList, TouchableOpacity, RefreshControl, ScrollView, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import InvitationCard from '../components/InvitationCard';

const COLORS = {
  background: '#F8FAFC', surface: '#FFFFFF', primary: '#0ea5e9',
  text: '#0F172A', textMuted: '#64748B', error: '#ef4444',
  border: '#E2E8F0', green: '#10b981', blue: '#3b82f6',
};
const SIZES = { small: 12, font: 14, medium: 16, large: 20, extraLarge: 24 };

// ===== STATUS CONFIG =====
const STATUS_CONFIG = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', color: '#f97316', icon: 'time-outline', bg: 'rgba(249,115,22,0.12)' },
  WAITING_DRIVER_APPROVAL: { label: 'Đang chờ tài xế duyệt...', color: '#f59e0b', icon: 'hourglass-outline', bg: 'rgba(245,158,11,0.12)' },
  CONFIRMED:       { label: 'Đã xác nhận',    color: COLORS.green,  icon: 'shield-checkmark-outline', bg: 'rgba(74,222,128,0.12)' },
  COMPLETED:       { label: 'Hoàn thành',     color: COLORS.green,  icon: 'checkmark-done-outline',   bg: 'rgba(74,222,128,0.12)' },
  REJECTED_BY_DRIVER: { label: 'Bị từ chối (Đã hoàn tiền)', color: COLORS.error, icon: 'close-circle-outline', bg: 'rgba(255,76,76,0.12)' },
  EXPIRED:         { label: 'Hết hạn', color: COLORS.error, icon: 'time-outline', bg: 'rgba(255,76,76,0.12)' },
  CANCELLED_USER:  { label: 'Đã huỷ', color: COLORS.error, icon: 'close-circle-outline', bg: 'rgba(255,76,76,0.12)' },
  CANCELLED_PAYMENT_FAILED: { label: 'Lỗi thanh toán', color: COLORS.error, icon: 'close-circle-outline', bg: 'rgba(255,76,76,0.12)' }
};

const getStatus = (status) =>
  STATUS_CONFIG[status] || { label: status || 'Không rõ', color: COLORS.textMuted, icon: 'ellipse-outline', bg: 'rgba(160,160,160,0.1)' };

const REQUEST_STATUS_CONFIG = {
  OPEN: { label: 'Đang tìm xe', color: COLORS.green, bg: 'rgba(16, 185, 129, 0.12)', icon: 'radio-outline' },
  ACCEPTED: { label: 'Đã chốt xe', color: COLORS.blue, bg: 'rgba(59, 130, 246, 0.12)', icon: 'checkmark-circle-outline' },
  EXPIRED: { label: 'Hết hạn', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', icon: 'time-outline' },
  CANCELLED: { label: 'Đã huỷ', color: COLORS.textMuted, bg: 'rgba(100, 116, 139, 0.12)', icon: 'close-circle-outline' },
};

const getRequestStatus = (status) =>
  REQUEST_STATUS_CONFIG[status] || { label: status || 'Chưa rõ', color: COLORS.textMuted, bg: 'rgba(100, 116, 139, 0.12)', icon: 'ellipse-outline' };

const REQUEST_TABS = [
  { key: null, label: 'Tất cả' },
  { key: 'OPEN', label: 'Đang tìm xe' },
  { key: 'ACCEPTED', label: 'Đã chốt' },
  { key: 'EXPIRED', label: 'Hết hạn' },
  { key: 'CANCELLED', label: 'Đã huỷ' },
];

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
const MyTripsScreen = ({ navigation, route }) => {
  const [mainTab, setMainTab] = useState(route?.params?.initialTab || 'BOOKINGS'); // 'BOOKINGS' | 'REQUESTS'
  const [bookings, setBookings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const [requestActiveTab, setRequestActiveTab] = useState(null);

  useEffect(() => {
    if (route?.params?.initialTab) {
      setMainTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  const fetchMyRequests = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await apiService.getMyTripRequests();
      const rawData = res?.data?.result ?? res?.data;
      const data = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      setRequests(data);
    } catch (e) {
      console.warn('Fetch requests error:', e?.response?.data || e);
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleCancelRequest = (requestId) => {
    Alert.alert(
      'Hủy yêu cầu tìm xe',
      'Bạn có chắc chắn muốn hủy yêu cầu phát tín hiệu tìm xe này không?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy yêu cầu',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.cancelTripRequest(requestId);
              setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'CANCELLED' } : r));
            } catch (e) {
              Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể hủy yêu cầu.');
            }
          }
        }
      ]
    );
  };

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

  const handleRefresh = useCallback(() => {
    if (mainTab === 'BOOKINGS') {
      fetchMyBookings(true);
    } else {
      fetchMyRequests(true);
    }
  }, [mainTab, fetchMyBookings, fetchMyRequests]);

  useFocusEffect(
    useCallback(() => {
      if (mainTab === 'BOOKINGS') {
        fetchMyBookings();
      } else {
        fetchMyRequests();
      }
    }, [mainTab, fetchMyBookings, fetchMyRequests])
  );

  const filteredBookings = activeTab ? bookings.filter(b => b.status === activeTab) : bookings;
  const filteredRequests = requestActiveTab ? requests.filter(r => r.status === requestActiveTab) : requests;

  const handleRejectInvitation = async (inv) => {
    try {
      await apiService.rejectTripRequestInvitation(inv.id);
      // Optimistic update: remove from local state
      setRequests(prev => prev.map(req => {
        if (req.id === inv.tripRequestId) {
          return { ...req, invitations: (req.invitations || []).filter(i => i.id !== inv.id) };
        }
        return req;
      }));
    } catch (e) {
      console.warn('Reject error', e);
    }
  };

  const handleAcceptInvitation = (invitation, tripRequest) => {
    // Chuyển hướng về SearchRide kèm theo thông tin lời mời để Đặt vé
    navigation.navigate('SearchRide', { 
      prefillInvitation: invitation,
      tripRequest: tripRequest
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>RIDEUP</Text>
          <Text style={styles.headerTitle}>Lịch sử chuyến</Text>
        </View>
      </View>

      {/* ── MASTER TABS (Vé vs Yêu cầu) ── */}
      <View style={styles.masterTabContainer}>
        <TouchableOpacity 
          style={[styles.masterTab, mainTab === 'BOOKINGS' && styles.masterTabActive]}
          onPress={() => setMainTab('BOOKINGS')}
        >
          <Text style={[styles.masterTabText, mainTab === 'BOOKINGS' && styles.masterTabTextActive]}>Vé Đã Đặt</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.masterTab, mainTab === 'REQUESTS' && styles.masterTabActive]}
          onPress={() => setMainTab('REQUESTS')}
        >
          <Text style={[styles.masterTabText, mainTab === 'REQUESTS' && styles.masterTabTextActive]}>Yêu Cầu Tìm Xe</Text>
        </TouchableOpacity>
      </View>

      {/* ── FILTER TABS ── */}
      {mainTab === 'BOOKINGS' ? (
        <View style={styles.tabsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer} style={styles.tabsScroll}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity key={String(tab.key)} style={[styles.tab, isActive && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.tabsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer} style={styles.tabsScroll}>
            {REQUEST_TABS.map((tab) => {
              const isActive = requestActiveTab === tab.key;
              return (
                <TouchableOpacity key={String(tab.key)} style={[styles.tab, isActive && styles.tabActive]} onPress={() => setRequestActiveTab(tab.key)}>
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── CONTENT ── */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={mainTab === 'BOOKINGS' ? filteredBookings : filteredRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if (mainTab === 'BOOKINGS') {
              return (
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
              );
            } else {
              // YÊU CẦU TÌM XE
              const reqStatus = getRequestStatus(item.status);
              const depTime = item.departureTime ? new Date(item.departureTime) : (item.createdAt ? new Date(item.createdAt) : null);
              const formattedTime = depTime 
                ? `${depTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • ${depTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}` 
                : '--';

              return (
                <View style={{ marginBottom: 16, marginHorizontal: 16, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
                  {/* Card Header */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(14, 165, 233, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
                        <Ionicons name="radio" size={14} color={COLORS.primary} />
                      </View>
                      <Text style={{ fontWeight: '700', fontSize: 13, color: COLORS.text }}>
                        Khởi hành: {formattedTime}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ backgroundColor: reqStatus.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name={reqStatus.icon} size={12} color={reqStatus.color} />
                        <Text style={{ color: reqStatus.color, fontSize: 11, fontWeight: 'bold' }}>
                          {reqStatus.label}
                        </Text>
                      </View>
                      {item.status === 'OPEN' && (
                        <TouchableOpacity onPress={() => handleCancelRequest(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Route */}
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Ionicons name="location" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 13, color: COLORS.text, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                        {item.startAddressText || 'Điểm đón'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="flag" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 13, color: COLORS.text, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                        {item.endAddressText || 'Điểm đến'}
                      </Text>
                    </View>
                  </View>

                  {/* Seat & Note */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="people-outline" size={14} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: '600' }}>
                        {item.seatTotal || 1} ghế
                      </Text>
                    </View>
                    {item.note ? (
                      <Text style={{ fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', maxWidth: '65%' }} numberOfLines={1}>
                        "{item.note}"
                      </Text>
                    ) : null}
                  </View>

                  {/* Invitations section */}
                  {item.invitations && item.invitations.length > 0 ? (
                    <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: COLORS.primary }}>
                          Lời mời từ tài xế ({item.invitations.length}):
                        </Text>
                        <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                          Chọn xe để tiếp tục
                        </Text>
                      </View>
                      {item.invitations.map(inv => (
                        <InvitationCard 
                          key={inv.id} 
                          invitation={inv} 
                          onAccept={() => handleAcceptInvitation(inv, item)} 
                          onReject={() => handleRejectInvitation(inv)} 
                        />
                      ))}
                    </View>
                  ) : (
                    <View style={{ paddingVertical: 8, alignItems: 'center' }}>
                      <Text style={{ color: COLORS.textMuted, fontStyle: 'italic', fontSize: 12 }}>
                        {item.status === 'OPEN' 
                          ? 'Đang phát sóng tìm tài xế gần bạn nhất...' 
                          : 'Không có lời mời nào.'}
                      </Text>
                    </View>
                  )}
                </View>
              );
            }
          }}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name={mainTab === 'BOOKINGS' ? "ticket-outline" : "radio-outline"} size={60} color={COLORS.border} />
              <Text style={styles.emptyTitle}>
                {mainTab === 'BOOKINGS' ? 'Chưa có chuyến nào' : 'Chưa có yêu cầu nào'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {mainTab === 'BOOKINGS' 
                  ? (activeTab ? 'Không có chuyến nào trong trạng thái này.' : 'Hãy đặt chuyến đầu tiên của bạn!')
                  : 'Bạn chưa phát tín hiệu tìm xe nào hoặc không có yêu cầu trong mục này.'}
              </Text>
              {mainTab === 'REQUESTS' && (
                <TouchableOpacity 
                  style={[styles.emptyBtn, { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 }]}
                  onPress={() => navigation.navigate('SearchRide')}
                >
                  <Ionicons name="radio" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyBtnText}>Phát tín hiệu tìm xe ngay</Text>
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

  // Master Tabs
  masterTabContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', margin: 16, borderRadius: 24, padding: 4 },
  masterTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  masterTabActive: { backgroundColor: COLORS.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  masterTabText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 13 },
  masterTabTextActive: { color: COLORS.primary, fontWeight: 'bold' },

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
