import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, 
  ActivityIndicator, Alert, Modal, FlatList, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '../services/apiService';

const COLORS = {
  background: '#121212', surface: '#1E1E1E', primary: '#0ea5e9',
  text: '#FFFFFF', textMuted: '#94a3b8', border: '#334155',
  success: '#10b981', error: '#ef4444'
};

const SEAT_OPTIONS = ['1', '2', '3', '4', '7'];
const PRICE_OPTIONS = ['100000', '150000', '200000', '250000', '300000'];

const formatMoney = (val) => {
  if (!val) return '0 đ';
  return Number(val).toLocaleString('vi-VN') + ' đ';
};

// ---- Dropdown Component ----
const DropdownSelect = ({ label, placeholder, value, options, onSelect, disabled }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedItem = options?.find(o => String(o.id) === String(value));

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity 
        style={[styles.inputBox, disabled && { opacity: 0.45 }]} 
        onPress={() => !disabled && setModalVisible(true)}
      >
        <View style={{ flex: 1 }}>
          {label && <Text style={styles.inputLabel}>{label}</Text>}
          <Text style={{ color: selectedItem ? COLORS.text : COLORS.textMuted, fontSize: 14, fontWeight: selectedItem ? '600' : 'normal' }} numberOfLines={1}>
            {selectedItem ? selectedItem.name : placeholder}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn {label || placeholder}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color={COLORS.textMuted} />
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
                  <Text style={[styles.modalItemText, String(item.id) === String(value) && { color: COLORS.primary, fontWeight: 'bold' }]}>
                    {item.name}
                  </Text>
                  {String(item.id) === String(value) && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default function CreateTripScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [provinces, setProvinces] = useState([]);
  const [startWards, setStartWards] = useState([]);
  const [endWards, setEndWards] = useState([]);
  
  const [form, setForm] = useState({
    startProvinceId: '', endProvinceId: '',
    pickups: [{ id: 'p1', wardId: '' }],
    dropoffs: [{ id: 'd1', wardId: '' }],
    departureTime: new Date(Date.now() + 86400000),
    seatTotal: '4', priceVnd: '150000'
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => { fetchProvinces(); }, []);

  const fetchProvinces = async () => {
    setLoading(true);
    try {
      const res = await apiService.getAllProvinces();
      setProvinces(res?.data?.result || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  const fetchWards = async (provinceId, isStart) => {
    if (!provinceId) return;
    try {
      const res = await apiService.getAllWards(provinceId);
      if (isStart) setStartWards(res?.data?.result || []);
      else setEndWards(res?.data?.result || []);
    } catch (e) { console.log(e); }
  };

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (form.startProvinceId) { fetchWards(form.startProvinceId, true); updateForm('pickups', [{ id: Date.now().toString(), wardId: '' }]); }
    else setStartWards([]);
  }, [form.startProvinceId]);

  useEffect(() => {
    if (form.endProvinceId) { fetchWards(form.endProvinceId, false); updateForm('dropoffs', [{ id: Date.now().toString(), wardId: '' }]); }
    else setEndWards([]);
  }, [form.endProvinceId]);

  const addStop = (type) => updateForm(type, [...form[type], { id: Date.now().toString(), wardId: '' }]);
  const removeStop = (type, index) => { const list = [...form[type]]; list.splice(index, 1); updateForm(type, list); };
  const updateStop = (type, index, wardId) => { const list = [...form[type]]; list[index].wardId = wardId; updateForm(type, list); };

  const adjustSeats = (delta) => {
    const current = Number(form.seatTotal) || 0;
    const next = Math.min(16, Math.max(1, current + delta));
    updateForm('seatTotal', String(next));
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
    if (!form.priceVnd || isNaN(form.priceVnd) || Number(form.priceVnd) < 1000) {
      Alert.alert('Lỗi', 'Giá vé phải từ 1.000đ trở lên.'); return;
    }

    setSubmitting(true);
    try {
      const stops = [
        ...validPickups.map(p => ({ stopType: 'PICKUP', wardId: p.wardId })),
        ...validDropoffs.map(d => ({ stopType: 'DROPOFF', wardId: d.wardId }))
      ];
      await apiService.createTrip({
        startProvinceId: form.startProvinceId, endProvinceId: form.endProvinceId,
        departureTime: form.departureTime.toISOString(),
        seatTotal: Number(form.seatTotal), priceVnd: Number(form.priceVnd),
        stops
      });
      Alert.alert('Thành công! 🎉', 'Chuyến xe đã được mở. Hành khách có thể tìm thấy và đặt chỗ ngay!', [
        { text: 'Xem chuyến xe', onPress: () => {
            updateForm('startProvinceId', ''); updateForm('endProvinceId', '');
            updateForm('pickups', [{ id: 'p1', wardId: '' }]); updateForm('dropoffs', [{ id: 'd1', wardId: '' }]);
            navigation.navigate('DriverTrips');
          }
        }
      ]);
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không thể tạo chuyến lúc này');
    } finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mở Chuyến Xe</Text>
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
              />
              <View style={{ marginTop: 10 }}>
                {form.pickups.map((p, index) => (
                  <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <DropdownSelect 
                      label={`Điểm đón ${index + 1}`} placeholder="Chọn phường/xã"
                      value={p.wardId} options={startWards} onSelect={(val) => updateStop('pickups', index, val)}
                      disabled={!form.startProvinceId}
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
              />
              <View style={{ marginTop: 10 }}>
                {form.dropoffs.map((d, index) => (
                  <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <DropdownSelect 
                      label={`Điểm trả ${index + 1}`} placeholder="Chọn phường/xã"
                      value={d.wardId} options={endWards} onSelect={(val) => updateStop('dropoffs', index, val)}
                      disabled={!form.endProvinceId}
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

          {/* === THỜI GIAN & GIÁ VÉ === */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="time" size={18} color={COLORS.primary} />
              <Text style={styles.cardTitle}>THỜI GIAN & GIÁ VÉ</Text>
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
                  style={{ alignSelf: 'stretch' }}
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

            {/* === SỐ GHẾ === */}
            <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Số ghế nhận khách</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustSeats(-1)}>
                <Ionicons name="remove" size={22} color={COLORS.primary} />
              </TouchableOpacity>
              <View style={styles.seatValueBox}>
                <TextInput
                  style={styles.seatInput}
                  keyboardType="numeric"
                  value={form.seatTotal}
                  onChangeText={(t) => updateForm('seatTotal', t.replace(/[^0-9]/g, ''))}
                  textAlign="center"
                  maxLength={2}
                  color={COLORS.text}
                />
                <Text style={styles.seatUnit}>ghế</Text>
              </View>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustSeats(1)}>
                <Ionicons name="add" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24, marginTop: 10 }}>
              {SEAT_OPTIONS.map(seat => (
                <TouchableOpacity key={seat} style={[styles.chip, form.seatTotal === seat && styles.chipActive]} onPress={() => updateForm('seatTotal', seat)}>
                  <Text style={[styles.chipText, form.seatTotal === seat && styles.chipTextActive]}>{seat} ghế</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* === GIÁ VÉ === */}
            <Text style={styles.sectionLabel}>Giá vé mỗi ghế</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {PRICE_OPTIONS.map(price => (
                <TouchableOpacity key={price} style={[styles.chip, form.priceVnd === price && styles.chipActive]} onPress={() => updateForm('priceVnd', price)}>
                  <Text style={[styles.chipText, form.priceVnd === price && styles.chipTextActive]}>{formatMoney(price)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.customInputRow}>
              <Ionicons name="cash-outline" size={20} color={COLORS.textMuted} />
              <TextInput 
                style={styles.customInput}
                keyboardType="numeric" 
                placeholder="Nhập giá khác..."
                placeholderTextColor={COLORS.textMuted} 
                value={form.priceVnd}
                color={COLORS.text}
                onChangeText={(t) => updateForm('priceVnd', t.replace(/[^0-9]/g, ''))}
              />
              <Text style={styles.currencyLabel}>đ</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingTop: 40, paddingBottom: 20, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, marginBottom: 4 },
  headerSub: { fontSize: 14, color: COLORS.textMuted },
  scrollContent: { padding: 16, paddingBottom: 20 },

  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  cardTitle: { color: COLORS.text, fontSize: 13, fontWeight: 'bold', letterSpacing: 1 },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  addStopBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: `${COLORS.primary}44`, backgroundColor: `${COLORS.primary}0d`, marginTop: 4 },
  addStopText: { color: COLORS.primary, fontSize: 13, fontWeight: 'bold' },
  deleteStopBtn: { padding: 14, marginLeft: 6 },

  inputBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, height: 60 },
  inputLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  sectionLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  datePickerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: `${COLORS.primary}15`, paddingHorizontal: 16, height: 50, borderRadius: 12, borderWidth: 1, borderColor: `${COLORS.primary}33` },
  datePickerBtnActive: { borderColor: COLORS.primary, borderWidth: 2 },
  datePickerText: { color: COLORS.primary, fontSize: 15, fontWeight: 'bold' },

  pickerContainer: { backgroundColor: COLORS.background, borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  pickerDoneBtn: { backgroundColor: COLORS.primary, margin: 12, borderRadius: 10, padding: 12, alignItems: 'center' },
  pickerDoneText: { color: COLORS.background, fontWeight: 'bold', fontSize: 15 },

  // Stepper
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 4 },
  stepperBtn: { width: 52, height: 52, borderRadius: 16, backgroundColor: `${COLORS.primary}15`, borderWidth: 1, borderColor: `${COLORS.primary}33`, justifyContent: 'center', alignItems: 'center' },
  seatValueBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 20, marginHorizontal: 12, height: 52, minWidth: 100, justifyContent: 'center' },
  seatInput: { fontSize: 26, fontWeight: 'bold', color: COLORS.text, minWidth: 40 },
  seatUnit: { color: COLORS.textMuted, fontSize: 16, marginLeft: 6 },

  chip: { paddingHorizontal: 18, height: 38, borderRadius: 20, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: COLORS.background, fontWeight: 'bold' },

  customInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 16, height: 52, gap: 10 },
  customInput: { flex: 1, fontSize: 16, fontWeight: 'bold' },
  currencyLabel: { color: COLORS.textMuted, fontSize: 16, fontWeight: 'bold' },

  // Bottom Footer
  bottomFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, borderTopWidth: 1, borderTopColor: COLORS.border },
  footerLeft: { flex: 1, marginRight: 12 },
  footerLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  footerValue: { color: COLORS.success, fontSize: 20, fontWeight: '900' },
  footerSub: { color: COLORS.textMuted, fontSize: 13 },
  submitBtn: { backgroundColor: COLORS.primary, height: 52, borderRadius: 14, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnText: { color: COLORS.background, fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '70%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalItemText: { color: COLORS.text, fontSize: 16 }
});
