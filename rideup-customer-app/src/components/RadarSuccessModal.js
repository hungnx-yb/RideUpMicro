import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#0ea5e9',
  surface: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  overlay: 'rgba(0,0,0,0.6)',
  success: '#10b981',
};

const RadarSuccessModal = ({ visible, onClose, onNavigateRequests }) => {
  const pulseAnim1 = useRef(new Animated.Value(0)).current;
  const pulseAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      const createPulse = (anim, delay) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            })
          ])
        );
      };

      createPulse(pulseAnim1, 0).start();
      createPulse(pulseAnim2, 1000).start();
    } else {
      pulseAnim1.setValue(0);
      pulseAnim2.setValue(0);
    }
  }, [visible]);

  const getStyle = (anim) => ({
    transform: [{
      scale: anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.5, 2.5]
      })
    }],
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 0]
    })
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          
          {/* Radar Animation Area */}
          <View style={styles.radarContainer}>
            <Animated.View style={[styles.pulseCircle, getStyle(pulseAnim1)]} />
            <Animated.View style={[styles.pulseCircle, getStyle(pulseAnim2)]} />
            <View style={styles.centerIconContainer}>
              <Ionicons name="radio-outline" size={40} color={COLORS.surface} />
            </View>
          </View>

          <Text style={styles.title}>Tín hiệu đã phủ sóng!</Text>
          <Text style={styles.message}>
            Yêu cầu của bạn đã được gửi đến các tài xế quanh khu vực. Chúng tôi sẽ thông báo ngay khi có người nhận cuốc.
          </Text>

          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.btnSecondary} onPress={onClose}>
              <Text style={styles.btnSecondaryText}>Đóng</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.btnPrimary} onPress={onNavigateRequests}>
              <Text style={styles.btnPrimaryText}>Xem Yêu Cầu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  radarContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  pulseCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
  },
  centerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 5,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.textMuted,
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.surface,
  },
});

export default RadarSuccessModal;
