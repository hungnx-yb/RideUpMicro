import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';

const COLORS = { 
  background: '#F8FAFC', 
  surface: '#FFFFFF', 
  primary: '#0ea5e9', 
  text: '#0F172A', 
  textMuted: '#64748B', 
  border: '#E2E8F0',
  gold: '#F59E0B',
  goldBg: '#FEF3C7',
  goldBorder: '#FDE68A',
};
const SIZES = { base: 8, small: 12, medium: 16, large: 20, extraLarge: 28, title: 32 };

const RatingScreen = ({ route, navigation }) => {
  const { bookingId, driverName } = route.params || { bookingId: 'unknown', driverName: 'Tài xế' };
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Chưa chọn số sao', 'Vui lòng chọn số sao đánh giá trước khi gửi!');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiService.rateTrip(bookingId, { rating, comment });
      Alert.alert(
        'Đã gửi đánh giá',
        rating === 5 
          ? 'Cảm ơn bạn! Đánh giá 5 sao của bạn đã giúp tài xế cộng thêm +1 điểm uy tín!' 
          : 'Cảm ơn bạn đã đóng góp ý kiến giúp nâng cao chất lượng dịch vụ!',
        [{ text: 'Đồng ý', onPress: () => navigation.popToTop() }]
      );
    } catch (error) {
      console.log('Lỗi gửi đánh giá:', error);
      Alert.alert('Hoàn tất', 'Cảm ơn bạn đã đánh giá chuyến đi!', [
        { text: 'Đồng ý', onPress: () => navigation.popToTop() }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= rating;
          return (
            <TouchableOpacity 
              key={star} 
              onPress={() => setRating(star)}
              activeOpacity={0.7}
              style={styles.starTouch}
            >
              <Ionicons 
                name={isFilled ? 'star' : 'star-outline'} 
                size={40} 
                color={isFilled ? COLORS.gold : '#CBD5E1'} 
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chuyến đi đã kết thúc</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Đánh giá tài xế</Text>
          <Text style={styles.subtitle}>Bạn cảm thấy chuyến đi với đối tác {driverName} như thế nào?</Text>
          
          {renderStars()}

          {/* Reputation Incentive Banner */}
          {rating === 5 ? (
            <View style={styles.incentiveBanner}>
              <View style={styles.incentiveIconCircle}>
                <Ionicons name="sparkles" size={18} color="#D97706" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.incentiveTitle}>Điểm Uy Tín +1 ⭐</Text>
                <Text style={styles.incentiveDesc}>
                  Đánh giá 5 sao của bạn sẽ cộng +1 Điểm Uy Tín cho tài xế và giúp họ được giảm phí sàn nền tảng!
                </Text>
              </View>
            </View>
          ) : rating > 0 ? (
            <View style={[styles.incentiveBanner, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.textMuted} />
              <Text style={[styles.incentiveDesc, { flex: 1, marginLeft: 8, color: COLORS.textMuted }]}>
                Phản hồi chân thực của bạn sẽ giúp tài xế khắc phục và nâng cao chất lượng phục vụ.
              </Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Để lại nhận xét chi tiết cho tài xế (Không bắt buộc)"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]} 
            onPress={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.surface} />
            ) : (
              <Text style={styles.submitText}>GỬI ĐÁNH GIÁ</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.skipBtn} 
            onPress={() => navigation.popToTop()}
          >
            <Text style={styles.skipText}>Bỏ qua</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingTop: 40, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  headerTitle: { color: COLORS.primary, fontSize: SIZES.medium, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: SIZES.extraLarge, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: SIZES.medium, color: COLORS.textMuted, textAlign: 'center', marginBottom: 28 },
  
  starsContainer: { flexDirection: 'row', gap: 14, marginBottom: 24 },
  starTouch: { padding: 4 },

  incentiveBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.goldBg,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  incentiveIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  incentiveTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  incentiveDesc: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 16,
  },
  
  inputContainer: { width: '100%', backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  textInput: { color: COLORS.text, fontSize: SIZES.medium, minHeight: 90, textAlignVertical: 'top' },
  
  footer: { padding: 24, paddingBottom: 40 },
  submitBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 12 },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { color: COLORS.surface, fontWeight: 'bold', fontSize: SIZES.medium, letterSpacing: 1 },
  skipBtn: { padding: 12, alignItems: 'center' },
  skipText: { color: COLORS.textMuted, fontWeight: '600', fontSize: SIZES.font },
});

export default RatingScreen;

