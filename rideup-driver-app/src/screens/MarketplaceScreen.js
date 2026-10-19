import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import DropdownSelect from '../components/DropdownSelect';

const COLORS = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  primary: '#0ea5e9',
  primaryDark: '#0284c7',
  primaryLight: '#E0F2FE',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  success: '#10b981',
  warning: '#F59E0B',
  error: '#EF4444',
  chipBg: '#F1F5F9',
};

export default function MarketplaceScreen({ navigation, route }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Provinces & Manual Filter
  const [provinces, setProvinces] = useState([]);
  const [startProvinceId, setStartProvinceId] = useState('');
  const [endProvinceId, setEndProvinceId] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);

  // Operating Provinces (Tỉnh hoạt động của tài xế)
  const [operatingProvinceIds, setOperatingProvinceIds] = useState([]);
  const [isOperatingModalVisible, setIsOperatingModalVisible] = useState(false);
  const [tempOperatingIds, setTempOperatingIds] = useState([]);
  const [provinceSearchQuery, setProvinceSearchQuery] = useState('');
  const [isSavingProvinces, setIsSavingProvinces] = useState(false);

  // Invitation Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [myTrips, setMyTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [quickMessage, setQuickMessage] = useState('Xe trống, sẵn sàng đón ngay!');
  const [isSending, setIsSending] = useState(false);

  // 0. Xử lý khi được điều hướng từ Thông báo với targetRequestId hoặc tuyến đường cụ thể
  useEffect(() => {
    const targetId = route?.params?.targetRequestId;
    const navStartId = route?.params?.startProvinceId;
    const navEndId = route?.params?.endProvinceId;

    if (!targetId && !navStartId && !navEndId) return;

    const handleTargetNavigation = async () => {
      try {
        setLoading(true);
        const [loadedTrips] = await Promise.all([
          fetchMyStartedTrips(),
          fetchProvinces(),
        ]);

        if (targetId) {
          const res = await apiService.getTripRequestById(targetId);
          const data = res.data?.result || res.data;
          if (data && data.id) {
            const startId = String(data.startProvinceId || navStartId || '');
            const endId = String(data.endProvinceId || navEndId || '');
            if (startId) setStartProvinceId(startId);
            if (endId) setEndProvinceId(endId);

            if (startId && endId) {
              await loadRequests(startId, endId);
            }

            if (data.status === 'OPEN') {
              setSelectedRequest(data);
              if (loadedTrips && loadedTrips.length > 0) {
                setSelectedTripId(loadedTrips[0].id);
              }
            } else {
              let msg = 'Yêu cầu này không còn mở.';
              if (data.status === 'ACCEPTED') msg = 'Yêu cầu này đã được tài xế khác nhận chỗ.';
              else if (data.status === 'EXPIRED') msg = 'Yêu cầu này đã hết hạn.';
              else if (data.status === 'CANCELLED') msg = 'Khách hàng đã hủy yêu cầu này.';
              Alert.alert('Nhu cầu không khả dụng', msg);
            }
          }
        } else if (navStartId && navEndId) {
          setStartProvinceId(String(navStartId));
          setEndProvinceId(String(navEndId));
          await loadRequests(String(navStartId), String(navEndId));
        }
      } catch (err) {
        console.warn('Lỗi khi lấy chi tiết yêu cầu từ thông báo:', err);
        // Fallback: nếu không lấy được theo ID thì thử tải theo tuyến
        if (navStartId && navEndId) {
          setStartProvinceId(String(navStartId));
          setEndProvinceId(String(navEndId));
          await loadRequests(String(navStartId), String(navEndId));
        } else {
          Alert.alert('Thông báo', 'Không thể tìm thấy yêu cầu di chuyển này hoặc đã hết hạn.');
        }
      } finally {
        setLoading(false);
        if (navigation?.setParams) {
          navigation.setParams({ targetRequestId: undefined, startProvinceId: undefined, endProvinceId: undefined });
        }
      }
    };

    handleTargetNavigation();
  }, [route?.params?.targetRequestId, route?.params?.startProvinceId, route?.params?.endProvinceId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const loadedProvinces = await fetchProvinces();
        const profileIds = await fetchDriverProfile();
        await fetchMyStartedTrips();

        // Tự động gán tuyến mặc định nếu tài xế có đăng ký tỉnh hoạt động và không có targetRequestId / tuyến từ thông báo
        if (!route?.params?.targetRequestId && !route?.params?.startProvinceId) {
          let initialStart = '';
          let initialEnd = '';
          if (profileIds && profileIds.length >= 2) {
            initialStart = profileIds[0];
            initialEnd = profileIds[1];
            setStartProvinceId(initialStart);
            setEndProvinceId(initialEnd);
            await loadRequests(initialStart, initialEnd);
          } else if (profileIds && profileIds.length === 1 && loadedProvinces.length > 1) {
            initialStart = profileIds[0];
            setStartProvinceId(initialStart);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // 1. Lấy danh sách 63 tỉnh thành từ location-service
  const fetchProvinces = async () => {
    try {
      const res = await apiService.getAllProvinces();
      if (res.data.code === 1000 && Array.isArray(res.data.result)) {
        const list = res.data.result.map((p) => ({
          id: String(p.id),
          name: p.name,
          code: p.code,
        }));
        setProvinces(list);
        return list;
      }
    } catch (e) {
      console.warn('Cannot fetch provinces from location-service:', e);
    }
    return [];
  };

  // 2. Lấy hồ sơ tài xế (danh sách tỉnh hoạt động)
  const fetchDriverProfile = async () => {
    try {
      const res = await apiService.getMyDriverProfile();
      if (res.data.code === 1000 && res.data.result?.operatingProvinceIds) {
        const ids = res.data.result.operatingProvinceIds.map(String);
        setOperatingProvinceIds(ids);
        return ids;
      }
    } catch (e) {
      console.warn('Cannot fetch driver profile', e);
    }
    return [];
  };

  // 3. Lấy các chuyến xe đang mở/chạy của tài xế để mời khách
  const fetchMyStartedTrips = async () => {
    try {
      const res = await apiService.getDriverTrips({ page: 0, size: 50 });
      if (res.data.code === 1000) {
        const rawTrips = res.data.result;
        const trips = Array.isArray(rawTrips) ? rawTrips : rawTrips?.content || [];
        // Lấy các chuyến xe đang mở hoặc đang chạy của tài xế
        const availableTrips = trips.filter((t) => t.status === 'STARTED' || t.status === 'OPEN' || t.status === 'FULL');
        const mapped = availableTrips.map((t) => {
          const sName = t.startAddressText || getProvinceName(t.startProvinceId) || 'Điểm đi';
          const eName = t.endAddressText || getProvinceName(t.endProvinceId) || 'Điểm đến';
          const depTime = t.departureTime
            ? new Date(t.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
            : '';
          return {
            id: t.id,
            name: `${sName} ➔ ${eName} (${Number(t.priceVnd || 0).toLocaleString('vi-VN')} đ/vé - Còn ${t.seatAvailable || 0} chỗ${depTime ? ` - ${depTime}` : ''})`,
            priceVnd: t.priceVnd,
            departureTime: t.departureTime,
            seatAvailable: t.seatAvailable,
            startProvinceId: String(t.startProvinceId || ''),
            endProvinceId: String(t.endProvinceId || ''),
          };
        });
        setMyTrips(mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('Cannot fetch driver trips', e);
    }
    return [];
  };

  // 4. Gọi API thật từ trip-service: /api/trip/trip-requests/marketplace
  const loadRequests = async (startId = startProvinceId, endId = endProvinceId) => {
    if (!startId || !endId) {
      setRequests([]);
      return;
    }
    setLoading(true);
    try {
      const params = {
        startProvinceId: startId,
        endProvinceId: endId,
        page: 0,
        size: 50,
      };
      const res = await apiService.getMarketplaceTripRequests(params);
      const rawContent = res.data?.result?.content || res.data?.result;
      if (res.data?.code === 1000 && Array.isArray(rawContent)) {
        setRequests(rawContent);
      } else {
        setRequests([]);
      }
    } catch (e) {
      console.warn('Fetch marketplace requests error:', e);
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMyStartedTrips();
    if (startProvinceId && endProvinceId) {
      await loadRequests(startProvinceId, endProvinceId);
    } else {
      setRefreshing(false);
    }
  };

  // Đảo chiều tuyến đường đi - về
  const handleSwapProvinces = () => {
    const newStart = endProvinceId;
    const newEnd = startProvinceId;
    setStartProvinceId(newStart);
    setEndProvinceId(newEnd);
    if (newStart && newEnd) {
      loadRequests(newStart, newEnd);
    }
  };

  // Chọn tuyến nhanh từ 1 trong các tỉnh đã đăng ký
  const handleSelectQuickRoute = (fromId, toId) => {
    setStartProvinceId(fromId);
    setEndProvinceId(toId);
    loadRequests(fromId, toId);
  };

  // Helper lấy tên tỉnh theo ID từ danh sách location-service
  const getProvinceName = (id) => {
    if (!id) return '';
    return provinces.find((p) => String(p.id) === String(id))?.name || id;
  };

  // Nhãn của Smart Location Pill trên Header
  const operatingPillLabel = useMemo(() => {
    if (operatingProvinceIds.length === 0) {
      return 'Chọn khu vực chạy +';
    }
    const names = operatingProvinceIds
      .map((id) => provinces.find((p) => String(p.id) === String(id))?.name)
      .filter(Boolean);

    if (names.length === 0) return `${operatingProvinceIds.length} tỉnh thành ▾`;
    if (names.length === 1) return `${names[0]} ▾`;
    if (names.length === 2) return `${names[0]}, ${names[1]} ▾`;
    return `${names[0]}, ${names[1]} (+${names.length - 2}) ▾`;
  }, [operatingProvinceIds, provinces]);

  // Mở modal cài đặt tỉnh hoạt động
  const handleOpenOperatingModal = () => {
    setTempOperatingIds([...operatingProvinceIds]);
    setProvinceSearchQuery('');
    setIsOperatingModalVisible(true);
  };

  const handleToggleProvince = (id) => {
    const strId = String(id);
    if (tempOperatingIds.includes(strId)) {
      setTempOperatingIds(tempOperatingIds.filter((item) => item !== strId));
    } else {
      if (tempOperatingIds.length >= 5) {
        Alert.alert('Giới hạn', 'Bạn chỉ có thể đăng ký tối đa 5 tỉnh thành hoạt động chính.');
        return;
      }
      setTempOperatingIds([...tempOperatingIds, strId]);
    }
  };

  const handleSaveOperatingProvinces = async () => {
    setIsSavingProvinces(true);
    try {
      const res = await apiService.updateOperatingProvinces(tempOperatingIds);
      if (res.data.code === 1000) {
        setOperatingProvinceIds([...tempOperatingIds]);
        setIsOperatingModalVisible(false);

        // Nếu chưa chọn tỉnh đi/đến, tự động set 2 tỉnh đầu tiên
        if (tempOperatingIds.length >= 2 && (!startProvinceId || !endProvinceId)) {
          setStartProvinceId(tempOperatingIds[0]);
          setEndProvinceId(tempOperatingIds[1]);
          loadRequests(tempOperatingIds[0], tempOperatingIds[1]);
        }
        Alert.alert('Thành công', 'Đã cập nhật khu vực hoạt động của bạn!');
      } else {
        Alert.alert('Lỗi', res.data.message || 'Không thể lưu khu vực hoạt động.');
      }
    } catch (e) {
      console.warn('Update operating provinces error:', e);
      Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ.');
    } finally {
      setIsSavingProvinces(false);
    }
  };

  // Mời khách
  const handleOpenInvite = (req) => {
    setSelectedRequest(req);
    // Ưu tiên chọn chuyến xe của tài xế trùng tuyến với yêu cầu của khách
    const matchingTrip = myTrips.find(
      (t) => String(t.startProvinceId) === String(req.startProvinceId) && String(t.endProvinceId) === String(req.endProvinceId)
    );
    if (matchingTrip) {
      setSelectedTripId(matchingTrip.id);
    } else if (myTrips.length > 0) {
      setSelectedTripId(myTrips[0].id);
    } else {
      setSelectedTripId('');
    }
  };

  const sendInvitation = async () => {
    if (!selectedTripId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn một chuyến xe của bạn để mời khách.');
      return;
    }
    setIsSending(true);
    try {
      const payload = {
        tripRequestId: selectedRequest.id,
        tripId: selectedTripId,
        message: quickMessage,
      };
      const res = await apiService.sendTripRequestInvitation(payload);
      if (res.data.code === 1000) {
        Alert.alert('Thành công', 'Đã gửi lời mời đến khách hàng!');
        setSelectedRequest(null);
        loadRequests();
      } else {
        Alert.alert('Lỗi', res.data.message || 'Không thể gửi lời mời.');
      }
    } catch (error) {
      Alert.alert('Lỗi', error?.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setIsSending(false);
    }
  };

  // Render thẻ yêu cầu tìm xe của khách
  const renderRequestCard = ({ item }) => {
    const passengerName = item.passenger?.fullName || item.passenger?.username || item.passengerName || 'Khách Hàng';
    const startName = item.startProvinceName || getProvinceName(item.startProvinceId) || item.startAddressText || 'Tỉnh đi';
    const endName = item.endProvinceName || getProvinceName(item.endProvinceId) || item.endAddressText || 'Tỉnh đến';
    const departureTime = item.departureTime || item.fromTime;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{passengerName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.passengerInfo}>
            <Text style={styles.passengerName}>{passengerName}</Text>
            {departureTime && (
              <Text style={styles.requestTime}>
                Cần đi: {new Date(departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })},{' '}
                {new Date(departureTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
              </Text>
            )}
          </View>
          <View style={styles.seatBadge}>
            <Ionicons name="people" size={13} color={COLORS.primary} />
            <Text style={styles.seatText}>{item.seatTotal || 1} ghế</Text>
          </View>
        </View>

        <View style={styles.routeBox}>
          <View style={styles.routePoint}>
            <Ionicons name="location" size={16} color={COLORS.primary} />
            <Text style={styles.routeText} numberOfLines={1}>
              {startName}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={14} color={COLORS.textMuted} />
          <View style={styles.routePoint}>
            <Ionicons name="flag" size={16} color={COLORS.warning} />
            <Text style={styles.routeText} numberOfLines={1}>
              {endName}
            </Text>
          </View>
        </View>

        {(item.startAddressText || item.endAddressText) && (
          <View style={styles.addressBox}>
            {item.startAddressText ? (
              <Text style={styles.addressDetailText} numberOfLines={1}>
                📍 Đón: {item.startAddressText}
              </Text>
            ) : null}
            {item.endAddressText ? (
              <Text style={styles.addressDetailText} numberOfLines={1}>
                🏁 Trả: {item.endAddressText}
              </Text>
            ) : null}
          </View>
        )}

        {item.note ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>"{item.note}"</Text>
          </View>
        ) : null}

        <View style={styles.cardFooter}>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusPillText}>Chờ tài xế báo giá</Text>
          </View>
          <TouchableOpacity style={styles.inviteBtn} onPress={() => handleOpenInvite(item)}>
            <Ionicons name="chatbubble-ellipses" size={15} color={COLORS.surface} style={{ marginRight: 6 }} />
            <Text style={styles.inviteBtnText}>BÁO GIÁ & MỜI ĐI</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ===== HEADER VỚI SMART LOCATION PILL ===== */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Chợ Khách</Text>
            <Text style={styles.headerSub}>Yêu cầu tìm xe ghép trực tiếp từ khách</Text>
          </View>

          {/* Smart Location Pill */}
          <TouchableOpacity
            style={[
              styles.locationPill,
              operatingProvinceIds.length > 0 && styles.locationPillActive,
            ]}
            onPress={handleOpenOperatingModal}
            activeOpacity={0.7}
          >
            <Ionicons
              name="location-sharp"
              size={13}
              color={operatingProvinceIds.length > 0 ? COLORS.primary : COLORS.textMuted}
            />
            <Text
              style={[
                styles.locationPillText,
                operatingProvinceIds.length > 0 && styles.locationPillTextActive,
              ]}
              numberOfLines={1}
            >
              {operatingPillLabel}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Thanh Tuyến Hoạt Động Nhanh (Nếu có >= 2 tỉnh đã đăng ký) */}
        {operatingProvinceIds.length >= 2 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRoutesScroll}>
            {operatingProvinceIds.slice(0, 4).map((fromId, i) => {
              const toId = operatingProvinceIds[(i + 1) % operatingProvinceIds.length];
              const isSelected = startProvinceId === fromId && endProvinceId === toId;
              return (
                <TouchableOpacity
                  key={`${fromId}-${toId}`}
                  style={[styles.quickRouteChip, isSelected && styles.quickRouteChipActive]}
                  onPress={() => handleSelectQuickRoute(fromId, toId)}
                >
                  <Text style={[styles.quickRouteText, isSelected && styles.quickRouteTextActive]}>
                    {getProvinceName(fromId).replace('Tỉnh ', '').replace('Thành phố ', '')} ➔{' '}
                    {getProvinceName(toId).replace('Tỉnh ', '').replace('Thành phố ', '')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Bộ Lọc Tuyến (Từ Tỉnh ➔ Đến Tỉnh theo API location-service) */}
        <View style={styles.filterSection}>
          <View style={styles.filterRow}>
            <View style={styles.filterCol}>
              <Text style={styles.filterColLabel}>TỪ TỈNH</Text>
              <DropdownSelect
                placeholder="Chọn tỉnh đi"
                value={startProvinceId}
                options={provinces}
                onSelect={(val) => {
                  setStartProvinceId(val);
                  if (val && endProvinceId) loadRequests(val, endProvinceId);
                }}
              />
            </View>

            {/* Nút đảo chiều */}
            <TouchableOpacity
              style={styles.swapBtn}
              onPress={handleSwapProvinces}
              disabled={!startProvinceId && !endProvinceId}
            >
              <Ionicons name="swap-horizontal" size={18} color={COLORS.primary} />
            </TouchableOpacity>

            <View style={styles.filterCol}>
              <Text style={styles.filterColLabel}>ĐẾN TỈNH</Text>
              <DropdownSelect
                placeholder="Chọn tỉnh đến"
                value={endProvinceId}
                options={provinces}
                onSelect={(val) => {
                  setEndProvinceId(val);
                  if (startProvinceId && val) loadRequests(startProvinceId, val);
                }}
              />
            </View>
          </View>

          {startProvinceId && endProvinceId && (
            <TouchableOpacity
              style={styles.searchActionBtn}
              onPress={() => loadRequests(startProvinceId, endProvinceId)}
            >
              <Ionicons name="search" size={15} color={COLORS.surface} style={{ marginRight: 6 }} />
              <Text style={styles.searchActionBtnText}>TÌM KHÁCH TRÊN TUYẾN NÀY</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ===== DANH SÁCH YÊU CẦU TỪ API THẬT ===== */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải khách từ hệ thống...</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRequestCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="car-outline" size={38} color={COLORS.primary} />
              </View>
              {startProvinceId && endProvinceId ? (
                <>
                  <Text style={styles.emptyTitle}>Chưa có khách đặt tuyến này</Text>
                  <Text style={styles.emptySub}>
                    Hiện tại chưa có khách nào đăng nhu cầu tìm xe từ{' '}
                    <Text style={{ fontWeight: 'bold' }}>{getProvinceName(startProvinceId)}</Text> đến{' '}
                    <Text style={{ fontWeight: 'bold' }}>{getProvinceName(endProvinceId)}</Text>.
                  </Text>
                  <TouchableOpacity style={styles.emptyActionBtn} onPress={handleSwapProvinces}>
                    <Ionicons name="swap-horizontal" size={16} color={COLORS.surface} style={{ marginRight: 6 }} />
                    <Text style={styles.emptyActionBtnText}>Tìm chiều ngược lại</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.emptyTitle}>Chọn tuyến để xem khách</Text>
                  <Text style={styles.emptySub}>
                    Vui lòng chọn Tỉnh đi và Tỉnh đến ở bộ lọc phía trên để tra cứu danh sách khách đang tìm xe ghép.
                  </Text>
                  {operatingProvinceIds.length === 0 && (
                    <TouchableOpacity style={styles.emptyActionBtn} onPress={handleOpenOperatingModal}>
                      <Ionicons name="location" size={16} color={COLORS.surface} style={{ marginRight: 6 }} />
                      <Text style={styles.emptyActionBtnText}>Cài đặt khu vực chạy</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          }
        />
      )}

      {/* ===== MODAL: BOTTOM SHEET CÀI ĐẶT TỈNH HOẠT ĐỘNG ===== */}
      <Modal
        visible={isOperatingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setIsOperatingModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoidingContainer}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setIsOperatingModalVisible(false);
            }}
          />
          <View style={styles.sheetModal}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.sheetTitle}>Khu Vực Chuyên Chạy</Text>
                <Text style={styles.sheetSub}>
                  Chọn tối đa 5 tỉnh bạn thường xuyên chạy để nhận thông báo và ghép chuyến
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setIsOperatingModalVisible(false);
                }}
                style={styles.sheetCloseBtn}
              >
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Các tỉnh đã chọn */}
            <View style={styles.selectedRow}>
              <Text style={styles.selectedCountText}>
                Đã chọn: <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>{tempOperatingIds.length}/5</Text>
              </Text>
              {tempOperatingIds.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {tempOperatingIds.map((id) => (
                    <View key={id} style={styles.selectedChip}>
                      <Text style={styles.selectedChipText}>{getProvinceName(id)}</Text>
                      <TouchableOpacity onPress={() => handleToggleProvince(id)}>
                        <Ionicons name="close-circle" size={16} color={COLORS.primary} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Tìm kiếm tỉnh */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm nhanh tỉnh thành..."
                placeholderTextColor={COLORS.textMuted}
                value={provinceSearchQuery}
                onChangeText={setProvinceSearchQuery}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              {provinceSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setProvinceSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Danh sách 63 tỉnh từ location-service */}
            <FlatList
              data={provinces.filter((p) =>
                p.name.toLowerCase().includes(provinceSearchQuery.toLowerCase())
              )}
              keyExtractor={(item) => String(item.id)}
              style={styles.provinceList}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              renderItem={({ item }) => {
                const isChecked = tempOperatingIds.includes(String(item.id));
                return (
                  <TouchableOpacity
                    style={[styles.provinceItem, isChecked && styles.provinceItemChecked]}
                    onPress={() => handleToggleProvince(item.id)}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        styles.provinceName,
                        isChecked && { color: COLORS.primary, fontWeight: '700' },
                      ]}
                    >
                      {item.name}
                    </Text>
                    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                      {isChecked && <Ionicons name="checkmark" size={14} color={COLORS.surface} />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              style={[styles.saveBtn, isSavingProvinces && { opacity: 0.7 }]}
              onPress={() => {
                Keyboard.dismiss();
                handleSaveOperatingProvinces();
              }}
              disabled={isSavingProvinces}
            >
              {isSavingProvinces ? (
                <ActivityIndicator color={COLORS.surface} />
              ) : (
                <Text style={styles.saveBtnText}>
                  LƯU KHU VỰC ({tempOperatingIds.length}/5 TỈNH)
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== MODAL: BÁO GIÁ & MỜI KHÁCH ĐI XE ===== */}
      <Modal visible={!!selectedRequest} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Báo Giá & Mời Khách</Text>
              <TouchableOpacity onPress={() => setSelectedRequest(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Gửi lời mời và báo giá tới khách{' '}
              <Text style={{ fontWeight: 'bold' }}>
                {selectedRequest?.passenger?.fullName || selectedRequest?.passenger?.username || selectedRequest?.passengerName || 'Khách Hàng'}
              </Text>
            </Text>

            {/* Chi tiết thông tin yêu cầu của khách */}
            <View style={styles.requestSummaryCard}>
              <View style={styles.requestSummaryRow}>
                <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                <Text style={styles.requestSummaryRoute} numberOfLines={2}>
                  {selectedRequest?.startAddressText ? `${selectedRequest.startAddressText}, ` : ''}{getProvinceName(selectedRequest?.startProvinceId)} ➔ {selectedRequest?.endAddressText ? `${selectedRequest.endAddressText}, ` : ''}{getProvinceName(selectedRequest?.endProvinceId)}
                </Text>
              </View>
              <View style={styles.requestSummaryDetails}>
                <View style={styles.requestSummaryBadge}>
                  <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
                  <Text style={styles.requestSummaryBadgeText}>
                    {selectedRequest?.departureTime ? new Date(selectedRequest.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : 'Giờ linh hoạt'}
                  </Text>
                </View>
                <View style={styles.requestSummaryBadge}>
                  <Ionicons name="people-outline" size={13} color={COLORS.textMuted} />
                  <Text style={styles.requestSummaryBadgeText}>
                    Cần {selectedRequest?.seatTotal || 1} ghế
                  </Text>
                </View>
              </View>
              {!!selectedRequest?.note && (
                <Text style={styles.requestSummaryNote} numberOfLines={2}>
                  💬 "{selectedRequest.note}"
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Chọn chuyến xe của bạn để báo giá:</Text>
              <DropdownSelect
                label="Chuyến xe"
                placeholder="Chọn chuyến xe đang mở/chạy"
                value={selectedTripId}
                options={myTrips}
                onSelect={setSelectedTripId}
              />
              {(() => {
                const selectedTrip = myTrips.find((t) => String(t.id) === String(selectedTripId));
                if (!selectedTrip) return null;
                const pricePerSeat = selectedTrip.priceVnd || 0;
                const seats = selectedRequest?.seatTotal || 1;
                const totalEstimated = pricePerSeat * seats;
                return (
                  <View style={styles.quoteBox}>
                    <View style={styles.quoteRow}>
                      <Text style={styles.quoteLabel}>Giá vé chuyến của bạn:</Text>
                      <Text style={styles.quotePrice}>
                        {Number(pricePerSeat).toLocaleString('vi-VN')} đ/ghế
                      </Text>
                    </View>
                    <View style={styles.quoteRow}>
                      <Text style={styles.quoteSub}>Tổng tiền báo khách ({seats} ghế):</Text>
                      <Text style={styles.quoteTotal}>
                        {Number(totalEstimated).toLocaleString('vi-VN')} đ
                      </Text>
                    </View>
                  </View>
                );
              })()}
              {myTrips.length === 0 && (
                <View style={{ marginTop: 8, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 10, borderWidth: 1, borderColor: '#FCA5A5' }}>
                  <Text style={{ color: COLORS.error, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
                    Bạn chưa có chuyến xe nào đang mở. Hãy tạo chuyến xe trước để mời khách.
                  </Text>
                  <TouchableOpacity 
                    style={{ backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, alignSelf: 'flex-start' }}
                    onPress={() => {
                      setSelectedRequest(null);
                      navigation.navigate('CreateTrip');
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>+ Tạo Chuyến Mới</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gửi tin nhắn nhanh:</Text>
              <View style={styles.chipRow}>
                {['Xe trống, đón ngay!', 'Tiện đường giá tốt', 'Xe 7 chỗ êm ái'].map((msg, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.chip, quickMessage === msg && styles.chipActive]}
                    onPress={() => setQuickMessage(msg)}
                  >
                    <Text style={[styles.chipText, quickMessage === msg && styles.chipTextActive]}>
                      {msg}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, (!selectedTripId || isSending) && { opacity: 0.7 }]}
              onPress={sendInvitation}
              disabled={!selectedTripId || isSending}
            >
              {isSending ? (
                <ActivityIndicator color={COLORS.surface} />
              ) : (
                <Text style={styles.confirmBtnText}>GỬI BÁO GIÁ ĐẾN KHÁCH</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header & Smart Location Pill
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },

  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.chipBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
    maxWidth: 165,
  },
  locationPillActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  locationPillText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  locationPillTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '700',
  },

  // Quick routes chips
  quickRoutesScroll: {
    marginVertical: 6,
  },
  quickRouteChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: COLORS.chipBg,
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickRouteChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  quickRouteText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  quickRouteTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '700',
  },

  // Filter Section
  filterSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  filterCol: {
    flex: 1,
  },
  filterColLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  swapBtn: {
    width: 38,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchActionBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  searchActionBtnText: {
    color: COLORS.surface,
    fontWeight: '800',
    fontSize: 12,
  },

  // List & Cards
  listContent: {
    padding: 14,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  passengerInfo: { flex: 1 },
  passengerName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  requestTime: { fontSize: 12, color: COLORS.primary, marginTop: 1, fontWeight: '600' },
  seatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  seatText: { fontSize: 11, fontWeight: 'bold', color: COLORS.primary },

  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  routeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },

  addressBox: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    gap: 3,
  },
  addressDetailText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },

  noteBox: {
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  noteText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.warning,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  quoteBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  quoteLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  quotePrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
  },
  quoteSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  quoteTotal: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.success,
  },
  inviteBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  inviteBtnText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 13,
  },

  // Empty State
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  emptyActionBtnText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 13,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textMuted,
  },

  // Sheet Modal (Khu vực hoạt động)
  keyboardAvoidingContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalBackdrop: {
    flex: 1,
  },
  sheetModal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '88%',
  },
  provinceList: {
    maxHeight: 250,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  sheetSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sheetCloseBtn: {
    padding: 4,
  },

  selectedRow: {
    marginBottom: 10,
  },
  selectedCountText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginRight: 6,
  },
  selectedChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.chipBg,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 6,
    fontSize: 13,
    color: COLORS.text,
  },

  provinceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  provinceItemChecked: {
    backgroundColor: '#F0F9FF',
  },
  provinceName: {
    fontSize: 14,
    color: COLORS.text,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  saveBtnText: {
    color: COLORS.surface,
    fontWeight: '800',
    fontSize: 14,
  },

  // Modal Gửi lời mời
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalSub: { fontSize: 13, color: COLORS.textMuted, marginBottom: 18 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.chipBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  chipText: { fontSize: 12, color: COLORS.textMuted },
  chipTextActive: { color: COLORS.primaryDark, fontWeight: '600' },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmBtnText: { color: COLORS.surface, fontWeight: '800', fontSize: 14 },
  requestSummaryCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  requestSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requestSummaryRoute: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  requestSummaryDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  requestSummaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  requestSummaryBadgeText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  requestSummaryNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: 6,
  },
});
