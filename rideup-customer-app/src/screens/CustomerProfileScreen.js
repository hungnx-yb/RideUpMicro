import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../services/apiService';

const COLORS = { 
  background: '#F8FAFC', surface: '#FFFFFF', primary: '#0ea5e9', 
  text: '#0F172A', textMuted: '#64748B', error: '#ef4444', 
  border: '#E2E8F0', disabled: '#CBD5E1', success: '#10b981'
};
const SIZES = { base: 8, small: 12, font: 14, medium: 16, large: 20, extraLarge: 24, title: 28 };

const MenuItem = ({ icon, title, subtitle, onPress, color = COLORS.text, isDestructive = false }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.menuIconBox, isDestructive && { backgroundColor: 'rgba(255,76,76,0.1)' }]}>
      <Ionicons name={icon} size={22} color={isDestructive ? COLORS.error : COLORS.primary} />
    </View>
    <View style={styles.menuContent}>
      <Text style={[styles.menuTitle, { color }]}>{title}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
  </TouchableOpacity>
);

const CustomerProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  
  const [user, setUser] = useState({
    username: '',
    email: '',
    fullName: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    avatarUrl: ''
  });

  const [editForm, setEditForm] = useState({
    fullName: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await apiService.getMyUserInfo();
      if (response?.data?.result) {
        setUser(response.data.result);
      }
    } catch (error) {
      console.log('Fetch profile error', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin cá nhân');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await apiService.updateMyUserInfo({
        fullName: editForm.fullName,
        phoneNumber: editForm.phoneNumber,
        dateOfBirth: editForm.dateOfBirth,
        gender: editForm.gender
      });
      setUser(prev => ({
        ...prev,
        fullName: editForm.fullName,
        phoneNumber: editForm.phoneNumber,
        dateOfBirth: editForm.dateOfBirth,
        gender: editForm.gender
      }));
      Alert.alert('Thành công', 'Cập nhật thông tin thành công!');
      setIsEditModalVisible(false);
    } catch (error) {
      console.log('Update profile error', error);
      Alert.alert('Thất bại', 'Cập nhật thất bại. Vui lòng thử lại!');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = () => {
    setEditForm({
      fullName: user.fullName || '',
      phoneNumber: user.phoneNumber || '',
      dateOfBirth: user.dateOfBirth || '',
      gender: user.gender || ''
    });
    setIsEditModalVisible(true);
  };

  const handleLogout = () => {
    Alert.alert(
      "Đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này?",
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Đăng xuất", 
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem('accessToken');
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          }
        }
      ]
    );
  };

  const handleUpdateAvatar = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Quyền truy cập", "Bạn cần cấp quyền truy cập thư viện ảnh để đổi avatar!");
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!pickerResult.canceled) {
        const uri = pickerResult.assets[0].uri;
        const formData = new FormData();
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('avatarFile', { uri, name: filename, type });

        setLoading(true);
        try {
          const response = await apiService.updateAvatar(formData);
          if (response?.data?.code === 1000) {
            setUser({ ...user, avatarUrl: response.data.result.avatarUrl });
            Alert.alert("Thành công", "Cập nhật avatar thành công!");
          } else {
            Alert.alert("Lỗi", response?.data?.message || "Không thể cập nhật avatar");
          }
        } catch (error) {
          console.log('Update avatar error', error);
          Alert.alert("Lỗi", "Đã có lỗi xảy ra. Vui lòng thử lại!");
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.log('ImagePicker Error:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const avatarChar = user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U';

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER MAIN */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>RIDEUP</Text>
          <Text style={styles.headerTitle}>Hồ sơ của tôi</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* PROFILE CARD */}
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={handleUpdateAvatar} activeOpacity={0.8}>
            <View style={styles.avatarCircle}>
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarLetter}>{avatarChar}</Text>
              )}
              <View style={styles.editAvatarBadge}>
                <Ionicons name="camera" size={12} color={COLORS.surface} />
              </View>
            </View>
          </TouchableOpacity>
          
          <View style={styles.profileInfo}>
            <Text style={styles.userName} numberOfLines={1}>{user.fullName || 'Người dùng'}</Text>
            <View style={styles.ratingBadge}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.primary} />
              <Text style={styles.ratingText}>Thành viên RideUp</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </View>

        {/* MENU LIST */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Tài khoản</Text>
          <MenuItem 
            icon="person-outline" 
            title="Sửa thông tin cá nhân" 
            subtitle="Cập nhật tên, ngày sinh, số điện thoại..."
            onPress={openEditModal} 
          />
          <MenuItem 
            icon="card-outline" 
            title="Phương thức thanh toán" 
            subtitle="Quản lý thẻ, VNPay"
            onPress={() => {}} 
          />
          <MenuItem 
            icon="location-outline" 
            title="Địa chỉ đã lưu" 
            subtitle="Nhà, công ty"
            onPress={() => {}} 
          />
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Chung</Text>
          <MenuItem icon="help-circle-outline" title="Trung tâm trợ giúp" onPress={() => {}} />
          <MenuItem icon="settings-outline" title="Cài đặt ứng dụng" onPress={() => {}} />
          <MenuItem icon="document-text-outline" title="Điều khoản & Chính sách" onPress={() => {}} />
        </View>

        <View style={styles.menuSection}>
          <MenuItem 
            icon="log-out-outline" 
            title="Đăng xuất" 
            color={COLORS.error}
            isDestructive={true}
            onPress={handleLogout} 
          />
        </View>
      </ScrollView>

      {/* MODAL EDIT PROFILE */}
      <Modal visible={isEditModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsEditModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Sửa thông tin</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.formSection}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Họ và Tên</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                    <TextInput style={styles.input} value={editForm.fullName} onChangeText={(t) => setEditForm({...editForm, fullName: t})} placeholder="VD: Nguyễn Văn A" placeholderTextColor={COLORS.border} />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Ngày sinh (YYYY-MM-DD)</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="calendar-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                    <TextInput style={styles.input} value={editForm.dateOfBirth} onChangeText={(t) => setEditForm({...editForm, dateOfBirth: t})} placeholder="VD: 2000-01-01" placeholderTextColor={COLORS.border} />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Giới tính</Text>
                  <View style={styles.genderRow}>
                    {['MALE', 'FEMALE', 'OTHER'].map(g => (
                      <TouchableOpacity 
                        key={g} 
                        style={[styles.genderBtn, editForm.gender === g && styles.genderBtnActive]}
                        onPress={() => setEditForm({...editForm, gender: g})}
                      >
                        <Text style={[styles.genderText, editForm.gender === g && styles.genderTextActive]}>
                          {g === 'MALE' ? 'Nam' : g === 'FEMALE' ? 'Nữ' : 'Khác'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Số điện thoại</Text>
                  <View style={[styles.inputWrapper, !!user.phoneNumber && styles.disabledWrapper]}>
                    <Ionicons name="call-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                    <TextInput 
                      style={[styles.input, !!user.phoneNumber && styles.disabledText]} 
                      value={editForm.phoneNumber} 
                      onChangeText={(t) => setEditForm({...editForm, phoneNumber: t})}
                      editable={!user.phoneNumber} 
                      placeholder="Nhập số điện thoại"
                      placeholderTextColor={COLORS.border}
                    />
                    {!!user.phoneNumber && <Ionicons name="lock-closed" size={14} color={COLORS.textMuted} style={styles.lockIcon} />}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <View style={[styles.inputWrapper, styles.disabledWrapper]}>
                    <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                    <TextInput style={[styles.input, styles.disabledText]} value={user.email} editable={false} />
                    <Ionicons name="lock-closed" size={14} color={COLORS.textMuted} style={styles.lockIcon} />
                  </View>
                </View>
                
                <Text style={styles.noteText}>* Email và Số điện thoại không thể thay đổi để đảm bảo an toàn tài khoản.</Text>
              </View>
            </ScrollView>

            <View style={styles.bottomBar}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate} disabled={saving}>
                {saving ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.saveBtnText}>CẬP NHẬT</Text>}
              </TouchableOpacity>
            </View>

          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, backgroundColor: COLORS.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4, zIndex: 10 },
  headerSub: { color: COLORS.primary, fontSize: SIZES.small, fontWeight: 'bold', letterSpacing: 1, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },

  content: { paddingBottom: 40 },

  // Profile Card
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: COLORS.surface, marginTop: 12, marginHorizontal: 16, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#F1F5F9' },
  avatarCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(14, 165, 233, 0.1)', borderWidth: 3, borderColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginRight: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 2 },
  avatarLetter: { color: COLORS.primary, fontSize: 26, fontWeight: '900' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 34 },
  editAvatarBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: COLORS.primary, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.surface },
  profileInfo: { flex: 1, justifyContent: 'center' },
  userName: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(14, 165, 233, 0.1)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  ratingText: { color: COLORS.primary, fontSize: 12, fontWeight: '700', marginLeft: 4 },

  // Menu List
  menuSection: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { color: '#94A3B8', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', marginBottom: 12, marginLeft: 6, letterSpacing: 0.5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 16, borderRadius: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1, borderWidth: 1, borderColor: '#F8FAFC' },
  menuIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(14, 165, 233, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  menuSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },

  // Edit Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { color: COLORS.text, fontSize: SIZES.large, fontWeight: 'bold' },
  closeBtn: { padding: 4 },
  modalContent: { paddingBottom: 40 },
  
  // Form Section
  formSection: { padding: 20 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between' },
  inputGroup: { marginBottom: 20 },
  label: { color: COLORS.textMuted, marginBottom: 8, fontSize: SIZES.small, fontWeight: '600', letterSpacing: 0.5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, height: 54 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: COLORS.text, fontSize: SIZES.medium, height: '100%' },
  disabledWrapper: { backgroundColor: COLORS.disabled, borderColor: 'transparent' },
  disabledText: { color: COLORS.textMuted },
  lockIcon: { marginLeft: 10 },
  noteText: { color: COLORS.textMuted, fontSize: 11, fontStyle: 'italic', marginTop: 8, lineHeight: 18 },
  
  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  genderBtnActive: { backgroundColor: 'rgba(255,215,0,0.1)', borderColor: COLORS.primary },
  genderText: { color: COLORS.textMuted, fontSize: SIZES.font, fontWeight: '600' },
  genderTextActive: { color: COLORS.primary, fontWeight: 'bold' },

  // Bottom Bar
  bottomBar: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 0 : 20, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background },
  saveBtn: { backgroundColor: COLORS.primary, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  saveBtnText: { color: COLORS.background, fontWeight: 'bold', fontSize: SIZES.medium, letterSpacing: 1 },
});

export default CustomerProfileScreen;
