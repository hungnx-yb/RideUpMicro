import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { apiService } from '../services/apiService';

const COLORS = { 
  background: '#F8FAFC', 
  surface: '#FFFFFF', 
  primary: '#0ea5e9', 
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  text: '#0F172A', 
  textMuted: '#64748B', 
  border: '#E2E8F0' 
};

const DEBT_LIMIT = 500000;
const WARNING_LIMIT = 400000;

export default function WalletScreen({ navigation }) {
  const [debt, setDebt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const res = await apiService.getMyWallet();
      setDebt(res.data.result || 0);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lấy thông tin ví.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (debt <= 0) {
      Alert.alert('Thông báo', 'Bạn không có dư nợ cần thanh toán.');
      return;
    }

    try {
      setProcessing(true);
      
      // 1. Initialize deposit on backend
      const res = await apiService.depositWallet();
      const { paymentUrl, transactionId } = res.data.result;

      // 2. Initialize Stripe PaymentSheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'RideUp Driver',
        paymentIntentClientSecret: paymentUrl,
        defaultBillingDetails: {
          name: 'RideUp Driver',
        }
      });

      if (initError) {
        Alert.alert('Lỗi khởi tạo', initError.message);
        setProcessing(false);
        return;
      }

      // 3. Present PaymentSheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        Alert.alert('Đã hủy', 'Bạn đã hủy thanh toán.');
        setProcessing(false);
        return;
      }

      // 4. Confirm with backend
      await apiService.confirmDeposit(transactionId);
      Alert.alert('Thành công', 'Thanh toán dư nợ thành công!');
      fetchWallet();

    } catch (error) {
      Alert.alert('Lỗi thanh toán', error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusInfo = () => {
    if (debt >= DEBT_LIMIT) return { color: COLORS.danger, text: 'Tài khoản đang bị tạm khóa', icon: 'lock-closed' };
    if (debt >= WARNING_LIMIT) return { color: COLORS.warning, text: 'Sắp đạt giới hạn nợ', icon: 'warning' };
    return { color: COLORS.success, text: 'Tài khoản hoạt động tốt', icon: 'checkmark-circle' };
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const status = getStatusInfo();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ví & Hoa Hồng</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Tổng Dư Nợ Hiện Tại</Text>
        <Text style={[styles.debtAmount, { color: debt > 0 ? COLORS.danger : COLORS.success }]}>
          {debt.toLocaleString('vi-VN')} đ
        </Text>
        
        <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
          <Ionicons name={status.icon} size={20} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        </View>

        <Text style={styles.description}>
          Hệ thống sẽ thu 20% hoa hồng cho mỗi chuyến đi hoàn thành. Nếu dư nợ vượt quá {DEBT_LIMIT.toLocaleString('vi-VN')} đ, tài khoản của bạn sẽ không thể nhận chuyến đi mới.
        </Text>

        <TouchableOpacity 
          style={[styles.payButton, debt <= 0 && styles.payButtonDisabled]} 
          onPress={handleDeposit}
          disabled={debt <= 0 || processing}
        >
          {processing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.payButtonText}>Thanh toán nợ ngay</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  card: {
    backgroundColor: COLORS.surface,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLabel: { fontSize: 14, color: COLORS.textMuted, marginBottom: 8 },
  debtAmount: { fontSize: 32, fontWeight: 'bold', marginBottom: 16 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusText: { marginLeft: 8, fontWeight: '600', fontSize: 14 },
  description: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 24,
  },
  payButton: {
    backgroundColor: COLORS.primary,
    width: '100%',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  payButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
