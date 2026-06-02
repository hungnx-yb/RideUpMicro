import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LocationMapPicker from '../components/LocationMapPicker';

const COLORS = {
  background: '#F8FAFC', surface: '#FFFFFF', primary: '#0ea5e9',
  text: '#0F172A', textMuted: '#64748B', error: '#ef4444',
  border: '#E2E8F0', green: '#10b981',
};
const SIZES = { small: 12, font: 14, medium: 16, large: 20, extraLarge: 24, title: 32 };

// ===== COMPONENT: Custom Dropdown =====
const DropdownSelect = ({ label, placeholder, value, options, onSelect, disabled }) => {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.id === value)?.name || '';

  return (
    <>
      <TouchableOpacity
        style={[styles.dropdownBtn, disabled && styles.dropdownBtnDisabled]}
        onPress={() => { if (!disabled) setOpen(true); }}
        activeOpacity={0.8}
      >
        <Text style={selectedLabel ? styles.dropdownValue : styles.dropdownPlaceholder} numberOfLines={1}>
          {selectedLabel || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={14} color={disabled ? COLORS.border : COLORS.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.ddOverlay} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={styles.ddSheet}>
          <View style={styles.ddHeader}>
            <Text style={styles.ddTitle}>{label}</Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Option: Tất cả */}
          <TouchableOpacity
            style={styles.ddItem}
            onPress={() => { onSelect(''); setOpen(false); }}
          >
            <Text style={[styles.ddItemText, !value && { color: COLORS.primary, fontWeight: 'bold' }]}>
              -- Tất cả --
            </Text>
            {!value && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
          </TouchableOpacity>

          <FlatList
            data={options}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.ddItem}
                onPress={() => { onSelect(item.id); setOpen(false); }}
              >
                <Text style={[styles.ddItemText, item.id === value && { color: COLORS.primary, fontWeight: 'bold' }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {item.id === value && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
              </TouchableOpacity>
            )}
            style={{ maxHeight: 360 }}
          />
        </View>
      </Modal>
    </>
  );
};


// ===== COMPONENT: Custom Calendar =====
const DAYS_OF_WEEK = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS_VN = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

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
const SearchRideScreen = ({ navigation }) => {
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

  const [pickupWardId, setPickupWardId] = useState('');
  const [pickupLocation, setPickupLocation] = useState({ lat: NaN, lng: NaN, addressText: '' });

  const [dropoffWardId, setDropoffWardId] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState({ lat: NaN, lng: NaN, addressText: '' });

  useEffect(() => {
    fetchTrips(false); // Không thu gọn bộ lọc trong lần tải đầu tiên
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

  const fetchProvinces = async () => {
    try {
      const res = await apiService.getAllProvinces();
      if (res?.data?.result) setProvinces(res.data.result);
    } catch (e) {
      console.log('fetchProvinces error:', e);
    }
  };

  const fetchTrips = async (autoCollapse = true) => {
    setLoading(true);
    if (autoCollapse) {
      // Chỉ thu gọn khi bấm nút Tìm kiếm
      setIsFilterExpanded(false);
    }
    try {
      const dateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : undefined;
      const response = await apiService.getAllTrips({ startWardId, endWardId, date: dateStr, page: 0, size: 20 });
      // API trả về result là array trực tiếp (không phải { items: [...] })
      if (Array.isArray(response?.data?.result)) {
        setTrips(response.data.result);
      } else if (response?.data?.result?.items) {
        // Fallback nếu API đổi sang dạng paginated
        setTrips(response.data.result.items);
      } else {
        setTrips([]);
      }
    } catch (error) {
      console.log('Fetch trips error:', error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
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
    try {
      const payload = {
        tripId: selectedTrip.id,
        seatCount: seatCount,
        paymentMethod: paymentMethod,
        pickupLat: pickupLocation.lat || 0,
        pickupLng: pickupLocation.lng || 0,
        pickupWardId: pickupWardId,
        pickupAddressText: pickupLocation.addressText?.trim() || '',
        dropoffLat: dropoffLocation.lat || 0,
        dropoffLng: dropoffLocation.lng || 0,
        dropoffWardId: dropoffWardId,
        dropoffAddressText: dropoffLocation.addressText?.trim() || '',
        note: bookingNote.trim() || 'Đặt qua Mobile App',
      };

      const response = await apiService.createBooking(payload);
      if (response.data.code === 1000) {
        const bookingId = response.data.result.id;
        if (paymentMethod === 'VNPAY') {
          const paymentUrlRes = await apiService.getPaymentUrl(bookingId);
          const paymentUrl = paymentUrlRes?.data?.result?.paymentUrl;
          if (paymentUrl) {
            alert('Đang mở cổng thanh toán VNPay...');
            Linking.openURL(paymentUrl);
          } else {
            alert('Không lấy được link thanh toán.');
          }
        } else {
          alert('Đặt chỗ thành công!');
        }
        setSelectedTrip(null);
        navigation.navigate('Map', { booking: response.data.result });
      } else {
        alert(response.data.message || 'Lỗi đặt chuyến');
      }
    } catch (error) {
      console.log(error);
      alert('Không thể tạo booking. Vui lòng thử lại.');
    } finally {
      setIsBooking(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };
  const formatMoney = (val) => `${Number(val || 0).toLocaleString('vi-VN')}đ`;

  const formatDuration = (dep, arr) => {
    if (!dep || !arr) return null;
    const mins = Math.round((new Date(arr) - new Date(dep)) / 60000);
    if (mins < 60) return `${mins} phút`;
    return `${Math.floor(mins/60)}g${mins%60 > 0 ? (mins%60)+'p' : ''}`;
  };

  const renderStars = (rating) => {
    const stars = Math.round(rating || 5);
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
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
                {renderStars(item.driverRating)} • 🚗 {item.vehicleBrand} {item.vehicleModel}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bookBtn} onPress={() => handleOpenBooking(item)}>
            <Text style={styles.bookBtnText}>Đặt ngay</Text>
          </TouchableOpacity>
        </View>

        {/* === BODY: LỘ TRÌNH === */}
        <View style={styles.cardBody}>
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
              {item.stops?.filter(s => s.stopType === 'PICKUP').slice(0, 1).map((s, i) => (
                <Text key={i} style={styles.subAddressText} numberOfLines={1}>↳ {s.addressText}</Text>
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
              {item.stops?.filter(s => s.stopType === 'DROPOFF').slice(0, 1).map((s, i) => (
                <Text key={i} style={styles.subAddressText} numberOfLines={1}>↳ {s.addressText}</Text>
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
                    <TouchableOpacity onPress={() => setSelectedDate(null)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
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
                <TouchableOpacity style={styles.searchBtn} onPress={fetchTrips}>
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
          ListEmptyComponent={<Text style={styles.emptyText}>Chưa có chuyến xe nào đang mở.</Text>}
        />
      )}

      {/* Booking Confirmation Modal */}
      <Modal visible={!!selectedTrip} transparent={false} animationType="slide">
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
                <TouchableOpacity style={[styles.payBtn, paymentMethod === 'VNPAY' && styles.payBtnActive]} onPress={() => setPaymentMethod('VNPAY')}>
                  <Text style={[styles.payBtnText, paymentMethod === 'VNPAY' && { color: COLORS.background }]}>VNPay</Text>
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
      </Modal>
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
  ddOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  ddSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '70%' },
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
});

export default SearchRideScreen;
