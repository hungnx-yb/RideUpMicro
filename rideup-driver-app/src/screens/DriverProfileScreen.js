import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiService } from '../services/apiService';
import { BASE_URL } from '../config/api';
import FaceVerificationModal from '../components/FaceVerificationModal';

const COLORS = { 
  background: '#F8FAFC', surface: '#FFFFFF', primary: '#0ea5e9', 
  text: '#0F172A', textMuted: '#64748B', error: '#ef4444', 
  border: '#E2E8F0', success: '#10b981', warning: '#f59e0b' 
};

// Helpers chuyển đổi định dạng ngày giữa UI (DD/MM/YYYY) và Backend API (YYYY-MM-DD)
const formatDateToDisplay = (dateStr) => {
  if (!dateStr) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return dateStr;
};

const formatDateToIso = (dateStr) => {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    if (d && m && y && d.length <= 2 && m.length <= 2 && y.length === 4) {
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  return null;
};

const parseDateForPicker = (str) => {
  if (!str) return new Date(2000, 0, 1);
  if (str.includes('/')) {
    const [d, m, y] = str.split('/').map(Number);
    if (d && m && y) return new Date(y, m - 1, d);
  }
  if (str.includes('-')) {
    const [y, m, d] = str.split('-').map(Number);
    if (d && m && y) return new Date(y, m - 1, d);
  }
  return new Date(2000, 0, 1);
};

const MetricBox = ({ icon, value, label, color }) => (
  <View style={styles.metricBox}>
    <View style={[styles.metricIcon, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const MenuItem = ({ icon, title, subtitle, onPress, color = COLORS.text, isDestructive = false }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.menuIconBox, isDestructive && { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
      <Ionicons name={icon} size={22} color={isDestructive ? COLORS.error : COLORS.primary} />
    </View>
    <View style={styles.menuContent}>
      <Text style={[styles.menuTitle, { color }]}>{title}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
  </TouchableOpacity>
);

export default function DriverProfileScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerDate, setDatePickerDate] = useState(new Date(2000, 0, 1));
  const [isVehicleModalVisible, setIsVehicleModalVisible] = useState(false);
  const [isDriverModalVisible, setIsDriverModalVisible] = useState(false);
  const [isFaceModalVisible, setIsFaceModalVisible] = useState(false);
  const [faceModalMode, setFaceModalMode] = useState('enroll');

  const [user, setUser] = useState({
    username: '', email: '', fullName: '',
    phoneNumber: '', dateOfBirth: '', gender: '', avatarUrl: ''
  });

  const [driver, setDriver] = useState(null);
  const [vehicle, setVehicle] = useState(null);

  const [editForm, setEditForm] = useState({
    fullName: '', phoneNumber: '', dateOfBirth: '', gender: ''
  });

  const [isEditVehicleModalVisible, setIsEditVehicleModalVisible] = useState(false);
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [vehicleEditForm, setVehicleEditForm] = useState({
    plateNumber: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleColor: '',
    vehicleYear: '',
    seatCapacity: '4',
    vehicleType: 'CAR_4_SEAT',
    vehicleImageUri: null,
    registrationImageUri: null,
    insuranceImageUri: null,
    registrationExpiryDate: '',
    insuranceExpiryDate: '',
  });

  const openEditVehicleModal = () => {
    if (!vehicle) return;
    setVehicleEditForm({
      plateNumber: vehicle.plateNumber || '',
      vehicleBrand: vehicle.vehicleBrand || '',
      vehicleModel: vehicle.vehicleModel || '',
      vehicleColor: vehicle.vehicleColor || '',
      vehicleYear: vehicle.vehicleYear ? String(vehicle.vehicleYear) : '',
      seatCapacity: vehicle.seatCapacity ? String(vehicle.seatCapacity) : '4',
      vehicleType: vehicle.vehicleType || 'CAR_4_SEAT',
      vehicleImageUri: null,
      registrationImageUri: null,
      insuranceImageUri: null,
      registrationExpiryDate: formatDateToDisplay(vehicle.registrationExpiryDate) || '',
      insuranceExpiryDate: formatDateToDisplay(vehicle.insuranceExpiryDate) || '',
    });
    // Đóng Modal Thông Tin Xe trước để Form Chỉnh Sửa hiển thị ngay lập tức (không bị đè layer)
    setIsVehicleModalVisible(false);
    setTimeout(() => {
      setIsEditVehicleModalVisible(true);
    }, 150);
  };

  const handlePickVehicleImage = async (field) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Quyền", "Bạn cần cấp quyền truy cập thư viện ảnh!");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images', allowsEditing: true, quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setVehicleEditForm(prev => ({ ...prev, [field]: result.assets[0].uri }));
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh lúc này');
    }
  };

  const handleUpdateVehicle = async () => {
    if (!vehicleEditForm.plateNumber?.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập biển số xe');
      return;
    }
    if (!vehicleEditForm.vehicleBrand?.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập thương hiệu xe');
      return;
    }
    if (!vehicleEditForm.vehicleModel?.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập dòng xe');
      return;
    }

    setVehicleSaving(true);
    try {
      const formData = new FormData();
      formData.append('plateNumber', vehicleEditForm.plateNumber.trim());
      formData.append('vehicleBrand', vehicleEditForm.vehicleBrand.trim());
      formData.append('vehicleModel', vehicleEditForm.vehicleModel.trim());
      if (vehicleEditForm.vehicleColor?.trim()) {
        formData.append('vehicleColor', vehicleEditForm.vehicleColor.trim());
      }
      if (vehicleEditForm.vehicleYear) {
        formData.append('vehicleYear', vehicleEditForm.vehicleYear);
      }
      if (vehicleEditForm.seatCapacity) {
        formData.append('seatCapacity', vehicleEditForm.seatCapacity);
      }
      if (vehicleEditForm.vehicleType) {
        formData.append('vehicleType', vehicleEditForm.vehicleType);
      }
      if (vehicleEditForm.registrationExpiryDate) {
        const regIso = formatDateToIso(vehicleEditForm.registrationExpiryDate);
        if (regIso) formData.append('registrationExpiryDate', regIso);
      }
      if (vehicleEditForm.insuranceExpiryDate) {
        const insIso = formatDateToIso(vehicleEditForm.insuranceExpiryDate);
        if (insIso) formData.append('insuranceExpiryDate', insIso);
      }

      if (vehicleEditForm.vehicleImageUri) {
        formData.append('vehicleImage', {
          uri: vehicleEditForm.vehicleImageUri,
          name: 'vehicle.jpg',
          type: 'image/jpeg',
        });
      }
      if (vehicleEditForm.registrationImageUri) {
        formData.append('registrationImage', {
          uri: vehicleEditForm.registrationImageUri,
          name: 'registration.jpg',
          type: 'image/jpeg',
        });
      }
      if (vehicleEditForm.insuranceImageUri) {
        formData.append('insuranceImage', {
          uri: vehicleEditForm.insuranceImageUri,
          name: 'insurance.jpg',
          type: 'image/jpeg',
        });
      }

      const res = await apiService.updateMyVehicle(formData);
      if (res?.data?.result) {
        setVehicle(res.data.result);
      }
      setIsEditVehicleModalVisible(false);
      Alert.alert(
        'Đã gửi cập nhật',
        'Thông tin phương tiện đã được lưu thành công và chuyển sang trạng thái CHỜ DUYỆT để ban quản trị phê duyệt lại.'
      );
      fetchProfileData();
    } catch (error) {
      console.log('Update vehicle error:', error);
      Alert.alert('Thất bại', error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật phương tiện.');
    } finally {
      setVehicleSaving(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  useEffect(() => {
    if (route?.params?.openVehicleModal) {
      setIsVehicleModalVisible(true);
      navigation.setParams({ openVehicleModal: false });
    }
  }, [route?.params?.openVehicleModal]);

  const fetchProfileData = async () => {
    try {
      const userRes = await apiService.getMyUserInfo();
      if (userRes?.data?.result) setUser(userRes.data.result);
      
      try {
        const driverRes = await apiService.getMyDriverProfile();
        if (driverRes?.data?.result) setDriver(driverRes.data.result);
      } catch (e) { console.log('No driver profile yet'); }

      try {
        const vehicleRes = await apiService.getMyVehicle();
        if (vehicleRes?.data?.result) {
          setVehicle(vehicleRes.data.result);
          if (route?.params?.openVehicleModal) {
            setIsVehicleModalVisible(true);
          }
        }
      } catch (e) { console.log('No vehicle registered yet'); }

    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editForm.fullName?.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ và tên');
      return;
    }
    if (editForm.phoneNumber?.trim() && !/^[0-9+]{9,15}$/.test(editForm.phoneNumber.trim())) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ (từ 9 đến 15 số)');
      return;
    }

    let isoDob = null;
    if (editForm.dateOfBirth?.trim()) {
      isoDob = formatDateToIso(editForm.dateOfBirth);
      if (!isoDob) {
        Alert.alert('Lỗi', 'Ngày sinh không đúng định dạng DD/MM/YYYY (Ví dụ: 15/01/2000)');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        fullName: editForm.fullName.trim(),
        phoneNumber: editForm.phoneNumber?.trim() || '',
        dateOfBirth: isoDob,
        gender: editForm.gender || user.gender || 'MALE'
      };
      await apiService.updateMyUserInfo(payload);
      setUser(prev => ({ ...prev, ...payload }));
      Alert.alert('Thành công', 'Đã cập nhật thông tin tài xế!');
      setIsEditModalVisible(false);
    } catch (error) {
      Alert.alert('Thất bại', error.response?.data?.message || 'Vui lòng thử lại sau.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Quyền", "Bạn cần cấp quyền truy cập thư viện ảnh!");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.8,
      });

      if (!result.canceled) {
        setLoading(true);
        const formData = new FormData();
        formData.append('file', {
          uri: result.assets[0].uri,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        });
        await apiService.updateAvatar(formData);
        fetchProfileData();
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể cập nhật ảnh đại diện');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      { 
        text: "Đăng xuất", style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem('accessToken');
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        }
      }
    ]);
  };

  if (loading && !user.fullName) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Header Section */}
        <View style={styles.headerCover}>
          <View style={styles.headerActions}>
            <Text style={styles.headerTitle}>Hồ Sơ Tài Xế</Text>
            <TouchableOpacity onPress={() => Alert.alert('Hỗ trợ', 'Liên hệ tổng đài: 1900 xxxx')}>
              <Ionicons name="headset" size={24} color={COLORS.background} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Info Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handleUpdateAvatar}>
            <Image 
              source={user.avatarUrl ? { uri: user.avatarUrl } : require('../../assets/images/react-logo.png')} 
              style={styles.avatar} 
            />
            <View style={styles.editAvatarBadge}>
              <Ionicons name="camera" size={14} color={COLORS.background} />
            </View>
          </TouchableOpacity>

          <View style={styles.infoContainer}>
            <Text style={styles.nameText}>{user.fullName || 'Tài xế đối tác'}</Text>
            <Text style={styles.emailText}>{user.email}</Text>
            
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color={COLORS.warning} />
              <Text style={styles.ratingText}>{driver?.rating ? `${driver.rating} Điểm tín nhiệm` : 'Chưa có đánh giá'}</Text>
            </View>
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.metricsContainer}>
          <MetricBox icon="wallet" value="0 đ" label="Doanh thu/Tuần" color={COLORS.success} />
          <MetricBox icon="car" value="0" label="Chuyến đã chạy" color={COLORS.primary} />
          <MetricBox icon="heart" value="0%" label="Đánh giá tốt" color={COLORS.error} />
        </View>

        {/* Action Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>CÔNG VIỆC</Text>
          <View style={styles.menuCard}>
            <MenuItem 
              icon="car-sport" title="Phương tiện của tôi" 
              onPress={async () => {
                try {
                  const res = await apiService.getMyVehicle();
                  if (res?.data?.result) {
                    setVehicle(res.data.result);
                    setIsVehicleModalVisible(true);
                  } else {
                    Alert.alert('Thông báo', 'Bạn chưa đăng ký phương tiện nào.');
                  }
                } catch (e) {
                  Alert.alert('Thông báo', 'Không thể lấy thông tin phương tiện lúc này.');
                }
              }} 
            />
            <View style={styles.divider} />
            <MenuItem 
              icon="document-text" title="Giấy phép & Hồ sơ" 
              subtitle={driver ? (driver.status === 'APPROVED' ? "Hồ sơ hợp lệ" : "Đang chờ duyệt") : "Đang tải / Chưa cập nhật"}
              onPress={async () => {
                try {
                  const res = await apiService.getMyDriverProfile();
                  if (res?.data?.result) {
                    setDriver(res.data.result);
                    setIsDriverModalVisible(true);
                  } else {
                    Alert.alert('Thông báo', 'Bạn chưa cập nhật hồ sơ tài xế.');
                  }
                } catch (e) {
                  Alert.alert('Thông báo', 'Không thể lấy thông tin hồ sơ lúc này.');
                }
              }} 
            />
            <View style={styles.divider} />
            <MenuItem 
              icon="scan-circle" 
              title="Xác thực khuôn mặt" 
              subtitle={
                driver?.isFaceEnrolled 
                  ? "Đã kích hoạt"
                  : "Chưa đăng ký • Cần chụp ảnh chân dung"
              }
              color={driver?.isFaceEnrolled ? COLORS.success : COLORS.warning}
              onPress={() => {
                setFaceModalMode('enroll');
                setIsFaceModalVisible(true);
              }} 
            />
            <View style={styles.divider} />
            <MenuItem 
              icon="card" title="Ví & Dòng tiền Stripe" subtitle="Điểm uy tín, liên kết Stripe & bù trừ nợ"
              onPress={() => navigation.navigate('Wallet')} 
            />
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>TÀI KHOẢN</Text>
          <View style={styles.menuCard}>
            <MenuItem 
              icon="person" title="Thông tin cá nhân" 
              onPress={() => {
                const formattedDob = formatDateToDisplay(user.dateOfBirth || '');
                setDatePickerDate(parseDateForPicker(user.dateOfBirth || ''));
                setEditForm({
                  fullName: user.fullName || '', 
                  phoneNumber: user.phoneNumber || '',
                  dateOfBirth: formattedDob, 
                  gender: user.gender || 'MALE'
                });
                setShowDatePicker(false);
                setIsEditModalVisible(true);
              }} 
            />
            <View style={styles.divider} />
            <MenuItem 
              icon="settings" title="Cài đặt ứng dụng" 
              onPress={() => Alert.alert('Tính năng', 'Cài đặt sắp ra mắt')} 
            />
            <View style={styles.divider} />
            <MenuItem 
              icon="log-out" title="Đăng xuất" isDestructive={true} 
              onPress={handleLogout} 
            />
          </View>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal 
        visible={isEditModalVisible} 
        animationType="slide" 
        transparent 
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.keyboardAvoidingView}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setIsEditModalVisible(false)}
          >
            <TouchableOpacity 
              style={styles.modalContent} 
              activeOpacity={1} 
              onPress={(e) => e?.stopPropagation?.()}
            >
              <ScrollView 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.editModalScroll}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Cập Nhật Thông Tin</Text>
                  <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                    <Ionicons name="close-circle" size={28} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Họ và tên</Text>
                  <TextInput 
                    style={styles.input} value={editForm.fullName}
                    onChangeText={(t) => setEditForm(p => ({...p, fullName: t}))}
                    placeholder="Nhập họ và tên" placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Số điện thoại</Text>
                  <TextInput 
                    style={styles.input} value={editForm.phoneNumber} keyboardType="phone-pad"
                    onChangeText={(t) => setEditForm(p => ({...p, phoneNumber: t}))}
                    placeholder="Nhập số điện thoại" placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Ngày sinh (DD/MM/YYYY)</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.chooseDateBtn}>
                      <Ionicons name="calendar" size={14} color={COLORS.primary} />
                      <Text style={styles.chooseDateText}>Chọn ngày</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity 
                    style={styles.datePickerInputWrapper} 
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.9}
                  >
                    <TextInput 
                      style={[styles.input, { flex: 1, borderWidth: 0, height: '100%', paddingHorizontal: 0 }]} 
                      value={editForm.dateOfBirth} 
                      onChangeText={(t) => {
                        setEditForm(p => ({...p, dateOfBirth: t}));
                        const parsed = parseDateForPicker(t);
                        if (parsed && !isNaN(parsed.getTime())) {
                          setDatePickerDate(parsed);
                        }
                      }}
                      placeholder="DD/MM/YYYY (VD: 15/01/2000)" 
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numbers-and-punctuation"
                      maxLength={10}
                    />
                    <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                      <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </View>

                {showDatePicker && (
                  <View style={styles.pickerBox}>
                    <View style={styles.datePickerHeader}>
                      <Text style={styles.datePickerHeaderLabel}>
                        Ngày đã chọn: <Text style={styles.datePickerHeaderValue}>{editForm.dateOfBirth || 'Chưa chọn'}</Text>
                      </Text>
                      <TouchableOpacity 
                        style={styles.datePickerCloseBtn} 
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Ionicons name="close" size={20} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>

                    <DateTimePicker
                      value={datePickerDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      themeVariant="light"
                      textColor="#0F172A"
                      maximumDate={new Date()}
                      locale="vi-VN"
                      style={styles.pickerStyle}
                      onChange={(event, selectedDate) => {
                        if (Platform.OS === 'android') {
                          setShowDatePicker(false);
                          if (event.type === 'dismissed') return;
                        }
                        if (selectedDate) {
                          setDatePickerDate(selectedDate);
                          const d = String(selectedDate.getDate()).padStart(2, '0');
                          const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                          const y = selectedDate.getFullYear();
                          setEditForm(p => ({ ...p, dateOfBirth: `${d}/${m}/${y}` }));
                        }
                      }}
                    />

                    {Platform.OS === 'ios' && (
                      <TouchableOpacity 
                        style={styles.pickerDoneBtn} 
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={styles.pickerDoneText}>Xác nhận</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Giới tính</Text>
                  <View style={styles.genderRow}>
                    {['MALE', 'FEMALE', 'OTHER'].map(g => (
                      <TouchableOpacity 
                        key={g} 
                        style={[styles.genderBtn, editForm.gender === g && styles.genderBtnActive]}
                        onPress={() => setEditForm(p => ({...p, gender: g}))}
                      >
                        <Text style={[styles.genderText, editForm.gender === g && styles.genderTextActive]}>
                          {g === 'MALE' ? 'Nam' : g === 'FEMALE' ? 'Nữ' : 'Khác'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate} disabled={saving}>
                  {saving ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.saveBtnText}>Lưu Thay Đổi</Text>}
                </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Vehicle Info Modal (Full Screen) */}
      <Modal visible={isVehicleModalVisible} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: Math.max(insets.top, 40) }}>
          <View style={styles.fullScreenHeader}>
            <TouchableOpacity onPress={() => setIsVehicleModalVisible(false)} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={28} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.fullScreenTitle}>Phương Tiện Của Tôi</Text>
            <View style={{ width: 36 }} />
          </View>
          
          {vehicle ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                  {/* Ảnh Xe */}
                  {vehicle.vehicleImage && (
                    <View style={styles.vehicleImageContainer}>
                      <Image 
                        source={{ uri: `https://tgbtragwxkulpittcjzw.supabase.co/storage/v1/object/public/Ride_Up_Micro/${vehicle.vehicleImage}` }} 
                        style={styles.vehicleImage} 
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Trạng thái</Text>
                    {vehicle.rejectedAt ? (
                      <View style={[styles.statusBadge, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                        <Text style={[styles.statusText, { color: COLORS.error }]}>BỊ TỪ CHỐI</Text>
                      </View>
                    ) : vehicle.isVerified ? (
                      <View style={[styles.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                        <Text style={[styles.statusText, { color: COLORS.success }]}>ĐÃ DUYỆT</Text>
                      </View>
                    ) : (
                      <View style={[styles.statusBadge, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                        <Text style={[styles.statusText, { color: COLORS.warning }]}>CHỜ DUYỆT</Text>
                      </View>
                    )}
                  </View>

                  {/* Cảnh báo lý do từ chối xe */}
                  {vehicle.rejectedAt && (
                    <View style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      borderColor: 'rgba(239, 68, 68, 0.25)',
                      borderWidth: 1,
                      borderRadius: 12,
                      padding: 12,
                      marginTop: 4,
                      marginBottom: 12
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Ionicons name="alert-circle" size={18} color={COLORS.error} style={{ marginRight: 6 }} />
                        <Text style={{ color: COLORS.error, fontWeight: 'bold', fontSize: 13 }}>Lý do từ chối phê duyệt:</Text>
                      </View>
                      <Text style={{ color: COLORS.text, fontSize: 13, lineHeight: 18, marginLeft: 24 }}>
                        {vehicle.rejectionReason || 'Hồ sơ phương tiện không hợp lệ. Vui lòng cập nhật lại thông tin/hình ảnh xe.'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Biển số xe</Text>
                    <View style={styles.plateBox}>
                      <Text style={styles.plateText}>{vehicle.plateNumber}</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Thương hiệu</Text>
                    <Text style={styles.infoValue}>{vehicle.vehicleBrand}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Dòng xe</Text>
                    <Text style={styles.infoValue}>{vehicle.vehicleModel} ({vehicle.vehicleColor})</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Năm sản xuất</Text>
                    <Text style={styles.infoValue}>{vehicle.vehicleYear || 'Chưa cập nhật'}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Loại xe</Text>
                    <Text style={styles.infoValue}>{vehicle.vehicleType === 'CAR_4_SEAT' ? 'Xe 4 chỗ' : vehicle.vehicleType === 'CAR_7_SEAT' ? 'Xe 7 chỗ' : vehicle.vehicleType}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Số ghế đăng ký</Text>
                    <Text style={styles.infoValue}>{vehicle.seatCapacity} chỗ</Text>
                  </View>
                  <View style={styles.divider} />
              <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Hạn đăng kiểm</Text>
                    <Text style={[styles.infoValue, { color: COLORS.primary }]}>{vehicle.registrationExpiryDate || 'Chưa cập nhật'}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Hạn bảo hiểm</Text>
                    <Text style={[styles.infoValue, { color: COLORS.primary }]}>{vehicle.insuranceExpiryDate || 'Chưa cập nhật'}</Text>
                  </View>

              {/* Ảnh giấy tờ xe: đăng ký (2 mặt), đăng kiểm, bảo hiểm */}
              {(() => {
                // Hồ sơ cũ lưu mặt sau đăng ký xe vào insuranceImage (chưa có registrationImageBack)
                const isLegacy = !vehicle.registrationImageBack && !vehicle.inspectionImage;
                const toUri = (path) =>
                  path.startsWith('http')
                    ? path
                    : `https://tgbtragwxkulpittcjzw.supabase.co/storage/v1/object/public/Ride_Up_Micro/${path}`;
                const groups = [
                  {
                    title: 'Giấy đăng ký xe',
                    images: [
                      vehicle.registrationImage,
                      isLegacy ? vehicle.insuranceImage : vehicle.registrationImageBack,
                    ].filter(Boolean),
                  },
                  {
                    title: 'Đăng kiểm & Bảo hiểm',
                    images: isLegacy ? [] : [vehicle.inspectionImage, vehicle.insuranceImage].filter(Boolean),
                  },
                ].filter((group) => group.images.length > 0);

                return groups.map((group) => (
                  <View key={group.title} style={{ marginTop: 16, marginBottom: 12 }}>
                    <Text style={[styles.infoLabel, { marginBottom: 10, fontSize: 14, fontWeight: 'bold', color: COLORS.text }]}>
                      {group.title}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      {group.images.map((path) => (
                        <View key={path} style={{ flex: 1 }}>
                          <Image source={{ uri: toUri(path) }} style={styles.documentImage} resizeMode="cover" />
                        </View>
                      ))}
                    </View>
                  </View>
                ));
              })()}
            </ScrollView>
          ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: COLORS.textMuted }}>Đang tải...</Text>
              </View>
            )}

            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <TouchableOpacity style={styles.editButton} onPress={openEditVehicleModal}>
                <Ionicons name="create-outline" size={20} color={COLORS.background} style={{ marginRight: 8 }} />
                <Text style={styles.editButtonText}>Cập nhật thông tin xe</Text>
              </TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* Edit Vehicle Modal (Full Screen) */}
      <Modal visible={isEditVehicleModalVisible} animationType="slide" transparent={false}>
        <KeyboardAvoidingView 
          style={{ flex: 1, backgroundColor: COLORS.background }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ flex: 1, paddingTop: Math.max(insets.top, 40) }}>
            <View style={styles.fullScreenHeader}>
              <TouchableOpacity 
                onPress={() => {
                  setIsEditVehicleModalVisible(false);
                  setTimeout(() => setIsVehicleModalVisible(true), 150);
                }} 
                style={{ padding: 4 }}
              >
                <Ionicons name="arrow-back" size={28} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.fullScreenTitle}>Chỉnh Sửa Thông Tin Xe</Text>
              <View style={{ width: 36 }} />
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderColor: 'rgba(245, 158, 11, 0.3)',
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                marginBottom: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10
              }}>
                <Ionicons name="information-circle" size={22} color={COLORS.warning} />
                <Text style={{ flex: 1, color: COLORS.text, fontSize: 13, lineHeight: 18 }}>
                  Sau khi lưu thông tin, trạng thái xe sẽ chuyển về <Text style={{ fontWeight: 'bold', color: COLORS.warning }}>CHỜ DUYỆT</Text> để admin phê duyệt lại trước khi tạo chuyến.
                </Text>
              </View>

              {/* Biển số xe */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Biển số xe *</Text>
                <TextInput
                  style={[styles.input, { textTransform: 'uppercase', fontWeight: 'bold' }]}
                  placeholder="VD: 30A-12345"
                  placeholderTextColor={COLORS.textMuted}
                  value={vehicleEditForm.plateNumber}
                  onChangeText={t => setVehicleEditForm(prev => ({ ...prev, plateNumber: t }))}
                  autoCapitalize="characters"
                />
              </View>

              {/* Thương hiệu & Dòng xe */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Hãng xe *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="VD: Toyota"
                    placeholderTextColor={COLORS.textMuted}
                    value={vehicleEditForm.vehicleBrand}
                    onChangeText={t => setVehicleEditForm(prev => ({ ...prev, vehicleBrand: t }))}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Dòng xe *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="VD: Vios"
                    placeholderTextColor={COLORS.textMuted}
                    value={vehicleEditForm.vehicleModel}
                    onChangeText={t => setVehicleEditForm(prev => ({ ...prev, vehicleModel: t }))}
                  />
                </View>
              </View>

              {/* Màu sắc & Năm sản xuất */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Màu xe</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="VD: Trắng"
                    placeholderTextColor={COLORS.textMuted}
                    value={vehicleEditForm.vehicleColor}
                    onChangeText={t => setVehicleEditForm(prev => ({ ...prev, vehicleColor: t }))}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Năm sản xuất</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="VD: 2022"
                    placeholderTextColor={COLORS.textMuted}
                    value={vehicleEditForm.vehicleYear}
                    keyboardType="numeric"
                    onChangeText={t => setVehicleEditForm(prev => ({ ...prev, vehicleYear: t }))}
                  />
                </View>
              </View>

              {/* Số ghế đăng ký & Loại xe */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Số ghế đăng ký *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="VD: 4"
                    placeholderTextColor={COLORS.textMuted}
                    value={vehicleEditForm.seatCapacity}
                    keyboardType="numeric"
                    onChangeText={t => setVehicleEditForm(prev => ({ ...prev, seatCapacity: t }))}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Loại xe</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <TouchableOpacity
                      style={[
                        styles.genderBtn,
                        vehicleEditForm.vehicleType === 'CAR_4_SEAT' && styles.genderBtnActive
                      ]}
                      onPress={() => setVehicleEditForm(prev => ({ ...prev, vehicleType: 'CAR_4_SEAT' }))}
                    >
                      <Text style={[
                        styles.genderText,
                        vehicleEditForm.vehicleType === 'CAR_4_SEAT' && styles.genderTextActive
                      ]}>4 chỗ</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.genderBtn,
                        vehicleEditForm.vehicleType === 'CAR_7_SEAT' && styles.genderBtnActive
                      ]}
                      onPress={() => setVehicleEditForm(prev => ({ ...prev, vehicleType: 'CAR_7_SEAT' }))}
                    >
                      <Text style={[
                        styles.genderText,
                        vehicleEditForm.vehicleType === 'CAR_7_SEAT' && styles.genderTextActive
                      ]}>7 chỗ</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Hạn đăng kiểm & Bảo hiểm */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Hạn đăng kiểm</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor={COLORS.textMuted}
                    value={vehicleEditForm.registrationExpiryDate}
                    onChangeText={t => setVehicleEditForm(prev => ({ ...prev, registrationExpiryDate: t }))}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Hạn bảo hiểm</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor={COLORS.textMuted}
                    value={vehicleEditForm.insuranceExpiryDate}
                    onChangeText={t => setVehicleEditForm(prev => ({ ...prev, insuranceExpiryDate: t }))}
                  />
                </View>
              </View>

              {/* Ảnh phương tiện */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Ảnh phương tiện</Text>
                <TouchableOpacity 
                  style={{
                    height: 140,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderStyle: 'dashed',
                    backgroundColor: COLORS.surface,
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden'
                  }}
                  onPress={() => handlePickVehicleImage('vehicleImageUri')}
                >
                  {vehicleEditForm.vehicleImageUri ? (
                    <Image source={{ uri: vehicleEditForm.vehicleImageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : vehicle?.vehicleImage ? (
                    <Image 
                      source={{ uri: vehicle.vehicleImage.startsWith('http') ? vehicle.vehicleImage : `https://tgbtragwxkulpittcjzw.supabase.co/storage/v1/object/public/Ride_Up_Micro/${vehicle.vehicleImage}` }} 
                      style={{ width: '100%', height: '100%' }} 
                      resizeMode="cover" 
                    />
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
                      <Text style={{ marginTop: 6, color: COLORS.textMuted, fontSize: 13 }}>Nhấn để chọn ảnh xe mới</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Ảnh giấy tờ xe */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Ảnh giấy đăng ký / bảo hiểm (nếu muốn cập nhật lại)</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity 
                    style={{
                      flex: 1,
                      height: 100,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderStyle: 'dashed',
                      backgroundColor: COLORS.surface,
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflow: 'hidden'
                    }}
                    onPress={() => handlePickVehicleImage('registrationImageUri')}
                  >
                    {vehicleEditForm.registrationImageUri ? (
                      <Image source={{ uri: vehicleEditForm.registrationImageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <View style={{ alignItems: 'center', padding: 6 }}>
                        <Ionicons name="document-attach-outline" size={24} color={COLORS.primary} />
                        <Text style={{ marginTop: 4, color: COLORS.textMuted, fontSize: 11, textAlign: 'center' }}>Đăng ký xe</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={{
                      flex: 1,
                      height: 100,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderStyle: 'dashed',
                      backgroundColor: COLORS.surface,
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflow: 'hidden'
                    }}
                    onPress={() => handlePickVehicleImage('insuranceImageUri')}
                  >
                    {vehicleEditForm.insuranceImageUri ? (
                      <Image source={{ uri: vehicleEditForm.insuranceImageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <View style={{ alignItems: 'center', padding: 6 }}>
                        <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.primary} />
                        <Text style={{ marginTop: 4, color: COLORS.textMuted, fontSize: 11, textAlign: 'center' }}>Bảo hiểm xe</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Nút lưu thay đổi */}
              <TouchableOpacity 
                style={[styles.saveBtn, { marginTop: 12 }]} 
                onPress={handleUpdateVehicle} 
                disabled={vehicleSaving}
              >
                {vehicleSaving ? (
                  <ActivityIndicator color={COLORS.background} />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.background} />
                    <Text style={styles.saveBtnText}>Gửi Duyệt Lại Phương Tiện</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Driver Profile Modal (Full Screen) */}
      <Modal visible={isDriverModalVisible} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: Math.max(insets.top, 40) }}>
          <View style={styles.fullScreenHeader}>
            <TouchableOpacity onPress={() => setIsDriverModalVisible(false)} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={28} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.fullScreenTitle}>Hồ Sơ & Giấy Tờ</Text>
            <View style={{ width: 36 }} />
          </View>
          
          {driver ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Trạng thái</Text>
                <View style={[styles.statusBadge, driver.status === 'APPROVED' ? { backgroundColor: 'rgba(16, 185, 129, 0.1)' } : { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <Text style={[styles.statusText, driver.status === 'APPROVED' ? { color: COLORS.success } : { color: COLORS.warning }]}>
                    {driver.status === 'APPROVED' ? "ĐÃ DUYỆT" : "CHỜ DUYỆT"}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Số CMND/CCCD</Text>
                <Text style={styles.infoValue}>{driver.cccd || 'Chưa cập nhật'}</Text>
              </View>
              
              {/* Ảnh CCCD */}
              {(driver.cccdImageFront || driver.cccdImageBack) && (
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 16 }}>
                  {driver.cccdImageFront && (
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.infoLabel, { marginBottom: 8, fontSize: 13 }]}>Mặt trước</Text>
                      <Image 
                        source={{ uri: `https://tgbtragwxkulpittcjzw.supabase.co/storage/v1/object/public/Ride_Up_Micro/${driver.cccdImageFront}` }} 
                        style={styles.documentImage} 
                        resizeMode="cover"
                      />
                    </View>
                  )}
                  {driver.cccdImageBack && (
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.infoLabel, { marginBottom: 8, fontSize: 13 }]}>Mặt sau</Text>
                      <Image 
                        source={{ uri: `https://tgbtragwxkulpittcjzw.supabase.co/storage/v1/object/public/Ride_Up_Micro/${driver.cccdImageBack}` }} 
                        style={styles.documentImage} 
                        resizeMode="cover"
                      />
                    </View>
                  )}
                </View>
              )}

              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bằng lái xe</Text>
                <Text style={styles.infoValue}>{driver.gplx || 'Chưa cập nhật'}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Hạng bằng lái</Text>
                <Text style={[styles.infoValue, { color: COLORS.primary }]}>
                  {driver.gplxClasses && driver.gplxClasses.length > 0
                    ? driver.gplxClasses.join(', ')
                    : 'Chưa cập nhật'}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ngày cấp</Text>
                <Text style={styles.infoValue}>{driver.gplxIssueDate || 'Chưa cập nhật'}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Hạn bằng lái</Text>
                <Text style={[styles.infoValue, { color: COLORS.primary }]}>{driver.gplxExpiryDate || 'Không thời hạn'}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nơi cấp</Text>
                <Text style={styles.infoValue}>{driver.gplxIssuePlace || 'Chưa cập nhật'}</Text>
              </View>

              {/* Ảnh Bằng lái */}
              {(driver.gplxImageFront || driver.gplxImageBack || driver.gplxImage) && (
                <View style={{ marginTop: 16, marginBottom: 24 }}>
                  <Text style={[styles.infoLabel, { marginBottom: 8, fontSize: 13 }]}>Hình ảnh Bằng Lái Xe</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.infoLabel, { marginBottom: 6, fontSize: 12, color: COLORS.textMuted }]}>
                        Mặt trước
                      </Text>
                      <Image
                        source={{
                          uri: `https://tgbtragwxkulpittcjzw.supabase.co/storage/v1/object/public/Ride_Up_Micro/${driver.gplxImageFront || driver.gplxImage}`
                        }}
                        style={styles.documentImage}
                        resizeMode="cover"
                      />
                    </View>
                    {driver.gplxImageBack && (
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.infoLabel, { marginBottom: 6, fontSize: 12, color: COLORS.textMuted }]}>
                          Mặt sau (QR)
                        </Text>
                        <Image 
                          source={{
                            uri: `https://tgbtragwxkulpittcjzw.supabase.co/storage/v1/object/public/Ride_Up_Micro/${driver.gplxImageBack}`
                          }}
                          style={styles.documentImage}
                          resizeMode="cover"
                        />
                      </View>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: COLORS.textMuted }}>Đang tải...</Text>
            </View>
          )}

          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <TouchableOpacity style={styles.editButton} onPress={() => Alert.alert('Thông báo', 'Tính năng sửa hồ sơ đang được phát triển.')}>
              <Ionicons name="create-outline" size={20} color={COLORS.background} style={{ marginRight: 8 }} />
              <Text style={styles.editButtonText}>Cập nhật hồ sơ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Quét và Xác thực khuôn mặt AI */}
      <FaceVerificationModal
        visible={isFaceModalVisible}
        mode={faceModalMode}
        onClose={() => setIsFaceModalVisible(false)}
        onSuccess={() => {
          fetchProfileData();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  // Header 
  headerCover: { backgroundColor: COLORS.primary, height: 140, padding: 20, paddingTop: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.background },

  // Profile Card
  profileCard: { backgroundColor: COLORS.surface, marginHorizontal: 20, marginTop: -50, borderRadius: 20, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5, borderWidth: 1, borderColor: COLORS.border },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: COLORS.background },
  editAvatarBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.primary, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.background },
  infoContainer: { alignItems: 'center' },
  nameText: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  emailText: { fontSize: 14, color: COLORS.textMuted, marginBottom: 8 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  ratingText: { color: COLORS.warning, fontSize: 12, fontWeight: 'bold', marginLeft: 4 },

  // Metrics
  metricsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 24, gap: 12 },
  metricBox: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  metricIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  metricValue: { color: COLORS.text, fontSize: 18, fontWeight: '900', marginBottom: 2 },
  metricLabel: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center' },

  // Menu
  menuSection: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 12, fontWeight: 'bold', marginBottom: 10, letterSpacing: 1 },
  menuCard: { backgroundColor: COLORS.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(14, 165, 233, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600' },
  menuSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 72 },

  // Modal
  keyboardAvoidingView: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '88%' },
  editModalScroll: { paddingBottom: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold' },
  formGroup: { marginBottom: 16 },
  label: { color: COLORS.textMuted, fontSize: 13, marginBottom: 8, fontWeight: '600' },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, height: 50, color: COLORS.text },
  saveBtn: { backgroundColor: COLORS.primary, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 },

  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  chooseDateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 6, backgroundColor: 'rgba(14, 165, 233, 0.1)', borderRadius: 6 },
  chooseDateText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  datePickerInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, height: 50 },
  pickerBox: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  datePickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  datePickerHeaderLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  datePickerHeaderValue: { fontSize: 14, color: COLORS.primary, fontWeight: '800' },
  datePickerCloseBtn: { padding: 4 },
  pickerStyle: { width: '100%', height: 170, backgroundColor: '#FFFFFF' },
  pickerDoneBtn: { alignSelf: 'flex-end', paddingHorizontal: 18, paddingVertical: 8, backgroundColor: COLORS.primary, borderRadius: 8, marginTop: 8 },
  pickerDoneText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },

  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  genderBtnActive: { backgroundColor: 'rgba(14, 165, 233, 0.1)', borderColor: COLORS.primary },
  genderText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  genderTextActive: { color: COLORS.primary, fontWeight: 'bold' },

  // Info Rows for Modals
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  infoLabel: { color: COLORS.textMuted, fontSize: 15 },
  infoValue: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  plateBox: { backgroundColor: 'rgba(14, 165, 233, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(14, 165, 233, 0.3)' },
  plateText: { color: COLORS.primary, fontSize: 16, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  vehicleImageContainer: { width: '100%', height: 220, borderRadius: 16, overflow: 'hidden', marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  vehicleImage: { width: '100%', height: '100%' },
  documentImage: { width: '100%', height: 120, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },

  // Full Screen Modal Styles
  fullScreenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  fullScreenTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  bottomBar: { padding: 20, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface },
  editButton: { flexDirection: 'row', backgroundColor: COLORS.primary, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  editButtonText: { color: COLORS.background, fontSize: 14, fontWeight: 'bold' }
});
