import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, ScrollView, Dimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';

const { width: SCREEN_W } = Dimensions.get('window');

// ===== DESIGN TOKENS =====
const COLORS = {
  bg: '#F0F4F8', surface: '#FFFFFF', primary: '#0ea5e9', primaryDark: '#0284c7',
  text: '#0F172A', textSec: '#475569', textMuted: '#94A3B8',
  green: '#10b981', greenBg: 'rgba(16,185,129,0.08)',
  orange: '#f97316', orangeBg: 'rgba(249,115,22,0.08)',
  yellow: '#f59e0b', yellowBg: 'rgba(245,158,11,0.08)',
  red: '#ef4444', redBg: 'rgba(239,68,68,0.08)',
  border: '#E2E8F0', divider: '#F1F5F9',
};

// ===== STATUS CONFIG =====
const STATUS_MAP = {
  PENDING_PAYMENT:            { label: 'Chờ thanh toán',              color: COLORS.orange,  bg: COLORS.orangeBg, icon: 'time-outline' },
  WAITING_DRIVER_APPROVAL:    { label: 'Đang chờ tài xế duyệt',      color: COLORS.yellow,  bg: COLORS.yellowBg, icon: 'hourglass-outline' },
  CONFIRMED:                  { label: 'Đã xác nhận',                 color: COLORS.green,   bg: COLORS.greenBg,  icon: 'shield-checkmark-outline' },
  COMPLETED:                  { label: 'Hoàn thành',                  color: COLORS.green,   bg: COLORS.greenBg,  icon: 'checkmark-done-outline' },
  REJECTED_BY_DRIVER:         { label: 'Bị từ chối',                 color: COLORS.red,     bg: COLORS.redBg,    icon: 'close-circle-outline' },
  EXPIRED:                    { label: 'Hết hạn',                     color: COLORS.red,     bg: COLORS.redBg,    icon: 'time-outline' },
  CANCELLED_USER:             { label: 'Đã huỷ',                      color: COLORS.red,     bg: COLORS.redBg,    icon: 'close-circle-outline' },
  CANCELLED_DRIVER:           { label: 'Tài xế huỷ chuyến',           color: COLORS.red,     bg: COLORS.redBg,    icon: 'close-circle-outline' },
  CANCELLED_PAYMENT_FAILED:   { label: 'Lỗi thanh toán',              color: COLORS.red,     bg: COLORS.redBg,    icon: 'alert-circle-outline' },
};
const getStatus = (s) => STATUS_MAP[s] || { label: s || 'Không rõ', color: COLORS.textMuted, bg: '#f1f5f9', icon: 'ellipse-outline' };

// ===== HELPERS =====
const money = (v) => `${Number(v || 0).toLocaleString('vi-VN')}đ`;
const fDate = (iso) => {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
};
const fTime = (iso) => {
  if (!iso) return '--';
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

// ──────────────────────────────── COMPONENT ────────────────────────────────
const BookingDetailScreen = ({ route, navigation }) => {
  const { booking: initialBooking } = route.params || {};
  const [booking, setBooking] = useState(initialBooking || {});
  const [trip, setTrip] = useState(initialBooking?.trip || null);
  const [loadingTrip, setLoadingTrip] = useState(false);

  useEffect(() => {
    if (booking?.id) {
      apiService.getBookingDetail(booking.id)
        .then(res => {
          if (res?.data?.result) {
            setBooking(prev => ({ ...prev, ...res.data.result }));
          }
        })
        .catch(err => console.log('Fetch booking detail error in BookingDetail:', err));
    }
  }, [booking?.id]);

  useEffect(() => {
    if (booking?.tripId) {
      setLoadingTrip(true);
      apiService.getTripDetail(booking.tripId)
        .then(res => {
          if (res?.data?.result) {
            setTrip(res.data.result);
          }
        })
        .catch(err => console.log('Fetch trip error in BookingDetail:', err))
        .finally(() => setLoadingTrip(false));
    }
  }, [booking?.tripId]);

  if (!booking || !booking.id) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={{ textAlign: 'center', marginTop: 80, color: COLORS.textMuted }}>Không tìm thấy thông tin chuyến đi.</Text>
      </SafeAreaView>
    );
  }

  const status = getStatus(booking.status);
  const shortCode = (booking.bookingCode || booking.id || '').toUpperCase();

  // Location breakdown
  const pickupWardName = trip?.stops?.find(s => String(s.wardId) === String(booking.pickupWardId))?.addressText || '';
  const dropoffWardName = trip?.stops?.find(s => String(s.wardId) === String(booking.dropoffWardId))?.addressText || '';
  const startProvinceName = trip?.startAddressText || '';
  const endProvinceName = trip?.endAddressText || '';

  // ── Context‑aware actions ──
  const showChat     = ['CONFIRMED', 'RESERVED', 'PENDING_PAYMENT', 'WAITING_DRIVER_APPROVAL'].includes(booking.status);
  const showRate     = booking.status === 'COMPLETED';
  const showRebook   = ['COMPLETED', 'CANCELLED_USER', 'CANCELLED_DRIVER', 'REJECTED_BY_DRIVER', 'EXPIRED', 'CANCELLED_PAYMENT_FAILED'].includes(booking.status);

  return (
    <SafeAreaView style={s.safe}>
      {/* ── TOP BAR ── */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Chi tiết chuyến đi</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ═══ STATUS BANNER ═══ */}
        <View style={[s.statusBanner, { backgroundColor: status.bg, borderColor: status.color }]}>
          <Ionicons name={status.icon} size={28} color={status.color} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={[s.statusLabel, { color: status.color }]}>{status.label}</Text>
            <Text style={s.statusCode}>Mã: {shortCode}</Text>
          </View>
        </View>

        {/* ═══ ROUTE CARD ═══ */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Lộ trình đón trả</Text>

          <View style={s.routeWrap}>
            {/* Vertical line */}
            <View style={s.routeTimeline}>
              <View style={[s.dot, { backgroundColor: COLORS.primary }]} />
              <View style={s.dashLine} />
              <View style={[s.dot, { backgroundColor: COLORS.orange }]} />
            </View>

            <View style={s.routeTexts}>
              {/* Pickup */}
              <View style={s.routeBlock}>
                <Text style={s.routeTag}>ĐIỂM ĐÓN</Text>
                {startProvinceName ? (
                  <View style={s.addrBreakdown}>
                    <View style={s.addrItemRow}>
                      <Ionicons name="map-outline" size={13} color={COLORS.primary} style={{ marginRight: 4, marginTop: 2 }} />
                      <Text style={s.addrAreaText}>
                        <Text style={{ fontWeight: '700', color: COLORS.primary }}>Tỉnh/Thành: </Text>{startProvinceName}
                      </Text>
                    </View>
                    {!!pickupWardName && (
                      <View style={s.addrItemRow}>
                        <Ionicons name="business-outline" size={13} color={COLORS.primary} style={{ marginRight: 4, marginTop: 2 }} />
                        <Text style={s.addrAreaText}>
                          <Text style={{ fontWeight: '700', color: COLORS.text }}>Phường/Xã: </Text>{pickupWardName}
                        </Text>
                      </View>
                    )}
                    <View style={s.addrItemRow}>
                      <Ionicons name="navigate-outline" size={13} color={COLORS.primary} style={{ marginRight: 4, marginTop: 2 }} />
                      <Text style={s.addrDetailText}>
                        <Text style={{ fontWeight: '700', color: COLORS.text }}>Địa chỉ chi tiết: </Text>{booking.pickupAddressText || 'Không rõ'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={s.routeAddr} numberOfLines={3}>{booking.pickupAddressText || booking.pickupLocation || 'Không rõ'}</Text>
                )}
              </View>

              {/* Dropoff */}
              <View style={[s.routeBlock, { marginTop: 20 }]}>
                <Text style={[s.routeTag, { color: COLORS.orange }]}>ĐIỂM ĐẾN</Text>
                {endProvinceName ? (
                  <View style={s.addrBreakdown}>
                    <View style={s.addrItemRow}>
                      <Ionicons name="map-outline" size={13} color={COLORS.orange} style={{ marginRight: 4, marginTop: 2 }} />
                      <Text style={s.addrAreaText}>
                        <Text style={{ fontWeight: '700', color: COLORS.orange }}>Tỉnh/Thành: </Text>{endProvinceName}
                      </Text>
                    </View>
                    {!!dropoffWardName && (
                      <View style={s.addrItemRow}>
                        <Ionicons name="business-outline" size={13} color={COLORS.orange} style={{ marginRight: 4, marginTop: 2 }} />
                        <Text style={s.addrAreaText}>
                          <Text style={{ fontWeight: '700', color: COLORS.text }}>Phường/Xã: </Text>{dropoffWardName}
                        </Text>
                      </View>
                    )}
                    <View style={s.addrItemRow}>
                      <Ionicons name="navigate-outline" size={13} color={COLORS.orange} style={{ marginRight: 4, marginTop: 2 }} />
                      <Text style={s.addrDetailText}>
                        <Text style={{ fontWeight: '700', color: COLORS.text }}>Địa chỉ chi tiết: </Text>{booking.dropoffAddressText || booking.dropoffLocation || 'Không rõ'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={s.routeAddr} numberOfLines={3}>{booking.dropoffAddressText || booking.dropoffLocation || 'Không rõ'}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* ═══ TRIP INFO ═══ */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Thông tin chuyến</Text>

          <InfoRow icon="calendar-outline" label="Ngày đặt" value={fDate(booking.createdAt)} />
          <InfoRow icon="time-outline" label="Giờ đặt" value={fTime(booking.createdAt)} />
          {(trip?.departureTime || booking.trip?.departureDate) && (
            <InfoRow icon="airplane-outline" label="Khởi hành" value={`${fTime(trip?.departureTime || booking.trip?.departureDate)} • ${fDate(trip?.departureTime || booking.trip?.departureDate)}`} />
          )}
          <InfoRow icon="people-outline" label="Số ghế" value={`${booking.seatsBooked || booking.seatCount || 1} ghế`} />
          {(trip?.vehicleBrand || trip?.vehicleModel || booking.trip?.vehicleType) && (
            <InfoRow icon="car-outline" label="Phương tiện" value={`${trip?.vehicleBrand || ''} ${trip?.vehicleModel || ''}`.trim() || booking.trip?.vehicleType} />
          )}
        </View>

        {/* ═══ PRICING ═══ */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Chi phí</Text>

          <View style={s.priceRow}>
            <Text style={s.priceLabel}>Giá vé</Text>
            <Text style={s.priceVal}>{money(booking.totalAmount || booking.totalPrice || booking.price)}</Text>
          </View>
          {booking.discountAmount > 0 && (
            <View style={s.priceRow}>
              <Text style={s.priceLabel}>Giảm giá</Text>
              <Text style={[s.priceVal, { color: COLORS.green }]}>-{money(booking.discountAmount)}</Text>
            </View>
          )}
          <View style={s.priceDivider} />
          <View style={s.priceRow}>
            <Text style={[s.priceLabel, { fontWeight: '800', color: COLORS.text }]}>Tổng thanh toán</Text>
            <Text style={[s.priceVal, { fontWeight: '800', color: COLORS.primary, fontSize: 20 }]}>
              {money(booking.totalAmount || booking.finalPrice || booking.totalPrice || booking.price)}
            </Text>
          </View>

          {/* ── Phương thức thanh toán ── */}
          <View style={s.priceDivider} />
          {(() => {
            const isStripe = booking.paymentMethod === 'STRIPE' || (booking.paymentMethod !== 'CASH' && (booking.paymentStatus === 'HOLDING' || booking.paymentId?.startsWith('pi_')));
            const methodLabel = isStripe ? 'Thẻ quốc tế (Stripe)' : 'Tiền mặt';
            const methodIcon = isStripe ? 'card' : 'cash-outline';
            const methodColor = isStripe ? '#2563EB' : '#D97706';

            // Payment status config
            let statusLabel, statusIcon, statusBg, statusColor, guidanceText;
            if (isStripe) {
              if (booking.paymentStatus === 'PAID') {
                statusLabel = 'Đã thanh toán';
                statusIcon = 'checkmark-circle';
                statusBg = '#ECFDF5'; statusColor = '#059669';
                guidanceText = 'Số tiền đã được thanh toán thành công qua thẻ. Bạn không cần trả thêm cho tài xế.';
              } else if (booking.paymentStatus === 'HOLDING') {
                statusLabel = 'Đã giữ cọc qua thẻ';
                statusIcon = 'shield-checkmark';
                statusBg = '#EFF6FF'; statusColor = '#2563EB';
                guidanceText = 'Số tiền đang được giữ an toàn trên thẻ của bạn. Sau khi hoàn thành chuyến, tiền sẽ tự động chuyển cho tài xế.';
              } else if (booking.paymentStatus === 'REFUNDED' || booking.paymentStatus === 'VOIDED') {
                statusLabel = 'Đã hoàn tiền';
                statusIcon = 'refresh-circle';
                statusBg = '#F3F4F6'; statusColor = '#6B7280';
                guidanceText = 'Số tiền đã được hoàn về thẻ của bạn.';
              } else if (booking.paymentStatus === 'FAILED') {
                statusLabel = 'Thanh toán thất bại';
                statusIcon = 'close-circle';
                statusBg = '#FEF2F2'; statusColor = '#DC2626';
                guidanceText = 'Thanh toán qua thẻ không thành công. Vui lòng thử lại hoặc chọn phương thức khác.';
              } else {
                statusLabel = 'Chờ thanh toán';
                statusIcon = 'time-outline';
                statusBg = '#FEF3C7'; statusColor = '#D97706';
                guidanceText = 'Đang xử lý thanh toán qua thẻ...';
              }
            } else {
              // Cash
              if (booking.paymentStatus === 'PAID') {
                statusLabel = 'Đã thanh toán';
                statusIcon = 'checkmark-circle';
                statusBg = '#ECFDF5'; statusColor = '#059669';
                guidanceText = 'Bạn đã thanh toán tiền mặt cho tài xế.';
              } else {
                statusLabel = 'Thu tiền mặt khi đi';
                statusIcon = 'wallet-outline';
                statusBg = '#FEF3C7'; statusColor = '#D97706';
                guidanceText = 'Vui lòng chuẩn bị tiền mặt để trả trực tiếp cho tài xế khi lên xe.';
              }
            }

            return (
              <>
                <View style={s.priceRow}>
                  <Text style={s.priceLabel}>Phương thức</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={methodIcon} size={16} color={methodColor} style={{ marginRight: 5 }} />
                    <Text style={[s.priceVal, { color: methodColor, fontSize: 14 }]}>{methodLabel}</Text>
                  </View>
                </View>

                <View style={s.priceRow}>
                  <Text style={s.priceLabel}>Thanh toán</Text>
                  <View style={[s.payStatusBadge, { backgroundColor: statusBg }]}>
                    <Ionicons name={statusIcon} size={14} color={statusColor} style={{ marginRight: 4 }} />
                    <Text style={[s.payStatusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                </View>

                {/* Guidance box */}
                <View style={[s.payGuidanceBox, { backgroundColor: statusBg, borderColor: statusColor + '30' }]}>
                  <Ionicons name="information-circle-outline" size={16} color={statusColor} style={{ marginRight: 8, marginTop: 1 }} />
                  <Text style={[s.payGuidanceText, { color: statusColor }]}>{guidanceText}</Text>
                </View>
              </>
            );
          })()}
        </View>

        {/* ═══ DRIVER INFO ═══ */}
        {(booking.trip?.driverName || booking.driverName) && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Tài xế</Text>
            <View style={s.driverRow}>
              <View style={s.avatarCircle}>
                <Ionicons name="person" size={26} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={s.driverName}>{booking.trip?.driverName || booking.driverName || 'Tài xế'}</Text>
                {(booking.trip?.vehicleType || booking.trip?.vehiclePlate) && (
                  <Text style={s.driverSub}>
                    {booking.trip?.vehicleType}{booking.trip?.vehiclePlate ? ` • ${booking.trip.vehiclePlate}` : ''}
                  </Text>
                )}
                {booking.trip?.driverRating > 0 && (
                  <View style={s.ratingRow}>
                    <Ionicons name="star" size={14} color="#f59e0b" />
                    <Text style={s.ratingText}>{booking.trip.driverRating}/5 sao</Text>
                  </View>
                )}
              </View>
              {showChat && (
                <TouchableOpacity
                  style={s.driverChatBtn}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('BookingChat', {
                    bookingId: booking.id,
                    driverName: booking.trip?.driverName || booking.driverName || 'Tài xế',
                    driverAvatar: booking.trip?.driverAvatar,
                    vehicleInfo: booking.trip?.vehicleType || 'Xe',
                  })}
                >
                  <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ═══ ACTION BUTTONS ═══ */}
        <View style={s.actions}>
          {showChat && (
            <TouchableOpacity
              style={s.btnPrimary}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('BookingChat', {
                bookingId: booking.id,
                driverName: booking.trip?.driverName || booking.driverName || 'Tài xế',
                driverAvatar: booking.trip?.driverAvatar,
                vehicleInfo: booking.trip?.vehicleType || 'Xe',
              })}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
              <Text style={s.btnPrimaryText}>Nhắn tin tài xế</Text>
            </TouchableOpacity>
          )}

          {showRate && (
            <TouchableOpacity
              style={s.btnPrimary}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Rating', {
                bookingId: booking.id,
                driverName: booking.trip?.driverName || booking.driverName || 'Tài xế',
              })}
            >
              <Ionicons name="star" size={18} color="#fff" />
              <Text style={s.btnPrimaryText}>Đánh giá chuyến đi</Text>
            </TouchableOpacity>
          )}

          {showRebook && (
            <TouchableOpacity
              style={s.btnOutline}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('SearchRide')}
            >
              <Ionicons name="search" size={18} color={COLORS.primary} />
              <Text style={s.btnOutlineText}>Đặt lại chuyến mới</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Reusable row ──
const InfoRow = ({ icon, label, value }) => (
  <View style={s.infoRow}>
    <View style={s.infoIcon}>
      <Ionicons name={icon} size={18} color={COLORS.primary} />
    </View>
    <Text style={s.infoLabel}>{label}</Text>
    <Text style={s.infoValue}>{value}</Text>
  </View>
);

// ════════════════════════════════ STYLES ════════════════════════════════
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  // Top Bar
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.divider, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },

  scroll: { padding: 16 },

  // Status Banner
  statusBanner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderLeftWidth: 5, marginBottom: 16 },
  statusLabel: { fontSize: 16, fontWeight: '800' },
  statusCode: { fontSize: 12, color: COLORS.textSec, marginTop: 2, fontWeight: '600' },

  // Card
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: COLORS.divider },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 },

  // Route
  routeWrap: { flexDirection: 'row' },
  routeTimeline: { width: 24, alignItems: 'center', paddingTop: 4 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dashLine: { width: 2, flex: 1, backgroundColor: COLORS.border, marginVertical: 3 },
  routeTexts: { flex: 1, marginLeft: 10 },
  routeBlock: {},
  routeTag: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.5, marginBottom: 3 },
  routeAddr: { fontSize: 15, fontWeight: '700', color: COLORS.text, lineHeight: 22 },
  addrBreakdown: { marginTop: 4, gap: 4 },
  addrItemRow: { flexDirection: 'row', alignItems: 'flex-start' },
  addrAreaText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 19 },
  addrDetailText: { flex: 1, fontSize: 13, color: COLORS.textSec, lineHeight: 19 },

  // Info rows
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  infoIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(14,165,233,0.08)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoLabel: { flex: 1, fontSize: 14, color: COLORS.textSec, fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },

  // Pricing
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  priceLabel: { fontSize: 14, color: COLORS.textSec, fontWeight: '500' },
  priceVal: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  priceDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },

  // Driver
  driverRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(14,165,233,0.08)', alignItems: 'center', justifyContent: 'center' },
  driverName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  driverSub: { fontSize: 13, color: COLORS.textSec, marginTop: 2, fontWeight: '500' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '700', color: '#f59e0b' },
  driverChatBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(14,165,233,0.1)', alignItems: 'center', justifyContent: 'center' },

  // Actions
  actions: { marginTop: 6, gap: 12 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 15, borderRadius: 14, gap: 10, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  btnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, paddingVertical: 15, borderRadius: 14, gap: 10, borderWidth: 2, borderColor: COLORS.primary },
  btnOutlineText: { color: COLORS.primary, fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },

  // Payment Status
  payStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  payStatusText: { fontSize: 12, fontWeight: '700' },
  payGuidanceBox: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 8 },
  payGuidanceText: { flex: 1, fontSize: 12, fontWeight: '500', lineHeight: 18 },
});

export default BookingDetailScreen;
