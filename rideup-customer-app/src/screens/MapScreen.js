import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = { background: '#F8FAFC', surface: '#FFFFFF', primary: '#0ea5e9', text: '#0F172A', textMuted: '#64748B', error: '#ef4444', border: '#E2E8F0', success: '#10b981' };
const SIZES = { base: 8, small: 12, font: 14, medium: 16, large: 20, extraLarge: 24, title: 32 };

const MapScreen = ({ route, navigation }) => {
  const { booking } = route.params || {};

  const handleLogout = async () => {
    await AsyncStorage.removeItem('accessToken');
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map}
        initialRegion={{
          latitude: 21.028511, // Hà Nội
          longitude: 105.804817,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        <Marker coordinate={{ latitude: 21.028511, longitude: 105.804817 }} title="Bạn đang ở đây" />
      </MapView>

      <SafeAreaView style={styles.overlay}>
        <View style={styles.header}>
          <Text style={styles.title}>RideUp</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomCard}>
          {booking ? (
            <>
              <Text style={styles.cardTitle}>Đang tìm tài xế...</Text>
              <Text style={{color: COLORS.textMuted}}>Mã chuyến: {booking.id}</Text>
              <Text style={{color: COLORS.textMuted, marginBottom: 16}}>{booking.pickupLocation} ➝ {booking.dropoffLocation}</Text>
              <TouchableOpacity 
                style={styles.bookingButton}
                onPress={() => navigation.navigate('BookingChat', { bookingId: booking.id })}
              >
                <Text style={styles.bookingText}>NHẮN TIN TÀI XẾ</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.bookingButton, { backgroundColor: COLORS.surface, marginTop: 10 }]}
                onPress={() => navigation.navigate('Rating', { bookingId: booking.id, driverName: 'Tài xế' })}
              >
                <Text style={[styles.bookingText, { color: COLORS.primary }]}>ĐÃ ĐẾN NƠI (ĐÁNH GIÁ)</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={{color: COLORS.text}}>Không có chuyến xe nào đang diễn ra.</Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  overlay: { flex: 1, justifyContent: 'space-between', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  title: { fontSize: SIZES.extraLarge, fontWeight: 'bold', color: '#000', textShadowColor: '#fff', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  logoutBtn: { backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: COLORS.error, fontWeight: 'bold' },
  bottomCard: { backgroundColor: COLORS.surface, padding: 24, borderRadius: 24, elevation: 10, marginBottom: 20 },
  cardTitle: { fontSize: SIZES.large, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
  bookingButton: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  bookingText: { color: COLORS.background, fontSize: SIZES.medium, fontWeight: 'bold', letterSpacing: 1 }
});

export default MapScreen;
