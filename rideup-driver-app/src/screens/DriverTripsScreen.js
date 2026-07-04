import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Modal, RefreshControl, ScrollView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiService } from '../services/apiService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  background: '#F8FAFC', surface: '#FFFFFF', primary: '#0ea5e9',
  text: '#0F172A', textMuted: '#64748B', border: '#E2E8F0',
  success: '#10b981', warning: '#f59e0b', error: '#ef4444'
};

const formatMoney = (val) => {
  if (!val) return '0 đ';
  return Number(val).toLocaleString('vi-VN') + ' đ';
};

const formatDate = (dateString) => {
  if (!dateString) return '--';
  const d = new Date(dateString);
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return { time, date };
};

const getStatusColor = (status) => {
  if (!status) return { bg: 'rgba(148, 163, 184, 0.1)', text: COLORS.textMuted, label: 'CHƯA RÕ' };
  const s = status.toUpperCase();
  if (s === 'STARTED') return { bg: 'rgba(14, 165, 233, 0.15)', text: COLORS.primary, label: 'ĐANG CHẠY' };
  if (s === 'COMPLETED') return { bg: 'rgba(16, 185, 129, 0.15)', text: COLORS.success, label: 'HOÀN THÀNH' };
  if (s === 'CANCELLED') return { bg: 'rgba(239, 68, 68, 0.15)', text: COLORS.error, label: 'ĐÃ HỦY' };
  if (s === 'FULL') return { bg: 'rgba(245, 158, 11, 0.15)', text: COLORS.warning, label: 'ĐÃ ĐẦY' };
  return { bg: 'rgba(255, 255, 255, 0.1)', text: COLORS.text, label: 'MỞ BÁN' }; // OPEN
};

// Component Dropdown
const DropdownSelect = ({ label, placeholder, value, options, onSelect }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedItem = options?.find(o => String(o.id) === String(value));

  return (
    <View style={{ marginBottom: 16 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.inputBox} onPress={() => setModalVisible(true)}>
        <Text style={{ color: selectedItem ? COLORS.text : COLORS.textMuted }}>
          {selectedItem ? selectedItem.name : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.textMuted} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.dropdownOverlay}>
          <View style={styles.dropdownContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn {label || placeholder}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => { onSelect(item.id); setModalVisible(false); }}
                >
                  <Text style={[styles.modalItemText, String(item.id) === String(value) && { color: COLORS.primary }]}>
                    {item.name}
                  </Text>
                  {String(item.id) === String(value) && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default function DriverTripsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('ACTIVE'); // 'ACTIVE' or 'ALL'

  // Filter state
  const [provinces, setProvinces] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({ startProvinceId: '', endProvinceId: '', startDate: null, endDate: null });
  const [datePickerType, setDatePickerType] = useState(null);

  // Booking Modal state
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    fetchProvinces();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, [filters])
  );

  const fetchProvinces = async () => {
    try {
      const res = await apiService.getAllProvinces();
      setProvinces(res?.data?.result || []);
    } catch (e) {
      console.log(e);
    }
  };

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const params = { size: 100, page: 0 };
      if (filters.startProvinceId) params.startProvinceId = filters.startProvinceId;
      if (filters.endProvinceId) params.endProvinceId = filters.endProvinceId;
      if (filters.startDate) params.startDate = filters.startDate.toISOString().split('T')[0];
      if (filters.endDate) params.endDate = filters.endDate.toISOString().split('T')[0];

      const res = await apiService.getDriverTrips(params);
      setTrips(res?.data?.result || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setShowFilter(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrips();
  };

  const handleTripPress = async (trip) => {
    setSelectedTrip(trip);
    setLoadingBookings(true);
    try {
      const res = await apiService.getBookingsByTripId(trip.id);
      setBookings(res?.data?.result || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoadingBookings(false);
    }
  };

  // Lọc chuyến theo tab
  const displayTrips = useMemo(() => {
    return trips.filter(t => {
      const s = (t.status || '').toUpperCase();
      if (activeTab === 'ACTIVE') {
        return ['OPEN', 'FULL', 'STARTED'].includes(s);
      } else {
        return true; // Tab ALL hiển thị tất cả
      }
    }).sort((a, b) => new Date(b.departureTime) - new Date(a.departureTime));
  }, [trips, activeTab]);

  const renderTripItem = ({ item }) => {
    const seatsBooked = Math.max((item.seatTotal || 0) - (item.seatAvailable || 0), 0);
    const revenue = (item.priceVnd || 0) * seatsBooked;
    const sColor = getStatusColor(item.status);
    const { time, date } = formatDate(item.departureTime);

    return (
      <TouchableOpacity style={styles.card} onPress={() => handleTripPress(item)} activeOpacity={0.85}>
        {/* Tiêu đề card */}
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.iconWrap}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
            </View>
            <Text style={styles.tripTime}>{time}</Text>
            <Text style={styles.tripDate}>•  {date}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sColor.bg }]}>
            <Text style={[styles.statusText, { color: sColor.text }]}>{sColor.label}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Lộ trình Timeline */}
        <View style={styles.timelineContainer}>
          <View style={styles.timelineGraphic}>
            <View style={styles.timelineDotStart} />
            <View style={styles.timelineLine} />
            <View style={styles.timelineDotEnd}>
              <View style={styles.timelineDotInner} />
            </View>
          </View>
          <View style={styles.timelineContent}>
            <View style={styles.locationBlock}>
              <Text style={styles.locationLabel}>ĐIỂM ĐÓN</Text>
              <Text style={styles.locationText} numberOfLines={1}>{item.startAddressText || 'Chưa cập nhật'}</Text>
            </View>
            <View style={[styles.locationBlock, { marginTop: 16 }]}>
              <Text style={styles.locationLabel}>ĐIỂM TRẢ</Text>
              <Text style={styles.locationText} numberOfLines={1}>{item.endAddressText || 'Chưa cập nhật'}</Text>
            </View>
          </View>
        </View>

        {/* Thống kê chuyến */}
        <View style={styles.tripStatsRow}>
          <View style={styles.statPill}>
            <Ionicons name="people" size={16} color={COLORS.primary} />
            <Text style={styles.statPillText}>{seatsBooked}/{item.seatTotal} khách</Text>
          </View>

          <View style={styles.revenueWrap}>
            <Text style={styles.revenueSub}>Doanh thu</Text>
            <Text style={styles.revenueText}>{formatMoney(revenue)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderBookingItem = ({ item }) => {
    const sColor = getStatusColor(item.status);
    return (
      <View style={styles.bookingCard}>
        {/* Header Khách hàng */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{(item.userName || 'K').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bookingName} numberOfLines={1}>{item.userName || 'Khách hàng'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Ionicons name="ticket" size={12} color={COLORS.primary} />
                <Text style={styles.bookingSub}>{item.seatCount} ghế • {formatMoney(item.totalAmount)}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.bookingStatusBadge, { backgroundColor: item.paymentStatus === 'PAID' ? 'rgba(16, 185, 129, 0.15)' : sColor.bg }]}>
            <Text style={[styles.bookingStatusText, { color: item.paymentStatus === 'PAID' ? COLORS.success : sColor.text }]}>
              {item.paymentStatus === 'PAID' ? 'ĐÃ TT' : item.status}
            </Text>
          </View>
        </View>

        {/* Điểm Đón & Trả của khách */}
        <View style={{ marginTop: 12, backgroundColor: 'rgba(14, 165, 233, 0.05)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(14, 165, 233, 0.1)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 4, marginRight: 8 }} />
            <Text style={{ flex: 1, fontSize: 12, color: COLORS.text, lineHeight: 18 }}><Text style={{ fontWeight: 'bold' }}>Đón: </Text>{item.pickupAddressText || 'Chưa cập nhật'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: COLORS.success, marginTop: 4, marginRight: 8 }} />
            <Text style={{ flex: 1, fontSize: 12, color: COLORS.text, lineHeight: 18 }}><Text style={{ fontWeight: 'bold' }}>Trả: </Text>{item.dropoffAddressText || 'Chưa cập nhật'}</Text>
          </View>
          {!!item.note && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }}>
              <Ionicons name="chatbox-ellipses-outline" size={14} color={COLORS.warning} style={{ marginTop: 2, marginRight: 6 }} />
              <Text style={{ flex: 1, fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' }}>{item.note}</Text>
            </View>
          )}
        </View>

        {/* Nút Nhắn tin */}
        {item.status === 'CONFIRMED' && (
          <TouchableOpacity
            style={[styles.chatBtn, { marginTop: 12, alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 16 }]}
            onPress={() => {
              setSelectedTrip(null);
              navigation.navigate('Chat', {
                bookingId: item.id,
                passengerName: item.userName || 'Khách hàng',
                passengerPhone: item.userPhone || '0987654321',
                passengerAvatar: item.userAvatarUrl || null
              });
            }}
          >
            <Ionicons name="chatbubbles" size={16} color={COLORS.background} />
            <Text style={styles.chatBtnText}>Nhắn tin</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View>
            <Text style={styles.headerAppTitle}>RIDEUP</Text>
            <Text style={styles.headerTitle}>Quản lý chuyến xe</Text>
          </View>
          <TouchableOpacity style={styles.filterBtnIcon} onPress={() => setShowFilter(true)}>
            <Ionicons name="filter" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'ACTIVE' && styles.tabBtnActive]}
            onPress={() => setActiveTab('ACTIVE')}
          >
            <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.tabTextActive]}>Đang hoạt động</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'ALL' && styles.tabBtnActive]}
            onPress={() => setActiveTab('ALL')}
          >
            <Text style={[styles.tabText, activeTab === 'ALL' && styles.tabTextActive]}>Tất cả chuyến</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={displayTrips}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTripItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: 80 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="car-outline" size={64} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Chưa có chuyến xe nào</Text>
              <Text style={styles.emptySub}>
                {activeTab === 'ACTIVE'
                  ? 'Bạn chưa mở chuyến nào sắp tới. Hãy tạo chuyến ngay để bắt đầu kiếm tiền nhé.'
                  : 'Lịch sử chuyến đi của bạn hiện đang trống.'}
              </Text>
              {activeTab === 'ACTIVE' && (
                <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateTrip')}>
                  <Text style={styles.createBtnText}>Mở chuyến ngay</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Modal Danh sách khách đặt & Chi tiết chuyến đi (Full Screen) */}
      <Modal visible={!!selectedTrip} animationType="slide">
        <View style={[styles.fullScreenContainer, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.fullScreenHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedTrip(null)}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.fullScreenTitle}>Chi tiết chuyến đi</Text>
            <View style={{ width: 40 }} />
          </View>

          {loadingBookings ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={bookings}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ paddingVertical: 16 }}
              ListHeaderComponent={() => {
                if (!selectedTrip) return null;
                const sColor = getStatusColor(selectedTrip.status);
                const { time, date } = formatDate(selectedTrip.departureTime);
                const seatsBooked = Math.max((selectedTrip.seatTotal || 0) - (selectedTrip.seatAvailable || 0), 0);

                // Lấy danh sách điểm đón/trả từ mảng stops
                const pickups = selectedTrip.stops?.filter(s => s.stopType === 'PICKUP').map(s => s.addressText).join(', ') || 'Không có điểm cụ thể';
                const dropoffs = selectedTrip.stops?.filter(s => s.stopType === 'DROPOFF').map(s => s.addressText).join(', ') || 'Không có điểm cụ thể';

                return (
                  <View style={styles.tripDetailHeader}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.text }}>{time}</Text>
                        <Text style={{ fontSize: 13, color: COLORS.textMuted }}>•  {date}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: sColor.bg }]}>
                        <Text style={[styles.statusText, { color: sColor.text }]}>{sColor.label}</Text>
                      </View>
                    </View>

                    {/* Lộ Trình Đón / Trả Chi Tiết */}
                    <View style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border }}>

                      {/* Điểm đón */}
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary, marginTop: 4, marginRight: 10, borderWidth: 2, borderColor: 'rgba(14, 165, 233, 0.2)' }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 }}>Tỉnh đón: <Text style={{ color: COLORS.text, fontSize: 13 }}>{selectedTrip.startAddressText || selectedTrip.startProvinceName || 'Chưa rõ'}</Text></Text>
                          <Text style={{ fontSize: 13, color: COLORS.text, fontWeight: '600', lineHeight: 20 }}>{pickups}</Text>
                        </View>
                      </View>

                      <View style={{ width: 2, height: 20, backgroundColor: COLORS.border, marginLeft: 5, marginTop: -16, marginBottom: -4 }} />

                      {/* Điểm trả */}
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 }}>
                        <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: COLORS.success, marginTop: 4, marginRight: 10 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 }}>Tỉnh trả: <Text style={{ color: COLORS.text, fontSize: 13 }}>{selectedTrip.endAddressText || selectedTrip.endProvinceName || 'Chưa rõ'}</Text></Text>
                          <Text style={{ fontSize: 13, color: COLORS.text, fontWeight: '600', lineHeight: 20 }}>{dropoffs}</Text>
                        </View>
                      </View>

                    </View>

                    {/* Stats */}
                    <View style={{ flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: 12, padding: 12, marginBottom: 20 }}>
                      <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: COLORS.border }}>
                        <Text style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4, textTransform: 'uppercase', fontWeight: 'bold' }}>Ghế đã đặt</Text>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.primary }}>{seatsBooked}/{selectedTrip.seatTotal}</Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4, textTransform: 'uppercase', fontWeight: 'bold' }}>Doanh thu (Ước tính)</Text>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.success }}>{formatMoney((selectedTrip.priceVnd || 0) * seatsBooked)}</Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 }}>Danh sách khách ({bookings.length})</Text>
                  </View>
                );
              }}
              renderItem={renderBookingItem}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyBookingBox}>
                  <Ionicons name="people-circle-outline" size={60} color={COLORS.border} />
                  <Text style={styles.emptyBookingText}>Chưa có khách nào đặt vé chuyến này.</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilter} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.modalDragIndicator} />
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Bộ lọc chuyến đi</Text>
              <TouchableOpacity style={styles.filterCloseBtn} onPress={() => setShowFilter(false)}>
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <DropdownSelect
                label="Tỉnh đi" placeholder="Chọn tỉnh xuất phát"
                value={filters.startProvinceId} options={provinces}
                onSelect={(val) => setFilters(p => ({ ...p, startProvinceId: val }))}
              />
              <DropdownSelect
                label="Tỉnh đến" placeholder="Chọn tỉnh đích"
                value={filters.endProvinceId} options={provinces}
                onSelect={(val) => setFilters(p => ({ ...p, endProvinceId: val }))}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Từ ngày</Text>
                  <TouchableOpacity style={[styles.inputBox, { marginBottom: 0 }]} onPress={() => setDatePickerType('start')}>
                    <Text style={{ color: filters.startDate ? COLORS.text : COLORS.textMuted, fontSize: 13, fontWeight: filters.startDate ? '600' : '400' }}>
                      {filters.startDate ? formatDate(filters.startDate).date : 'Chọn ngày'}
                    </Text>
                    <Ionicons name="calendar" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Đến ngày</Text>
                  <TouchableOpacity style={[styles.inputBox, { marginBottom: 0 }]} onPress={() => setDatePickerType('end')}>
                    <Text style={{ color: filters.endDate ? COLORS.text : COLORS.textMuted, fontSize: 13, fontWeight: filters.endDate ? '600' : '400' }}>
                      {filters.endDate ? formatDate(filters.endDate).date : 'Chọn ngày'}
                    </Text>
                    <Ionicons name="calendar" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Lịch Chọn Ngày Inline (Android/iOS) */}
              {(datePickerType === 'start' || datePickerType === 'end') && (
                <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, marginTop: 12, padding: 8, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 }}>
                  <DateTimePicker
                    value={datePickerType === 'start' ? (filters.startDate || new Date()) : (filters.endDate || new Date())}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                    themeVariant="light"
                    onChange={(event, selectedDate) => {
                      if (Platform.OS === 'android') setDatePickerType(null);
                      if (selectedDate) {
                        if (datePickerType === 'start') setFilters(p => ({ ...p, startDate: selectedDate }));
                        else setFilters(p => ({ ...p, endDate: selectedDate }));
                      }
                    }}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity style={{ backgroundColor: COLORS.primary, padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 }} onPress={() => setDatePickerType(null)}>
                      <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Xác nhận</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={[styles.filterActions, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setFilters({ startProvinceId: '', endProvinceId: '', startDate: null, endDate: null });
                  fetchTrips();
                  setShowFilter(false);
                }}
              >
                <Text style={styles.resetBtnText}>Xóa lọc</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => { fetchTrips(); setShowFilter(false); }}>
                <Text style={styles.applyBtnText}>Áp dụng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4, zIndex: 10 },
  headerAppTitle: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary, letterSpacing: 1, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  filterBtnIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(14, 165, 233, 0.1)', justifyContent: 'center', alignItems: 'center' },

  // Tabs
  tabContainer: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 12, padding: 4, marginVertical: 12, borderWidth: 1, borderColor: COLORS.border },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: `${COLORS.primary}15` },
  tabText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: COLORS.primary, fontWeight: '800' },

  listContent: { padding: 16 },

  // Trip Card (Mới)
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: `${COLORS.primary}15`, justifyContent: 'center', alignItems: 'center' },
  tripTime: { color: COLORS.text, fontSize: 16, fontWeight: '900' },
  tripDate: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },

  // Timeline
  timelineContainer: { flexDirection: 'row', marginBottom: 12 },
  timelineGraphic: { width: 20, alignItems: 'center', marginRight: 12, paddingTop: 4 },
  timelineDotStart: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, borderWidth: 2, borderColor: 'rgba(14, 165, 233, 0.2)' },
  timelineLine: { width: 1, flex: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  timelineDotEnd: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center' },
  timelineDotInner: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF' },
  timelineContent: { flex: 1, paddingBottom: 4 },
  locationBlock: { marginBottom: 12 },
  locationLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2, textTransform: 'uppercase' },
  locationText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },

  // Stats Row
  tripStatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, borderStyle: 'dashed' },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${COLORS.primary}10`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statPillText: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' },
  revenueWrap: { alignItems: 'flex-end' },
  revenueSub: { color: COLORS.textMuted, fontSize: 10, marginBottom: 2, fontWeight: '700', textTransform: 'uppercase' },
  revenueText: { color: COLORS.success, fontSize: 16, fontWeight: '900' },

  // Empty State
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIconBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySub: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  createBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  createBtnText: { color: COLORS.background, fontSize: 15, fontWeight: 'bold' },

  // Modal Bottom Sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%', paddingHorizontal: 20, paddingTop: 12 },
  modalDragIndicator: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 16 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '900' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },

  // Full Screen Modal
  fullScreenContainer: { flex: 1, backgroundColor: COLORS.background },
  fullScreenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.background },
  fullScreenTitle: { color: COLORS.text, fontSize: 18, fontWeight: '900' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.03)', justifyContent: 'center', alignItems: 'center' },
  tripDetailHeader: { marginBottom: 8, paddingHorizontal: 16, paddingTop: 16 },

  // Booking Card
  bookingCard: { backgroundColor: COLORS.surface, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, marginHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(14, 165, 233, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(14, 165, 233, 0.3)' },
  avatarInitials: { color: COLORS.primary, fontSize: 18, fontWeight: 'bold' },
  bookingName: { color: COLORS.text, fontWeight: 'bold', fontSize: 16 },
  bookingSub: { color: COLORS.textMuted, fontSize: 13 },
  bookingStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  bookingStatusText: { fontSize: 10, fontWeight: 'bold' },
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
  chatBtnText: { color: COLORS.background, fontSize: 13, fontWeight: 'bold' },

  emptyBookingBox: { alignItems: 'center', padding: 40 },
  emptyBookingText: { color: COLORS.textMuted, fontSize: 14, marginTop: 16 },

  // Filter Modal
  filterModalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, maxHeight: '90%' },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  filterTitle: { color: COLORS.text, fontSize: 18, fontWeight: '900' },
  filterCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },

  // Filter Form
  label: { color: COLORS.text, fontSize: 13, marginBottom: 8, fontWeight: '700' },
  inputBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 16, height: 50, marginBottom: 16 },
  filterActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  resetBtn: { flex: 1, height: 50, borderRadius: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center' },
  resetBtnText: { color: COLORS.error, fontWeight: 'bold', fontSize: 14 },
  applyBtn: { flex: 2, height: 50, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  applyBtnText: { color: COLORS.background, fontWeight: 'bold', fontSize: 14 },

  // Dropdown
  dropdownOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  dropdownContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '50%', padding: 20 },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalItemText: { color: COLORS.text, fontSize: 16 }
});
