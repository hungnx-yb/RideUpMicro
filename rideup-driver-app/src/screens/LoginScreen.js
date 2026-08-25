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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/apiService';
import { chatSocket } from '../services/chatSocket';

const COLORS = { background: '#F8FAFC', surface: '#FFFFFF', primary: '#0ea5e9', text: '#0F172A', textMuted: '#64748B', error: '#ef4444', border: '#E2E8F0' };
const SIZES = { base: 8, small: 12, font: 14, medium: 16, large: 20, extraLarge: 24, title: 32 };

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ Email và mật khẩu');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      const response = await apiService.login(email, password);

      if (response.data.code === 1000) {
        const token = response.data.result.token;
        await AsyncStorage.setItem('accessToken', token);

        // Mở kết nối Chat Socket ngay sau khi lưu token
        chatSocket.connect();

        navigation.replace('MainTabs');
      } else {
        setErrorMsg(response.data.message || 'Sai thông tin đăng nhập');
      }
    } catch (error) {
      console.log(error);
      const backendError = error.response?.data?.message || error.message || 'Không thể kết nối đến máy chủ.';
      setErrorMsg(backendError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} enabled={Platform.OS === 'ios'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.headerContainer}>
          <Text style={styles.logoText}>Ride<Text style={{color: COLORS.primary}}>Up</Text></Text>
          <Text style={styles.subText}>Cùng nhau đi muôn nơi</Text>
        </View>

        <View style={styles.formContainer}>
          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input} placeholder="Nhập email của bạn" placeholderTextColor={COLORS.textMuted}
              value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
              autoComplete="off" textContentType="none" importantForAutofill="no"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mật khẩu</Text>
            <TextInput
              style={styles.input} placeholder="Nhập mật khẩu" placeholderTextColor={COLORS.textMuted}
              secureTextEntry value={password} onChangeText={setPassword}
              autoComplete="off" textContentType="oneTimeCode" importantForAutofill="no"
            />
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.loginButtonText}>ĐĂNG NHẬP</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerText}>Đăng ký ngay</Text>
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
  headerContainer: { alignItems: 'center', marginBottom: 50 },
  logoText: { fontSize: 48, fontWeight: 'bold', color: COLORS.text, letterSpacing: 1 },
  subText: { fontSize: SIZES.medium, color: COLORS.textMuted, marginTop: 8 },
  formContainer: { width: '100%' },
  inputContainer: { marginBottom: 20 },
  label: { color: COLORS.text, fontSize: SIZES.font, marginBottom: 8, fontWeight: '500' },
  input: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 16, color: COLORS.text, fontSize: SIZES.medium,
  },
  loginButton: {
    backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center',
    marginTop: 10, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  loginButtonText: { color: COLORS.background, fontSize: SIZES.medium, fontWeight: 'bold', letterSpacing: 1 },
  errorText: { color: COLORS.error, fontSize: SIZES.font, marginBottom: 16, textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { color: COLORS.textMuted, fontSize: SIZES.medium },
  registerText: { color: COLORS.primary, fontWeight: 'bold', fontSize: SIZES.medium }
});

export default LoginScreen;
