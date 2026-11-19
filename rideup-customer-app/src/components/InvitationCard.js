import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#0ea5e9',
  primaryDark: '#0284c7',
  surface: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  success: '#10b981',
  background: '#F8FAFC',
  warning: '#F59E0B',
};

const InvitationCard = ({ invitation, onAccept, onReject }) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onAccept(invitation);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await onReject(invitation);
    } finally {
      setIsRejecting(false);
    }
  };

  const rating = invitation.driverRating != null ? Number(invitation.driverRating).toFixed(1) : null;
  const totalRides = invitation.totalRides || invitation.driver?.totalDriverRides || 0;
  const phoneNumber = invitation.driverPhone || invitation.driver?.phoneNumber || '';
  const plateNumber = invitation.plateNumber || invitation.driver?.plateNumber || '';
  const vehicleColor = invitation.vehicleColor || invitation.driver?.vehicleColor || '';
  const seatCapacity = invitation.driver?.seatCapacity || null;

  const depTimeStr = invitation.departureTime
    ? new Date(invitation.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
      ', ' +
      new Date(invitation.departureTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  const pricePerSeat = invitation.pricePerSeat || (invitation.seatCount && invitation.price ? Math.round(Number(invitation.price) / Number(invitation.seatCount)) : null);
  const totalPrice = invitation.price ? Number(invitation.price) : null;

  const startAddr = invitation.startAddressText || '';
  const endAddr = invitation.endAddressText || '';

  const stops = invitation.stops || [];
  const pickupStops = stops.filter(s => s.stopType === 'PICKUP');
  const dropoffStops = stops.filter(s => s.stopType === 'DROPOFF');

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.95}
      onPress={() => setExpanded(!expanded)}
    >
      {/* ── Header: Tài xế + Giá ── */}
      <View style={styles.topRow}>
        <View style={styles.driverInfo}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={44} color={COLORS.primary} />
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.driverMeta}>
            <Text style={styles.driverName} numberOfLines={1}>
              {invitation.driverName || 'Tài xế'}
            </Text>
            <View style={styles.ratingRow}>
              {rating && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.ratingText}>{rating}</Text>
                </View>
              )}
              {totalRides > 0 && (
                <Text style={styles.ridesText}>• {totalRides} chuyến</Text>
              )}
            </View>
          </View>
        </View>
        <View style={styles.priceCol}>
          {totalPrice != null ? (
            <>
              <Text style={styles.priceMain}>{totalPrice.toLocaleString('vi-VN')}đ</Text>
              {pricePerSeat != null && invitation.seatCount > 1 && (
                <Text style={styles.priceSub}>{Number(pricePerSeat).toLocaleString('vi-VN')}đ/ghế</Text>
              )}
            </>
          ) : (
            <Text style={styles.priceMain}>Thỏa thuận</Text>
          )}
        </View>
      </View>

      {/* ── Thông tin chuyến xe ── */}
      <View style={styles.tripInfoBox}>
        {/* Thời gian khởi hành */}
        {depTimeStr && (
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={15} color={COLORS.primaryDark} />
            <Text style={styles.infoLabel}>Khởi hành:</Text>
            <Text style={styles.infoValue}>{depTimeStr}</Text>
          </View>
        )}

        {/* Xe */}
        <View style={styles.infoRow}>
          <Ionicons name="car-outline" size={15} color={COLORS.textMuted} />
          <Text style={styles.infoLabel}>Xe:</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {invitation.vehicleInfo || 'Chưa rõ'}
            {vehicleColor ? ` • ${vehicleColor}` : ''}
            {seatCapacity ? ` • ${seatCapacity} chỗ` : ''}
          </Text>
        </View>

        {/* Biển số */}
        {plateNumber ? (
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={15} color={COLORS.textMuted} />
            <Text style={styles.infoLabel}>Biển số:</Text>
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{plateNumber}</Text>
            </View>
          </View>
        ) : null}

        {/* Ghế trống */}
        {invitation.seatAvailable != null && (
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={15} color={COLORS.textMuted} />
            <Text style={styles.infoLabel}>Còn trống:</Text>
            <Text style={[styles.infoValue, { color: invitation.seatAvailable <= 2 ? '#D97706' : '#059669', fontWeight: '700' }]}>
              {invitation.seatAvailable}/{invitation.seatTotal || '?'} ghế
            </Text>
          </View>
        )}
      </View>

      {/* ── Lộ trình: Đón → Trả ── */}
      <View style={styles.routeBox}>
        {/* Điểm đón */}
        <View style={styles.routeRow}>
          <View style={styles.routeIconCol}>
            <View style={[styles.routeDot, { backgroundColor: COLORS.primary }]} />
            <View style={styles.routeLine} />
          </View>
          <View style={styles.routeContent}>
            <Text style={styles.routeLabel}>ĐIỂM ĐÓN</Text>
            <Text style={styles.routeProvince} numberOfLines={1}>{startAddr || 'Tỉnh đón'}</Text>
            {pickupStops.length > 0 && (
              <View style={styles.wardsWrap}>
                {pickupStops.map((s, i) => (
                  <View key={`p-${i}`} style={styles.wardChip}>
                    <Ionicons name="location" size={10} color={COLORS.primary} />
                    <Text style={styles.wardChipText} numberOfLines={1}>{s.addressText || `Phường/Xã ${i+1}`}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Điểm trả */}
        <View style={styles.routeRow}>
          <View style={styles.routeIconCol}>
            <View style={[styles.routeDot, { backgroundColor: '#EA580C' }]} />
          </View>
          <View style={styles.routeContent}>
            <Text style={[styles.routeLabel, { color: '#EA580C' }]}>ĐIỂM TRẢ</Text>
            <Text style={styles.routeProvince} numberOfLines={1}>{endAddr || 'Tỉnh đến'}</Text>
            {dropoffStops.length > 0 && (
              <View style={styles.wardsWrap}>
                {dropoffStops.map((s, i) => (
                  <View key={`d-${i}`} style={[styles.wardChip, { borderColor: '#FDBA74' }]}>
                    <Ionicons name="flag" size={10} color="#EA580C" />
                    <Text style={[styles.wardChipText, { color: '#9A3412' }]} numberOfLines={1}>{s.addressText || `Phường/Xã ${i+1}`}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── Lời nhắn tài xế ── */}
      {invitation.message && (
        <View style={styles.messageBox}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.messageText} numberOfLines={2}>"{invitation.message}"</Text>
        </View>
      )}

      {/* ── SĐT (khi mở rộng) ── */}
      {expanded && phoneNumber ? (
        <View style={styles.expandedInfo}>
          <Ionicons name="call-outline" size={14} color={COLORS.primaryDark} />
          <Text style={styles.expandedText}>SĐT tài xế: {phoneNumber}</Text>
        </View>
      ) : null}

      {/* ── Nhấn để xem thêm ── */}
      <TouchableOpacity style={styles.expandToggle} onPress={() => setExpanded(!expanded)}>
        <Text style={styles.expandToggleText}>{expanded ? 'Thu gọn' : 'Xem thêm'}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.textMuted} />
      </TouchableOpacity>

      {/* ── Nút hành động ── */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.btnReject}
          onPress={handleReject}
          disabled={isAccepting || isRejecting}
        >
          {isRejecting ? (
            <ActivityIndicator size="small" color={COLORS.textMuted} />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.btnRejectText}>Bỏ qua</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnAccept}
          onPress={handleAccept}
          disabled={isAccepting || isRejecting}
        >
          {isAccepting ? (
            <ActivityIndicator size="small" color={COLORS.surface} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.surface} />
              <Text style={styles.btnAcceptText}>Chọn xe này</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  driverMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  driverName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  ridesText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  priceCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  priceMain: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.success,
  },
  priceSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  tripInfoBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 10,
    gap: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
    minWidth: 68,
  },
  infoValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
  },
  plateBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#94A3B8',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  plateText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 1,
  },
  routeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeIconCol: {
    width: 18,
    alignItems: 'center',
    paddingTop: 3,
    marginRight: 8,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLine: {
    width: 1.5,
    minHeight: 24,
    backgroundColor: '#CBD5E1',
    marginVertical: 2,
  },
  routeContent: {
    flex: 1,
    paddingBottom: 6,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  routeProvince: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  wardsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  wardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  wardChipText: {
    fontSize: 11,
    color: COLORS.primaryDark,
    fontWeight: '500',
    maxWidth: 200,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
    gap: 6,
  },
  messageText: {
    fontStyle: 'italic',
    color: COLORS.textMuted,
    fontSize: 12,
    flex: 1,
  },
  expandedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  expandedText: {
    fontSize: 13,
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 4,
    marginBottom: 6,
  },
  expandToggleText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  btnReject: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    gap: 5,
  },
  btnRejectText: {
    color: COLORS.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  btnAccept: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    gap: 5,
  },
  btnAcceptText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 13,
  },
});

export default InvitationCard;
