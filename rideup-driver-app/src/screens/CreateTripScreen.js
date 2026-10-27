import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal, FlatList, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '../services/apiService';

const COLORS = {
  background: '#F8FAFC', surface: '#FFFFFF', primary: '#0ea5e9',
  text: '#0F172A', textMuted: '#64748B', border: '#E2E8F0',
  success: '#10b981', warning: '#f59e0b', error: '#ef4444'
};

const SEAT_OPTIONS = ['1', '2', '3', '4', '7'];
const PRICE_OPTIONS = ['100000', '150000', '200000', '250000', '300000'];
const DURATION_PRESETS = ['1.5', '2', '2.5', '3', '3.5', '4', '5', '6'];

const formatMoney = (val) => {
  if (!val) return '0 đ';
  return Number(val).toLocaleString('vi-VN') + ' đ';
};

// ---- Dropdown Component ----
const DropdownSelect = ({ label, placeholder, value, options, onSelect, disabled, loading = false, onRetry }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const safeOptions = Array.isArray(options) ? options : [];
  const selectedItem = safeOptions.find(o => String(o?.id) === String(value));

  const query = (searchQuery || '').trim().toLowerCase();
  const filteredOptions = safeOptions.filter(o => {
    if (!o) return false;
    const itemName = (o.name || o.wardName || o.provinceName || '').toString().toLowerCase();
    return itemName.includes(query);
  });

  const handleOpen = () => {
    if (disabled) {
      Alert.alert('Chưa chọn Tỉnh/Thành', 'Vui lòng chọn Tỉnh/Thành phố trước khi chọn Phường/Xã.');
      return;
    }
    setSearchQuery('');
    setModalVisible(true);
  };

  const handleClose = () => {
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        style={[styles.inputBox, disabled && { opacity: 0.45, backgroundColor: '#F1F5F9' }]}
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1, marginRight: 8 }}>
          {label && <Text style={styles.inputLabel}>{label}</Text>}
          <Text
            style={{
              color: selectedItem ? COLORS.text : COLORS.textMuted,
              fontSize: 15,
              fontWeight: selectedItem ? '700' : 'normal'
            }}
            numberOfLines={1}
          >
            {selectedItem ? selectedItem.name : placeholder}
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleClose}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => {
              e?.stopPropagation?.();
            }}
          >
            {/* Thanh kéo mờ (Drag Indicator) */}
            <View style={styles.modalDragIndicator} />

            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.modalTitle}>
                  {label ? `Chọn ${label}` : placeholder}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={handleClose}
                activeOpacity={0.6}
              >
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Ô TÌM KIẾM (SEARCH BOX) */}
            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Nhập tên để tìm kiếm..."
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ marginTop: 12, color: COLORS.textMuted, fontSize: 14 }}>
                  Đang tải danh sách...
                </Text>
              </View>
            ) : (
              <FlatList
                style={{ flex: 1 }}
                data={filteredOptions}
                keyExtractor={(item, index) => String(item?.id ?? index)}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
                ListEmptyComponent={() => (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <Ionicons name="search-outline" size={48} color="#CBD5E1" style={{ marginBottom: 12 }} />
                    <Text style={{ color: COLORS.textMuted, fontSize: 15, textAlign: 'center', marginBottom: 12 }}>
                      {safeOptions.length === 0 ? 'Chưa có dữ liệu danh sách' : 'Không tìm thấy kết quả phù hợp'}
                    </Text>
                    {safeOptions.length === 0 && onRetry && (
                      <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={onRetry}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="refresh" size={16} color={COLORS.primary} />
                        <Text style={styles.retryBtnText}>Tải lại danh sách</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                renderItem={({ item }) => {
                  const isSelected = String(item?.id) === String(value);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        isSelected && {
                          backgroundColor: `${COLORS.primary}10`,
                          borderColor: COLORS.primary,
                          borderWidth: 1,
                          borderRadius: 12,
                          paddingHorizontal: 16,
                          borderBottomWidth: 1
                        }
                      ]}
                      onPress={() => {
                        onSelect(item.id);
                        handleClose();
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                        <View style={[styles.modalItemIconWrap, isSelected && { backgroundColor: `${COLORS.primary}20` }]}>
                          <Ionicons
                            name={isSelected ? "location" : "location-outline"}
                            size={18}
                            color={isSelected ? COLORS.primary : COLORS.textMuted}
                          />
                        </View>
                        <Text
                          style={[styles.modalItemText, isSelected && { color: COLORS.primary, fontWeight: '700' }]}
                          numberOfLines={2}
                        >
                          {item?.name || '---'}
                        </Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default function CreateTripScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [provinces, setProvinces] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [startWards, setStartWards] = useState([]);
  const [loadingStartWards, setLoadingStartWards] = useState(false);
  const [endWards, setEndWards] = useState([]);
  const [loadingEndWards, setLoadingEndWards] = useState(false);

  const [form, setForm] = useState({
    startProvinceId: '', endProvinceId: '',
    pickups: [{ id: 'p1', wardId: '' }],
    dropoffs: [{ id: 'd1', wardId: '' }],
    departureTime: new Date(Date.now() + 86400000),
    estimatedDurationHours: '3',
    seatTotal: '4', priceVnd: '150000'
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [vehicle, setVehicle] = useState(null);

  // Tính thời gian đến dự kiến dựa trên giờ xuất phát + số giờ chạy
  const estimatedArrivalTime = useMemo(() => {
    const hours = parseFloat(form.estimatedDurationHours) || 0;
    if (hours <= 0 || !form.departureTime) return null;
    return new Date(form.departureTime.getTime() + hours * 3600 * 1000);
  }, [form.departureTime, form.estimatedDurationHours]);

  const adjustDuration = (delta) => {
    const current = parseFloat(form.estimatedDurationHours) || 3;
    const next = Math.max(0.5, Math.min(24, Math.round((current + delta) * 10) / 10));
    updateForm('estimatedDurationHours', String(next));
  };

  const resetForm = () => {
    const defaultSeat = vehicle?.seatCapacity ? String(Math.min(4, Number(vehicle.seatCapacity))) : '4';
    setForm({
      startProvinceId: '', endProvinceId: '',
      pickups: [{ id: Date.now().toString(), wardId: '' }],
      dropoffs: [{ id: (Date.now() + 1).toString(), wardId: '' }],
      departureTime: new Date(Date.now() + 86400000),
      estimatedDurationHours: '3',
      seatTotal: defaultSeat, priceVnd: '150000'
    });
    setStartWards([]);
    setEndWards([]);
  };

  const fetchVehicle = async () => {
    try {
      const res = await apiService.getMyVehicle();
      if (res?.data?.result) {
        const v = res.data.result;
        setVehicle(v);
        if (v.seatCapacity) {
          const cap = Number(v.seatCapacity);
          setForm(prev => {
            const current = Number(prev.seatTotal) || 4;
            return {
              ...prev,
              seatTotal: String(Math.min(current, cap))
            };
          });
        }
      }
    } catch (e) {
      console.log('Error fetching vehicle:', e);
    }
  };

  const fetchProvinces = async () => {
    setLoadingProvinces(true);
    try {
      const res = await apiService.getAllProvinces();
      if (Array.isArray(res?.data?.result)) {
        setProvinces(res.data.result);
      }
    } catch (e) {
      console.log('Error fetching provinces:', e);
    } finally {
      setLoadingProvinces(false);
    }
  };

  const fetchWards = async (provinceId, isStart) => {
    if (!provinceId) {
      if (isStart) setStartWards([]);
      else setEndWards([]);
      return;
    }
    try {
      if (isStart) setLoadingStartWards(true);
      else setLoadingEndWards(true);

      const res = await apiService.getAllWards(provinceId);
      const list = Array.isArray(res?.data?.result) ? res.data.result : [];
      if (isStart) setStartWards(list);
      else setEndWards(list);
    } catch (e) {
      console.log('Error fetching wards:', e);
      if (isStart) setStartWards([]);
      else setEndWards([]);
    } finally {
      if (isStart) setLoadingStartWards(false);
      else setLoadingEndWards(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (provinces.length === 0) {
        fetchProvinces();
      }
      fetchVehicle();
    }, [provinces.length])
  );

  useEffect(() => {
    fetchProvinces();
    fetchVehicle();
  }, []);

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (form.startProvinceId) {
      fetchWards(form.startProvinceId, true);
      updateForm('pickups', [{ id: Date.now().toString(), wardId: '' }]);
    } else {
      setStartWards([]);
    }
  }, [form.startProvinceId]);

  useEffect(() => {
    if (form.endProvinceId) {
      fetchWards(form.endProvinceId, false);
      updateForm('dropoffs', [{ id: Date.now().toString(), wardId: '' }]);
    } else {
      setEndWards([]);
    }
  }, [form.endProvinceId]);

  const addStop = (type) => updateForm(type, [...form[type], { id: Date.now().toString(), wardId: '' }]);
  const removeStop = (type, index) => { const list = [...form[type]]; list.splice(index, 1); updateForm(type, list); };
  const updateStop = (type, index, wardId) => { const list = [...form[type]]; list[index].wardId = wardId; updateForm(type, list); };

  const maxCapacity = vehicle?.seatCapacity ? Number(vehicle.seatCapacity) : 16;

  const adjustSeats = (delta) => {
    const current = Number(form.seatTotal) || 0;
    const next = Math.min(maxCapacity, Math.max(1, current + delta));
    updateForm('seatTotal', String(next));
  };

  const handleSeatBlur = () => {
    let num = Number(form.seatTotal);
    if (isNaN(num) || num < 1) num = 1;
    if (num > maxCapacity) {
      num = maxCapacity;
      Alert.alert(
        'Vượt quá số ghế đăng ký',
        `Xe của bạn đăng ký tối đa ${maxCapacity} chỗ. Số ghế đã được điều chỉnh về ${maxCapacity}.`
      );
    }
    updateForm('seatTotal', String(num));
  };

  const handleSubmit = async () => {
    const validPickups = form.pickups.filter(p => p.wardId);
    const validDropoffs = form.dropoffs.filter(d => d.wardId);
    if (!form.startProvinceId || !form.endProvinceId || validPickups.length === 0 || validDropoffs.length === 0) {
      Alert.alert('Chưa đầy đủ', 'Vui lòng chọn ít nhất 1 điểm đón và 1 điểm trả.'); return;
    }
    if (!form.seatTotal || isNaN(form.seatTotal) || Number(form.seatTotal) < 1) {
      Alert.alert('Lỗi', 'Số ghế không hợp lệ.'); return;
    }
    if (vehicle?.seatCapacity && Number(form.seatTotal) > Number(vehicle.seatCapacity)) {
      Alert.alert(
        'Số ghế không hợp lệ',
        `Không được tạo chuyến có số ghế (${form.seatTotal} ghế) vượt quá số ghế xe đăng ký (${vehicle.seatCapacity} chỗ).`
      );
      return;
    }
    if (!form.priceVnd || isNaN(form.priceVnd) || Number(form.priceVnd) < 1000) {
      Alert.alert('Lỗi', 'Giá vé phải từ 1.000đ trở lên.'); return;
    }

    setSubmitting(true);
    try {
      const startProvName = provinces.find(p => String(p.id) === String(form.startProvinceId))?.name || '';
      const endProvName = provinces.find(p => String(p.id) === String(form.endProvinceId))?.name || '';

      const stops = [
        ...validPickups.map(p => ({
          stopType: 'PICKUP',
          wardId: p.wardId,
          addressText: startWards.find(w => String(w.id) === String(p.wardId))?.name || ''
        })),
        ...validDropoffs.map(d => ({
          stopType: 'DROPOFF',
          wardId: d.wardId,
          addressText: endWards.find(w => String(w.id) === String(d.wardId))?.name || ''
        }))
      ];
      const tzOffset = new Date().getTimezoneOffset() * 60000;
      const localISOTime = new Date(form.departureTime.getTime() - tzOffset).toISOString().slice(0, -1);

      let localEstimatedArrivalTime = null;
      if (estimatedArrivalTime) {
        localEstimatedArrivalTime = new Date(estimatedArrivalTime.getTime() - tzOffset).toISOString().slice(0, -1);
      }

      await apiService.createTrip({
        startProvinceId: form.startProvinceId,
        endProvinceId: form.endProvinceId,
        startAddressText: startProvName,
        endAddressText: endProvName,
        departureTime: localISOTime,
        estimatedArrivalTime: localEstimatedArrivalTime,
        seatTotal: Number(form.seatTotal), priceVnd: Number(form.priceVnd),
        stops
      });
      setSuccessModalVisible(true);
    } catch (e) {
      const errorCode = e.response?.data?.code;
      const errorMessage = e.response?.data?.message || '';
      
      if (errorCode === 6001 || errorCode === 8001 || errorMessage.includes('ACCOUNT_BLOCKED_DUE_TO_DEBT')) {
        Alert.alert(
          'Tạm khóa tạo chuyến',
          'Dư nợ của bạn đã vượt mức 500.000đ. Vui lòng thanh toán hoa hồng để tiếp tục hoạt động.',
          [
            { text: 'Đóng', style: 'cancel' },
            { text: 'Đi tới Ví', onPress: () => navigation.navigate('Wallet') }
          ]
        );
      } else if (errorCode === 5008 || errorMessage.includes('vượt quá số ghế')) {
        Alert.alert('Không hợp lệ', errorMessage || 'Số ghế tạo chuyến không được vượt quá số ghế đăng ký của xe');
      } else {
        Alert.alert('Lỗi', errorMessage || 'Không thể tạo chuyến lúc này');
      }
    } finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View>
            <Text style={styles.headerAppTitle}>RIDEUP</Text>
            <Text style={styles.headerTitle}>Mở chuyến xe</Text>
          </View>
        </View>
        <Text style={styles.headerSub}>Thiết lập lộ trình để hành khách đặt chỗ</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + insets.bottom }]}>

          {/* === LỘ TRÌNH === */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="map" size={18} color={COLORS.primary} />
              <Text style={styles.cardTitle}>LỘ TRÌNH ĐI LẠI</Text>
            </View>

            {/* ĐIỂM ĐÓN */}
            <View style={{ marginBottom: 16 }}>
              <DropdownSelect
                label="Tỉnh đi" placeholder="Chọn tỉnh xuất phát"
                value={form.startProvinceId} options={provinces} onSelect={(val) => updateForm('startProvinceId', val)}
                loading={loadingProvinces}
                onRetry={fetchProvinces}
              />
              <View style={{ marginTop: 10 }}>
                {form.pickups.map((p, index) => (
                  <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <DropdownSelect
                      label={`Điểm đón ${index + 1}`} placeholder="Chọn phường/xã"
                      value={p.wardId} options={startWards} onSelect={(val) => updateStop('pickups', index, val)}
                      disabled={!form.startProvinceId}
                      loading={loadingStartWards}
                      onRetry={() => fetchWards(form.startProvinceId, true)}
                    />
                    {index > 0 && (
                      <TouchableOpacity style={styles.deleteStopBtn} onPress={() => removeStop('pickups', index)}>
                        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity style={styles.addStopBtn} onPress={() => addStop('pickups')}>
                  <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.addStopText}>Thêm điểm đón</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider} />

            {/* ĐIỂM TRẢ */}
            <View style={{ marginTop: 16 }}>
              <DropdownSelect
                label="Tỉnh đến" placeholder="Chọn tỉnh kết thúc"
                value={form.endProvinceId} options={provinces} onSelect={(val) => updateForm('endProvinceId', val)}
                loading={loadingProvinces}
                onRetry={fetchProvinces}
              />
              <View style={{ marginTop: 10 }}>
                {form.dropoffs.map((d, index) => (
                  <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <DropdownSelect
                      label={`Điểm trả ${index + 1}`} placeholder="Chọn phường/xã"
                      value={d.wardId} options={endWards} onSelect={(val) => updateStop('dropoffs', index, val)}
                      disabled={!form.endProvinceId}
                      loading={loadingEndWards}
                      onRetry={() => fetchWards(form.endProvinceId, false)}
                    />
                    {index > 0 && (
                      <TouchableOpacity style={styles.deleteStopBtn} onPress={() => removeStop('dropoffs', index)}>
                        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity style={[styles.addStopBtn, { borderColor: `${COLORS.error}44` }]} onPress={() => addStop('dropoffs')}>
                  <Ionicons name="add-circle-outline" size={16} color={COLORS.error} />
                  <Text style={[styles.addStopText, { color: COLORS.error }]}>Thêm điểm trả</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* === THỜI GIAN KHỞI HÀNH & ĐẾN === */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="time" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.cardTitle}>THỜI GIAN LỘ TRÌNH</Text>
            </View>

            {/* Date/Time pickers */}
            <Text style={styles.sectionLabel}>Giờ khởi hành dự kiến</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <TouchableOpacity
                style={[styles.datePickerBtn, showDatePicker && styles.datePickerBtnActive]}
                onPress={() => { setShowDatePicker(v => !v); setShowTimePicker(false); }}
              >
                <Ionicons name="calendar" size={20} color={COLORS.primary} />
                <Text style={styles.datePickerText}>{form.departureTime.toLocaleDateString('vi-VN')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.datePickerBtn, showTimePicker && styles.datePickerBtnActive]}
                onPress={() => { setShowTimePicker(v => !v); setShowDatePicker(false); }}
              >
                <Ionicons name="time" size={20} color={COLORS.primary} />
                <Text style={styles.datePickerText}>{form.departureTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={form.departureTime} mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                  themeVariant="light"
                  minimumDate={new Date()} style={{ alignSelf: 'stretch' }}
                  onChange={(e, date) => {
                    if (Platform.OS === 'android') setShowDatePicker(false);
                    if (date) { const d = new Date(form.departureTime); date.setHours(d.getHours(), d.getMinutes()); updateForm('departureTime', date); }
                  }}
                />
                <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.pickerDoneText}>Xong</Text>
                </TouchableOpacity>
              </View>
            )}

            {showTimePicker && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={form.departureTime} mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
                  themeVariant="light"
                  style={{ alignSelf: 'center' }}
                  onChange={(e, time) => {
                    if (Platform.OS === 'android') setShowTimePicker(false);
                    if (time) { const d = new Date(form.departureTime); d.setHours(time.getHours(), time.getMinutes()); updateForm('departureTime', d); }
                  }}
                />
                <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.pickerDoneText}>Xong</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.divider} />

            {/* Thời gian di chuyển ước tính */}
            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>Thời gian di chuyển ước tính</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.primary }}>
                  {form.estimatedDurationHours || '0'} giờ
                </Text>
              </View>

              {/* Stepper + Input */}
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustDuration(-0.5)} activeOpacity={0.7}>
                  <Ionicons name="remove" size={18} color={COLORS.primary} />
                </TouchableOpacity>
                <View style={styles.seatValueBox}>
                  <TextInput
                    style={styles.seatInput}
                    keyboardType="numeric"
                    value={form.estimatedDurationHours}
                    onChangeText={(t) => updateForm('estimatedDurationHours', t.replace(/[^0-9.]/g, ''))}
                  />
                  <Text style={styles.seatUnit}>giờ</Text>
                </View>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustDuration(0.5)} activeOpacity={0.7}>
                  <Ionicons name="add" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              {/* Chips gợi ý nhanh */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
                {DURATION_PRESETS.map((dur) => (
                  <TouchableOpacity
                    key={dur}
                    style={[styles.chip, form.estimatedDurationHours === dur && styles.chipActive]}
                    onPress={() => updateForm('estimatedDurationHours', dur)}
                  >
                    <Text style={[styles.chipText, form.estimatedDurationHours === dur && styles.chipTextActive]}>
                      {dur}h
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Hộp xem trước thời gian đến dự kiến */}
            {estimatedArrivalTime && (
              <View style={styles.arrivalPreviewBox}>
                <View style={styles.arrivalIconWrap}>
                  <Ionicons name="flag" size={16} color={COLORS.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.arrivalPreviewLabel}>DỰ KIẾN ĐẾN NƠI</Text>
                  <Text style={styles.arrivalPreviewTime}>
                    {estimatedArrivalTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {estimatedArrivalTime.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </Text>
                  <Text style={styles.arrivalPreviewNote}>
                    ⏱ Chuyến sẽ tự động hoàn thành sau 30 phút kể từ giờ đến nếu bạn chưa kết thúc.
                  </Text>
                </View>
              </View>
            )}

          </View>

          {/* === SỐ GHẾ & GIÁ VÉ === */}
          <View style={[styles.card, { marginTop: 16 }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="ticket" size={18} color={COLORS.success} />
              </View>
              <Text style={styles.cardTitle}>THÔNG TIN VÉ</Text>
            </View>

            {/* === SỐ GHẾ === */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <Text style={[styles.sectionLabel, { marginTop: 0 }]}>Số ghế nhận khách</Text>
              {vehicle?.seatCapacity ? (
                <View style={styles.vehicleCapacityBadge}>
                  <Ionicons name="car-sport" size={13} color={COLORS.primary} />
                  <Text style={styles.vehicleCapacityText}>Xe đăng ký: {vehicle.seatCapacity} chỗ</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.stepperRow}>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustSeats(-1)} activeOpacity={0.8}>
                <Ionicons name="remove" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              <View style={styles.seatValueBox}>
                <TextInput
                  style={styles.seatInput}
                  keyboardType="numeric"
                  value={String(form.seatTotal || '')}
                  onChangeText={(t) => updateForm('seatTotal', t.replace(/[^0-9]/g, ''))}
                  onBlur={handleSeatBlur}
                  textAlign="center"
                  maxLength={2}
                  color={COLORS.primary}
                  includeFontPadding={false}
                />
                <Text style={styles.seatUnit}>ghế</Text>
              </View>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustSeats(1)} activeOpacity={0.8}>
                <Ionicons name="add" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 32, paddingBottom: 10 }}>
              {(() => {
                const maxSeatChip = vehicle?.seatCapacity ? Number(vehicle.seatCapacity) : 7;
                const chips = [1, 2, 3, 4, 7, 9, 16].filter(n => n <= maxSeatChip);
                if (vehicle?.seatCapacity && !chips.includes(Number(vehicle.seatCapacity))) {
                  chips.push(Number(vehicle.seatCapacity));
                  chips.sort((a, b) => a - b);
                }
                return chips.map(String).map(seat => (
                  <TouchableOpacity key={seat} style={[styles.chip, String(form.seatTotal) === String(seat) && styles.chipActive]} onPress={() => updateForm('seatTotal', seat)} activeOpacity={0.8}>
                    <Text style={[styles.chipText, String(form.seatTotal) === String(seat) && styles.chipTextActive]}>{seat} ghế</Text>
                  </TouchableOpacity>
                ));
              })()}
            </ScrollView>

            {/* === GIÁ VÉ === */}
            <Text style={styles.sectionLabel}>Giá vé mỗi ghế</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, paddingBottom: 10 }}>
              {PRICE_OPTIONS.map(price => (
                <TouchableOpacity key={price} style={[styles.chip, form.priceVnd === price && styles.chipActive]} onPress={() => updateForm('priceVnd', price)} activeOpacity={0.8}>
                  <Text style={[styles.chipText, form.priceVnd === price && styles.chipTextActive]}>{formatMoney(price)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.customInputRow}>
              <View style={styles.iconCurrencyWrap}>
                <Ionicons name="cash" size={24} color={COLORS.success} />
              </View>
              <TextInput
                style={styles.customInput}
                keyboardType="numeric"
                placeholder="Nhập giá tự chọn..."
                placeholderTextColor={COLORS.textMuted}
                value={form.priceVnd}
                color={COLORS.primary}
                onChangeText={(t) => updateForm('priceVnd', t.replace(/[^0-9]/g, ''))}
              />
              <Text style={styles.currencyLabel}>VNĐ</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* === STICKY FOOTER === */}
      {!loading && (
        <View style={styles.bottomFooter}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerLabel}>Doanh thu ước tính</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={styles.footerValue}>{formatMoney(Number(form.seatTotal || 0) * Number(form.priceVnd || 0))}</Text>
              <Text style={styles.footerSub}> / {form.seatTotal || 0} ghế</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
            {submitting ? <ActivityIndicator size="small" color={COLORS.background} /> : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="car-sport-outline" size={16} color={COLORS.background} />
                <Text style={styles.submitBtnText}>Mở Chuyến</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* === COMPACT SUCCESS MODAL === */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>

            {/* Vòng sáng quanh Icon - Thu nhỏ */}
            <View style={styles.successGlow}>
              <View style={styles.successIconWrap}>
                <Ionicons name="checkmark-sharp" size={32} color="#FFFFFF" />
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="sparkles" size={18} color={COLORS.warning} style={{ marginRight: 6 }} />
              <Text style={styles.successTitle}>Tuyệt vời!</Text>
              <Ionicons name="sparkles" size={18} color={COLORS.warning} style={{ marginLeft: 6 }} />
            </View>

            <Text style={styles.successDesc}>
              Đã mở tuyến thành công. Hành khách đang chờ để đặt xe của bạn!
            </Text>

            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => {
                setSuccessModalVisible(false);
                resetForm();
                navigation.navigate('DriverTrips');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="car-sport" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.successBtnText}>Xem chuyến xe</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingTop: 16, paddingBottom: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4, zIndex: 10 },
  headerAppTitle: { fontSize: 12, fontWeight: '600', color: COLORS.primary, letterSpacing: 1, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  headerSub: { fontSize: 14, color: COLORS.textMuted },
  scrollContent: { padding: 16, paddingBottom: 8 },

  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardIconWrap: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(14, 165, 233, 0.1)', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { color: COLORS.text, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  addStopBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: `${COLORS.primary}44`, backgroundColor: `${COLORS.primary}0d`, marginTop: 4 },
  addStopText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  deleteStopBtn: { padding: 14, marginLeft: 6 },

  inputBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, height: 60 },
  inputLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  sectionLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  datePickerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${COLORS.primary}10`, paddingHorizontal: 10, height: 38, borderRadius: 8, borderWidth: 1, borderColor: `${COLORS.primary}22` },
  datePickerBtnActive: { borderColor: COLORS.primary, borderWidth: 1 },
  datePickerText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },

  pickerContainer: { backgroundColor: COLORS.background, borderRadius: 12, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  pickerDoneBtn: { backgroundColor: COLORS.primary, margin: 10, borderRadius: 8, padding: 8, alignItems: 'center' },
  pickerDoneText: { color: COLORS.background, fontWeight: '600', fontSize: 13 },

  // Stepper
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12, marginTop: 4 },
  stepperBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  seatValueBox: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', minWidth: 90, paddingHorizontal: 6 },
  seatInput: { minWidth: 38, fontSize: 22, fontWeight: '700', color: COLORS.primary, padding: 0, margin: 0, textAlign: 'center' },
  seatUnit: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600', marginLeft: 4 },

  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(14, 165, 233, 0.1)', borderWidth: 1, borderColor: COLORS.primary },
  retryBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },

  chip: { paddingHorizontal: 12, height: 28, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary, shadowColor: COLORS.primary, shadowOpacity: 0.2, shadowRadius: 3, elevation: 2 },
  chipText: { color: COLORS.text, fontSize: 11, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },

  customInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1, borderRadius: 8, paddingHorizontal: 10, height: 38, marginTop: 4, borderWidth: 1, borderColor: COLORS.border },
  iconCurrencyWrap: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center' },
  customInput: { flex: 1, fontSize: 13, fontWeight: '600', marginLeft: 8 },
  currencyLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },

  // Bottom Footer
  bottomFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 4 },
  footerLeft: { flex: 1, marginRight: 12 },
  footerLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  footerValue: { color: COLORS.success, fontSize: 16, fontWeight: '700' },
  footerSub: { color: COLORS.textMuted, fontSize: 11 },
  submitBtn: { backgroundColor: COLORS.primary, height: 38, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  submitBtnText: { color: COLORS.background, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '80%', padding: 24, paddingTop: 16 },
  modalDragIndicator: { width: 44, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },

  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600', letterSpacing: 0 },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },

  modalSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 16, height: 48, marginBottom: 16 },
  modalSearchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: COLORS.text, fontWeight: '500' },

  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalItemIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  modalItemText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },

  // Compact Success Modal Styles
  successOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, width: '85%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },

  successGlow: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(16, 185, 129, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },

  successTitle: { fontSize: 22, fontWeight: '600', color: COLORS.text, letterSpacing: 0.5 },
  successDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24, paddingHorizontal: 10 },

  successBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, borderRadius: 14, height: 50, width: '100%', alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  successBtnText: { color: COLORS.surface, fontSize: 15, fontWeight: '600' },

  vehicleCapacityBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(14, 165, 233, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  vehicleCapacityText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },

  arrivalPreviewBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    gap: 10,
  },
  arrivalIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  arrivalPreviewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.success,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  arrivalPreviewTime: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  arrivalPreviewNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 15,
  }
});
