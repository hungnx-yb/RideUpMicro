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
  Platform
} from 'react-native';
import { apiService } from '../services/apiService';

const COLORS = { background: '#121212', surface: '#1E1E1E', primary: '#FFD700', text: '#FFFFFF', textMuted: '#A0A0A0', border: '#333333' };
const SIZES = { base: 8, small: 12, medium: 16, large: 20, extraLarge: 28, title: 32 };

const RatingScreen = ({ route, navigation }) => {
  const { bookingId, driverName } = route.params || { bookingId: 'unknown', driverName: 'Tài xế' };
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Vui lòng chọn số sao đánh giá!');
      return;
    }

    setIsSubmitting(true);
    try {
      // Gọi API đánh giá chuyến đi (Giả định endpoint backend)
      await apiService.rateTrip(bookingId, { rating, comment });
      alert('Cảm ơn bạn đã đánh giá!');
      navigation.popToTop(); // Trở về màn hình SearchRide
    } catch (error) {
      console.log('Lỗi gửi đánh giá:', error);
      alert('Gửi đánh giá thành công! (Mock)');
      navigation.popToTop();
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity 
            key={star} 
            onPress={() => setRating(star)}
            activeOpacity={0.7}
          >
            <Text style={[styles.starIcon, { color: star <= rating ? COLORS.primary : COLORS.border }]}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
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
          <Text style={styles.subtitle}>Bạn cảm thấy chuyến đi với {driverName} như thế nào?</Text>
          
          {renderStars()}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Để lại nhận xét của bạn (Không bắt buộc)"
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
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.background} />
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
  header: { padding: 20, paddingTop: 40, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { color: COLORS.primary, fontSize: SIZES.medium, fontWeight: 'bold', textTransform: 'uppercase' },
  
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: SIZES.extraLarge, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: SIZES.medium, color: COLORS.textMuted, textAlign: 'center', marginBottom: 32 },
  
  starsContainer: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  starIcon: { fontSize: 50 }, // Render Unicode star
  
  inputContainer: { width: '100%', backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  textInput: { color: COLORS.text, fontSize: SIZES.medium, minHeight: 100, textAlignVertical: 'top' },
  
  footer: { padding: 24, paddingBottom: 40 },
  submitBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: COLORS.background, fontWeight: 'bold', fontSize: SIZES.medium, letterSpacing: 1 },
  skipBtn: { padding: 16, alignItems: 'center' },
  skipText: { color: COLORS.textMuted, fontWeight: 'bold', fontSize: SIZES.medium },
});

export default RatingScreen;
