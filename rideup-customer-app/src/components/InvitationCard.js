import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#0ea5e9',
  surface: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  success: '#10b981',
  background: '#F8FAFC',
};

const InvitationCard = ({ invitation, onAccept, onReject }) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    await onAccept(invitation);
    setIsAccepting(false);
  };

  const handleReject = async () => {
    setIsRejecting(true);
    await onReject(invitation);
    setIsRejecting(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.driverInfo}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={48} color={COLORS.textMuted} />
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.driverMeta}>
            <Text style={styles.driverName}>
              {invitation.driverName || 'Tài xế'} 
              <Ionicons name="star" size={14} color="#f59e0b" /> 4.9
            </Text>
            <Text style={styles.vehicleInfo}>
              {invitation.vehicleInfo || 'Xe 4 chỗ'}
            </Text>
          </View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>
            {invitation.price ? invitation.price.toLocaleString('vi-VN') + 'đ' : 'Thỏa thuận'}
          </Text>
        </View>
      </View>

      {invitation.message && (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>"{invitation.message}"</Text>
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={styles.btnReject} 
          onPress={handleReject}
          disabled={isAccepting || isRejecting}
        >
          {isRejecting ? (
            <ActivityIndicator size="small" color={COLORS.textMuted} />
          ) : (
            <Text style={styles.btnRejectText}>Bỏ qua</Text>
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
            <Text style={styles.btnAcceptText}>Chọn xe này</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  driverMeta: {
    justifyContent: 'center',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  vehicleInfo: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  priceContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  messageBox: {
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  messageText: {
    fontStyle: 'italic',
    color: COLORS.textMuted,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  btnReject: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  btnRejectText: {
    color: COLORS.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  btnAccept: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  btnAcceptText: {
    color: COLORS.surface,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default InvitationCard;
