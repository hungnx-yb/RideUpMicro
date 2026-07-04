import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';

const COLORS = { 
  background: '#F8FAFC', surface: '#FFFFFF', primary: '#0ea5e9', 
  text: '#0F172A', textMuted: '#64748B', error: '#ef4444', border: '#E2E8F0' 
};
const SIZES = { font: 14, medium: 16 };

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ Họ tên, Email và Mật khẩu.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const response = await apiService.register({ name, email, password });
      if (response.data.code === 1000) {
        Alert.alert('Thành công!', 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực.', [
          { text: 'Đăng nhập ngay', onPress: () => navigation.goBack() }
        ]);
      } else {
        setErrorMsg(response.data.message || 'Đăng ký thất bại!');
      }
    } catch (error) {
      console.log('Register error:', error);
      setErrorMsg(error.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} enabled={Platform.OS === 'ios'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <View style={styles.headerContainer}>
          <Text style={styles.logoText}>Ride<Text style={{ color: COLORS.primary }}>Up</Text></Text>
          <Text style={styles.subText}>Trở thành đối tác tài xế của chúng tôi</Text>
        </View>

        <View style={styles.formContainer}>
          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Họ và Tên</Text>
            <TextInput
              style={styles.input}
              placeholder="Nguyễn Văn A"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mật khẩu</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Nhập mật khẩu"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
            {loading
              ? <ActivityIndicator color={COLORS.background} />
              : <Text style={styles.registerButtonText}>ĐĂNG KÝ</Text>
            }
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.loginText}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24, paddingTop: Platform.OS === 'ios' ? 80 : 100, minHeight: '100%' },

  headerContainer: { alignItems: 'center', marginBottom: 40 },
  logoText: { fontSize: 48, fontWeight: 'bold', color: COLORS.text, letterSpacing: 1 },
  subText: { fontSize: SIZES.medium, color: COLORS.textMuted, marginTop: 8, textAlign: 'center' },

  formContainer: { width: '100%' },
  inputContainer: { marginBottom: 20 },
  label: { color: COLORS.text, fontSize: SIZES.font, marginBottom: 8, fontWeight: '500' },
  input: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 16, color: COLORS.text, fontSize: SIZES.medium,
  },

  passwordWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
  },
  passwordInput: { flex: 1, padding: 16, color: COLORS.text, fontSize: SIZES.medium },
  eyeBtn: { paddingHorizontal: 16 },

  registerButton: {
    backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center',
    marginTop: 10, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  registerButtonText: { color: COLORS.background, fontSize: SIZES.medium, fontWeight: 'bold', letterSpacing: 1 },

  errorText: { color: COLORS.error, fontSize: SIZES.font, marginBottom: 16, textAlign: 'center' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { color: COLORS.textMuted, fontSize: SIZES.medium },
  loginText: { color: COLORS.primary, fontWeight: 'bold', fontSize: SIZES.medium },
});

export default RegisterScreen;
