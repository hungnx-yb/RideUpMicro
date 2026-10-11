import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Modal, RefreshControl, ScrollView, Platform, Alert, Linking, TextInput
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
  if (s === 'CANCELLED' || s === 'CANCELED') return { bg: 'rgba(239, 68, 68, 0.15)', text: COLORS.error, label: 'ĐÃ HỦY' };
  if (s === 'FULL') return { bg: 'rgba(245, 158, 11, 0.15)', text: COLORS.warning, label: 'ĐÃ ĐẦY' };
  return { bg: 'rgba(255, 255, 255, 0.1)', text: COLORS.text, label: 'MỞ BÁN' }; // OPEN
};

// Booking status config (Vietnamese labels)
const BOOKING_STATUS_CONFIG = {
  PENDING_PAYMENT:           { label: 'Chờ thanh toán',    color: COLORS.warning,  bg: 'rgba(245,158,11,0.12)' },
  WAITING_DRIVER_APPROVAL:   { label: 'Chờ duyệt',        color: '#f97316',       bg: 'rgba(249,115,22,0.12)' },
  CONFIRMED:                 { label: 'Đã xác nhận',      color: COLORS.success,  bg: 'rgba(16,185,129,0.12)' },
  COMPLETED:                 { label: 'Hoàn thành',       color: COLORS.success,  bg: 'rgba(16,185,129,0.12)' },
  REJECTED_BY_DRIVER:        { label: 'Đã từ chối',       color: COLORS.error,    bg: 'rgba(239,68,68,0.12)' },
  CANCELLED_USER:            { label: 'Khách huỷ',        color: COLORS.error,    bg: 'rgba(239,68,68,0.12)' },
  CANCELLED_DRIVER:          { label: 'Tài xế huỷ',        color: COLORS.error,    bg: 'rgba(239,68,68,0.12)' },
  CANCELLED_PAYMENT_FAILED:  { label: 'Lỗi thanh toán',   color: COLORS.error,    bg: 'rgba(239,68,68,0.12)' },
  EXPIRED:                   { label: 'Hết hạn',          color: COLORS.error,    bg: 'rgba(239,68,68,0.12)' },
};
const getBookingStatus = (status) => BOOKING_STATUS_CONFIG[status] || { label: status || 'Không rõ', color: COLORS.textMuted, bg: 'rgba(148,163,184,0.1)' };

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
  const [filters, setFilters] = useState({
    startProvinceId: '',
    endProvinceId: '',
    startDate: null,
    endDate: null,
    pickupAddress: '',
    dropoffAddress: '',
  });
  const [datePickerType, setDatePickerType] = useState(null);
  const [page, setPage] = useState(0);
  const [totalTripsCount, setTotalTripsCount] = useState(0);

  // Booking Modal state
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // track which action is loading
  const [bookingFilterTab, setBookingFilterTab] = useState('ACTIVE'); // 'ACTIVE' or 'CANCELLED'
  const [bookingPickupFilter, setBookingPickupFilter] = useState('');
  const [bookingDropoffFilter, setBookingDropoffFilter] = useState('');
  const [bookingPage, setBookingPage] = useState(0);

  useEffect(() => {
    fetchProvinces();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTrips(0);
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

  const fetchTrips = async (targetPage = 0) => {
    try {
      setLoading(true);
      const params = { size: 10, page: targetPage };
      if (filters.startProvinceId) params.startProvinceId = filters.startProvinceId;
      if (filters.endProvinceId) params.endProvinceId = filters.endProvinceId;
      if (filters.startDate) params.startDate = filters.startDate.toISOString().split('T')[0];
      if (filters.endDate) params.endDate = filters.endDate.toISOString().split('T')[0];
      if (filters.pickupAddress?.trim()) params.pickupAddress = filters.pickupAddress.trim();
      if (filters.dropoffAddress?.trim()) params.dropoffAddress = filters.dropoffAddress.trim();

      const res = await apiService.getDriverTrips(params);
      const count = res?.data?.count ?? 0;
      setTotalTripsCount(count);
      setPage(targetPage);

      let list = res?.data?.result || [];
      // Sắp xếp mặc định theo thời gian tạo giảm dần (createdAt DESC)
      list.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      setTrips(list);
    } catch (e) {
      console.log(e);
      setTrips([]);
      setTotalTripsCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setShowFilter(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrips(0);
  };

  const handleTripPress = async (trip) => {
    setBookingPickupFilter('');
    setBookingDropoffFilter('');
    setBookingPage(0);
    setSelectedTrip(trip);
    setBookingFilterTab('ACTIVE');
    setLoadingBookings(true);
    try {
      const [res, tRes] = await Promise.all([
        apiService.getBookingsByTripId(trip.id),
        apiService.getTripDetail(trip.id).catch(() => null)
      ]);
      setBookings(res?.data?.result || []);
      if (tRes?.data?.result) {
        setSelectedTrip(tRes.data.result);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoadingBookings(false);
    }
  };

  // Refresh bookings for current trip
  const refreshBookings = async () => {
    if (!selectedTrip) return;
    try {
      const [res, tRes] = await Promise.all([
        apiService.getBookingsByTripId(selectedTrip.id),
        apiService.getTripDetail(selectedTrip.id).catch(() => null)
      ]);
      setBookings(res?.data?.result || []);
      if (tRes?.data?.result) {
        setSelectedTrip(tRes.data.result);
      }
      fetchTrips();
    } catch (e) {
      console.log(e);
    }
  };

  // Approve a booking
  const handleApproveBooking = (bookingId, userName) => {
    Alert.alert('Xác nhận duyệt', `Bạn muốn duyệt khách "${userName || 'Khách hàng'}"?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Duyệt', style: 'default', onPress: async () => {
          setActionLoading(bookingId);
          try {
            await apiService.approveBooking(bookingId);
            Alert.alert('Thành công', 'Đã duyệt khách thành công!');
            await refreshBookings();
          } catch (e) {
            Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể duyệt.');
          } finally {
            setActionLoading(null);
          }
        }
      }
    ]);
  };

  // Reject a booking
  const handleRejectBooking = (bookingId, userName) => {
    Alert.alert('Xác nhận từ chối', `Bạn muốn từ chối khách "${userName || 'Khách hàng'}"?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Từ chối', style: 'destructive', onPress: async () => {
          setActionLoading(bookingId);
          try {
            await apiService.rejectBooking(bookingId);
            Alert.alert('Đã từ chối', 'Đã từ chối khách.');
            await refreshBookings();
          } catch (e) {
            Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể từ chối.');
          } finally {
            setActionLoading(null);
          }
        }
      }
    ]);
  };

  // Complete a booking
  const handleCompleteBooking = (bookingId, userName) => {
    Alert.alert('Hoàn thành chuyến', `Xác nhận đã trả khách và hoàn thành chuyến cho "${userName || 'Khách hàng'}"?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Hoàn thành', style: 'default', onPress: async () => {
          setActionLoading(bookingId);
          try {
            await apiService.completeBooking(bookingId);
            Alert.alert('Thành công', 'Đã đánh dấu hoàn thành chuyến cho khách!');
            await refreshBookings();
          } catch (e) {
            Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể cập nhật trạng thái.');
          } finally {
            setActionLoading(null);
          }
        }
      }
    ]);
  };

  // Bắt đầu chuyến - Cảnh báo chặn nếu còn đơn chờ duyệt
  const handleStartTrip = () => {
    const waitingList = (bookings || []).filter(b => b.status === 'WAITING_DRIVER_APPROVAL');
    if (waitingList.length > 0) {
      Alert.alert(
        'Chưa duyệt hết khách!',
        `Chuyến đi vẫn còn ${waitingList.length} yêu cầu đặt chỗ đang chờ duyệt.\n\nKhi xe bắt đầu chạy, bạn sẽ không thể duyệt thêm khách nữa. Bạn có muốn tự động TỪ CHỐI các yêu cầu này để bắt đầu chuyến không?`,
        [
          { text: 'Quay lại duyệt', style: 'cancel' },
          {
            text: 'Từ chối & Bắt đầu',
            style: 'destructive',
            onPress: async () => {
              setActionLoading('trip-status');
              try {
                // Tự động từ chối các đơn chờ duyệt để hoàn cọc cho khách
                await Promise.allSettled(waitingList.map(b => apiService.rejectBooking(b.id)));
                await apiService.changeTripStatus(selectedTrip.id, 'STARTED');
                Alert.alert('Thành công', 'Đã bắt đầu chuyến đi!');
                try {
                  const res = await apiService.getTripDetail(selectedTrip.id);
                  setSelectedTrip(res?.data?.result || { ...selectedTrip, status: 'STARTED' });
                } catch (_) {
                  setSelectedTrip({ ...selectedTrip, status: 'STARTED' });
                }
                await refreshBookings();
                fetchTrips();
              } catch (e) {
                Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể bắt đầu chuyến.');
              } finally {
                setActionLoading(null);
              }
            }
          }
        ]
      );
    } else {
      handleChangeTripStatus('STARTED', 'Bắt đầu chuyến đi? Trạng thái sẽ chuyển sang "Đang chạy" và xe không thể nhận thêm khách mới.');
    }
  };

  // Hoàn thành chuyến - Chặn nếu chưa bấm hoàn thành từng khách
  const handleCompleteTrip = () => {
    const uncompletedBookings = (bookings || []).filter(b => b.status === 'CONFIRMED');
    if (uncompletedBookings.length > 0) {
      Alert.alert(
        'Chưa hoàn thành trả khách!',
        `Vẫn còn ${uncompletedBookings.length} khách chưa được bấm "Hoàn thành".\n\nVui lòng bấm nút "Hoàn thành" cho từng khách (khi đã trả khách xong) trước khi kết thúc toàn bộ chuyến xe!`,
        [{ text: 'Đã hiểu', style: 'default' }]
      );
      return;
    }

    const waitingBookings = (bookings || []).filter(b => b.status === 'WAITING_DRIVER_APPROVAL');
    if (waitingBookings.length > 0) {
      Alert.alert(
        'Còn khách chưa xử lý!',
        `Vẫn còn ${waitingBookings.length} yêu cầu đang chờ duyệt. Vui lòng từ chối các yêu cầu này trước khi kết thúc chuyến!`,
        [{ text: 'Đã hiểu', style: 'default' }]
      );
      return;
    }

    handleChangeTripStatus('COMPLETED', 'Xác nhận hoàn thành chuyến đi? Toàn bộ khách hàng trên xe đã được trả xong.');
  };

  // Huỷ chuyến - Hỏi lý do huỷ và cảnh báo huỷ vé/hoàn tiền
  const handleCancelTrip = () => {
    if (selectedTrip?.status === 'STARTED') {
      Alert.alert('Không thể huỷ chuyến', 'Chuyến xe đã bắt đầu di chuyển. Bạn không thể huỷ chuyến đi này!');
      return;
    }

    const bookedCount = (bookings || []).filter(b => b.status === 'CONFIRMED' || b.status === 'WAITING_DRIVER_APPROVAL').length;
    const warningText = bookedCount > 0
      ? `Chuyến đi đang có ${bookedCount} khách đã đặt vé. Khi huỷ chuyến, hệ thống sẽ tự động huỷ vé, hoàn tiền/cọc và gửi thông báo đến hành khách.\n\nVui lòng chọn lý do huỷ chuyến:`
      : 'Bạn có chắc chắn muốn huỷ chuyến đi này không? Vui lòng chọn lý do huỷ:';

    Alert.alert(
      'Xác nhận huỷ chuyến đi',
      warningText,
      [
        { text: 'Đóng', style: 'cancel' },
        {
          text: 'Sự cố xe / Hỏng xe',
          style: 'destructive',
          onPress: () => executeCancelTrip('Sự cố xe cộ / Hỏng xe')
        },
        {
          text: 'Lý do sức khỏe đột xuất',
          style: 'destructive',
          onPress: () => executeCancelTrip('Lý do sức khỏe đột xuất')
        },
        {
          text: 'Thời tiết xấu / Ngập đường',
          style: 'destructive',
          onPress: () => executeCancelTrip('Thời tiết xấu / Đường ngập')
        },
        {
          text: 'Lý do cá nhân khác',
          style: 'destructive',
          onPress: () => executeCancelTrip('Lý do cá nhân khác')
        }
      ]
    );
  };

  const executeCancelTrip = async (cancelReason) => {
    setActionLoading('trip-status');
    try {
      await apiService.changeTripStatus(selectedTrip.id, 'CANCELED', cancelReason);
      Alert.alert('Đã huỷ chuyến', 'Chuyến đi đã được huỷ thành công. Hệ thống đang tự động hoàn tiền/cọc và gửi thông báo đến hành khách.');
      try {
        const res = await apiService.getTripDetail(selectedTrip.id);
        setSelectedTrip(res?.data?.result || { ...selectedTrip, status: 'CANCELED' });
      } catch (_) {
        setSelectedTrip({ ...selectedTrip, status: 'CANCELED' });
      }
      await refreshBookings();
      fetchTrips();
    } catch (e) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể huỷ chuyến.');
    } finally {
      setActionLoading(null);
    }
  };

  // Change trip status
  const handleChangeTripStatus = (newStatus, confirmMsg) => {
    Alert.alert('Xác nhận', confirmMsg, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Đồng ý', onPress: async () => {
          setActionLoading('trip-status');
          try {
            await apiService.changeTripStatus(selectedTrip.id, newStatus);
            Alert.alert('Thành công', 'Đã cập nhật trạng thái chuyến!');
            // Refresh trip detail and bookings
            try {
              const res = await apiService.getTripDetail(selectedTrip.id);
              setSelectedTrip(res?.data?.result || { ...selectedTrip, status: newStatus });
            } catch (_) {
              setSelectedTrip({ ...selectedTrip, status: newStatus });
            }
            await refreshBookings();
            fetchTrips(); // refresh list behind modal
          } catch (e) {
            Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể cập nhật trạng thái.');
          } finally {
            setActionLoading(null);
          }
        }
      }
    ]);
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
            <Text style={styles.statPillText}>{seatsBooked}/{item.seatTotal} ghế</Text>
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
    const bStatus = getBookingStatus(item.status);
    const isWaiting = item.status === 'WAITING_DRIVER_APPROVAL';
    const isConfirmed = item.status === 'CONFIRMED';
    const isCompleted = item.status === 'COMPLETED';
    const isLoading = actionLoading === item.id;
    const canApprove = selectedTrip?.status === 'OPEN' || selectedTrip?.status === 'FULL';

    const pickupWardName = selectedTrip?.stops?.find(s => String(s.wardId) === String(item.pickupWardId))?.addressText || '';
    const dropoffWardName = selectedTrip?.stops?.find(s => String(s.wardId) === String(item.dropoffWardId))?.addressText || '';
    const startProvinceName = selectedTrip?.startAddressText || '';
    const endProvinceName = selectedTrip?.endAddressText || '';

    return (
      <View style={styles.bookingCard}>
        {/* Header Khách hàng */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{(item.userName || 'K').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={styles.bookingName} numberOfLines={1}>{item.userName || 'Khách hàng'}</Text>
                {!!item.bookingCode && (
                  <View style={styles.bookingCodeBadge}>
                    <Text style={styles.bookingCodeText}>#{item.bookingCode}</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Ionicons name="ticket" size={12} color={COLORS.primary} />
                <Text style={styles.bookingSub}>{item.seatCount} ghế • {formatMoney(item.totalAmount)}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.bookingStatusBadge, { backgroundColor: bStatus.bg }]}>
            <Text style={[styles.bookingStatusText, { color: bStatus.color }]}>
              {item.paymentStatus === 'PAID' ? `${bStatus.label} • Đã TT` : bStatus.label}
            </Text>
          </View>
        </View>

        {/* Điểm Đón & Trả của khách */}
        <View style={{ marginTop: 12, backgroundColor: 'rgba(14, 165, 233, 0.05)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(14, 165, 233, 0.1)', gap: 10 }}>
          {/* Điểm đón */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginRight: 6 }} />
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: COLORS.primary }}>ĐIỂM ĐÓN:</Text>
            </View>
            <View style={{ paddingLeft: 14 }}>
              {(startProvinceName || pickupWardName) && (
                <Text style={{ fontSize: 12, color: COLORS.text, lineHeight: 18 }}>
                  <Text style={{ fontWeight: 'bold' }}>Khu vực: </Text>
                  {pickupWardName ? `${pickupWardName}, ` : ''}{startProvinceName}
                </Text>
              )}
              <Text style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 18 }}>
                <Text style={{ fontWeight: 'bold', color: COLORS.text }}>Địa chỉ chi tiết: </Text>
                {item.pickupAddressText || 'Chưa cập nhật'}
              </Text>
            </View>
          </View>

          {/* Điểm trả */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: COLORS.success, marginRight: 6 }} />
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: COLORS.success }}>ĐIỂM TRẢ:</Text>
            </View>
            <View style={{ paddingLeft: 14 }}>
              {(endProvinceName || dropoffWardName) && (
                <Text style={{ fontSize: 12, color: COLORS.text, lineHeight: 18 }}>
                  <Text style={{ fontWeight: 'bold' }}>Khu vực: </Text>
                  {dropoffWardName ? `${dropoffWardName}, ` : ''}{endProvinceName}
                </Text>
              )}
              <Text style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 18 }}>
                <Text style={{ fontWeight: 'bold', color: COLORS.text }}>Địa chỉ chi tiết: </Text>
                {item.dropoffAddressText || 'Chưa cập nhật'}
              </Text>
            </View>
          </View>

          {!!item.note && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }}>
              <Ionicons name="chatbox-ellipses-outline" size={14} color={COLORS.warning} style={{ marginTop: 2, marginRight: 6 }} />
              <Text style={{ flex: 1, fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' }}>{item.note}</Text>
            </View>
          )}
          {!!item.cancelReason && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }}>
              <Ionicons name="alert-circle-outline" size={14} color={COLORS.error} style={{ marginTop: 2, marginRight: 6 }} />
              <Text style={{ flex: 1, fontSize: 12, color: COLORS.error, fontStyle: 'italic' }}>Lý do huỷ: {item.cancelReason}</Text>
            </View>
          )}
        </View>

        {/* ── Action Buttons ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {/* Nút Gọi nếu có số điện thoại */}
          {!!item.userPhone && (
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${item.userPhone}`)}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={14} color={COLORS.primary} />
              <Text style={styles.callBtnText}>Gọi</Text>
            </TouchableOpacity>
          )}

          {/* Duyệt / Từ chối khi WAITING_DRIVER_APPROVAL */}
          {isWaiting && (
            <>
              {!canApprove && (
                <View style={styles.cannotApproveNotice}>
                  <Ionicons name="alert-circle-outline" size={13} color={COLORS.error} />
                  <Text style={styles.cannotApproveNoticeText}>Xe đang chạy (Không thể duyệt)</Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.actionBtnReject]}
                onPress={() => handleRejectBooking(item.id, item.userName)}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                {isLoading ? <ActivityIndicator size="small" color={COLORS.error} /> : (
                  <>
                    <Ionicons name="close-circle" size={16} color={COLORS.error} />
                    <Text style={styles.actionBtnRejectText}>Từ chối</Text>
                  </>
                )}
              </TouchableOpacity>
              {canApprove && (
                <TouchableOpacity
                  style={[styles.actionBtnApprove]}
                  onPress={() => handleApproveBooking(item.id, item.userName)}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  {isLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      <Text style={styles.actionBtnApproveText}>Duyệt</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Hoàn thành khi CONFIRMED và chuyến đã STARTED */}
          {isConfirmed && selectedTrip?.status === 'STARTED' && (
            <TouchableOpacity
              style={styles.actionBtnComplete}
              onPress={() => handleCompleteBooking(item.id, item.userName)}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              {isLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <Ionicons name="checkmark-done" size={15} color="#fff" />
                  <Text style={styles.actionBtnCompleteText}>Hoàn thành</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Nhắn tin cho khách đã được duyệt hoặc đang chờ duyệt */}
          {(isConfirmed || isWaiting) && (
            <TouchableOpacity
              style={[styles.chatBtn, { paddingVertical: 8, paddingHorizontal: 14 }]}
              onPress={() => {
                setSelectedTrip(null);
                navigation.navigate('Chat', {
                  bookingId: item.id,
                  passengerName: item.userName || 'Khách hàng',
                  passengerPhone: item.userPhone || '0987654321',
                  passengerAvatar: item.userAvatarUrl || null
                });
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubbles" size={15} color={COLORS.background} />
              <Text style={styles.chatBtnText}>Nhắn tin</Text>
            </TouchableOpacity>
          )}

          {/* Huy hiệu đã hoàn thành */}
          {isCompleted && (
            <View style={styles.completedPill}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              <Text style={styles.completedPillText}>Đã hoàn thành</Text>
            </View>
          )}
        </View>
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
          ListFooterComponent={
            totalTripsCount > 10 ? (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
                  disabled={page === 0 || loading}
                  onPress={() => fetchTrips(page - 1)}
                >
                  <Ionicons name="chevron-back" size={16} color={page === 0 ? COLORS.textMuted : COLORS.primary} />
                  <Text style={[styles.pageBtnText, page === 0 && styles.pageBtnTextDisabled]}>Trước</Text>
                </TouchableOpacity>

                <Text style={styles.pageInfoText}>
                  Trang <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>{page + 1}</Text> / {Math.max(1, Math.ceil(totalTripsCount / 10))}
                </Text>

                <TouchableOpacity
                  style={[styles.pageBtn, page >= Math.ceil(totalTripsCount / 10) - 1 && styles.pageBtnDisabled]}
                  disabled={page >= Math.ceil(totalTripsCount / 10) - 1 || loading}
                  onPress={() => fetchTrips(page + 1)}
                >
                  <Text style={[styles.pageBtnText, page >= Math.ceil(totalTripsCount / 10) - 1 && styles.pageBtnTextDisabled]}>Sau</Text>
                  <Ionicons name="chevron-forward" size={16} color={page >= Math.ceil(totalTripsCount / 10) - 1 ? COLORS.textMuted : COLORS.primary} />
                </TouchableOpacity>
              </View>
            ) : null
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
          ) : (() => {
            const validBookings = [...bookings]
              .filter(b => {
                const cancelledStatuses = ['REJECTED_BY_DRIVER', 'CANCELLED_USER', 'CANCELLED_DRIVER', 'CANCELLED_PAYMENT_FAILED', 'EXPIRED'];
                return !cancelledStatuses.includes(b.status);
              })
              .sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return timeB - timeA;
              });

            const filteredBookings = validBookings.filter(b => {
              if (bookingPickupFilter.trim()) {
                const q = bookingPickupFilter.trim().toLowerCase();
                if (!b.pickupAddressText || !b.pickupAddressText.toLowerCase().includes(q)) return false;
              }
              if (bookingDropoffFilter.trim()) {
                const q = bookingDropoffFilter.trim().toLowerCase();
                if (!b.dropoffAddressText || !b.dropoffAddressText.toLowerCase().includes(q)) return false;
              }
              return true;
            });

            const totalBookingPages = Math.max(1, Math.ceil(filteredBookings.length / 10));
            const paginatedBookings = filteredBookings.slice(bookingPage * 10, (bookingPage + 1) * 10);

            return (
              <FlatList
                data={paginatedBookings}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{ paddingVertical: 16 }}
                ListHeaderComponent={() => {
                  if (!selectedTrip) return null;
                  const sColor = getStatusColor(selectedTrip.status);
                  const { time, date } = formatDate(selectedTrip.departureTime);
                  const approvedBookings = (bookings || []).filter(b => ['CONFIRMED', 'COMPLETED'].includes(b.status));
                  const seatsBooked = approvedBookings.reduce((sum, b) => sum + (b.seatCount || 1), 0);
                  const waitingBookings = (bookings || []).filter(b => b.status === 'WAITING_DRIVER_APPROVAL');
                  const seatsWaiting = waitingBookings.reduce((sum, b) => sum + (b.seatCount || 1), 0);

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
                          <Text style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4, textTransform: 'uppercase', fontWeight: 'bold' }}>Ghế đã duyệt{seatsWaiting > 0 ? ` (chờ: ${seatsWaiting})` : ''}</Text>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.primary }}>
                            {seatsBooked}/{selectedTrip.seatTotal} ghế <Text style={{ fontSize: 12, fontWeight: 'normal', color: COLORS.textMuted }}>({approvedBookings.length} khách)</Text>
                          </Text>
                        </View>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <Text style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4, textTransform: 'uppercase', fontWeight: 'bold' }}>Doanh thu (Ước tính)</Text>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.success }}>{formatMoney((selectedTrip.priceVnd || 0) * seatsBooked)}</Text>
                        </View>
                      </View>

                      {/* ── Trip Action Buttons ── */}
                      {(selectedTrip.status === 'OPEN' || selectedTrip.status === 'FULL') && (
                        <TouchableOpacity
                          style={[styles.tripActionBtn, { backgroundColor: COLORS.primary }]}
                          disabled={actionLoading === 'trip-status'}
                          onPress={handleStartTrip}
                          activeOpacity={0.8}
                        >
                          {actionLoading === 'trip-status' ? <ActivityIndicator color="#fff" size="small" /> : (
                            <>
                              <Ionicons name="play-circle" size={18} color="#fff" />
                              <Text style={styles.tripActionBtnText}>Bắt đầu chuyến</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      {selectedTrip.status === 'STARTED' && (() => {
                        const uncompletedCount = (bookings || []).filter(b => b.status === 'CONFIRMED').length;
                        return (
                          <TouchableOpacity
                            style={[
                              styles.tripActionBtn,
                              { backgroundColor: uncompletedCount > 0 ? '#64748B' : COLORS.success }
                            ]}
                            disabled={actionLoading === 'trip-status'}
                            onPress={handleCompleteTrip}
                            activeOpacity={0.8}
                          >
                            {actionLoading === 'trip-status' ? <ActivityIndicator color="#fff" size="small" /> : (
                              <>
                                <Ionicons name="checkmark-done-circle" size={18} color="#fff" />
                                <Text style={styles.tripActionBtnText}>
                                  {uncompletedCount > 0
                                    ? `Hoàn thành chuyến (Còn ${uncompletedCount} khách)`
                                    : 'Hoàn thành chuyến'}
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        );
                      })()}

                      {(selectedTrip.status === 'OPEN' || selectedTrip.status === 'FULL') && (
                        <TouchableOpacity
                          style={[styles.tripActionBtn, { backgroundColor: COLORS.error, marginTop: 8 }]}
                          disabled={actionLoading === 'trip-status'}
                          onPress={handleCancelTrip}
                          activeOpacity={0.8}
                        >
                          {actionLoading === 'trip-status' ? <ActivityIndicator color="#fff" size="small" /> : (
                            <>
                              <Ionicons name="close-circle" size={18} color="#fff" />
                              <Text style={styles.tripActionBtnText}>Huỷ chuyến</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      {/* Lọc điểm đón/trả của khách trong chuyến */}
                      <View style={{ marginTop: 20, marginBottom: 12 }}>
                        <Text style={{ fontSize: 15, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 }}>
                          Danh sách khách ({filteredBookings.length})
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 8, height: 36 }}>
                            <Ionicons name="location" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                            <TextInput
                              style={{ flex: 1, fontSize: 12, color: COLORS.text, paddingVertical: 0 }}
                              placeholder="Lọc đón..."
                              placeholderTextColor={COLORS.textMuted}
                              value={bookingPickupFilter}
                              onChangeText={(t) => { setBookingPickupFilter(t); setBookingPage(0); }}
                            />
                            {bookingPickupFilter ? (
                              <TouchableOpacity onPress={() => { setBookingPickupFilter(''); setBookingPage(0); }}>
                                <Ionicons name="close-circle" size={14} color={COLORS.textMuted} />
                              </TouchableOpacity>
                            ) : null}
                          </View>
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 8, height: 36 }}>
                            <Ionicons name="flag" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                            <TextInput
                              style={{ flex: 1, fontSize: 12, color: COLORS.text, paddingVertical: 0 }}
                              placeholder="Lọc trả..."
                              placeholderTextColor={COLORS.textMuted}
                              value={bookingDropoffFilter}
                              onChangeText={(t) => { setBookingDropoffFilter(t); setBookingPage(0); }}
                            />
                            {bookingDropoffFilter ? (
                              <TouchableOpacity onPress={() => { setBookingDropoffFilter(''); setBookingPage(0); }}>
                                <Ionicons name="close-circle" size={14} color={COLORS.textMuted} />
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                }}
                renderItem={renderBookingItem}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={
                  filteredBookings.length > 10 ? (
                    <View style={styles.paginationRow}>
                      <TouchableOpacity
                        style={[styles.pageBtn, bookingPage === 0 && styles.pageBtnDisabled]}
                        disabled={bookingPage === 0}
                        onPress={() => setBookingPage(p => Math.max(0, p - 1))}
                      >
                        <Ionicons name="chevron-back" size={16} color={bookingPage === 0 ? COLORS.textMuted : COLORS.primary} />
                        <Text style={[styles.pageBtnText, bookingPage === 0 && styles.pageBtnTextDisabled]}>Trước</Text>
                      </TouchableOpacity>
                      <Text style={styles.pageInfoText}>
                        Trang <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>{bookingPage + 1}</Text> / {totalBookingPages}
                      </Text>
                      <TouchableOpacity
                        style={[styles.pageBtn, bookingPage >= totalBookingPages - 1 && styles.pageBtnDisabled]}
                        disabled={bookingPage >= totalBookingPages - 1}
                        onPress={() => setBookingPage(p => Math.min(totalBookingPages - 1, p + 1))}
                      >
                        <Text style={[styles.pageBtnText, bookingPage >= totalBookingPages - 1 && styles.pageBtnTextDisabled]}>Sau</Text>
                        <Ionicons name="chevron-forward" size={16} color={bookingPage >= totalBookingPages - 1 ? COLORS.textMuted : COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  <View style={styles.emptyBookingBox}>
                    <Ionicons name="people-circle-outline" size={60} color={COLORS.border} />
                    <Text style={styles.emptyBookingText}>
                      {bookingPickupFilter || bookingDropoffFilter ? 'Không tìm thấy khách theo điểm đón/trả.' : 'Chưa có khách nào đặt vé chuyến này.'}
                    </Text>
                  </View>
                }
              />
            );
          })()}
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

              {/* Lọc theo Điểm đón & Điểm trả chi tiết */}
              <Text style={[styles.label, { marginTop: 12 }]}>Điểm đón (Địa chỉ / Trạm đón)</Text>
              <View style={styles.addressInputBox}>
                <Ionicons name="location" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textFilterInput}
                  placeholder="Nhập địa chỉ hoặc từ khóa điểm đón..."
                  placeholderTextColor={COLORS.textMuted}
                  value={filters.pickupAddress}
                  onChangeText={(txt) => setFilters(p => ({ ...p, pickupAddress: txt }))}
                />
                {filters.pickupAddress ? (
                  <TouchableOpacity onPress={() => setFilters(p => ({ ...p, pickupAddress: '' }))}>
                    <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <Text style={[styles.label, { marginTop: 12 }]}>Điểm trả (Địa chỉ / Trạm trả)</Text>
              <View style={styles.addressInputBox}>
                <Ionicons name="flag" size={18} color="#F59E0B" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textFilterInput}
                  placeholder="Nhập địa chỉ hoặc từ khóa điểm trả..."
                  placeholderTextColor={COLORS.textMuted}
                  value={filters.dropoffAddress}
                  onChangeText={(txt) => setFilters(p => ({ ...p, dropoffAddress: txt }))}
                />
                {filters.dropoffAddress ? (
                  <TouchableOpacity onPress={() => setFilters(p => ({ ...p, dropoffAddress: '' }))}>
                    <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                ) : null}
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
                  setFilters({ startProvinceId: '', endProvinceId: '', startDate: null, endDate: null, pickupAddress: '', dropoffAddress: '' });
                  fetchTrips(0);
                  setShowFilter(false);
                }}
              >
                <Text style={styles.resetBtnText}>Xóa lọc</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => { fetchTrips(0); setShowFilter(false); }}>
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

  // Approve / Reject Buttons
  actionBtnApprove: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.success, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, shadowColor: COLORS.success, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
  actionBtnApproveText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  actionBtnReject: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  actionBtnRejectText: { color: COLORS.error, fontSize: 13, fontWeight: 'bold' },
  cannotApproveNotice: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239, 68, 68, 0.08)', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  cannotApproveNoticeText: { fontSize: 12, color: COLORS.error, fontWeight: '600' },

  // Booking Code Badge
  bookingCodeBadge: { backgroundColor: 'rgba(14, 165, 233, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  bookingCodeText: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },

  // Call Button
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(14, 165, 233, 0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(14, 165, 233, 0.25)' },
  callBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' },

  // Action Complete Button
  actionBtnComplete: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.success, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, shadowColor: COLORS.success, shadowOpacity: 0.25, shadowRadius: 4, elevation: 3 },
  actionBtnCompleteText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  // Completed Pill
  completedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16, 185, 129, 0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  completedPillText: { color: COLORS.success, fontSize: 12, fontWeight: 'bold' },

  // Trip Action Buttons
  tripActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  tripActionBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },

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
  modalItemText: { color: COLORS.text, fontSize: 16 },

  // Address Input for Filter
  addressInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 8,
  },
  textFilterInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    paddingVertical: 0,
  },

  // Pagination
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    gap: 4,
  },
  pageBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.6,
    elevation: 0,
  },
  pageBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  pageBtnTextDisabled: {
    color: COLORS.textMuted,
  },
  pageInfoText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
