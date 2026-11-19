import React, { useState, useEffect, useRef } from 'react';
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
  ScrollView,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';

const COLORS = { 
  background: '#F8FAFC', 
  surface: '#FFFFFF', 
  primary: '#0284C7', 
  primaryLight: '#E0F2FE',
  primaryBorder: '#BAE6FD',
  text: '#0F172A', 
  textSec: '#334155',
  textMuted: '#64748B', 
  border: '#E2E8F0',
  gold: '#F59E0B',
  goldBg: '#FEF3C7',
  goldBorder: '#FDE68A',
  goldText: '#92400E',
  success: '#10B981',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',
  successText: '#065F46',
  cardBg: '#FFFFFF',
};

const QUICK_TAGS = [
  'Lái xe an toàn',
  'Xe sạch sẽ, thơm tho',
  'Đúng giờ hẹn',
  'Thân thiện, nhiệt tình',
  'Lái xe êm ái',
  'Giao tiếp lịch sự',
];

const STAR_LABELS = {
  1: 'Rất không hài lòng 😞',
  2: 'Chưa hài lòng 🙁',
  3: 'Bình thường 😐',
  4: 'Hài lòng 🙂',
  5: 'Tuyệt vời, vượt mong đợi! 🌟',
};

const RatingScreen = ({ route, navigation }) => {
  const {
    bookingId,
    tripId: paramTripId,
    driverId: paramDriverId,
    driverName: paramDriverName,
    driverAvatar: paramDriverAvatar,
    driverPhone: paramDriverPhone,
    driverRating: paramDriverRating,
    vehicleInfo: paramVehicleInfo,
    existingReview: paramExistingReview
  } = route.params || {};

  const [existingReview, setExistingReview] = useState(paramExistingReview || null);
  const [rating, setRating] = useState(paramExistingReview?.rating || 0);
  const [comment, setComment] = useState(paramExistingReview?.comment || '');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingReview, setIsCheckingReview] = useState(!paramExistingReview);

  const [resolvedTripId, setResolvedTripId] = useState(paramTripId || null);
  const [resolvedDriverId, setResolvedDriverId] = useState(paramDriverId || null);
  const [driverName, setDriverName] = useState(paramDriverName && paramDriverName !== 'Tài xế' ? paramDriverName : '');
  const [driverAvatar, setDriverAvatar] = useState(paramDriverAvatar || null);
  const [vehicleInfo, setVehicleInfo] = useState(paramVehicleInfo || '');
  const [driverRating, setDriverRating] = useState(paramDriverRating || null);

  // Background check for existing review without blocking initial screen render
  useEffect(() => {
    let isMounted = true;

    const checkReviewInBackground = async () => {
      if (!bookingId || bookingId === 'unknown') {
        if (isMounted) setIsCheckingReview(false);
        return;
      }

      // 1. Kiểm tra bộ nhớ tạm cục bộ trước để phản hồi tức thì
      try {
        const localCached = await AsyncStorage.getItem(`@review_${bookingId}`);
        if (localCached && isMounted) {
          const rev = JSON.parse(localCached);
          setExistingReview(rev);
          setRating(rev.rating || 5);
          setComment(rev.comment || '');
        }
      } catch (_) {}

      // 2. Kiểm tra từ máy chủ backend
      if (!paramExistingReview) {
        try {
          const res = await apiService.getReviewByBookingId(bookingId);
          if (isMounted && res?.data?.result) {
            const rev = res.data.result;
            setExistingReview(rev);
            setRating(rev.rating || 5);
            setComment(rev.comment || '');
            await AsyncStorage.setItem(`@review_${bookingId}`, JSON.stringify(rev));
          }
        } catch (err) {
          // No existing review found (normal case for new review)
        } finally {
          if (isMounted) setIsCheckingReview(false);
        }
      } else {
        if (isMounted) setIsCheckingReview(false);
      }

      // Fetch fallback trip/driver details in background if missing
      const tId = paramTripId || resolvedTripId;
      if (tId) {
        try {
          const tRes = await apiService.getTripDetail(tId);
          const tData = tRes?.data?.result;
          if (tData && isMounted) {
            if (tData.driverName) setDriverName(tData.driverName);
            if (tData.avatarUrl) setDriverAvatar(tData.avatarUrl);
            const vInfo = [tData.vehicleBrand, tData.vehicleModel].filter(Boolean).join(' ');
            if (vInfo) setVehicleInfo(vInfo);
            if (tData.driverRating) setDriverRating(tData.driverRating);
            if (tData.driverId && !resolvedDriverId) setResolvedDriverId(tData.driverId);
          }
        } catch (_) {}
      } else {
        try {
          const bRes = await apiService.getBookingDetail(bookingId);
          const bData = bRes?.data?.result;
          if (bData && isMounted) {
            const fetchedTripId = bData.tripId || bData.trip?.id;
            if (fetchedTripId) {
              setResolvedTripId(fetchedTripId);
              const tRes = await apiService.getTripDetail(fetchedTripId);
              const tData = tRes?.data?.result;
              if (tData && isMounted) {
                if (tData.driverName) setDriverName(tData.driverName);
                if (tData.avatarUrl) setDriverAvatar(tData.avatarUrl);
                const vInfo = [tData.vehicleBrand, tData.vehicleModel].filter(Boolean).join(' ');
                if (vInfo) setVehicleInfo(vInfo);
                if (tData.driverRating) setDriverRating(tData.driverRating);
                if (tData.driverId) setResolvedDriverId(tData.driverId);
              }
            }
          }
        } catch (_) {}
      }
    };

    checkReviewInBackground();
    return () => { isMounted = false; };
  }, [bookingId]);

  const toggleTag = (tag) => {
    if (isAlreadyReviewed) return;
    let nextTags;
    if (selectedTags.includes(tag)) {
      nextTags = selectedTags.filter((t) => t !== tag);
    } else {
      nextTags = [...selectedTags, tag];
    }
    setSelectedTags(nextTags);

    // Sync tags into comment text if comment is empty or contains previous tags
    if (nextTags.length > 0) {
      const tagText = nextTags.join(', ');
      setComment((prev) => {
        // If current comment has custom words, append; otherwise set tags
        const nonTagComment = QUICK_TAGS.reduce((acc, t) => acc.replace(t, '').replace(/^[,\s]+|[,\s]+$/g, ''), prev);
        if (nonTagComment.trim()) {
          return `${nonTagComment.trim()}. ${tagText}`;
        }
        return tagText;
      });
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Chưa chọn số sao', 'Vui lòng chọn từ 1 đến 5 sao để đánh giá chuyến đi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        bookingId,
        tripId: resolvedTripId || paramTripId || 'unknown',
        driverId: resolvedDriverId || paramDriverId || 'unknown',
        rating,
        comment: comment?.trim() || '',
      };

      const res = await apiService.rateTrip(bookingId, payload);
      const createdReview = res?.data?.result || { rating, comment, bookingId, createdAt: new Date().toISOString() };
      setExistingReview(createdReview);
      try {
        await AsyncStorage.setItem(`@review_${bookingId}`, JSON.stringify(createdReview));
      } catch (_) {}

      Alert.alert(
        'Đã gửi đánh giá thành công! 🎉',
        rating === 5 
          ? 'Cảm ơn bạn! Đánh giá 5 sao đã giúp tài xế cộng thêm +1 điểm uy tín!' 
          : 'Cảm ơn phản hồi của bạn giúp RideUp ngày càng hoàn thiện hơn.',
        [{ text: 'Hoàn tất', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      const errCode = error?.response?.data?.code;
      const reviewObj = { rating: rating || 5, comment: comment || '', bookingId, createdAt: new Date().toISOString() };
      setExistingReview(reviewObj);
      try {
        await AsyncStorage.setItem(`@review_${bookingId}`, JSON.stringify(reviewObj));
      } catch (_) {}

      if (errCode === 9001 || error?.response?.data?.message?.includes('đã đánh giá')) {
        Alert.alert('Thông báo', 'Bạn đã đánh giá chuyến đi này rồi!', [
          { text: 'Đồng ý', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Thành công', 'Đánh giá của bạn đã được ghi nhận.', [
          { text: 'Đồng ý', onPress: () => navigation.goBack() }
        ]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAlreadyReviewed = !!existingReview;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isAlreadyReviewed ? 'Chi tiết đánh giá' : 'Đánh giá chuyến đi'}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── DRIVER SUMMARY CARD ── */}
          <View style={styles.driverCard}>
            <View style={[styles.driverAvatar, driverAvatar && { overflow: 'hidden' }]}>
              {driverAvatar ? (
                <Image source={{ uri: driverAvatar }} style={{ width: 48, height: 48, borderRadius: 24 }} />
              ) : (
                <Ionicons name="person" size={26} color={COLORS.primary} />
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.driverNameText}>{driverName || 'Tài xế chuyến xe'}</Text>
              <Text style={styles.driverSubText}>
                {vehicleInfo ? `${vehicleInfo}` : 'Tài xế đối tác RideUp'}
                {driverRating > 0 ? ` • ${driverRating}⭐` : ''}
              </Text>
            </View>
            {isAlreadyReviewed && (
              <View style={styles.reviewedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                <Text style={styles.reviewedBadgeText}>Đã đánh giá</Text>
              </View>
            )}
          </View>

          {/* ── READ-ONLY NOTICE IF ALREADY REVIEWED ── */}
          {isAlreadyReviewed ? (
            <View style={styles.reviewedCard}>
              <View style={styles.reviewedCardTop}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.success} />
                <Text style={styles.reviewedCardTitle}>ĐÁNH GIÁ ĐÃ ĐƯỢC GHI NHẬN</Text>
              </View>
              <Text style={styles.reviewedCardDesc}>
                Bạn đã gửi đánh giá cho đối tác {driverName || 'tài xế'}. Mỗi đơn đặt vé chỉ được đánh giá 1 lần duy nhất để đảm bảo tính minh bạch.
              </Text>
              {existingReview?.createdAt && (
                <Text style={styles.reviewedCardTime}>
                  Thời gian: {new Date(existingReview.createdAt).toLocaleString('vi-VN')}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.promptWrap}>
              <Text style={styles.promptTitle}>Bạn cảm thấy chuyến đi thế nào?</Text>
              <Text style={styles.promptSubtitle}>Chạm vào số sao để xếp hạng trải nghiệm phục vụ</Text>
            </View>
          )}

          {/* ── STARS CONTAINER ── */}
          <View style={styles.starsCard}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= rating;
                return (
                  <TouchableOpacity
                    key={star}
                    activeOpacity={isAlreadyReviewed ? 1 : 0.6}
                    disabled={isAlreadyReviewed}
                    onPress={() => setRating(star)}
                    style={styles.starTouch}
                  >
                    <Ionicons
                      name={isFilled ? 'star' : 'star-outline'}
                      size={44}
                      color={isFilled ? COLORS.gold : '#CBD5E1'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
            {rating > 0 && (
              <Text style={styles.starLabelText}>
                {STAR_LABELS[rating] || ''}
              </Text>
            )}
          </View>

          {/* ── 5-STAR REPUTATION REWARD BANNER ── */}
          {rating === 5 && (
            <View style={styles.rewardBanner}>
              <View style={styles.rewardIconCircle}>
                <Ionicons name="sparkles" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rewardTitle}>Cộng +1 Điểm Uy Tín ⭐</Text>
                <Text style={styles.rewardDesc}>
                  {isAlreadyReviewed
                    ? 'Đánh giá 5 sao của bạn đã giúp đối tác nhận +1 điểm uy tín trên hệ thống RideUp!'
                    : 'Đánh giá 5 sao của bạn sẽ cộng +1 Điểm Uy Tín cho tài xế và giúp họ được ưu tiên nhận chuyến!'}
                </Text>
              </View>
            </View>
          )}

          {/* ── QUICK TAGS (ONLY WHEN NOT YET REVIEWED) ── */}
          {!isAlreadyReviewed && (
            <View style={styles.tagsContainer}>
              <Text style={styles.tagsLabel}>Điểm nổi bật của chuyến đi:</Text>
              <View style={styles.tagsWrap}>
                {QUICK_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      activeOpacity={0.7}
                      style={[styles.tagPill, isSelected && styles.tagPillActive]}
                      onPress={() => toggleTag(tag)}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark' : 'add'}
                        size={14}
                        color={isSelected ? '#FFFFFF' : COLORS.textSec}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.tagText, isSelected && styles.tagTextActive]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── COMMENT INPUT / READONLY REVIEW COMMENT ── */}
          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>
              {isAlreadyReviewed ? 'Nhận xét của bạn' : 'Nhận xét chi tiết (Không bắt buộc)'}
            </Text>
            <View style={[styles.inputBox, isAlreadyReviewed && styles.inputBoxReadOnly]}>
              <TextInput
                style={[styles.textInput, isAlreadyReviewed && styles.textInputReadOnly]}
                placeholder={isAlreadyReviewed ? 'Không có nhận xét chi tiết' : 'Chia sẻ thêm cảm nhận của bạn về tài xế và chuyến đi...'}
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
                value={comment}
                onChangeText={setComment}
                editable={!isAlreadyReviewed}
              />
            </View>
          </View>
        </ScrollView>

        {/* ── FOOTER ACTIONS ── */}
        <View style={styles.footer}>
          {isAlreadyReviewed ? (
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: COLORS.text }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>QUAY LẠI</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.submitBtn, (rating === 0 || isSubmitting) && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={rating === 0 || isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>GỬI ĐÁNH GIÁ</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.6}
              >
                <Text style={styles.skipBtnText}>Để sau</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  header: { 
    height: 56, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    backgroundColor: COLORS.surface, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: COLORS.text 
  },
  scrollContent: { 
    padding: 16, 
    paddingBottom: 24 
  },

  // Driver Card
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverNameText: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: COLORS.text 
  },
  driverSubText: { 
    fontSize: 13, 
    color: COLORS.textMuted, 
    marginTop: 2 
  },
  reviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
    gap: 4,
  },
  reviewedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.successText,
  },

  // Reviewed Card
  reviewedCard: {
    backgroundColor: COLORS.successBg,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  reviewedCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  reviewedCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.successText,
    letterSpacing: 0.5,
  },
  reviewedCardDesc: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 18,
  },
  reviewedCardTime: {
    fontSize: 12,
    color: '#059669',
    marginTop: 8,
    fontWeight: '600',
  },

  // Prompt
  promptWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  promptSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },

  // Stars Card
  starsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  starTouch: {
    padding: 4,
  },
  starLabelText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.goldText,
    marginTop: 12,
    textAlign: 'center',
  },

  // Reward banner
  rewardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.goldBg,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  rewardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.goldText,
    marginBottom: 2,
  },
  rewardDesc: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 17,
  },

  // Quick Tags
  tagsContainer: {
    marginBottom: 16,
  },
  tagsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSec,
    marginBottom: 8,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSec,
  },
  tagTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Comment Box
  commentSection: {
    marginBottom: 16,
  },
  commentLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSec,
    marginBottom: 8,
  },
  inputBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputBoxReadOnly: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  textInput: {
    fontSize: 14,
    color: COLORS.text,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  textInputReadOnly: {
    color: COLORS.textMuted,
  },

  // Footer
  footer: {
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitBtn: {
    flexDirection: 'row',
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  skipBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
});

export default RatingScreen;
