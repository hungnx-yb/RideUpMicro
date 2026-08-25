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
  Modal
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../services/apiService';
import { BASE_URL } from '../config/api';

const COLORS = { 
  background: '#F8FAFC', surface: '#FFFFFF', primary: '#0ea5e9', 
  text: '#0F172A', textMuted: '#64748B', error: '#ef4444', 
  border: '#E2E8F0', success: '#10b981', warning: '#f59e0b' 
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

export default function DriverProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isVehicleModalVisible, setIsVehicleModalVisible] = useState(false);
  const [isDriverModalVisible, setIsDriverModalVisible] = useState(false);
  
  const [user, setUser] = useState({
    username: '', email: '', fullName: '',
    phoneNumber: '', dateOfBirth: '', gender: '', avatarUrl: ''
  });

  const [driver, setDriver] = useState(null);
  const [vehicle, setVehicle] = useState(null);

  const [editForm, setEditForm] = useState({
    fullName: '', phoneNumber: '', dateOfBirth: '', gender: ''
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

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
        if (vehicleRes?.data?.result) setVehicle(vehicleRes.data.result);
      } catch (e) { console.log('No vehicle registered yet'); }

    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await apiService.updateMyUserInfo(editForm);
      setUser(prev => ({ ...prev, ...editForm }));
      Alert.alert('Thành công', 'Đã cập nhật thông tin tài xế!');
      setIsEditModalVisible(false);
    } catch (error) {
      Alert.alert('Thất bại', 'Vui lòng thử lại sau.');
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
              subtitle={vehicle ? `${vehicle.vehicleBrand} ${vehicle.vehicleModel} - ${vehicle.plateNumber}` : "Đang tải / Chưa đăng ký"}
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
              icon="card" title="Ví & Hoa hồng" subtitle="Thanh toán chiết khấu"
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
                setEditForm({
                  fullName: user.fullName || '', phoneNumber: user.phoneNumber || '',
                  dateOfBirth: user.dateOfBirth || '', gender: user.gender || ''
                });
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
      <Modal visible={isEditModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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

            <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate} disabled={saving}>
              {saving ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.saveBtnText}>Lưu Thay Đổi</Text>}
            </TouchableOpacity>
          </View>
        </View>
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
                    <View style={[styles.statusBadge, vehicle.isVerified ? { backgroundColor: 'rgba(16, 185, 129, 0.1)' } : { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                      <Text style={[styles.statusText, vehicle.isVerified ? { color: COLORS.success } : { color: COLORS.warning }]}>
                        {vehicle.isVerified ? "ĐÃ DUYỆT" : "CHỜ DUYỆT"}
                      </Text>
                    </View>
                  </View>
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
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Hạn đăng kiểm</Text>
                    <Text style={[styles.infoValue, { color: COLORS.primary }]}>{vehicle.registrationExpiryDate || 'Chưa cập nhật'}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Hạn bảo hiểm</Text>
                    <Text style={[styles.infoValue, { color: COLORS.primary }]}>{vehicle.insuranceExpiryDate || 'Chưa cập nhật'}</Text>
                  </View>
            </ScrollView>
          ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: COLORS.textMuted }}>Đang tải...</Text>
              </View>
            )}

            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <TouchableOpacity style={styles.editButton} onPress={() => Alert.alert('Thông báo', 'Tính năng sửa thông tin xe đang được phát triển.')}>
                <Ionicons name="create-outline" size={20} color={COLORS.background} style={{ marginRight: 8 }} />
                <Text style={styles.editButtonText}>Cập nhật thông tin</Text>
              </TouchableOpacity>
            </View>
        </View>
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
                <Text style={styles.infoLabel}>Hạn bằng lái</Text>
                <Text style={[styles.infoValue, { color: COLORS.primary }]}>{driver.gplxExpiryDate || 'Chưa cập nhật'}</Text>
              </View>

              {/* Ảnh Bằng lái */}
              {driver.gplxImage && (
                <View style={{ marginTop: 16, marginBottom: 24 }}>
                  <Text style={[styles.infoLabel, { marginBottom: 8, fontSize: 13 }]}>Hình ảnh Bằng Lái Xe</Text>
                  <Image 
                    source={{ uri: `https://tgbtragwxkulpittcjzw.supabase.co/storage/v1/object/public/Ride_Up_Micro/${driver.gplxImage}` }} 
                    style={[styles.documentImage, { height: 180 }]} 
                    resizeMode="cover"
                  />
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold' },
  formGroup: { marginBottom: 20 },
  label: { color: COLORS.textMuted, fontSize: 13, marginBottom: 8, fontWeight: '600' },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, height: 50, color: COLORS.text },
  saveBtn: { backgroundColor: COLORS.primary, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 },

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
