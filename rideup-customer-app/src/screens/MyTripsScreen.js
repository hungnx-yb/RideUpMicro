import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ActivityIndicator, FlatList, TouchableOpacity, RefreshControl, ScrollView,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
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

            {/* Ô tìm kiếm trên đầu droplist */}
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
                    if (!day) return;
                    onSelect(new Date(year, month, day));
                    onClose();
                  }}
                  disabled={!day}
                >
                  <Text style={[
                    styles.calDayText,
                    isSelected && styles.calDayTextSelected,
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

// ===== STATUS CONFIG =====
const STATUS_CONFIG = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', color: '#f97316', icon: 'time-outline', bg: 'rgba(249,115,22,0.12)' },
  WAITING_DRIVER_APPROVAL: { label: 'Đang chờ tài xế duyệt...', color: '#f59e0b', icon: 'hourglass-outline', bg: 'rgba(245,158,11,0.12)' },
  CONFIRMED:       { label: 'Đã xác nhận',    color: COLORS.green,  icon: 'shield-checkmark-outline', bg: 'rgba(74,222,128,0.12)' },
  COMPLETED:       { label: 'Hoàn thành',     color: COLORS.green,  icon: 'checkmark-done-outline',   bg: 'rgba(74,222,128,0.12)' },
  REJECTED_BY_DRIVER: { label: 'Bị từ chối', color: COLORS.error, icon: 'close-circle-outline', bg: 'rgba(255,76,76,0.12)' },
  EXPIRED:         { label: 'Hết hạn', color: COLORS.error, icon: 'time-outline', bg: 'rgba(255,76,76,0.12)' },
  CANCELLED_USER:  { label: 'Đã huỷ', color: COLORS.error, icon: 'close-circle-outline', bg: 'rgba(255,76,76,0.12)' },
  CANCELLED_DRIVER:{ label: 'Tài xế huỷ chuyến', color: COLORS.error, icon: 'close-circle-outline', bg: 'rgba(255,76,76,0.12)' },
  CANCELLED_PAYMENT_FAILED: { label: 'Lỗi thanh toán', color: COLORS.error, icon: 'close-circle-outline', bg: 'rgba(255,76,76,0.12)' }
};

const getStatus = (status) =>
  STATUS_CONFIG[status] || { label: status || 'Không rõ', color: COLORS.textMuted, icon: 'ellipse-outline', bg: 'rgba(160,160,160,0.1)' };

// Helper phân tách địa chỉ đầy đủ ("chi tiết, phường/xã, tỉnh/thành") thành các phần riêng biệt
const parseFullAddress = (fullText, wardName = '', provinceName = '') => {
  if (!fullText) return { detail: '', ward: wardName || '', province: provinceName || '' };
  const parts = fullText.split(',').map(p => p.trim()).filter(Boolean);
  let detail = fullText;
  let parsedWard = wardName || '';
  let parsedProvince = provinceName || '';

  if (parts.length >= 3) {
    parsedProvince = provinceName || parts[parts.length - 1];
    parsedWard = wardName || parts[parts.length - 2];
    detail = parts.slice(0, -2).join(', ');
  } else if (parts.length === 2) {
    parsedProvince = provinceName || parts[1];
    detail = parts[0];
  }

  // Tinh chỉnh nếu detail vẫn còn dính phần phường hoặc tỉnh
  if (detail) {
    const detailParts = detail.split(',').map(p => p.trim()).filter(Boolean);
    const clean = [];
    const normWard = removeDiacritics(parsedWard);
    const normProv = removeDiacritics(parsedProvince);

    for (const p of detailParts) {
      const normP = removeDiacritics(p);
      if (normWard && (normP === normWard || normP.includes(normWard))) continue;
      if (normProv && (normP === normProv || normP.includes(normProv))) continue;
      clean.push(p);
    }
    if (clean.length > 0) {
      detail = clean.join(', ');
    }
  }

  return { detail: detail.trim(), ward: parsedWard.trim(), province: parsedProvince.trim() };
};

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
const BookingCard = ({ item, trip, onPress, onChatPress }) => {
  const status = getStatus(item.status);

  const formatDate = (iso) => {
    if (!iso) return '--';
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const formatTime = (iso) => {
    if (!iso) return '--';
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  // 1. Phường/Xã từ trip.stops dựa trên pickupWardId/dropoffWardId
  const tripPickupWard = trip?.stops?.find(s => String(s.wardId) === String(item.pickupWardId))?.addressText || '';
  const tripDropoffWard = trip?.stops?.find(s => String(s.wardId) === String(item.dropoffWardId))?.addressText || '';

  // 2. Tỉnh/Thành từ trip (startAddressText / endAddressText)
  const tripStartProvince = trip?.startAddressText || '';
  const tripEndProvince = trip?.endAddressText || '';

  // 3. Fallback phân tách nếu item.pickupAddressText có định dạng ghép chuỗi
  const fallbackPickup = parseFullAddress(item.pickupAddressText, tripPickupWard, tripStartProvince);
  const fallbackDropoff = parseFullAddress(item.dropoffAddressText, tripDropoffWard, tripEndProvince);

  // Xác định tỉnh thành, phường xã và chi tiết
  const displayPickupProvince = tripStartProvince || fallbackPickup.province;
  const displayPickupWard = tripPickupWard || fallbackPickup.ward;
  const displayPickupDetail = fallbackPickup.detail || item.pickupAddressText || '';

  const displayDropoffProvince = tripEndProvince || fallbackDropoff.province;
  const displayDropoffWard = tripDropoffWard || fallbackDropoff.ward;
  const displayDropoffDetail = fallbackDropoff.detail || item.dropoffAddressText || '';

  const formatMoney = (val) => {
    if (!val && val !== 0) return '0 đ';
    return Number(val).toLocaleString('vi-VN') + ' đ';
  };

  const isStripe = item.paymentMethod === 'STRIPE' || (item.paymentMethod !== 'CASH' && (item.paymentStatus === 'HOLDING' || item.paymentId?.startsWith('pi_')));

  const getPayInfo = () => {
    if (isStripe) {
      if (item.paymentStatus === 'PAID') {
        return { label: 'Thẻ Stripe • Đã thanh toán', icon: 'card', bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' };
      }
      if (item.paymentStatus === 'HOLDING') {
        return { label: 'Thẻ Stripe • Đã cọc giữ tiền', icon: 'shield-checkmark', bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' };
      }
      if (item.paymentStatus === 'REFUNDED' || item.paymentStatus === 'VOIDED') {
        return { label: 'Thẻ Stripe • Đã hoàn tiền', icon: 'refresh-circle', bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' };
      }
      return { label: 'Thẻ Stripe', icon: 'card-outline', bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' };
    }
    // Tiền mặt
    if (item.paymentStatus === 'PAID') {
      return { label: 'Tiền mặt • Đã thanh toán', icon: 'cash', bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' };
    }
    return { label: 'Tiền mặt • Trả tài xế khi đi', icon: 'cash-outline', bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' };
  };
  const payInfo = getPayInfo();

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

      {/* ── ROUTE (Hiển thị đầy đủ Tỉnh/Thành + Phường/Xã + Chi tiết như màn Tìm chuyến) ── */}
      <View style={styles.cardBody}>
        {/* Banner ngày khởi hành của chuyến đi */}
        {trip?.departureTime ? (
          <View style={styles.departureDateBanner}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.primary} style={{ marginRight: 5 }} />
            <Text style={styles.departureDateBannerText}>
              Ngày khởi hành: <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>{formatDate(trip.departureTime)}</Text>
            </Text>
          </View>
        ) : null}

        {/* Điểm đón */}
        <View style={styles.routeRow}>
          <View style={styles.timeBox}>
            <Text style={styles.timeText}>{formatTime(trip?.departureTime || item.createdAt)}</Text>
          </View>
          <View style={styles.iconBox}>
            <Ionicons name="location" size={18} color={COLORS.primary} />
            <View style={styles.routeLine} />
          </View>
          <View style={styles.addressBox}>
            {/* Tỉnh / Thành */}
            <Text style={styles.addressText} numberOfLines={1}>
              {displayPickupProvince || 'Điểm đón'}
            </Text>
            {/* Phường / Xã */}
            {displayPickupWard ? (
              <Text style={styles.subAddressText} numberOfLines={1}>
                ↳ {displayPickupWard}
              </Text>
            ) : null}
            {/* Địa chỉ chi tiết */}
            {displayPickupDetail ? (
              <Text style={styles.detailAddressText} numberOfLines={2}>
                <Ionicons name="navigate-outline" size={11} color={COLORS.textMuted} />{' '}{displayPickupDetail}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Điểm trả */}
        <View style={styles.routeRow}>
          <View style={styles.timeBox}>
            <Text style={styles.timeText}>{formatTime(trip?.estimatedArrivalTime)}</Text>
          </View>
          <View style={styles.iconBox}>
            <Ionicons name="flag" size={18} color="#F59E0B" />
          </View>
          <View style={styles.addressBox}>
            {/* Tỉnh / Thành */}
            <Text style={styles.addressText} numberOfLines={1}>
              {displayDropoffProvince || 'Điểm đến'}
            </Text>
            {/* Phường / Xã */}
            {displayDropoffWard ? (
              <Text style={styles.subAddressText} numberOfLines={1}>
                ↳ {displayDropoffWard}
              </Text>
            ) : null}
            {/* Địa chỉ chi tiết */}
            {displayDropoffDetail ? (
              <Text style={styles.detailAddressText} numberOfLines={2}>
                <Ionicons name="navigate-outline" size={11} color={COLORS.textMuted} />{' '}{displayDropoffDetail}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* ── PAYMENT & PRICE ROW ── */}
      <View style={styles.cardPaymentRow}>
        <View style={[styles.paymentBadge, { backgroundColor: payInfo.bg, borderColor: payInfo.border }]}>
          <Ionicons name={payInfo.icon} size={12} color={payInfo.color} style={{ marginRight: 4 }} />
          <Text style={[styles.paymentBadgeText, { color: payInfo.color }]}>
            {payInfo.label}
          </Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.seatCountText}>{item.seatCount || 1} vé</Text>
          <Text style={styles.cardPriceAmount}>{formatMoney(item.totalAmount)}</Text>
        </View>
      </View>

      {/* ── FOOTER: Chat Action ── */}
      {(item.status === 'CONFIRMED' || item.status === 'RESERVED' || item.status === 'PENDING_PAYMENT' || item.status === 'WAITING_DRIVER_APPROVAL') && (
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
const CANCELLED_STATUSES = ['CANCELLED_USER', 'CANCELLED_DRIVER', 'CANCELLED_PAYMENT_FAILED', 'REJECTED_BY_DRIVER', 'EXPIRED'];
const TABS = [
  { key: null, label: 'Tất cả' },
  { key: 'WAITING', label: 'Chờ duyệt' },
  { key: 'CONFIRMED', label: 'Xác nhận' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
  { key: 'CANCELLED', label: 'Đã huỷ' },
];

// ===== MAIN SCREEN =====
const MyTripsScreen = ({ navigation, route }) => {
  const [mainTab, setMainTab] = useState(route?.params?.initialTab || 'BOOKINGS'); // 'BOOKINGS' | 'REQUESTS'
  const [bookings, setBookings] = useState([]);
  const [tripMap, setTripMap] = useState({});
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const [requestActiveTab, setRequestActiveTab] = useState(null);
  const [page, setPage] = useState(0);

  // State cho Modal Xác nhận chốt chuyến từ lời mời
  const [selectedInviteData, setSelectedInviteData] = useState(null); // { invitation, tripRequest }
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Filter states giống hệt màn Tìm kiếm
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [startProvinceId, setStartProvinceId] = useState('');
  const [startWards, setStartWards] = useState([]);
  const [startWardId, setStartWardId] = useState('');
  const [loadingStartWards, setLoadingStartWards] = useState(false);

  const [endProvinceId, setEndProvinceId] = useState('');
  const [endWards, setEndWards] = useState([]);
  const [endWardId, setEndWardId] = useState('');
  const [loadingEndWards, setLoadingEndWards] = useState(false);

  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Cache tên phường/xã theo wardId để hiển thị trên thẻ yêu cầu
  const wardNameCacheRef = useRef({});
  const [wardNameCache, setWardNameCache] = useState({});

  const getProvinceName = useCallback((id) => {
    if (!id) return '';
    const match = provinces.find(p => String(p.id) === String(id));
    return match ? match.name : '';
  }, [provinces]);

  // Resolve ward names khi requests thay đổi
  useEffect(() => {
    if (requests.length === 0) return;
    const wardIds = new Set();
    requests.forEach(r => {
      if (r.startWardId && !wardNameCacheRef.current[r.startWardId]) wardIds.add(r.startWardId);
      if (r.endWardId && !wardNameCacheRef.current[r.endWardId]) wardIds.add(r.endWardId);
    });
    if (wardIds.size === 0) return;

    const resolveWards = async () => {
      const entries = {};
      await Promise.allSettled(
        [...wardIds].map(async (wId) => {
          try {
            const res = await apiService.getWardById(wId);
            const ward = res?.data?.result || res?.data;
            if (ward?.name) entries[wId] = ward.name;
          } catch (e) { /* ignore */ }
        })
      );
      if (Object.keys(entries).length > 0) {
        wardNameCacheRef.current = { ...wardNameCacheRef.current, ...entries };
        setWardNameCache(prev => ({ ...prev, ...entries }));
      }
    };
    resolveWards();
  }, [requests]);

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
      const cleaned = data.map(req => ({
        ...req,
        invitations: (req.invitations || []).filter(inv => inv.status === 'PENDING' || !inv.status)
      }));
      setRequests(cleaned);
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
      const bookingList = Array.isArray(data) ? data : [];
      setBookings(bookingList);
      if (isRefresh) setPage(0);

      // Thu thập các tripId duy nhất để tải thông tin trip chi tiết (tỉnh thành, phường xã, giờ khởi hành)
      const uniqueTripIds = [...new Set(bookingList.map(b => b.tripId).filter(Boolean))];
      if (uniqueTripIds.length > 0) {
        const tripPromises = uniqueTripIds.map(async (tripId) => {
          try {
            const tripRes = await apiService.getTripDetail(tripId);
            return { tripId, trip: tripRes?.data?.result || null };
          } catch (e) {
            console.log('Error fetching trip detail:', tripId, e);
            return { tripId, trip: null };
          }
        });
        const tripResults = await Promise.all(tripPromises);
        const map = {};
        tripResults.forEach(item => {
          if (item.trip) {
            map[item.tripId] = item.trip;
          }
        });
        setTripMap(prev => ({ ...prev, ...map }));
      }
    } catch (error) {
      console.log('Fetch bookings error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchProvinces = async () => {
    try {
      const res = await apiService.getAllProvinces();
      if (res?.data?.result) setProvinces(res.data.result);
    } catch (e) {
      console.log('fetchProvinces error:', e);
    }
  };

  useEffect(() => {
    fetchMyBookings();
    fetchProvinces();
  }, []);

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

  // Sắp xếp mặc định theo thời gian booking giảm dần (createdAt DESC)
  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [bookings]);

  // Tạo Set wardId thuộc tỉnh đang chọn để lọc nhanh theo provinceId
  const startWardIdSet = useMemo(() => new Set(startWards.map(w => w.id)), [startWards]);
  const endWardIdSet = useMemo(() => new Set(endWards.map(w => w.id)), [endWards]);

  // Lọc theo các tiêu chí giống màn Tìm chuyến: dùng cả thông tin trip lẫn booking
  const filtered = useMemo(() => {
    return sortedBookings.filter((b) => {
      // 1. Tab status
      if (activeTab) {
        if (activeTab === 'CANCELLED') {
          if (!CANCELLED_STATUSES.includes(b.status)) return false;
        } else if (activeTab === 'WAITING') {
          if (b.status !== 'WAITING_DRIVER_APPROVAL' && b.status !== 'PENDING_PAYMENT') return false;
        } else {
          if (b.status !== activeTab) return false;
        }
      }

      const trip = tripMap[b.tripId];

      // 2. Điểm đón: match bằng wardId hoặc provinceId
      if (startWardId) {
        const matchWard = String(b.pickupWardId) === String(startWardId) ||
          trip?.stops?.some(s => s.stopType === 'PICKUP' && String(s.wardId) === String(startWardId));
        if (!matchWard) return false;
      } else if (startProvinceId) {
        const matchProvince = (trip?.startProvinceId && String(trip.startProvinceId) === String(startProvinceId)) ||
          (b.pickupWardId && startWardIdSet.has(b.pickupWardId));
        if (!matchProvince) return false;
      }

      // 3. Điểm trả: match bằng wardId hoặc provinceId
      if (endWardId) {
        const matchWard = String(b.dropoffWardId) === String(endWardId) ||
          trip?.stops?.some(s => s.stopType === 'DROPOFF' && String(s.wardId) === String(endWardId));
        if (!matchWard) return false;
      } else if (endProvinceId) {
        const matchProvince = (trip?.endProvinceId && String(trip.endProvinceId) === String(endProvinceId)) ||
          (b.dropoffWardId && endWardIdSet.has(b.dropoffWardId));
        if (!matchProvince) return false;
      }

      // 4. Ngày đi: lọc theo ngày khởi hành của chuyến đi (hoặc ngày đặt); không chặn >= hôm nay vì là màn lịch sử
      if (selectedDate) {
        const compareDateStr = trip?.departureTime || b.createdAt;
        if (!compareDateStr) return false;
        const itemDate = new Date(compareDateStr);
        const isSame =
          itemDate.getDate() === selectedDate.getDate() &&
          itemDate.getMonth() === selectedDate.getMonth() &&
          itemDate.getFullYear() === selectedDate.getFullYear();
        if (!isSame) return false;
      }

      return true;
    });
  }, [sortedBookings, activeTab, startProvinceId, startWardId, endProvinceId, endWardId, selectedDate, startWardIdSet, endWardIdSet, tripMap]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedData = useMemo(() => {
    return filtered.slice(page * pageSize, (page + 1) * pageSize);
  }, [filtered, page]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setPage(0);
  };

  const handleClearFilters = () => {
    setStartProvinceId('');
    setStartWardId('');
    setEndProvinceId('');
    setEndWardId('');
    setSelectedDate(null);
    setPage(0);
  };

  const hasActiveFilters = Boolean(startProvinceId || startWardId || endProvinceId || endWardId || selectedDate);

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

  const filteredRequests = requestActiveTab ? requests.filter(r => r.status === requestActiveTab) : requests;

  const handleRejectInvitation = async (inv) => {
    try {
      // Optimistic update: remove from local state immediately
      setRequests(prev => prev.map(req => {
        if (req.id === inv.tripRequestId) {
          return { ...req, invitations: (req.invitations || []).filter(i => i.id !== inv.id) };
        }
        return req;
      }));
      await apiService.rejectTripRequestInvitation(inv.id);
    } catch (e) {
      console.warn('Reject error', e);
      fetchMyRequests();
    }
  };

  const handleAcceptInvitation = (invitation, tripRequest) => {
    // Mở modal xác nhận chốt chuyến xe trực tiếp tại đây, không chuyển màn hình tránh nhiều popup
    setSelectedInviteData({ invitation, tripRequest });
  };

  const handleConfirmAcceptInvitation = async () => {
    if (!selectedInviteData || isSubmittingBooking) return;
    setIsSubmittingBooking(true);
    const { invitation, tripRequest } = selectedInviteData;
    try {
      const idempotencyKey = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

      const payload = {
        tripId: invitation.tripId,
        seatCount: tripRequest.seatTotal || 1,
        paymentMethod: 'CASH',
        pickupLat: 0,
        pickupLng: 0,
        pickupWardId: tripRequest.startWardId || '',
        pickupAddressText: tripRequest.startAddressText || '',
        dropoffLat: 0,
        dropoffLng: 0,
        dropoffWardId: tripRequest.endWardId || '',
        dropoffAddressText: tripRequest.endAddressText || '',
        note: tripRequest.note || 'Đặt từ lời mời tìm xe',
        invitationId: invitation.id,
      };

      const res = await apiService.createBooking(payload, idempotencyKey);
      if (res?.data?.code === 1000) {
        try {
          await apiService.acceptTripRequestInvitation(invitation.id);
        } catch (_) {}

        setSelectedInviteData(null);
        Alert.alert(
          'Chốt chuyến thành công! 🎉',
          'Bạn đã đồng ý lời mời và đặt chỗ thành công. Tài xế đã nhận được thông tin chuyến đi của bạn.',
          [
            {
              text: 'Xem vé đã đặt',
              onPress: () => {
                setMainTab('BOOKINGS');
                fetchMyBookings(true);
                fetchMyRequests(true);
              },
            },
          ]
        );
        setMainTab('BOOKINGS');
        fetchMyBookings(true);
        fetchMyRequests(true);
      } else {
        Alert.alert('Không thể đặt chỗ', res?.data?.message || 'Có lỗi xảy ra khi tạo vé.');
      }
    } catch (err) {
      console.warn('Lỗi khi chấp nhận lời mời:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi chốt chuyến đi.';
      Alert.alert('Lỗi đặt chỗ', errMsg);
    } finally {
      setIsSubmittingBooking(false);
    }
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

      {/* ── BỘ LỌC CHUYẾN ĐI (GIỐNG MÀN TÌM KIẾM) ── */}
      {mainTab === 'BOOKINGS' && (
        <View style={styles.filterCard}>
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={() => setIsFilterExpanded(!isFilterExpanded)}
            activeOpacity={0.8}
          >
            <View>
              <Text style={styles.brandText}>BỘ LỌC CHUYẾN ĐI</Text>
              <Text style={styles.cardTitle}>Lọc điểm đón, điểm trả & ngày</Text>
            </View>
            <View style={styles.toggleBtn}>
              <Text style={styles.toggleBtnText}>{isFilterExpanded ? 'Thu gọn' : 'Mở rộng'}</Text>
              <Ionicons name={isFilterExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.primary} />
            </View>
          </TouchableOpacity>

          {isFilterExpanded && (
            <View style={styles.filterBody}>
              {/* Row 1: Điểm đón */}
              <View style={styles.filterRow}>
                <View style={styles.filterCol}>
                  <Text style={styles.filterLabel}>TỈNH/THÀNH ĐI</Text>
                  <DropdownSelect
                    label="Chọn Tỉnh/Thành đi"
                    placeholder="Chọn tỉnh/thành đi"
                    value={startProvinceId}
                    options={provinces}
                    onSelect={(val) => { setStartProvinceId(val); setPage(0); }}
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
                      onSelect={(val) => { setStartWardId(val); setPage(0); }}
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
                    onSelect={(val) => { setEndProvinceId(val); setPage(0); }}
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
                      onSelect={(val) => { setEndWardId(val); setPage(0); }}
                      disabled={endWards.length === 0}
                    />
                  }
                </View>
              </View>

              {/* Row 3: Ngày & Nút điều khiển */}
              <View style={styles.filterRow}>
                <View style={styles.filterCol}>
                  <Text style={styles.filterLabel}>NGÀY ĐI / ĐẶT</Text>
                  <TouchableOpacity style={styles.dateBox} onPress={() => setShowDatePicker(true)}>
                    <Ionicons name="calendar-outline" size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
                    <Text style={selectedDate ? styles.dateValue : styles.datePlaceholder}>
                      {selectedDate
                        ? selectedDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : 'Chọn ngày'}
                    </Text>
                    {selectedDate && (
                      <TouchableOpacity onPress={() => { setSelectedDate(null); setPage(0); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                  <CustomCalendar
                    visible={showDatePicker}
                    selectedDate={selectedDate}
                    onSelect={(d) => { setSelectedDate(d); setPage(0); }}
                    onClose={() => setShowDatePicker(false)}
                  />
                </View>

                <View style={[styles.filterCol, { flexDirection: 'row', gap: 8, alignItems: 'flex-end' }]}>
                  {hasActiveFilters && (
                    <TouchableOpacity style={styles.clearBtn} onPress={handleClearFilters}>
                      <Ionicons name="refresh" size={14} color={COLORS.error} style={{ marginRight: 4 }} />
                      <Text style={styles.clearBtnText}>Xóa lọc</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.applyFilterBtn} onPress={() => setIsFilterExpanded(false)}>
                    <Ionicons name="checkmark-done" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.applyFilterBtnText}>Áp dụng</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── FILTER TABS ── */}
      {mainTab === 'BOOKINGS' ? (
        <View style={styles.tabsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer} style={styles.tabsScroll}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity key={String(tab.key)} style={[styles.tab, isActive && styles.tabActive]} onPress={() => handleTabChange(tab.key)}>
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
          data={mainTab === 'BOOKINGS' ? paginatedData : filteredRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if (mainTab === 'BOOKINGS') {
              const trip = tripMap[item.tripId];
              return (
                <BookingCard
                  item={item}
                  trip={trip}
                  onPress={() => navigation.navigate('BookingDetail', { booking: { ...item, trip } })}
                  onChatPress={() => navigation.navigate('BookingChat', { 
                    bookingId: item.id, 
                    driverName: trip?.driverName || 'Tài xế', 
                    driverAvatar: trip?.avatarUrl,
                    vehicleInfo: [trip?.vehicleBrand, trip?.vehicleModel].filter(Boolean).join(' ') || 'Phương tiện'
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

                  {/* Route - Hiển thị chuẩn form như BookingCard */}
                  <View style={styles.cardBody}>
                    {/* Điểm đón */}
                    <View style={styles.routeRow}>
                      <View style={styles.iconBox}>
                        <Ionicons name="location" size={18} color={COLORS.primary} />
                        <View style={styles.routeLine} />
                      </View>
                      <View style={styles.addressBox}>
                        <Text style={styles.addressText} numberOfLines={1}>
                          {getProvinceName(item.startProvinceId) || 'Điểm đón'}
                        </Text>
                        {wardNameCache[item.startWardId] ? (
                          <Text style={styles.subAddressText} numberOfLines={1}>
                            ↳ {wardNameCache[item.startWardId]}
                          </Text>
                        ) : null}
                        {item.startAddressText ? (
                          <Text style={styles.detailAddressText} numberOfLines={2}>
                            <Ionicons name="navigate-outline" size={11} color={COLORS.textMuted} />{' '}{item.startAddressText}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Điểm trả */}
                    <View style={styles.routeRow}>
                      <View style={styles.iconBox}>
                        <Ionicons name="flag" size={18} color="#F59E0B" />
                      </View>
                      <View style={styles.addressBox}>
                        <Text style={styles.addressText} numberOfLines={1}>
                          {getProvinceName(item.endProvinceId) || 'Điểm đến'}
                        </Text>
                        {wardNameCache[item.endWardId] ? (
                          <Text style={styles.subAddressText} numberOfLines={1}>
                            ↳ {wardNameCache[item.endWardId]}
                          </Text>
                        ) : null}
                        {item.endAddressText ? (
                          <Text style={styles.detailAddressText} numberOfLines={2}>
                            <Ionicons name="navigate-outline" size={11} color={COLORS.textMuted} />{' '}{item.endAddressText}
                          </Text>
                        ) : null}
                      </View>
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
                  {(() => {
                    if (item.status === 'ACCEPTED') {
                      return (
                        <View style={{ marginTop: 10, padding: 10, backgroundColor: '#ECFDF5', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#A7F3D0' }}>
                          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                          <Text style={{ color: '#047857', fontSize: 12, fontWeight: 'bold' }}>
                            Đã chốt xe thành công! Xem chi tiết tại "Vé Đã Đặt"
                          </Text>
                        </View>
                      );
                    }
                    const pendingInvitations = (item.invitations || []).filter(inv => inv.status === 'PENDING' || !inv.status);
                    if (pendingInvitations.length > 0) {
                      return (
                        <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={{ fontSize: 13, fontWeight: 'bold', color: COLORS.primary }}>
                              Lời mời từ tài xế ({pendingInvitations.length}):
                            </Text>
                            <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                              Chọn xe để tiếp tục
                            </Text>
                          </View>
                          {pendingInvitations.map(inv => (
                            <InvitationCard 
                              key={inv.id} 
                              invitation={inv} 
                              onAccept={() => handleAcceptInvitation(inv, item)} 
                              onReject={() => handleRejectInvitation(inv)} 
                            />
                          ))}
                        </View>
                      );
                    }
                    return (
                      <View style={{ paddingVertical: 8, alignItems: 'center' }}>
                        <Text style={{ color: COLORS.textMuted, fontStyle: 'italic', fontSize: 12 }}>
                          {item.status === 'OPEN' 
                            ? 'Đang phát sóng tìm tài xế gần bạn nhất...' 
                            : 'Không có lời mời nào.'}
                        </Text>
                      </View>
                    );
                  })()}
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
          ListFooterComponent={
            mainTab === 'BOOKINGS' && filtered.length > 10 ? (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
                  disabled={page === 0}
                  onPress={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <Ionicons name="chevron-back" size={16} color={page === 0 ? COLORS.textMuted : COLORS.primary} />
                  <Text style={[styles.pageBtnText, page === 0 && styles.pageBtnTextDisabled]}>Trước</Text>
                </TouchableOpacity>

                <Text style={styles.pageInfoText}>
                  Trang <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>{page + 1}</Text> / {totalPages}
                </Text>

                <TouchableOpacity
                  style={[styles.pageBtn, page >= totalPages - 1 && styles.pageBtnDisabled]}
                  disabled={page >= totalPages - 1}
                  onPress={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  <Text style={[styles.pageBtnText, page >= totalPages - 1 && styles.pageBtnTextDisabled]}>Sau</Text>
                  <Ionicons name="chevron-forward" size={16} color={page >= totalPages - 1 ? COLORS.textMuted : COLORS.primary} />
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name={mainTab === 'BOOKINGS' ? "car-outline" : "radio-outline"} size={60} color={COLORS.border} />
              <Text style={styles.emptyTitle}>
                {mainTab === 'BOOKINGS' ? 'Chưa có chuyến nào' : 'Chưa có yêu cầu nào'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {mainTab === 'BOOKINGS' 
                  ? (hasActiveFilters
                      ? 'Không tìm thấy chuyến đi phù hợp với bộ lọc bạn đã chọn.'
                      : activeTab
                      ? 'Không có chuyến nào trong trạng thái này.'
                      : 'Hãy đặt chuyến đầu tiên của bạn!')
                  : 'Bạn chưa phát tín hiệu tìm xe nào hoặc không có yêu cầu trong mục này.'}
              </Text>
              {mainTab === 'BOOKINGS' && !activeTab && !hasActiveFilters && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => navigation.navigate('SearchRide')}
                >
                  <Text style={styles.emptyBtnText}>Tìm chuyến ngay</Text>
                </TouchableOpacity>
              )}
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

      {/* ── MODAL XÁC NHẬN CHỐT CHUYẾN GỌN GÀNG TẠI CHỖ ── */}
      <Modal
        visible={!!selectedInviteData}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSubmittingBooking) setSelectedInviteData(null);
        }}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalCard}>
            {/* Header */}
            <View style={styles.confirmModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.confirmHeaderIconBox}>
                  <Ionicons name="car-sport" size={20} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.confirmHeaderTitle}>Xác nhận chốt chuyến</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={styles.confirmHeaderSub}>Đồng ý lời mời</Text>
                    {selectedInviteData?.invitation?.tripId && (
                      <View style={styles.confirmTripIdBadge}>
                        <Ionicons name="barcode-outline" size={11} color={COLORS.primary} />
                        <Text style={styles.confirmTripIdText}>
                          Mã: #{selectedInviteData.invitation.tripId.length > 12 ? selectedInviteData.invitation.tripId.slice(0, 8).toUpperCase() : selectedInviteData.invitation.tripId}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedInviteData(null)}
                disabled={isSubmittingBooking}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={26} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {/* Departure Time Hero Banner */}
              {selectedInviteData?.invitation?.departureTime && (
                <View style={styles.confirmTimeHeroBox}>
                  <View style={styles.confirmTimeHeroIconWrap}>
                    <Ionicons name="time" size={20} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.confirmTimeHeroSub}>THỜI GIAN KHỞI HÀNH</Text>
                    <Text style={styles.confirmTimeHeroMain}>
                      {new Date(selectedInviteData.invitation.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(selectedInviteData.invitation.departureTime).toLocaleDateString('vi-VN')}
                    </Text>
                  </View>
                </View>
              )}
              {/* Driver & Vehicle info */}
              <View style={styles.confirmSectionBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.confirmDriverName}>{selectedInviteData?.invitation?.driverName || 'Tài xế'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Ionicons name="star" size={13} color="#f59e0b" />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text }}>
                          {selectedInviteData?.invitation?.driverRating ? Number(selectedInviteData.invitation.driverRating).toFixed(1) : '5.0'}
                        </Text>
                      </View>
                      {selectedInviteData?.invitation?.totalRides != null && (
                        <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                          ({selectedInviteData.invitation.totalRides} chuyến)
                        </Text>
                      )}
                    </View>
                  </View>
                  {selectedInviteData?.invitation?.driverPhone ? (
                    <View style={styles.confirmPhoneBadge}>
                      <Ionicons name="call" size={12} color="#0284c7" />
                      <Text style={styles.confirmPhoneText}>{selectedInviteData.invitation.driverPhone}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Car Details */}
                {(selectedInviteData?.invitation?.vehicleName || selectedInviteData?.invitation?.plateNumber) && (
                  <View style={styles.confirmCarRow}>
                    <Ionicons name="car" size={14} color={COLORS.textMuted} />
                    <Text style={styles.confirmCarName}>
                      {selectedInviteData?.invitation?.vehicleName || 'Xe ô tô'}
                      {selectedInviteData?.invitation?.vehicleColor ? ` (${selectedInviteData.invitation.vehicleColor})` : ''}
                    </Text>
                    {selectedInviteData?.invitation?.plateNumber && (
                      <View style={styles.confirmPlateBadge}>
                        <Text style={styles.confirmPlateText}>{selectedInviteData.invitation.plateNumber}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Route Info */}
              <View style={styles.confirmSectionBox}>
                <Text style={styles.confirmSectionTitle}>LỘ TRÌNH ĐÓN TRẢ</Text>
                
                {selectedInviteData?.invitation?.departureTime && (
                  <View style={styles.confirmTimeRow}>
                    <Ionicons name="time" size={14} color={COLORS.primary} />
                    <Text style={styles.confirmTimeText}>
                      Khởi hành: {new Date(selectedInviteData.invitation.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(selectedInviteData.invitation.departureTime).toLocaleDateString('vi-VN')}
                    </Text>
                  </View>
                )}

                <View style={styles.confirmRoutePoint}>
                  <View style={[styles.confirmDot, { backgroundColor: COLORS.green }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.confirmPointLabel}>Điểm đón của bạn</Text>
                    <Text style={styles.confirmPointValue}>
                      {selectedInviteData?.tripRequest?.startAddressText || 'Địa chỉ điểm đón'}
                    </Text>
                  </View>
                </View>

                <View style={styles.confirmRouteLine} />

                <View style={styles.confirmRoutePoint}>
                  <View style={[styles.confirmDot, { backgroundColor: COLORS.error }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.confirmPointLabel}>Điểm trả của bạn</Text>
                    <Text style={styles.confirmPointValue}>
                      {selectedInviteData?.tripRequest?.endAddressText || 'Địa chỉ điểm đến'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Payment & Price Summary */}
              <View style={styles.confirmPriceBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, color: COLORS.textMuted }}>Số lượng chỗ</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text }}>
                    {selectedInviteData?.tripRequest?.seatTotal || 1} ghế
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, color: COLORS.textMuted }}>Hình thức</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="cash-outline" size={15} color={COLORS.green} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.green }}>Tiền mặt khi lên xe</Text>
                  </View>
                </View>
                <View style={styles.confirmDivider} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: COLORS.text }}>Tổng thanh toán</Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.primary }}>
                    {Number(selectedInviteData?.invitation?.price || 0).toLocaleString('vi-VN')} đ
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Action buttons */}
            <View style={styles.confirmActionsRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setSelectedInviteData(null)}
                disabled={isSubmittingBooking}
              >
                <Text style={styles.confirmCancelText}>Để sau</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmSubmitBtn, isSubmittingBooking && { opacity: 0.7 }]}
                onPress={handleConfirmAcceptInvitation}
                disabled={isSubmittingBooking}
              >
                {isSubmittingBooking ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.confirmSubmitText}>Xác nhận chốt</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: COLORS.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4, zIndex: 10 },
  headerSub: { color: COLORS.primary, fontSize: SIZES.small, fontWeight: 'bold', letterSpacing: 1, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },

  // Master Tabs
  masterTabContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', margin: 16, borderRadius: 24, padding: 4 },
  masterTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  masterTabActive: { backgroundColor: COLORS.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  masterTabText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 13 },
  masterTabTextActive: { color: COLORS.primary, fontWeight: 'bold' },

  // Filter Card
  filterCard: { backgroundColor: COLORS.surface, marginHorizontal: 16, marginTop: 12, marginBottom: 8, borderRadius: 16, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandText: { color: COLORS.green, fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 3 },
  cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: 'bold' },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(14, 165, 233, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
  toggleBtnText: { color: COLORS.primary, fontSize: 11, fontWeight: 'bold' },
  filterBody: { borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 14, marginTop: 10 },
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
  dateValue: { flex: 1, color: COLORS.text, fontSize: 13 },
  datePlaceholder: { flex: 1, color: COLORS.textMuted, fontSize: 13 },

  // Filter Action Buttons
  clearBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: 10, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  clearBtnText: { color: COLORS.error, fontWeight: 'bold', fontSize: 12 },
  applyFilterBtn: { flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 11, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  applyFilterBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },

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
  calDayTextToday: { color: COLORS.primary, fontWeight: 'bold' },
  calFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  calClearBtn: { color: COLORS.textMuted, fontSize: SIZES.medium, fontWeight: 'bold', padding: 8 },
  calTodayBtn: { color: COLORS.primary, fontSize: SIZES.medium, fontWeight: 'bold', padding: 8 },

  // Filter tabs
  tabsWrapper: { backgroundColor: COLORS.surface, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabsScroll: { flexGrow: 0 },
  tabsContainer: { paddingHorizontal: 16, gap: 10, flexDirection: 'row', alignItems: 'center' },
  tab: { paddingHorizontal: 20, height: 38, justifyContent: 'center', borderRadius: 20, backgroundColor: '#F1F5F9' },
  tabActive: { backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  tabText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF', fontWeight: 'bold' },

  // List
  listContainer: { paddingHorizontal: 0, paddingVertical: 12, paddingBottom: 24 },

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
    borderLeftWidth: 5,
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

  // Card Body (Route - Giống màn Tìm chuyến)
  cardBody: { padding: 14, position: 'relative' },
  departureDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  departureDateBannerText: {
    color: COLORS.text,
    fontSize: 12,
  },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  timeBox: { width: 44, paddingTop: 2 },
  timeText: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  iconBox: { width: 24, alignItems: 'center', zIndex: 2, paddingTop: 2 },
  routeLine: { width: 2, height: 38, backgroundColor: '#CBD5E1', borderStyle: 'dashed', position: 'absolute', top: 22 },
  addressBox: { flex: 1, paddingLeft: 8 },
  addressText: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  subAddressText: { color: COLORS.primary, fontSize: 12, marginTop: 2, fontWeight: '600' },
  detailAddressText: { color: COLORS.textMuted, fontSize: 12, marginTop: 3, fontWeight: '500', lineHeight: 17 },

  // Payment Row & Badge
  cardPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  seatCountText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  cardPriceAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },

  // Footer Card
  cardFooter: { borderTopWidth: 1, borderTopColor: '#F8FAFC', padding: 12 },
  chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(14, 165, 233, 0.1)', paddingVertical: 8, borderRadius: 8, gap: 8 },
  chatBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },

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

  // Confirm Invitation Modal styles
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  confirmHeaderIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  confirmHeaderSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  confirmTripIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  confirmTripIdText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  confirmTimeHeroBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  confirmTimeHeroIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmTimeHeroSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  confirmTimeHeroMain: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  confirmSectionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  confirmSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  confirmDriverName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  confirmPhoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  confirmPhoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  confirmCarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
  },
  confirmCarName: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  confirmPlateBadge: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  confirmPlateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  confirmTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  confirmTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  confirmRoutePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  confirmDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  confirmRouteLine: {
    width: 2,
    height: 14,
    backgroundColor: '#CBD5E1',
    marginLeft: 4,
    marginVertical: 2,
  },
  confirmPointLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  confirmPointValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 1,
  },
  confirmPriceBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 12,
  },
  confirmDivider: {
    height: 1,
    backgroundColor: '#DCFCE7',
    marginVertical: 8,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  confirmSubmitBtn: {
    flex: 1.5,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmSubmitText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default MyTripsScreen;
