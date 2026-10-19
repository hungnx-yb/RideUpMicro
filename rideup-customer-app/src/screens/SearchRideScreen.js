import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Modal,
  Platform,
  Linking,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useStripe } from '@stripe/stripe-react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LocationMapPicker from '../components/LocationMapPicker';
import RadarSuccessModal from '../components/RadarSuccessModal';

const COLORS = {
  background: '#F8FAFC', surface: '#FFFFFF', primary: '#0ea5e9',
  text: '#0F172A', textMuted: '#64748B', error: '#ef4444',
  border: '#E2E8F0', green: '#10b981',
};
const SIZES = { small: 12, font: 14, medium: 16, large: 20, extraLarge: 24, title: 32 };

// Helper xóa dấu tiếng Việt để tìm kiếm không dấu / có dấu đều ra
const removeDiacritics = (str) => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

// ===== COMPONENT: Custom Dropdown =====
const DropdownSelect = ({ label, placeholder, value, options, onSelect, disabled }) => {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const selectedLabel = options.find(o => o.id === value)?.name || '';

  const filteredOptions = useMemo(() => {
    if (!keyword.trim()) return options;
    const q = removeDiacritics(keyword);
    const rawQ = keyword.trim().toLowerCase();
    return options.filter(o => o.name && (
      removeDiacritics(o.name).includes(q) ||
      o.name.toLowerCase().includes(rawQ)
    ));
  }, [options, keyword]);

  const handleOpen = () => {
    if (!disabled) {
      setKeyword('');
      setOpen(true);
    }
  };

  const handleClose = () => {
    setKeyword('');
    setOpen(false);
  };

  const handleSelect = (id) => {
    onSelect(id);
    handleClose();
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.dropdownBtn, disabled && styles.dropdownBtnDisabled]}
        onPress={handleOpen}
        activeOpacity={0.8}
      >
        <Text style={selectedLabel ? styles.dropdownValue : styles.dropdownPlaceholder} numberOfLines={1}>
          {selectedLabel || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={14} color={disabled ? COLORS.border : COLORS.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.ddModalContainer}
        >
          <TouchableOpacity style={styles.ddOverlay} activeOpacity={1} onPress={handleClose} />
          <View style={styles.ddSheet}>
            <View style={styles.ddHeader}>
              <Text style={styles.ddTitle}>{label}</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Ô tìm kiếm trên đầu droplist - gõ chữ là lọc ngay */}
            <View style={styles.ddSearchBox}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.ddSearchInput}
                placeholder="Nhập tên để lọc nhanh..."
                placeholderTextColor={COLORS.textMuted}
                value={keyword}
                onChangeText={setKeyword}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {keyword ? (
                <TouchableOpacity onPress={() => setKeyword('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Option: Tất cả */}
            {!keyword && (
              <TouchableOpacity
                style={styles.ddItem}
                onPress={() => handleSelect('')}
              >
                <Text style={[styles.ddItemText, !value && { color: COLORS.primary, fontWeight: 'bold' }]}>
                  -- Tất cả --
                </Text>
                {!value && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
              </TouchableOpacity>
            )}

            <FlatList
              data={filteredOptions}
              keyExtractor={item => String(item.id)}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.ddEmpty}>Không tìm thấy kết quả phù hợp</Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.ddItem}
                  onPress={() => handleSelect(item.id)}
                >
                  <Text style={[styles.ddItemText, item.id === value && { color: COLORS.primary, fontWeight: 'bold' }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  {item.id === value && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 340 }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};


// ===== COMPONENT: Custom Calendar =====
const DAYS_OF_WEEK = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS_VN = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

const CustomCalendar = ({ visible, selectedDate, onSelect, onClose }) => {
  const today = new Date();
  const [viewDate, setViewDate] = useState(selectedDate || today);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const isSameDay = (d1, d2) =>
    d1 && d2 &&
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  const isToday = (day) => isSameDay(new Date(year, month, day), today);
  const isPast = (day) => new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.calOverlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.calSheet}>
        {/* Header tháng/năm */}
        <View style={styles.calHeader}>
          <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
            <Ionicons name="chevron-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.calMonthTitle}>{MONTHS_VN[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Ngày trong tuần */}
        <View style={styles.calWeekRow}>
          {DAYS_OF_WEEK.map(d => (
            <Text key={d} style={styles.calWeekDay}>{d}</Text>
          ))}
        </View>

        {/* Grid ngày */}
        {rows.map((row, ri) => (
          <View key={ri} style={styles.calRow}>
            {row.map((day, di) => {
              const isSelected = day && isSameDay(new Date(year, month, day), selectedDate);
              const past = day && isPast(day);
              const todayDay = day && isToday(day);
              return (
                <TouchableOpacity
                  key={di}
                  style={[
                    styles.calCell,
                    isSelected && styles.calCellSelected,
                    todayDay && !isSelected && styles.calCellToday,
                  ]}
                  onPress={() => {
                    if (!day || past) return;
                    onSelect(new Date(year, month, day));
                    onClose();
                  }}
                  disabled={!day || past}
                >
                  <Text style={[
                    styles.calDayText,
                    isSelected && styles.calDayTextSelected,
                    past && styles.calDayTextPast,
                    todayDay && !isSelected && styles.calDayTextToday,
                  ]}>{day || ''}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Footer buttons */}
        <View style={styles.calFooter}>
          <TouchableOpacity onPress={() => { onSelect(null); onClose(); }}>
            <Text style={styles.calClearBtn}>Xóa</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { onSelect(today); onClose(); }}>
            <Text style={styles.calTodayBtn}>Hôm nay</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};


// ===== MAIN SCREEN =====
export default function SearchRideScreen({ navigation, route }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [provinces, setProvinces] = useState([]);
  const [startWards, setStartWards] = useState([]);
  const [endWards, setEndWards] = useState([]);

  // UX states
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);

  const [startProvinceId, setStartProvinceId] = useState('');
  const [startWardId, setStartWardId] = useState('');
  const [endProvinceId, setEndProvinceId] = useState('');
  const [endWardId, setEndWardId] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loadingStartWards, setLoadingStartWards] = useState(false);
  const [loadingEndWards, setLoadingEndWards] = useState(false);

  // Booking Modal State
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [seatCount, setSeatCount] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [bookingNote, setBookingNote] = useState('');
  const [bookingIdempotencyKey, setBookingIdempotencyKey] = useState('');
  const [acceptedInvitationId, setAcceptedInvitationId] = useState(null);

  // Success Modal State
  const [successBooking, setSuccessBooking] = useState(null);
  const [isRedirectingPayment, setIsRedirectingPayment] = useState(false);
  const [stripeCheckoutData, setStripeCheckoutData] = useState(null);
  const [isStripePaying, setIsStripePaying] = useState(false);

  // Marketplace States
  const [isRequestModalVisible, setIsRequestModalVisible] = useState(false);
  const [isRadarVisible, setIsRadarVisible] = useState(false);
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [requestSeatCount, setRequestSeatCount] = useState(1);
  const [requestStartAddress, setRequestStartAddress] = useState('');
  const [requestEndAddress, setRequestEndAddress] = useState('');
  const [requestDepartureDate, setRequestDepartureDate] = useState(new Date());
  const [requestNote, setRequestNote] = useState('');
  const [showRequestDatePicker, setShowRequestDatePicker] = useState(false);

  // Mở modal phát tín hiệu: Tự động lấy toàn bộ dữ liệu từ bộ lọc tìm kiếm
  const handleOpenRequestModal = () => {
    if (!startProvinceId || !endProvinceId) {
      Alert.alert(
        'Chưa chọn tuyến đường',
        'Vui lòng chọn Tỉnh/Thành đi và Tỉnh/Thành đến trong phần tìm kiếm trước khi phát tín hiệu tìm xe.',
        [
          { 
            text: 'Mở bộ lọc', 
            onPress: () => setIsFilterExpanded(true) 
          }
        ]
      );
      return;
    }

    const startProv = provinces.find(p => p.id === startProvinceId)?.name || '';
    const startW = startWards.find(w => w.id === startWardId)?.name || '';
    const endProv = provinces.find(p => p.id === endProvinceId)?.name || '';
    const endW = endWards.find(w => w.id === endWardId)?.name || '';

    const defaultStart = startW ? `${startW}, ${startProv}` : startProv;
    const defaultEnd = endW ? `${endW}, ${endProv}` : endProv;

    setRequestStartAddress(defaultStart);
    setRequestEndAddress(defaultEnd);

    // Xử lý thời gian khởi hành hợp lệ (> now + 30 phút theo yêu cầu backend)
    const now = new Date();
    let initialDate;
    if (selectedDate) {
      initialDate = new Date(selectedDate);
      if (initialDate.toDateString() === now.toDateString()) {
        initialDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 tiếng sau hiện tại
      } else {
        initialDate.setHours(8, 0, 0, 0); // 8:00 sáng
      }
    } else {
      initialDate = new Date(now.getTime() + 60 * 60 * 1000);
    }

    setRequestDepartureDate(initialDate);
    setRequestSeatCount(1);
    setRequestNote('');
    setIsRequestModalVisible(true);
  };

  const handleCreateTripRequest = async () => {
    if (!startProvinceId || !endProvinceId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn Tỉnh/Thành đi và Tỉnh/Thành đến.');
      return;
    }
    if (!requestStartAddress || !requestStartAddress.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập địa chỉ điểm đón cụ thể.');
      return;
    }
    if (!requestEndAddress || !requestEndAddress.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập địa chỉ điểm đến cụ thể.');
      return;
    }

    const minTime = new Date(Date.now() + 30 * 60 * 1000);
    if (requestDepartureDate < minTime) {
      Alert.alert(
        'Thời gian không hợp lệ',
        'Thời gian khởi hành phải cách hiện tại ít nhất 30 phút để tài xế kịp tiếp nhận chuyến đi.'
      );
      return;
    }

    setIsCreatingRequest(true);
    try {
      const tzOffset = requestDepartureDate.getTimezoneOffset() * 60000;
      const localISOTime = new Date(requestDepartureDate.getTime() - tzOffset).toISOString().slice(0, 19);

      const payload = {
        startProvinceId,
        startWardId: startWardId || undefined,
        endProvinceId,
        endWardId: endWardId || undefined,
        startAddressText: requestStartAddress.trim(),
        endAddressText: requestEndAddress.trim(),
        departureTime: localISOTime,
        seatTotal: requestSeatCount,
        note: requestNote.trim() || 'Khách đang tìm xe ghép nhanh',
      };

      const res = await apiService.createTripRequest(payload);
      if (res.data.code === 1000) {
        setIsRequestModalVisible(false);
        setIsRadarVisible(true);
      } else {
        Alert.alert('Lỗi', res.data.message || 'Không thể tạo yêu cầu tìm xe.');
      }
    } catch (error) {
      console.log('createTripRequest error:', error?.response?.data || error);
      Alert.alert('Lỗi', error?.response?.data?.message || 'Có lỗi xảy ra khi phát tín hiệu tìm xe.');
    } finally {
      setIsCreatingRequest(false);
    }
  };

  const [pickupWardId, setPickupWardId] = useState('');
  const [pickupLocation, setPickupLocation] = useState({ lat: NaN, lng: NaN, addressText: '' });

  const [dropoffWardId, setDropoffWardId] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState({ lat: NaN, lng: NaN, addressText: '' });

  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    fetchTrips(0, false); // Không thu gọn bộ lọc trong lần tải đầu tiên
    fetchProvinces();
  }, []);

  useEffect(() => {
    if (route?.params?.prefillInvitation && route?.params?.tripRequest) {
      const { prefillInvitation, tripRequest } = route.params;
      const fakeTrip = {
        id: prefillInvitation.tripId,
        driverName: prefillInvitation.driverName,
        stops: [], // Không có sẵn stops từ lời mời, map picker sẽ cho chọn toàn phường
        seatAvailable: tripRequest.seatTotal,
        priceVnd: prefillInvitation.price || 0,
        startAddressText: tripRequest.startProvinceName,
        endAddressText: tripRequest.endProvinceName,
      };
      
      setSelectedTrip(fakeTrip);
      setPickupWardId(tripRequest.startWardId || '');
      setDropoffWardId(tripRequest.endWardId || '');
      setSeatCount(tripRequest.seatTotal || 1);
      setPaymentMethod('STRIPE'); // Ưu tiên thanh toán online cho Marketplace
      setBookingNote('');
      setBookingIdempotencyKey(generateUuid());
      setAcceptedInvitationId(prefillInvitation.id);
    }
  }, [route?.params]);

  useEffect(() => {
    if (startProvinceId) {
      setLoadingStartWards(true);
      setStartWardId('');
      apiService.getAllWards(startProvinceId)
        .then(res => { if (res?.data?.result) setStartWards(res.data.result); })
        .catch(e => console.log(e))
        .finally(() => setLoadingStartWards(false));
    } else {
      setStartWards([]);
      setStartWardId('');
    }
  }, [startProvinceId]);

  useEffect(() => {
    if (endProvinceId) {
      setLoadingEndWards(true);
      setEndWardId('');
      apiService.getAllWards(endProvinceId)
        .then(res => { if (res?.data?.result) setEndWards(res.data.result); })
        .catch(e => console.log(e))
        .finally(() => setLoadingEndWards(false));
    } else {
      setEndWards([]);
      setEndWardId('');
    }
  }, [endProvinceId]);

  const fetchProvinces = async () => {
    try {
      const res = await apiService.getAllProvinces();
      if (res?.data?.result) setProvinces(res.data.result);
    } catch (e) {
      console.log('fetchProvinces error:', e);
    }
  };

  const fetchTrips = async (targetPage = 0, autoCollapse = true) => {
    setLoading(true);
    if (autoCollapse) {
      // Chỉ thu gọn khi bấm nút Tìm kiếm
      setIsFilterExpanded(false);
    }
    try {
      const dateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : undefined;
      const response = await apiService.getAllTrips({
        startProvinceId: startProvinceId || undefined,
        startWardId: startWardId || undefined,
        endProvinceId: endProvinceId || undefined,
        endWardId: endWardId || undefined,
        date: dateStr,
        page: targetPage,
        size: 10
      });
      const count = response?.data?.count ?? 0;
      setTotalElements(count);
      setPage(targetPage);

      let list = [];
      if (Array.isArray(response?.data?.result)) {
        list = response.data.result;
      } else if (response?.data?.result?.items) {
        list = response.data.result.items;
      }

      // Đảm bảo chỉ hiển thị chuyến xe khởi hành >= hôm nay
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      list = list.filter(t => !t.departureTime || new Date(t.departureTime) >= now);

      // Sắp xếp theo thời gian tạo chuyến giảm dần (createdAt DESC)
      list.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      setTrips(list);
    } catch (error) {
      console.log('Fetch trips error:', error);
      setTrips([]);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  const generateUuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleOpenBooking = (trip) => {
    setSelectedTrip(trip);
    const pickups = trip.stops?.filter(s => s.stopType === 'PICKUP') || [];
    const dropoffs = trip.stops?.filter(s => s.stopType === 'DROPOFF') || [];
    setPickupWardId(pickups[0]?.wardId || '');
    setDropoffWardId(dropoffs[0]?.wardId || '');
    setPickupLocation({ lat: NaN, lng: NaN, addressText: '' });
    setDropoffLocation({ lat: NaN, lng: NaN, addressText: '' });
    setSeatCount(1);
    setPaymentMethod('CASH');
    setBookingNote('');
    setBookingIdempotencyKey(generateUuid());
    setAcceptedInvitationId(null); // Reset when manually booking
  };

  const confirmBooking = async () => {
    if (!selectedTrip) return;
    const pickupAddr = pickupLocation.addressText?.trim();
    const dropoffAddr = dropoffLocation.addressText?.trim();
    if (!pickupWardId || !pickupAddr || !pickupAddr.length) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn phường/xã và địa chỉ chi tiết điểm đón');
      return;
    }
    if (!dropoffWardId || !dropoffAddr || !dropoffAddr.length) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn phường/xã và địa chỉ chi tiết điểm trả');
      return;
    }
    setIsBooking(true);

    // 1. ƯU TIÊN KIỂM TRA TRÙNG BOOKING TRƯỚC TIÊN (cho cả CASH và STRIPE)
    try {
      await apiService.checkDuplicateBooking(selectedTrip.id);
    } catch (error) {
      setIsBooking(false);
      const errData = error?.response?.data;
      const errMsg = errData?.message || 'Bạn đã có vé đang hoạt động cho chuyến xe này. Không thể đặt thêm.';
      Alert.alert('Không thể đặt chuyến', errMsg);
      return;
    }

    const pickupWardName = selectedTrip?.stops?.find(s => String(s.wardId) === String(pickupWardId))?.addressText || '';
    const dropoffWardName = selectedTrip?.stops?.find(s => String(s.wardId) === String(dropoffWardId))?.addressText || '';
    const startProvName = selectedTrip?.startAddressText || '';
    const endProvName = selectedTrip?.endAddressText || '';

    const buildFullAddress = (detail, ward, province) => {
      let parts = [];
      if (detail) parts.push(detail);
      if (ward && (!detail || !removeDiacritics(detail).includes(removeDiacritics(ward)))) {
        parts.push(ward);
      }
      if (province && (!detail || !removeDiacritics(detail).includes(removeDiacritics(province)))) {
        parts.push(province);
      }
      return parts.join(', ');
    };

    const fullPickupAddress = buildFullAddress(pickupAddr, pickupWardName, startProvName);
    const fullDropoffAddress = buildFullAddress(dropoffAddr, dropoffWardName, endProvName);

    const payload = {
      tripId: selectedTrip.id,
      seatCount: seatCount,
      paymentMethod: paymentMethod,
      pickupLat: pickupLocation.lat || 0,
      pickupLng: pickupLocation.lng || 0,
      pickupWardId: pickupWardId,
      pickupAddressText: fullPickupAddress,
      dropoffLat: dropoffLocation.lat || 0,
      dropoffLng: dropoffLocation.lng || 0,
      dropoffWardId: dropoffWardId,
      dropoffAddressText: fullDropoffAddress,
      note: bookingNote.trim() || 'Đặt qua Mobile App',
    };

    if (acceptedInvitationId) {
      payload.invitationId = acceptedInvitationId;
    }

    // Nếu chọn STRIPE: KHÔNG tạo booking ngay! Hiển thị popup direct thanh toán + nút thay đổi phương thức
    if (paymentMethod === 'STRIPE') {
      Keyboard.dismiss();
      setIsBooking(false);
      setStripeCheckoutData({
        trip: selectedTrip,
        payload: payload,
        totalAmount: (selectedTrip?.priceVnd || 0) * seatCount,
        seatCount: seatCount,
      });
      return;
    }

    // Với CASH: Tạo booking trực tiếp
    try {
      const response = await apiService.createBooking(payload, bookingIdempotencyKey);
      if (response.data.code === 1000) {
        const result = response.data.result;
        setSelectedTrip(null);
        setBookingIdempotencyKey('');
        setAcceptedInvitationId(null);
        setSuccessBooking({
          id: result.id,
          bookingCode: result.bookingCode || '',
          paymentMethod: 'CASH',
        });
      } else {
        Alert.alert('Lỗi', response.data.message || 'Lỗi đặt chuyến');
      }
    } catch (error) {
      const errData = error?.response?.data;
      const errMsg = errData?.message || error?.message || 'Không thể tạo booking. Vui lòng thử lại.';
      Alert.alert('Lỗi đặt chỗ', errMsg);
    } finally {
      setIsBooking(false);
    }
  };

  const handleStripeDirectPay = async () => {
    if (!stripeCheckoutData || isStripePaying) return;
    setIsStripePaying(true);
    try {
      // 1. Tạo Stripe Payment Intent trên payment-service (chưa tạo booking)
      const res = await apiService.createPaymentIntent({
        amount: stripeCheckoutData.totalAmount,
        tripId: stripeCheckoutData.trip?.id,
      });

      const intentData = res?.data?.result;
      if (!intentData?.clientSecret) {
        Alert.alert('Lỗi khởi tạo', 'Không thể tạo thông tin thanh toán Stripe. Vui lòng thử lại.');
        setIsStripePaying(false);
        return;
      }

      // 2. Khởi tạo Stripe PaymentSheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'RideUp',
        paymentIntentClientSecret: intentData.clientSecret,
      });

      if (initError) {
        Alert.alert('Lỗi khởi tạo', initError.message);
        setIsStripePaying(false);
        return;
      }

      // 3. Hiển thị PaymentSheet để người dùng thanh toán
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Thanh toán thất bại', presentError.message || 'Giao dịch chưa hoàn thành');
        }
        setIsStripePaying(false);
        return;
      }

      // 4. Thanh toán thành công! CHỈ KHI NÀY MỚI TẠO BOOKING
      const bookingPayload = {
        ...stripeCheckoutData.payload,
        paymentIntentId: intentData.paymentIntentId,
      };

      const key = bookingIdempotencyKey || generateUuid();
      const createRes = await apiService.createBooking(bookingPayload, key);

      if (createRes.data.code === 1000) {
        const result = createRes.data.result;
        setStripeCheckoutData(null);
        setSelectedTrip(null);
        setBookingIdempotencyKey('');
        setStripeSuccessBooking({
          id: result.id,
          bookingCode: result.bookingCode || '',
        });
      } else {
        Alert.alert('Lỗi tạo booking', createRes.data.message || 'Không thể ghi nhận đặt chỗ.');
      }
    } catch (error) {
      console.error('Stripe direct pay error:', error);
      const errData = error?.response?.data;
      const errMsg = errData?.message || error?.message || 'Không thể hoàn tất thanh toán. Vui lòng thử lại.';
      Alert.alert('Lỗi thanh toán', errMsg);
    } finally {
      setIsStripePaying(false);
    }
  };

  const handleChangePaymentMethod = () => {
    // Đóng popup Stripe, giữ modal đặt chỗ và chuyển phương thức sang Tiền mặt
    setStripeCheckoutData(null);
    setPaymentMethod('CASH');
  };

  // Retry lấy link tối đa 6 lần
  const getUrlWithRetry = async (bookingId) => {
    const maxAttempts = 600; // Tăng lên 60 giây để debug backend thoải mái
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await apiService.getPaymentUrl(bookingId);
        const result = res?.data?.result;
        if (result?.paymentUrl) return result;
      } catch (err) {
        if (attempt === maxAttempts) throw err;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    return null;
  };

  const [stripeSuccessBooking, setStripeSuccessBooking] = useState(null);

  const handlePayNow = async () => {
    if (!successBooking?.id || isRedirectingPayment) return;
    setIsRedirectingPayment(true);
    try {
      const paymentData = await getUrlWithRetry(successBooking.id);
      if (!paymentData || !paymentData.paymentUrl) {
        Alert.alert('Chưa sẵn sàng', 'Chưa lấy được thông tin thanh toán. Vui lòng thử lại.');
        setIsRedirectingPayment(false);
        return;
      }

      if (successBooking.paymentMethod === 'STRIPE') {
        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: 'RideUp',
          paymentIntentClientSecret: paymentData.paymentUrl,
        });
        if (initError) {
          Alert.alert('Lỗi khởi tạo', initError.message);
          setIsRedirectingPayment(false);
          return;
        }

        // Đợi 1 chút trước khi hiển thị Stripe để UI ổn định (nhưng KHÔNG ĐÓNG modal cũ, tránh xung đột View gốc của HĐH)
        const currentBooking = successBooking;

        const { error: presentError } = await presentPaymentSheet();
        
        if (presentError) {
          Alert.alert('Thanh toán thất bại', presentError.message);
        } else {
          // Báo cho backend biết đã thanh toán thành công
          try {
            await apiService.markPaymentPaid(paymentData.id, paymentData.transactionId);
          } catch (e) {
            console.warn('Lỗi cập nhật backend:', e);
          }
          // Chuyển đổi mượt mà từ Modal thông báo sang Modal Thành công xịn xò
          setSuccessBooking(null);
          setTimeout(() => {
            setStripeSuccessBooking(currentBooking);
          }, 300);
        }
      }
    } catch (error) {
      Alert.alert('Lỗi thanh toán', 'Không thể khởi tạo thanh toán. Vui lòng thử lại.');
    } finally {
      setIsRedirectingPayment(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };
  const formatDate = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };
  const formatMoney = (val) => `${Number(val || 0).toLocaleString('vi-VN')}đ`;

  const formatDuration = (dep, arr) => {
    if (!dep || !arr) return null;
    const mins = Math.round((new Date(arr) - new Date(dep)) / 60000);
    if (mins < 60) return `${mins} phút`;
    return `${Math.floor(mins / 60)}g${mins % 60 > 0 ? (mins % 60) + 'p' : ''}`;
  };

  const formatRating = (rating) => {
    const val = rating != null && !isNaN(rating) && Number(rating) > 0 ? Number(rating).toFixed(1) : '5.0';
    return `${val}/5 sao`;
  };

  const renderTrip = ({ item }) => {
    const seats = item.seatAvailable ?? item.seatTotal ?? 0;
    const seatColor = seats === 0 ? COLORS.error : seats <= 2 ? '#f97316' : COLORS.green;
    const duration = formatDuration(item.departureTime, item.estimatedArrivalTime);

    return (
      <TouchableOpacity style={styles.tripCard} onPress={() => handleOpenBooking(item)} activeOpacity={0.92}>

        {/* === HEADER: TÀI XẾ === */}
        <View style={styles.cardHeader}>
          <View style={styles.driverRow}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{(item.driverName || 'D').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName} numberOfLines={1}>{item.driverName || 'Tài xế RideUp'}</Text>
              <Text style={styles.vehicleInfo} numberOfLines={1}>
                ⭐ {formatRating(item.driverRating)} • 🚗 {item.vehicleBrand} {item.vehicleModel}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bookBtn} onPress={() => handleOpenBooking(item)}>
            <Text style={styles.bookBtnText}>Đặt ngay</Text>
          </TouchableOpacity>
        </View>

        {/* === BODY: LỘ TRÌNH === */}
        <View style={styles.cardBody}>
          {/* Ngày khởi hành */}
          {item.departureTime ? (
            <View style={styles.departureDateBanner}>
              <Ionicons name="calendar-outline" size={13} color={COLORS.primary} style={{ marginRight: 5 }} />
              <Text style={styles.departureDateBannerText}>
                Ngày khởi hành: <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>{formatDate(item.departureTime)}</Text>
              </Text>
            </View>
          ) : null}

          <View style={styles.routeRow}>
            <View style={styles.timeBox}>
              <Text style={styles.timeText}>{formatTime(item.departureTime)}</Text>
            </View>
            <View style={styles.iconBox}>
              <Ionicons name="location" size={18} color={COLORS.primary} />
              <View style={styles.routeLine} />
            </View>
            <View style={styles.addressBox}>
              <Text style={styles.addressText} numberOfLines={1}>{item.startAddressText || 'Điểm đón'}</Text>
              {item.stops?.filter(s => s.stopType === 'PICKUP').map((s, i) => (
                <Text key={`pickup-${i}`} style={styles.subAddressText} numberOfLines={1}>↳ {s.addressText}</Text>
              ))}
            </View>
          </View>

          <View style={styles.routeRow}>
            <View style={styles.timeBox}>
              <Text style={styles.timeText}>{formatTime(item.estimatedArrivalTime)}</Text>
              {duration && <Text style={styles.durationText}>{duration}</Text>}
            </View>
            <View style={styles.iconBox}>
              <Ionicons name="flag" size={18} color="#F59E0B" />
            </View>
            <View style={styles.addressBox}>
              <Text style={styles.addressText} numberOfLines={1}>{item.endAddressText || 'Điểm đến'}</Text>
              {item.stops?.filter(s => s.stopType === 'DROPOFF').map((s, i) => (
                <Text key={`dropoff-${i}`} style={styles.subAddressText} numberOfLines={1}>↳ {s.addressText}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* === FOOTER: GIÁ + CHỖ === */}
        <View style={styles.cardFooter}>
          <View style={styles.priceWrap}>
            <Text style={styles.priceLabel}>GIÁ VÉ</Text>
            <Text style={styles.priceAmount}>{formatMoney(item.priceVnd)}<Text style={styles.priceUnit}>/người</Text></Text>
          </View>
          <View style={[styles.seatPill, { backgroundColor: seatColor + '15' }]}>
            <Ionicons name="people" size={14} color={seatColor} />
            <Text style={[styles.seatPillText, { color: seatColor }]}>
              {seats === 0 ? 'Hết chỗ' : `Còn ${seats} chỗ`}
            </Text>
          </View>
        </View>

      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>RIDEUP</Text>
          <Text style={styles.headerTitle}>Tìm chuyến đi</Text>
        </View>
      </View>

      {/* Search Filter Card */}
      <View style={styles.filterCard}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => setIsFilterExpanded(!isFilterExpanded)} activeOpacity={0.8}>
          <View>
            <Text style={styles.brandText}>RIDEUP NOW</Text>
            <Text style={styles.cardTitle}>Bạn muốn đi đâu hôm nay?</Text>
          </View>
          <View style={styles.toggleBtn}>
            <Text style={styles.toggleBtnText}>{isFilterExpanded ? 'Thu gọn' : 'Mở rộng'}</Text>
            <Ionicons name={isFilterExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.primary} />
          </View>
        </TouchableOpacity>

        {isFilterExpanded && (
          <View style={styles.filterBody}>
            {/* Row 1: Điểm đi */}
            <View style={styles.filterRow}>
              <View style={styles.filterCol}>
                <Text style={styles.filterLabel}>TỈNH/THÀNH ĐI</Text>
                <DropdownSelect
                  label="Chọn Tỉnh/Thành đi"
                  placeholder="Chọn tỉnh/thành đi"
                  value={startProvinceId}
                  options={provinces}
                  onSelect={setStartProvinceId}
                />
              </View>
              <View style={styles.filterCol}>
                <Text style={styles.filterLabel}>PHƯỜNG/XÃ ĐI</Text>
                {loadingStartWards
                  ? <ActivityIndicator size="small" color={COLORS.primary} style={{ height: 44, alignSelf: 'center' }} />
                  : <DropdownSelect
                    label="Chọn Phường/Xã đi"
                    placeholder="Chọn phường/xã đi"
                    value={startWardId}
                    options={startWards}
                    onSelect={setStartWardId}
                    disabled={startWards.length === 0}
                  />
                }
              </View>
            </View>

            {/* Row 2: Điểm đến */}
            <View style={styles.filterRow}>
              <View style={styles.filterCol}>
                <Text style={styles.filterLabel}>TỈNH/THÀNH ĐẾN</Text>
                <DropdownSelect
                  label="Chọn Tỉnh/Thành đến"
                  placeholder="Chọn tỉnh/thành đến"
                  value={endProvinceId}
                  options={provinces}
                  onSelect={setEndProvinceId}
                />
              </View>
              <View style={styles.filterCol}>
                <Text style={styles.filterLabel}>PHƯỜNG/XÃ ĐẾN</Text>
                {loadingEndWards
                  ? <ActivityIndicator size="small" color={COLORS.primary} style={{ height: 44, alignSelf: 'center' }} />
                  : <DropdownSelect
                    label="Chọn Phường/Xã đến"
                    placeholder="Chọn phường/xã đến"
                    value={endWardId}
                    options={endWards}
                    onSelect={setEndWardId}
                    disabled={endWards.length === 0}
                  />
                }
              </View>
            </View>

            {/* Row 3: Ngày đi + Nút tìm */}
            <View style={styles.filterRow}>
              <View style={styles.filterCol}>
                <Text style={styles.filterLabel}>NGÀY ĐI</Text>
                <TouchableOpacity style={styles.dateBox} onPress={() => setShowDatePicker(true)}>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
                  <Text style={selectedDate ? styles.dateValue : styles.datePlaceholder}>
                    {selectedDate
                      ? selectedDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : 'mm/dd/yyyy'}
                  </Text>
                  {selectedDate && (
                    <TouchableOpacity onPress={() => setSelectedDate(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
                <CustomCalendar
                  visible={showDatePicker}
                  selectedDate={selectedDate}
                  onSelect={setSelectedDate}
                  onClose={() => setShowDatePicker(false)}
                />
              </View>
              <View style={[styles.filterCol, { justifyContent: 'flex-end' }]}>
                <TouchableOpacity style={styles.searchBtn} onPress={() => fetchTrips(0, true)}>
                  <Ionicons name="search" size={15} color={COLORS.text} style={{ marginRight: 5 }} />
                  <Text style={styles.searchBtnText}>Tìm chuyến</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Trip List */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={renderTrip}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40, paddingHorizontal: 20 }}>
              <Ionicons name="car-sport-outline" size={60} color={COLORS.border} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>Chưa có chuyến xe nào đang mở.</Text>
              <Text style={{ textAlign: 'center', color: COLORS.textMuted, fontSize: 13, marginTop: 8, marginBottom: 24, lineHeight: 20 }}>
                Bạn có muốn phát tín hiệu đến các tài xế quanh đây để họ chủ động liên hệ không?
              </Text>
              <TouchableOpacity 
                style={{ backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 30, flexDirection: 'row', alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}
                onPress={handleOpenRequestModal}
              >
                <Ionicons name="radio-outline" size={20} color={COLORS.surface} style={{ marginRight: 8 }} />
                <Text style={{ color: COLORS.surface, fontWeight: 'bold', fontSize: 15 }}>Phát Tín Hiệu Tìm Xe</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            trips.length > 0 ? (
              <View>
                {totalElements > 10 && (
                  <View style={styles.paginationRow}>
                    <TouchableOpacity
                      style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
                      disabled={page === 0 || loading}
                      onPress={() => fetchTrips(page - 1, false)}
                    >
                      <Ionicons name="chevron-back" size={16} color={page === 0 ? COLORS.border : COLORS.primary} />
                      <Text style={[styles.pageBtnText, page === 0 && styles.pageBtnTextDisabled]}>Trước</Text>
                    </TouchableOpacity>

                    <Text style={styles.pageInfoText}>
                      Trang <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>{page + 1}</Text> / {Math.max(1, Math.ceil(totalElements / 10))}
                    </Text>

                    <TouchableOpacity
                      style={[styles.pageBtn, (page >= Math.ceil(totalElements / 10) - 1) && styles.pageBtnDisabled]}
                      disabled={page >= Math.ceil(totalElements / 10) - 1 || loading}
                      onPress={() => fetchTrips(page + 1, false)}
                    >
                      <Text style={[styles.pageBtnText, (page >= Math.ceil(totalElements / 10) - 1) && styles.pageBtnTextDisabled]}>Sau</Text>
                      <Ionicons name="chevron-forward" size={16} color={(page >= Math.ceil(totalElements / 10) - 1) ? COLORS.border : COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                )}
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 10 }}>
                    Không tìm thấy chuyến xe phù hợp với lịch trình?
                  </Text>
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(14, 165, 233, 0.1)', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 }}
                    onPress={handleOpenRequestModal}
                  >
                    <Ionicons name="radio-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={{ color: COLORS.primary, fontWeight: 'bold', fontSize: 13 }}>
                      Phát tín hiệu để tài xế báo giá
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null
          }
        />
      )}

      {/* Booking Confirmation Modal */}
      <Modal visible={!!selectedTrip} transparent={false} animationType="slide" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <SafeAreaView style={styles.modalOverlay}>
            <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Xác nhận đặt chỗ</Text>
              <TouchableOpacity onPress={() => setSelectedTrip(null)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Bạn đang đặt chỗ trên chuyến xe của {selectedTrip?.driverName}.</Text>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalRoute}>
                <Text style={{ color: COLORS.textMuted }}>Từ: <Text style={{ color: COLORS.text }}>{selectedTrip?.startAddressText}</Text></Text>
                <Text style={{ color: COLORS.textMuted, marginTop: 8 }}>Đến: <Text style={{ color: COLORS.text }}>{selectedTrip?.endAddressText}</Text></Text>
              </View>

              <LocationMapPicker
                title="Điểm Đón"
                wardOptions={selectedTrip?.stops?.filter(s => s.stopType === 'PICKUP').map(s => ({ id: s.wardId, name: s.addressText })) || []}
                wardId={pickupWardId}
                onWardChange={(id) => {
                  setPickupWardId(id);
                  setPickupLocation({ lat: NaN, lng: NaN, addressText: '' });
                }}
                value={pickupLocation}
                onChange={setPickupLocation}
                accentColor="#0ea5e9"
              />

              <LocationMapPicker
                title="Điểm Trả"
                wardOptions={selectedTrip?.stops?.filter(s => s.stopType === 'DROPOFF').map(s => ({ id: s.wardId, name: s.addressText })) || []}
                wardId={dropoffWardId}
                onWardChange={(id) => {
                  setDropoffWardId(id);
                  setDropoffLocation({ lat: NaN, lng: NaN, addressText: '' });
                }}
                value={dropoffLocation}
                onChange={setDropoffLocation}
                accentColor="#0ea5e9"
              />

              <View style={styles.selectionRow}>
                <Text style={styles.selectionLabel}>Số lượng ghế:</Text>
                <View style={styles.counterBox}>
                  <TouchableOpacity onPress={() => setSeatCount(Math.max(1, seatCount - 1))} style={styles.counterBtn}>
                    <Text style={styles.counterText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{seatCount}</Text>
                  <TouchableOpacity onPress={() => setSeatCount(Math.min(selectedTrip?.seatAvailable || 1, seatCount + 1))} style={styles.counterBtn}>
                    <Text style={styles.counterText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.selectionRow}>
                <Text style={styles.selectionLabel}>Thanh toán:</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={[styles.payBtn, paymentMethod === 'CASH' && styles.payBtnActive]} onPress={() => setPaymentMethod('CASH')}>
                    <Text style={[styles.payBtnText, paymentMethod === 'CASH' && { color: COLORS.background }]}>Tiền mặt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.payBtn, paymentMethod === 'STRIPE' && styles.payBtnActive]} onPress={() => setPaymentMethod('STRIPE')}>
                    <Text style={[styles.payBtnText, paymentMethod === 'STRIPE' && { color: COLORS.background }]}>Stripe (Thẻ)</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modalPriceBox}>
                <Text style={styles.modalPriceLabel}>Tổng thanh toán</Text>
                <Text style={styles.modalPrice}>{formatMoney((selectedTrip?.priceVnd || 0) * seatCount)}</Text>
              </View>

              <View style={styles.noteBox}>
                <Text style={styles.noteLabel}>Ghi chú cho tài xế</Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder="VD: Đi được từ 7h, gọi trước 10 phút..."
                  placeholderTextColor={COLORS.textMuted}
                  value={bookingNote}
                  onChangeText={setBookingNote}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                  textAlignVertical="top"
                />
                <Text style={styles.noteCount}>{bookingNote.length}/200</Text>
              </View>

            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setSelectedTrip(null); }} disabled={isBooking}>
                <Text style={styles.cancelText}>ĐÓNG</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmBooking} disabled={isBooking}>
                {isBooking ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.confirmText}>XÁC NHẬN</Text>}
              </TouchableOpacity>
            </View>
          </View>
          </SafeAreaView>
        </KeyboardAvoidingView>

        {/* Stripe Direct Payment Overlay Popup - FULL SCREEN */}
        {!!stripeCheckoutData && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(15,23,42,0.85)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
            zIndex: 999999,
            elevation: 999999,
          }}>
            <View style={{ width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 30, elevation: 25, position: 'relative' }}>
              {/* Close button top right */}
              <TouchableOpacity 
                style={{ position: 'absolute', top: 16, right: 16, padding: 6, zIndex: 10 }}
                onPress={() => setStripeCheckoutData(null)}
                disabled={isStripePaying}
              >
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>

              {/* Header Icon */}
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(14, 165, 233, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 2, borderColor: 'rgba(14, 165, 233, 0.3)' }}>
                <Ionicons name="card" size={36} color="#0ea5e9" />
              </View>
              
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 6, textAlign: 'center' }}>Thanh Toán Stripe</Text>
              
              <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 18, lineHeight: 19 }}>
                Tiền cọc sẽ được giữ an toàn qua Stripe và chỉ thanh toán sau khi hoàn tất chuyến đi.
              </Text>

              {/* Thông tin chuyến đi & giá */}
              <View style={{ width: '100%', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 18 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: '#64748B', fontSize: 13 }}>Tài xế:</Text>
                  <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: 'bold' }}>{stripeCheckoutData?.trip?.driverName || 'Tài xế RideUp'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: '#64748B', fontSize: 13 }}>Số lượng vé:</Text>
                  <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: 'bold' }}>{stripeCheckoutData?.seatCount} ghế</Text>
                </View>
                <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 6 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '700' }}>Tổng thanh toán:</Text>
                  <Text style={{ color: '#0ea5e9', fontSize: 19, fontWeight: '900' }}>{formatMoney(stripeCheckoutData?.totalAmount)}</Text>
                </View>
              </View>

              {/* Nút thanh toán trực tiếp */}
              <TouchableOpacity 
                style={{ backgroundColor: '#0F172A', width: '100%', paddingVertical: 15, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8, marginBottom: 10 }} 
                onPress={handleStripeDirectPay} 
                disabled={isStripePaying}
                activeOpacity={0.8}
              >
                {isStripePaying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="card" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>THANH TOÁN BẰNG THẺ</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Nút thay đổi phương thức thanh toán */}
              <TouchableOpacity
                style={{ width: '100%', paddingVertical: 13, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }}
                onPress={handleChangePaymentMethod}
                disabled={isStripePaying}
                activeOpacity={0.8}
              >
                <Ionicons name="swap-horizontal" size={18} color="#475569" style={{ marginRight: 6 }} />
                <Text style={{ color: '#475569', fontSize: 14, fontWeight: '700' }}>Thay đổi phương thức thanh toán</Text>
              </TouchableOpacity>

            </View>
          </View>
        )}
        </View>
      </Modal>

      {/* Success Modal (Before Payment) - Premium UI */}
      <Modal visible={!!successBooking} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.85)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 32, alignItems: 'center', shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 20 }}>
            {/* Header Icon */}
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(14, 165, 233, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: 'rgba(14, 165, 233, 0.3)' }}>
              <Ionicons name="receipt" size={40} color="#0ea5e9" />
            </View>
            
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 8, textAlign: 'center' }}>Phiếu Đặt Chỗ</Text>
            
            <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, marginBottom: 20 }}>
              <Text style={{ fontSize: 13, color: '#475569', fontWeight: 'bold' }}>Mã: {successBooking?.bookingCode || successBooking?.id}</Text>
            </View>

            {successBooking?.paymentMethod === 'STRIPE' ? (
              <View style={{ width: '100%', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
                  Vui lòng thanh toán bảo đảm bằng thẻ tín dụng qua cổng Stripe để hoàn tất yêu cầu đặt xe.
                </Text>
                <TouchableOpacity 
                  style={{ backgroundColor: '#0F172A', width: '100%', paddingVertical: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 }} 
                  onPress={handlePayNow} 
                  disabled={isRedirectingPayment}
                >
                  {isRedirectingPayment ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Ionicons name="card" size={20} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>THANH TOÁN BẰNG THẺ</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ width: '100%', marginTop: 12, paddingVertical: 12, alignItems: 'center' }}
                  onPress={() => setSuccessBooking(null)}
                >
                  <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '600' }}>Đóng</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ width: '100%', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
                  Yêu cầu đặt chỗ của bạn đã được gửi. Bạn sẽ thanh toán bằng tiền mặt trực tiếp cho tài xế.
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: '#10b981', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#10b981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 }}
                  onPress={() => {
                    setSuccessBooking(null);
                    try {
                      navigation.navigate('Main', { screen: 'MyTrips' });
                    } catch (_) {
                      navigation.navigate('MyTrips');
                    }
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>XONG</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Stripe Success Modal - Premium UI */}
      <Modal visible={!!stripeSuccessBooking} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.85)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 32, alignItems: 'center', shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 20 }}>
            {/* Header Icon */}
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <Ionicons name="checkmark-done" size={48} color="#10b981" />
            </View>
            
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 8, textAlign: 'center' }}>Thanh toán thành công!</Text>
            <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
              Hệ thống đã giữ tiền an toàn qua thẻ tín dụng. Đang chờ tài xế xác nhận yêu cầu của bạn.
            </Text>
            
            {/* Receipt Box */}
            <View style={{ width: '100%', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '600' }}>Mã chuyến đi</Text>
                <Text style={{ color: '#0F172A', fontSize: 15, fontWeight: 'bold' }}>{stripeSuccessBooking?.bookingCode || stripeSuccessBooking?.id}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={{ backgroundColor: '#0ea5e9', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}
              activeOpacity={0.8}
              onPress={() => {
                setStripeSuccessBooking(null);
                try {
                  navigation.navigate('Main', { screen: 'MyTrips' });
                } catch (_) {
                  navigation.navigate('MyTrips');
                }
              }}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 }}>HOÀN TẤT & THEO DÕI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Request Modal - Đồng bộ với thông tin đã tìm kiếm */}
      <Modal visible={isRequestModalVisible} transparent animationType="slide" onRequestClose={() => setIsRequestModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.reqModalOverlay}>
            <View style={styles.reqModalSheet}>
              {/* Header */}
              <View style={styles.reqModalHeader}>
                <View style={styles.reqModalIconCircle}>
                  <Ionicons name="radio" size={24} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.reqModalTitle}>Phát Tín Hiệu Tìm Xe</Text>
                  <Text style={styles.reqModalSub}>Dữ liệu lấy từ tìm kiếm, phát sóng đến các tài xế</Text>
                </View>
                <TouchableOpacity onPress={() => setIsRequestModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={24} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                {/* Lộ trình tóm tắt lấy từ tìm kiếm */}
                <View style={styles.reqRouteCard}>
                  <View style={styles.reqRouteHeader}>
                    <Ionicons name="navigate-circle" size={16} color={COLORS.primary} />
                    <Text style={styles.reqRouteHeaderText}>TUYẾN ĐƯỜNG ĐÃ CHỌN TỪ TÌM KIẾM</Text>
                  </View>
                  
                  {/* Điểm đón */}
                  <View style={styles.reqInputRow}>
                    <View style={styles.reqBadgeRow}>
                      <Ionicons name="location" size={16} color={COLORS.primary} />
                      <Text style={styles.reqBadgeLabel}>Điểm đón:</Text>
                      <View style={styles.reqPill}>
                        <Text style={styles.reqPillText} numberOfLines={1}>
                          {provinces.find(p => p.id === startProvinceId)?.name || 'Chưa chọn'}
                        </Text>
                      </View>
                      {startWardId ? (
                        <View style={[styles.reqPill, { backgroundColor: '#F1F5F9' }]}>
                          <Text style={[styles.reqPillText, { color: COLORS.text }]} numberOfLines={1}>
                            {startWards.find(w => w.id === startWardId)?.name}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <TextInput
                      style={styles.reqTextInput}
                      value={requestStartAddress}
                      onChangeText={setRequestStartAddress}
                      placeholder="Nhập địa chỉ đón chi tiết (thôn, số nhà, đường...)"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>

                  {/* Điểm đến */}
                  <View style={[styles.reqInputRow, { marginTop: 12 }]}>
                    <View style={styles.reqBadgeRow}>
                      <Ionicons name="flag" size={16} color="#F59E0B" />
                      <Text style={styles.reqBadgeLabel}>Điểm đến:</Text>
                      <View style={styles.reqPill}>
                        <Text style={styles.reqPillText} numberOfLines={1}>
                          {provinces.find(p => p.id === endProvinceId)?.name || 'Chưa chọn'}
                        </Text>
                      </View>
                      {endWardId ? (
                        <View style={[styles.reqPill, { backgroundColor: '#F1F5F9' }]}>
                          <Text style={[styles.reqPillText, { color: COLORS.text }]} numberOfLines={1}>
                            {endWards.find(w => w.id === endWardId)?.name}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <TextInput
                      style={styles.reqTextInput}
                      value={requestEndAddress}
                      onChangeText={setRequestEndAddress}
                      placeholder="Nhập địa chỉ trả chi tiết (thôn, số nhà, đường...)"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                </View>

                {/* Thời gian khởi hành */}
                <View style={styles.reqSectionBox}>
                  <Text style={styles.reqSectionTitle}>THỜI GIAN KHỞI HÀNH</Text>
                  <TouchableOpacity 
                    style={styles.reqTimeDisplayBtn}
                    onPress={() => setShowRequestDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.reqTimeDisplayText}>
                      {requestDepartureDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {requestDepartureDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>

                  {/* Quick time chips */}
                  <View style={styles.reqChipRow}>
                    <TouchableOpacity 
                      style={styles.reqChip} 
                      onPress={() => setRequestDepartureDate(new Date(Date.now() + 60 * 60 * 1000))}
                    >
                      <Text style={styles.reqChipText}>+1 giờ</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.reqChip} 
                      onPress={() => setRequestDepartureDate(new Date(Date.now() + 120 * 60 * 1000))}
                    >
                      <Text style={styles.reqChipText}>+2 giờ</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.reqChip} 
                      onPress={() => {
                        const t = new Date();
                        t.setDate(t.getDate() + 1);
                        t.setHours(8, 0, 0, 0);
                        setRequestDepartureDate(t);
                      }}
                    >
                      <Text style={styles.reqChipText}>Sáng mai (08h)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.reqChip} 
                      onPress={() => {
                        const t = new Date();
                        t.setDate(t.getDate() + 1);
                        t.setHours(14, 0, 0, 0);
                        setRequestDepartureDate(t);
                      }}
                    >
                      <Text style={styles.reqChipText}>Chiều mai (14h)</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Số lượng ghế */}
                <View style={[styles.reqSectionBox, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                  <View>
                    <Text style={styles.reqSectionTitle}>SỐ GHẾ CẦN TÌM</Text>
                    <Text style={{ fontSize: 12, color: COLORS.textMuted }}>Số chỗ cần giữ trên xe</Text>
                  </View>
                  <View style={styles.counterBox}>
                    <TouchableOpacity onPress={() => setRequestSeatCount(Math.max(1, requestSeatCount - 1))} style={styles.counterBtn}>
                      <Text style={styles.counterText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{requestSeatCount}</Text>
                    <TouchableOpacity onPress={() => setRequestSeatCount(Math.min(10, requestSeatCount + 1))} style={styles.counterBtn}>
                      <Text style={styles.counterText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Ghi chú cho tài xế */}
                <View style={styles.reqSectionBox}>
                  <Text style={styles.reqSectionTitle}>GHI CHÚ GỬI TÀI XẾ (TÙY CHỌN)</Text>
                  <TextInput
                    style={styles.reqNoteInput}
                    placeholder="VD: Cần xe đón đúng giờ, có 1 vali lớn, xe không mùi..."
                    placeholderTextColor={COLORS.textMuted}
                    value={requestNote}
                    onChangeText={setRequestNote}
                    multiline
                    numberOfLines={2}
                    maxLength={150}
                  />
                </View>
              </ScrollView>

              {/* Action buttons */}
              <View style={styles.reqModalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsRequestModalVisible(false)} disabled={isCreatingRequest}>
                  <Text style={styles.cancelText}>HỦY</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleCreateTripRequest} disabled={isCreatingRequest}>
                  {isCreatingRequest ? (
                    <ActivityIndicator color={COLORS.surface} />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="radio-outline" size={18} color={COLORS.surface} style={{ marginRight: 6 }} />
                      <Text style={styles.confirmText}>PHÁT SÓNG TÌM XE</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <CustomCalendar
                visible={showRequestDatePicker}
                selectedDate={requestDepartureDate}
                onSelect={(d) => {
                  if (d) {
                    const newD = new Date(d);
                    newD.setHours(requestDepartureDate.getHours(), requestDepartureDate.getMinutes(), 0, 0);
                    setRequestDepartureDate(newD);
                  }
                  setShowRequestDatePicker(false);
                }}
                onClose={() => setShowRequestDatePicker(false)}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <RadarSuccessModal 
        visible={isRadarVisible} 
        onClose={() => setIsRadarVisible(false)} 
        onNavigateRequests={() => {
          setIsRadarVisible(false);
          navigation.navigate('MyTrips', { initialTab: 'REQUESTS' });
        }}
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, backgroundColor: COLORS.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4, zIndex: 10 },
  headerSub: { color: COLORS.primary, fontSize: SIZES.small, fontWeight: 'bold', letterSpacing: 1, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },

  // Filter Card
  filterCard: { backgroundColor: COLORS.surface, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10 },
  brandText: { color: COLORS.green, fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
  cardTitle: { color: COLORS.text, fontSize: 17, fontWeight: 'bold' },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(14, 165, 233, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
  toggleBtnText: { color: COLORS.primary, fontSize: 11, fontWeight: 'bold' },
  filterBody: { borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 16 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  filterCol: { flex: 1 },
  filterLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 5 },

  // Custom Dropdown Button
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, paddingVertical: 11 },
  dropdownBtnDisabled: { opacity: 0.4 },
  dropdownValue: { color: COLORS.text, fontSize: 13, flex: 1, marginRight: 4 },
  dropdownPlaceholder: { color: COLORS.textMuted, fontSize: 12, flex: 1, marginRight: 4 },

  // Dropdown Modal
  ddModalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  ddOverlay: { ...StyleSheet.absoluteFillObject },
  ddSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '80%' },
  ddHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ddTitle: { color: COLORS.text, fontSize: SIZES.medium, fontWeight: 'bold' },
  ddSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  ddSearchInput: { flex: 1, color: COLORS.text, fontSize: SIZES.font },
  ddItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  ddItemText: { color: COLORS.text, fontSize: SIZES.font, flex: 1 },
  ddEmpty: { color: COLORS.textMuted, textAlign: 'center', paddingVertical: 20 },

  // Date Box
  dateBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, paddingVertical: 11 },
  dateInput: { flex: 1, color: COLORS.text, fontSize: 13 },
  dateValue: { flex: 1, color: COLORS.text, fontSize: 13 },
  datePlaceholder: { flex: 1, color: COLORS.textMuted, fontSize: 13 },

  // Search Button
  searchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, marginTop: 4, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  searchBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: SIZES.font },

  // Trip List
  listContainer: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40, fontSize: SIZES.font },

  // ===== TRIP CARD - Super App Style =====
  tripCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4,
  },

  // Header
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  driverRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(14, 165, 233, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: COLORS.primary, fontWeight: '900', fontSize: 16 },
  driverInfo: { flex: 1 },
  driverName: { color: COLORS.text, fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  vehicleInfo: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500' },
  bookBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  bookBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

  // Body
  cardBody: { padding: 14, position: 'relative' },
  departureDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  departureDateBannerText: {
    color: COLORS.text,
    fontSize: 12,
  },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  timeBox: { width: 44, paddingTop: 2 },
  timeText: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  durationText: { color: '#94A3B8', fontSize: 10, marginTop: 4, fontWeight: '600' },

  iconBox: { width: 24, alignItems: 'center', zIndex: 2 },
  routeLine: { width: 2, height: 26, backgroundColor: '#E2E8F0', borderStyle: 'dashed', position: 'absolute', top: 20 },

  addressBox: { flex: 1, paddingLeft: 8 },
  addressText: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  subAddressText: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  // Footer
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: '#F8FAFC', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  priceWrap: { flexDirection: 'column' },
  priceLabel: { color: '#94A3B8', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 2 },
  priceAmount: { color: COLORS.primary, fontWeight: '900', fontSize: 18 },
  priceUnit: { color: COLORS.textMuted, fontWeight: '600', fontSize: 12 },
  seatPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  seatPillText: { fontSize: 12, fontWeight: 'bold' },

  // Booking Modal
  modalOverlay: { flex: 1, backgroundColor: COLORS.background },
  modalContent: { flex: 1, backgroundColor: COLORS.surface, padding: 20 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  modalCloseIcon: { padding: 4 },
  modalSub: { color: COLORS.textMuted, fontSize: SIZES.font, marginBottom: 20 },
  modalRoute: { backgroundColor: COLORS.background, padding: 16, borderRadius: 12, marginBottom: 20 },
  addressSection: { marginBottom: 16, backgroundColor: COLORS.background, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  addressSectionTitle: { color: COLORS.primary, fontSize: 13, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  addressInput: { backgroundColor: COLORS.surface, borderRadius: 8, paddingHorizontal: 12, height: 44, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  mapBtn: { width: 44, height: 44, borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  selectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  selectionLabel: { color: COLORS.text, fontSize: SIZES.medium, fontWeight: '500' },
  counterBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 8 },
  counterBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  counterText: { color: COLORS.primary, fontSize: SIZES.large, fontWeight: 'bold' },
  counterValue: { color: COLORS.text, fontSize: SIZES.medium, fontWeight: 'bold', marginHorizontal: 8 },
  payBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary, backgroundColor: COLORS.surface },
  payBtnActive: { backgroundColor: COLORS.primary },
  payBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 13 },
  modalPriceBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(14, 165, 233, 0.08)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginTop: 12 },
  modalPriceLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: 'bold' },
  modalPrice: { color: COLORS.primary, fontSize: 20, fontWeight: '900' },

  noteBox: { marginTop: 12 },
  noteLabel: { color: COLORS.textMuted, fontSize: SIZES.small, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  noteInput: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, color: COLORS.text, fontSize: SIZES.font, minHeight: 80, lineHeight: 20 },
  noteCount: { color: COLORS.textMuted, fontSize: 11, textAlign: 'right', marginTop: 4 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: COLORS.border, alignItems: 'center' },
  cancelText: { color: COLORS.text, fontWeight: '600', fontSize: SIZES.font },
  confirmBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  confirmText: { color: COLORS.background, fontWeight: 'bold', fontSize: SIZES.font },

  // Custom Calendar
  calOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  calSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30 },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  calNavBtn: { padding: 8 },
  calMonthTitle: { color: COLORS.text, fontSize: SIZES.medium, fontWeight: 'bold' },
  calWeekRow: { flexDirection: 'row', marginBottom: 8 },
  calWeekDay: { flex: 1, textAlign: 'center', color: COLORS.textMuted, fontSize: 12, fontWeight: 'bold' },
  calRow: { flexDirection: 'row', marginBottom: 4 },
  calCell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: 20 },
  calCellSelected: { backgroundColor: COLORS.primary },
  calCellToday: { borderWidth: 1.5, borderColor: COLORS.primary },
  calDayText: { color: COLORS.text, fontSize: 14 },
  calDayTextSelected: { color: COLORS.background, fontWeight: 'bold' },
  calDayTextPast: { color: COLORS.border },
  calDayTextToday: { color: COLORS.primary, fontWeight: 'bold' },
  calFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  calClearBtn: { color: COLORS.textMuted, fontSize: SIZES.medium, fontWeight: 'bold', padding: 8 },
  calTodayBtn: { color: COLORS.primary, fontSize: SIZES.medium, fontWeight: 'bold', padding: 8 },

  // Success Modal
  successOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  successCard: { backgroundColor: COLORS.surface, width: '100%', borderRadius: 24, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  successSub: { fontSize: 14, color: COLORS.textMuted, marginBottom: 24, textAlign: 'center' },
  successCode: { fontWeight: 'bold', color: COLORS.text },
  payLaterBtn: { paddingVertical: 12, width: '100%', alignItems: 'center' },
  payLaterBtnText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 14 },
  doneBtn: { backgroundColor: COLORS.green, paddingVertical: 14, borderRadius: 16, width: '100%', alignItems: 'center', shadowColor: COLORS.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  doneBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  
  stripeBox: { backgroundColor: 'rgba(14, 165, 233, 0.05)', padding: 20, borderRadius: 16, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(14, 165, 233, 0.2)' },
  stripeDesc: { color: COLORS.text, fontSize: 13, textAlign: 'center', marginBottom: 16, lineHeight: 20, fontWeight: '500' },
  stripeBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, width: '100%', alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  stripeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  // Pagination
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 16,
    marginTop: 8,
    marginBottom: 24,
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

  // Marketplace Request Modal
  reqModalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  reqModalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '88%' },
  reqModalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  reqModalIconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(14, 165, 233, 0.1)', justifyContent: 'center', alignItems: 'center' },
  reqModalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  reqModalSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  
  reqRouteCard: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 },
  reqRouteHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  reqRouteHeaderText: { fontSize: 11, fontWeight: 'bold', color: COLORS.primary, letterSpacing: 0.5 },
  reqInputRow: { width: '100%' },
  reqBadgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  reqBadgeLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  reqPill: { backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  reqPillText: { fontSize: 12, fontWeight: 'bold', color: '#0369A1' },
  reqTextInput: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: COLORS.text },
  
  reqSectionBox: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 },
  reqSectionTitle: { fontSize: 11, fontWeight: 'bold', color: COLORS.textMuted, letterSpacing: 0.5, marginBottom: 8 },
  reqTimeDisplayBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'space-between' },
  reqTimeDisplayText: { flex: 1, fontSize: 13, fontWeight: 'bold', color: COLORS.text },
  reqChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  reqChip: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  reqChipText: { fontSize: 11, fontWeight: '600', color: COLORS.text },
  reqNoteInput: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 13, color: COLORS.text, minHeight: 60, textAlignVertical: 'top' },
  reqModalActions: { flexDirection: 'row', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
});

