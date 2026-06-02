import React, { useState } from 'react';
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
  ScrollView
} from 'react-native';
import { apiService } from '../services/apiService';

const COLORS = { background: '#F8FAFC', surface: '#FFFFFF', primary: '#0ea5e9', text: '#0F172A', textMuted: '#64748B', error: '#ef4444', border: '#E2E8F0', success: '#10b981' };
const SIZES = { base: 8, small: 12, medium: 16, large: 20, extraLarge: 28, title: 32 };

const RegisterScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', password: '', email: '' });

  const handleRegister = async () => {
    if (!formData.name || !formData.password || !formData.email) {
      alert('Vui lòng nhập đầy đủ Tên, Email và Mật khẩu!');
      return;
    }
    
    setLoading(true);
    try {
      const response = await apiService.register(formData);
      if (response.data.code === 1000) {
        alert('Đăng ký thành công! Vui lòng kiểm tra email để xác thực.');
        navigation.goBack();
      } else {
        alert(response.data.message || 'Đăng ký thất bại!');
      }
    } catch (error) {
      console.log('Register error:', error);
      alert('Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Đăng Ký</Text>
          <Text style={styles.subtitle}>Tạo tài khoản RideUp để bắt đầu</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Họ và Tên *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
              placeholder="VD: Nguyễn Văn A"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData({...formData, email: text})}
              placeholder="VD: user@example.com"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu *</Text>
            <TextInput
              style={styles.input}
              value={formData.password}
              onChangeText={(text) => setFormData({...formData, password: text})}
              placeholder="Mật khẩu của bạn"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
            />
          </View>

          <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.registerBtnText}>ĐĂNG KÝ NGAY</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.loginText}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24, justifyContent: 'center', minHeight: '100%' },
  title: { fontSize: SIZES.title, fontWeight: 'bold', color: COLORS.primary, marginBottom: 8 },
  subtitle: { fontSize: SIZES.medium, color: COLORS.textMuted, marginBottom: 32 },
  
  inputGroup: { marginBottom: 20 },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: COLORS.text, marginBottom: 8, fontSize: SIZES.medium },
  input: { backgroundColor: COLORS.surface, color: COLORS.text, borderRadius: 16, padding: 16, fontSize: SIZES.medium, borderWidth: 1, borderColor: COLORS.border },
  
  registerBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 16 },
  registerBtnText: { color: COLORS.background, fontWeight: 'bold', fontSize: SIZES.medium },
  
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { color: COLORS.textMuted, fontSize: SIZES.medium },
  loginText: { color: COLORS.primary, fontWeight: 'bold', fontSize: SIZES.medium }
});

export default RegisterScreen;



