import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';

// ── Constants ──────────────────────────────────────────────────────────────
const DEFAULT_COORD = { latitude: 16.047079, longitude: 108.20623 };
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const MAX_DISTANCE_METERS = 20000;

// ── Helpers ────────────────────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isValid(lat, lng) {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180 &&
    (lat !== 0 || lng !== 0)
  );
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `${NOMINATIM_URL}?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`
    );
    const data = await res.json();
    return data?.display_name || '';
  } catch {
    return '';
  }
}

// ── Component ──────────────────────────────────────────────────────────────
/**
 * LocationMapPicker
 *
 * UX flow: Chọn Phường/Xã (dropdown) → Map hiện ra → Bấm/GPS để ghim điểm → Địa chỉ tự điền
 *
 * Props:
 *   title        {string}  - "Điểm Đón" / "Điểm Trả"
 *   wardOptions  {Array}   - [{ id, name }] - danh sách phường/xã để chọn
 *   wardId       {string}  - wardId đang được chọn
 *   onWardChange {fn}      - callback khi chọn phường/xã
 *   value        {object}  - { lat, lng, addressText }
 *   onChange     {fn}      - callback khi vị trí / địa chỉ thay đổi
 *   accentColor  {string}  - màu accent
 */
export default function LocationMapPicker({
  title,
  wardOptions = [],
  wardId,
  onWardChange,
  value,
  onChange,
  accentColor = '#0ea5e9',
}) {
  const mapRef = useRef(null);
  const [wardCenter, setWardCenter] = useState(null);
  const [loadingWard, setLoadingWard] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showWardList, setShowWardList] = useState(false);

  const lat = Number(value?.lat);
  const lng = Number(value?.lng);
  const hasCoord = isValid(lat, lng);

  const selectedWardName = wardOptions.find(w => w.id === wardId)?.name || '';

  // Load tâm phường/xã khi wardId thay đổi
  useEffect(() => {
    if (!wardId) { setWardCenter(null); return; }
    let cancelled = false;
    setLoadingWard(true);
    apiService.getWardById(wardId)
      .then(res => {
        const ward = res?.data?.result;
        const wLat = Number(ward?.lat);
        const wLng = Number(ward?.lng);
        if (!cancelled) {
          setWardCenter(isValid(wLat, wLng) ? { latitude: wLat, longitude: wLng } : null);
        }
      })
      .catch(() => { if (!cancelled) setWardCenter(null); })
      .finally(() => { if (!cancelled) setLoadingWard(false); });
    return () => { cancelled = true; };
  }, [wardId]);

  // Validate khoảng cách khi tọa độ hoặc tâm ward thay đổi
  useEffect(() => {
    if (!hasCoord || !wardCenter) return;
    const dist = haversine(lat, lng, wardCenter.latitude, wardCenter.longitude);
    if (dist > MAX_DISTANCE_METERS) {
      onChange({ lat: NaN, lng: NaN, addressText: value?.addressText || '' });
      setLocalError(`Vị trí nằm ngoài bán kính ${MAX_DISTANCE_METERS / 1000}km từ phường/xã đã chọn.`);
    }
  }, [hasCoord, lat, lng, wardCenter]);

  const updateFromCoord = useCallback(async (nextLat, nextLng) => {
    setLocalError('');
    if (!isValid(nextLat, nextLng)) {
      setLocalError('Tọa độ không hợp lệ. Vui lòng thử lại.');
      return;
    }
    if (wardCenter) {
      const dist = haversine(nextLat, nextLng, wardCenter.latitude, wardCenter.longitude);
      if (dist > MAX_DISTANCE_METERS) {
        setLocalError(`Điểm chọn nằm ngoài ${MAX_DISTANCE_METERS / 1000}km từ phường/xã. Vui lòng chọn điểm khác.`);
        return;
      }
    }
    onChange({ lat: nextLat, lng: nextLng, addressText: value?.addressText || '' });
    try {
      setResolvingAddress(true);
      const address = await reverseGeocode(nextLat, nextLng);
      if (address) onChange({ lat: nextLat, lng: nextLng, addressText: address });
    } catch {
      setLocalError('Không lấy được địa chỉ tự động. Bạn có thể tự nhập bên dưới.');
    } finally {
      setResolvingAddress(false);
    }
  }, [wardCenter, value, onChange]);

  const useCurrentLocation = async () => {
    setLocalError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocalError('Bạn cần cấp quyền vị trí để sử dụng tính năng này.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await updateFromCoord(loc.coords.latitude, loc.coords.longitude);
    } catch {
      setLocalError('Không thể lấy vị trí hiện tại.');
    }
  };

  const mapRegion = hasCoord
    ? { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : wardCenter
      ? { ...wardCenter, latitudeDelta: 0.05, longitudeDelta: 0.05 }
      : { ...DEFAULT_COORD, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  const distance = hasCoord && wardCenter
    ? haversine(lat, lng, wardCenter.latitude, wardCenter.longitude)
    : null;

  return (
    <View style={styles.wrapper}>

      {/* STEP 1: Chọn Phường/Xã */}
      <View style={styles.sectionHeader}>
        <View style={[styles.stepBadge, { backgroundColor: accentColor }]}>
          <Text style={styles.stepText}>1</Text>
        </View>
        <Text style={[styles.sectionTitle, { color: accentColor }]}>{title} — Chọn Phường/Xã</Text>
      </View>

      <TouchableOpacity
        style={[styles.wardBtn, wardId && { borderColor: accentColor }]}
        onPress={() => setShowWardList(!showWardList)}
        activeOpacity={0.8}
      >
        <Ionicons name="location-outline" size={18} color={wardId ? accentColor : '#64748B'} />
        <Text style={[styles.wardBtnText, wardId && { color: '#0F172A' }]} numberOfLines={1}>
          {wardId ? selectedWardName : 'Chọn Phường/Xã...'}
        </Text>
        <Ionicons name={showWardList ? 'chevron-up' : 'chevron-down'} size={16} color="#888" />
      </TouchableOpacity>

      {/* Danh sách phường/xã */}
      {showWardList && (
        <View style={styles.wardList}>
          {wardOptions.map(w => (
            <TouchableOpacity
              key={w.id}
              style={[styles.wardItem, w.id === wardId && { backgroundColor: `${accentColor}20`, borderColor: accentColor }]}
              onPress={() => {
                onWardChange(w.id);
                // Reset tọa độ khi đổi phường
                onChange({ lat: NaN, lng: NaN, addressText: '' });
                setLocalError('');
                setShowWardList(false);
              }}
            >
              <Ionicons
                name={w.id === wardId ? 'radio-button-on' : 'radio-button-off'}
                size={16}
                color={w.id === wardId ? accentColor : '#64748B'}
              />
              <Text style={[styles.wardItemText, w.id === wardId && { color: accentColor, fontWeight: 'bold' }]}>
                {w.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* STEP 2: Chọn trên bản đồ — chỉ hiện khi đã chọn phường/xã */}
      {wardId ? (
        <>
          <View style={[styles.sectionHeader, { marginTop: 16 }]}>
            <View style={[styles.stepBadge, { backgroundColor: accentColor }]}>
              <Text style={styles.stepText}>2</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: accentColor }]}>Ghim vị trí trên bản đồ</Text>
            <TouchableOpacity style={styles.gpsBtn} onPress={useCurrentLocation}>
              <Ionicons name="locate" size={13} color="#0F172A" />
              <Text style={styles.gpsBtnText}>Vị trí hiện tại</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>Bấm vào bản đồ để ghim vị trí chính xác</Text>

          <View style={styles.mapContainer}>
            {loadingWard && (
              <View style={styles.mapOverlay}>
                <ActivityIndicator color="#FFD700" />
                <Text style={styles.mapOverlayText}>Đang tải phạm vi phường/xã...</Text>
              </View>
            )}
            <MapView
              ref={mapRef}
              style={styles.map}
              region={mapRegion}
              onPress={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                updateFromCoord(latitude, longitude);
              }}
            >
              {wardCenter && (
                <Circle
                  center={wardCenter}
                  radius={MAX_DISTANCE_METERS}
                  strokeColor={accentColor}
                  strokeWidth={2}
                  fillColor={`${accentColor}18`}
                />
              )}
              {hasCoord && (
                <Marker coordinate={{ latitude: lat, longitude: lng }} pinColor={accentColor} />
              )}
            </MapView>
          </View>

          {distance !== null && distance > MAX_DISTANCE_METERS * 0.8 && (
            <Text style={styles.distText}>
              Cách tâm phường/xã: {(distance / 1000).toFixed(2)} km (tối đa {MAX_DISTANCE_METERS / 1000} km)
            </Text>
          )}

          {/* STEP 3: Địa chỉ chi tiết */}
          <View style={[styles.sectionHeader, { marginTop: 12 }]}>
            <View style={[styles.stepBadge, { backgroundColor: accentColor }]}>
              <Text style={styles.stepText}>3</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: accentColor }]}>Địa chỉ chi tiết</Text>
            {resolvingAddress && <ActivityIndicator color="#FFD700" size="small" style={{ marginLeft: 8 }} />}
          </View>
          <TextInput
            style={styles.addressInput}
            placeholder="Số nhà, tên đường, mốc nhận diện..."
            placeholderTextColor="#94A3B8"
            value={value?.addressText || ''}
            onChangeText={(t) => onChange({ lat, lng, addressText: t })}
          />
        </>
      ) : (
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={32} color="#CBD5E1" />
          <Text style={styles.mapPlaceholderText}>Chọn Phường/Xã để hiển thị bản đồ</Text>
        </View>
      )}

      {localError ? <Text style={styles.errorText}>{localError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 20 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  stepBadge: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  stepText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', flex: 1 },

  // Ward selector
  wardBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 14, height: 48,
  },
  wardBtnText: { flex: 1, color: '#64748B', fontSize: 14 },
  wardList: {
    backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1,
    borderColor: '#E2E8F0', marginTop: 4, overflow: 'hidden',
  },
  wardItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  wardItemText: { color: '#0F172A', fontSize: 14, flex: 1 },

  // GPS button
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, gap: 4,
  },
  gpsBtnText: { color: '#0F172A', fontSize: 11, fontWeight: '600' },
  hint: { color: '#64748B', fontSize: 11, marginBottom: 8 },

  // Map
  mapContainer: { height: 200, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
  map: { flex: 1 },
  mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  mapOverlayText: { color: '#0F172A', marginTop: 8, fontSize: 12, fontWeight: '500' },

  // Map placeholder
  mapPlaceholder: { height: 80, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8 },
  mapPlaceholderText: { color: '#64748B', fontSize: 13 },

  // Coords
  distText: { color: '#64748B', fontSize: 11, marginBottom: 8, fontStyle: 'italic' },

  // Address input
  addressInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 14, height: 48, color: '#0F172A', fontSize: 14 },
  errorText: { color: '#ef4444', fontSize: 11, marginTop: 6 },
});
