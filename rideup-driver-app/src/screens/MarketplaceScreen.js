import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

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
  const [filteredTripsForInvite, setFilteredTripsForInvite] = useState([]);

  // Cache tên phường/xã theo wardId để hiển thị trên thẻ yêu cầu và chuyến xe
  const wardNameCacheRef = useRef({});
  const [wardNameCache, setWardNameCache] = useState({});

  const resolveWardIds = useCallback(async (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    const missing = ids.filter((id) => id && !wardNameCacheRef.current[String(id)]);
    if (missing.length === 0) return;

    const uniqueMissing = [...new Set(missing.map(String))];
    const entries = {};
    await Promise.allSettled(
      uniqueMissing.map(async (wId) => {
        try {
          const res = await apiService.getWardById(wId);
          const ward = res?.data?.result || res?.data;
          if (ward?.name) entries[wId] = ward.name;
        } catch (e) { /* ignore */ }
      })
    );
    if (Object.keys(entries).length > 0) {
      wardNameCacheRef.current = { ...wardNameCacheRef.current, ...entries };
      setWardNameCache((prev) => ({ ...prev, ...entries }));
    }
  }, []);

  // Resolve ward names khi requests hoặc myTrips thay đổi
  useEffect(() => {
    const wardIds = [];
    requests.forEach((r) => {
      if (r.startWardId) wardIds.push(r.startWardId);
      if (r.endWardId) wardIds.push(r.endWardId);
    });
    myTrips.forEach((t) => {
      (t.stops || []).forEach((s) => {
        if (s.wardId) wardIds.push(s.wardId);
      });
    });
    if (wardIds.length > 0) {
      resolveWardIds(wardIds);
    }
  }, [requests, myTrips, resolveWardIds]);

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
              await loadRequests(0, startId, endId);
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
          await loadRequests(0, String(navStartId), String(navEndId));
        }
      } catch (err) {
        console.warn('Lỗi khi lấy chi tiết yêu cầu từ thông báo:', err);
        // Fallback: nếu không lấy được theo ID thì thử tải theo tuyến
        if (navStartId && navEndId) {
          setStartProvinceId(String(navStartId));
          setEndProvinceId(String(navEndId));
          await loadRequests(0, String(navStartId), String(navEndId));
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

  useFocusEffect(
    useCallback(() => {
      // Khi tài xế vào màn hình Chợ Khách, tự động nạp danh sách tỉnh nếu chưa có
      if (provinces.length === 0) {
        fetchProvinces();
      }
    }, [provinces.length])
  );

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchProvinces(),
          fetchDriverProfile(),
          fetchMyStartedTrips(),
        ]);

        // Tự động tìm tất cả các chuyến ngay khi vào màn hình chợ
        if (!route?.params?.targetRequestId && !route?.params?.startProvinceId) {
          await loadRequests(0, '', '');
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // 1. Lấy danh sách 63 tỉnh thành từ location-service (có lưu cache cục bộ)
  const fetchProvinces = async () => {
    try {
      const res = await apiService.getAllProvinces();
      const rawList = res?.data?.result || res?.data;
      if (Array.isArray(rawList) && rawList.length > 0) {
        const list = rawList.map((p) => ({
          id: String(p.id),
          name: p.name,
          code: p.code,
        }));
        setProvinces(list);
        await AsyncStorage.setItem('cached_provinces', JSON.stringify(list)).catch(() => { });
        return list;
      }
    } catch (e) {
      console.warn('Cannot fetch provinces from location-service:', e);
    }

    // Nếu API gặp sự cố mạng hoặc đang tải lại, khôi phục từ cache để không bao giờ hiện ID
    try {
      const cached = await AsyncStorage.getItem('cached_provinces');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProvinces(parsed);
          return parsed;
        }
      }
    } catch (_) { }

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
            startAddressText: t.startAddressText || '',
            endAddressText: t.endAddressText || '',
            vehicleBrand: t.vehicleBrand || '',
            vehicleModel: t.vehicleModel || '',
            stops: t.stops || [],
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
  const loadRequests = async (page = 0, startId = startProvinceId, endId = endProvinceId) => {
    setLoading(true);
    try {
      const params = {
        page: page,
        size: 10,
      };
      if (startId) params.startProvinceId = startId;
      if (endId) params.endProvinceId = endId;

      const res = await apiService.getMarketplaceTripRequests(params);
      const resData = res.data?.result;
      const rawContent = resData?.content || (Array.isArray(resData) ? resData : []);

      if (res.data?.code === 1000 && Array.isArray(rawContent)) {
        setRequests(rawContent);
        setCurrentPage(resData?.number !== undefined ? resData.number : page);
        setTotalPages(resData?.totalPages !== undefined ? resData.totalPages : 1);
        setTotalElements(resData?.totalElements !== undefined ? resData.totalElements : rawContent.length);
      } else {
        setRequests([]);
        setCurrentPage(0);
        setTotalPages(1);
        setTotalElements(0);
      }
    } catch (e) {
      console.warn('Fetch marketplace requests error:', e);
      setRequests([]);
      setCurrentPage(0);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchProvinces(),
      fetchMyStartedTrips(),
      fetchDriverProfile(),
    ]);
    await loadRequests(0, startProvinceId, endProvinceId);
  };

  // Đảo chiều tuyến đường đi - về
  const handleSwapProvinces = () => {
    const newStart = endProvinceId;
    const newEnd = startProvinceId;
    setStartProvinceId(newStart);
    setEndProvinceId(newEnd);
    loadRequests(0, newStart, newEnd);
  };

  // Chọn tuyến nhanh từ 1 trong các tỉnh đã đăng ký
  const handleSelectQuickRoute = (fromId, toId) => {
    setStartProvinceId(fromId);
    setEndProvinceId(toId);
    loadRequests(0, fromId, toId);
  };

  // Helper lấy tên tỉnh theo ID từ danh sách location-service
  const getProvinceName = (id) => {
    if (!id) return '';
    const match = provinces.find((p) => String(p.id) === String(id));
    if (match) return match.name;
    if (typeof id === 'string' && id.length > 20) {
      return 'Đang tải tỉnh...';
    }
    return id;
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
    if (provinces.length === 0) {
      fetchProvinces();
    }
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

  // Kiểm tra chuyến xe có trùng tuyến và phủ trúng điểm đón/trả của yêu cầu không
  const checkTripMatchesRequest = (trip, req) => {
    if (!trip || !req) return false;

    // 1. Chuyến xe phải còn đủ số ghế khách yêu cầu
    const reqSeats = Number(req.seatTotal || 1);
    const availableSeats = Number(trip.seatAvailable || 0);
    if (availableSeats < reqSeats) return false;

    // 2. Tuyến tỉnh/thành: Tỉnh đi và tỉnh đến phải trùng khớp
    const reqStartProv = String(req.startProvinceId || '').trim();
    const reqEndProv = String(req.endProvinceId || '').trim();
    const tripStartProv = String(trip.startProvinceId || '').trim();
    const tripEndProv = String(trip.endProvinceId || '').trim();

    if (reqStartProv && tripStartProv && reqStartProv !== tripStartProv) return false;
    if (reqEndProv && tripEndProv && reqEndProv !== tripEndProv) return false;

    const stops = Array.isArray(trip.stops) ? trip.stops : [];
    const pickupStops = stops.filter(s => s.stopType === 'PICKUP');
    const dropoffStops = stops.filter(s => s.stopType === 'DROPOFF');

    // 3. Phủ điểm đón tới cấp phường/xã của yêu cầu
    const reqStartWard = String(req.startWardId || '').trim();
    if (reqStartWard) {
      if (pickupStops.length > 0) {
        const hasWard = pickupStops.some(s => String(s.wardId || '').trim() === reqStartWard);
        if (!hasWard) return false;
      } else if (stops.length > 0) {
        const hasWard = stops.some(s => String(s.wardId || '').trim() === reqStartWard);
        if (!hasWard) return false;
      }
    }

    // 4. Phủ điểm trả tới cấp phường/xã của yêu cầu
    const reqEndWard = String(req.endWardId || '').trim();
    if (reqEndWard) {
      if (dropoffStops.length > 0) {
        const hasWard = dropoffStops.some(s => String(s.wardId || '').trim() === reqEndWard);
        if (!hasWard) return false;
      } else if (stops.length > 0) {
        const hasWard = stops.some(s => String(s.wardId || '').trim() === reqEndWard);
        if (!hasWard) return false;
      }
    }

    return true;
  };

  // Mở modal mời khách — CHỈ hiển thị chuyến xe hợp lệ trùng với yêu cầu khách
  const handleOpenInvite = async (req) => {
    setSelectedRequest(req);

    let trips = myTrips;
    if (!trips || trips.length === 0) {
      trips = await fetchMyStartedTrips();
    }

    // Lọc chuẩn xác: CHỈ giữ lại các chuyến xe trùng tuyến, phủ trúng đón/trả và đủ ghế
    const compatibleTrips = (trips || []).filter((t) => checkTripMatchesRequest(t, req));

    setFilteredTripsForInvite(compatibleTrips);

    if (compatibleTrips.length > 0) {
      setSelectedTripId(compatibleTrips[0].id);
    } else {
      setSelectedTripId('');
    }

    // Nạp tên phường/xã cho yêu cầu và tất cả các điểm dừng của chuyến phù hợp
    const wardIdsToFetch = [];
    if (req?.startWardId) wardIdsToFetch.push(req.startWardId);
    if (req?.endWardId) wardIdsToFetch.push(req.endWardId);
    compatibleTrips.forEach((t) => {
      (t.stops || []).forEach((s) => {
        if (s.wardId) wardIdsToFetch.push(s.wardId);
      });
    });
    if (wardIdsToFetch.length > 0) {
      resolveWardIds(wardIdsToFetch);
    }
  };

  const sendInvitation = async () => {
    if (!selectedTripId) {
      Alert.alert('Chưa chọn chuyến', 'Vui lòng chọn một chuyến xe phù hợp của bạn để gửi lời mời.');
      return;
    }
    const matchingTrip = filteredTripsForInvite.find((t) => String(t.id) === String(selectedTripId));
    if (!matchingTrip) {
      Alert.alert('Chuyến không phù hợp', 'Chuyến xe đã chọn không bao trọn điểm đón/trả của khách hàng.');
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
        Alert.alert('Thành công', 'Đã gửi lời mời và báo giá đến khách hàng!');
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

        {/* Route - Hiển thị chuẩn form: Tỉnh/Thành → Phường/Xã → Chi tiết */}
        <View style={styles.routeSection}>
          {/* Điểm đón */}
          <View style={styles.routeRow}>
            <View style={styles.routeIconBox}>
              <Ionicons name="location" size={16} color={COLORS.primary} />
              <View style={styles.routeConnector} />
            </View>
            <View style={styles.routeAddressBox}>
              <Text style={styles.routeAddressText} numberOfLines={1}>
                {startName}
              </Text>
              {wardNameCache[item.startWardId] ? (
                <Text style={styles.routeWardText} numberOfLines={1}>
                  ↳ {wardNameCache[item.startWardId]}
                </Text>
              ) : null}
              {item.startAddressText ? (
                <Text style={styles.routeDetailText} numberOfLines={2}>
                  📍 {item.startAddressText}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Điểm trả */}
          <View style={styles.routeRow}>
            <View style={styles.routeIconBox}>
              <Ionicons name="flag" size={16} color={COLORS.warning} />
            </View>
            <View style={styles.routeAddressBox}>
              <Text style={styles.routeAddressText} numberOfLines={1}>
                {endName}
              </Text>
              {wardNameCache[item.endWardId] ? (
                <Text style={styles.routeWardText} numberOfLines={1}>
                  ↳ {wardNameCache[item.endWardId]}
                </Text>
              ) : null}
              {item.endAddressText ? (
                <Text style={styles.routeDetailText} numberOfLines={2}>
                  🏁 {item.endAddressText}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

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

  const renderPagination = () => {
    if (requests.length === 0) return null;
    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.pageBtn, currentPage === 0 && styles.pageBtnDisabled]}
          disabled={currentPage === 0 || loading}
          onPress={() => loadRequests(currentPage - 1, startProvinceId, endProvinceId)}
        >
          <Ionicons name="chevron-back" size={18} color={currentPage === 0 ? COLORS.textMuted : COLORS.primary} />
          <Text style={[styles.pageBtnText, currentPage === 0 && styles.pageBtnTextDisabled]}>Trước</Text>
        </TouchableOpacity>

        <View style={styles.pageInfoBadge}>
          <Text style={styles.pageInfoText}>
            Trang {currentPage + 1} / {Math.max(1, totalPages)}
          </Text>
          <Text style={styles.pageTotalElementsText}>({totalElements} khách)</Text>
        </View>

        <TouchableOpacity
          style={[styles.pageBtn, currentPage >= totalPages - 1 && styles.pageBtnDisabled]}
          disabled={currentPage >= totalPages - 1 || loading}
          onPress={() => loadRequests(currentPage + 1, startProvinceId, endProvinceId)}
        >
          <Text style={[styles.pageBtnText, currentPage >= totalPages - 1 && styles.pageBtnTextDisabled]}>Sau</Text>
          <Ionicons name="chevron-forward" size={18} color={currentPage >= totalPages - 1 ? COLORS.textMuted : COLORS.primary} />
        </TouchableOpacity>
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
                placeholder="Tất cả tỉnh đi"
                value={startProvinceId}
                options={provinces}
                onSelect={(val) => {
                  setStartProvinceId(val);
                  loadRequests(0, val, endProvinceId);
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
                placeholder="Tất cả tỉnh đến"
                value={endProvinceId}
                options={provinces}
                onSelect={(val) => {
                  setEndProvinceId(val);
                  loadRequests(0, startProvinceId, val);
                }}
              />
            </View>
          </View>

          {(startProvinceId || endProvinceId) ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.searchActionBtn, { flex: 2, marginTop: 0 }]}
                onPress={() => loadRequests(0, startProvinceId, endProvinceId)}
              >
                <Ionicons name="search" size={15} color={COLORS.surface} style={{ marginRight: 6 }} />
                <Text style={styles.searchActionBtnText}>LỌC THEO TUYẾN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.searchActionBtn, { flex: 1, marginTop: 0, backgroundColor: '#64748B' }]}
                onPress={() => {
                  setStartProvinceId('');
                  setEndProvinceId('');
                  loadRequests(0, '', '');
                }}
              >
                <Ionicons name="refresh" size={15} color={COLORS.surface} style={{ marginRight: 6 }} />
                <Text style={styles.searchActionBtnText}>XÓA LỌC</Text>
              </TouchableOpacity>
            </View>
          ) : null}
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
          ListFooterComponent={renderPagination}
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
              {startProvinceId || endProvinceId ? (
                <>
                  <Text style={styles.emptyTitle}>Chưa có khách đặt tuyến này</Text>
                  <Text style={styles.emptySub}>
                    Hiện tại chưa có khách nào đăng nhu cầu tìm xe phù hợp với bộ lọc đã chọn.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    {startProvinceId && endProvinceId && (
                      <TouchableOpacity style={styles.emptyActionBtn} onPress={handleSwapProvinces}>
                        <Ionicons name="swap-horizontal" size={16} color={COLORS.surface} style={{ marginRight: 6 }} />
                        <Text style={styles.emptyActionBtnText}>Đảo chiều</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.emptyActionBtn, { backgroundColor: COLORS.primary }]}
                      onPress={() => {
                        setStartProvinceId('');
                        setEndProvinceId('');
                        loadRequests(0, '', '');
                      }}
                    >
                      <Ionicons name="apps-outline" size={16} color={COLORS.surface} style={{ marginRight: 6 }} />
                      <Text style={styles.emptyActionBtnText}>Xem tất cả các chuyến</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.emptyTitle}>Hiện chưa có yêu cầu nào</Text>
                  <Text style={styles.emptySub}>
                    Chưa có khách hàng nào phát tín hiệu tìm xe trên hệ thống lúc này. Hãy vuốt xuống để tải lại.
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
            {/* Header */}
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Báo Giá & Mời Khách</Text>
                <Text style={styles.modalSub}>
                  Khách hàng:{' '}
                  <Text style={{ fontWeight: 'bold', color: COLORS.text }}>
                    {selectedRequest?.passenger?.fullName || selectedRequest?.passenger?.username || selectedRequest?.passengerName || 'Khách Hàng'}
                  </Text>
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedRequest(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={26} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
              style={{ maxHeight: 520 }}
            >
              {/* 1. Chi tiết thông tin yêu cầu của khách (Chuẩn form Tỉnh -> Phường -> Chi tiết) */}
              <View style={styles.reqSummaryCard}>
                <View style={styles.reqSummaryTopRow}>
                  <View style={styles.reqBadgeRow}>
                    <View style={styles.reqBadge}>
                      <Ionicons name="people" size={13} color={COLORS.primary} />
                      <Text style={styles.reqBadgeText}>Cần {selectedRequest?.seatTotal || 1} ghế</Text>
                    </View>
                    <View style={styles.reqBadge}>
                      <Ionicons name="time" size={13} color="#F59E0B" />
                      <Text style={styles.reqBadgeText}>
                        {selectedRequest?.departureTime
                          ? new Date(selectedRequest.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ', ' +
                          new Date(selectedRequest.departureTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                          : 'Giờ linh hoạt'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Tuyến đường của khách */}
                <View style={styles.reqRouteBox}>
                  {/* Điểm đón */}
                  <View style={styles.reqRouteRow}>
                    <View style={styles.reqRouteIconBox}>
                      <Ionicons name="location" size={15} color={COLORS.primary} />
                      <View style={styles.reqRouteConnector} />
                    </View>
                    <View style={{ flex: 1, paddingLeft: 6 }}>
                      <Text style={styles.reqProvText}>
                        {getProvinceName(selectedRequest?.startProvinceId) || 'Điểm đón'}
                      </Text>
                      {wardNameCache[selectedRequest?.startWardId] ? (
                        <Text style={styles.reqWardText}>
                          ↳ {wardNameCache[selectedRequest.startWardId]}
                        </Text>
                      ) : null}
                      {selectedRequest?.startAddressText ? (
                        <Text style={styles.reqDetailText} numberOfLines={1}>
                          📍 {selectedRequest.startAddressText}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Điểm trả */}
                  <View style={[styles.reqRouteRow, { marginTop: 8 }]}>
                    <View style={styles.reqRouteIconBox}>
                      <Ionicons name="flag" size={15} color="#F59E0B" />
                    </View>
                    <View style={{ flex: 1, paddingLeft: 6 }}>
                      <Text style={styles.reqProvText}>
                        {getProvinceName(selectedRequest?.endProvinceId) || 'Điểm đến'}
                      </Text>
                      {wardNameCache[selectedRequest?.endWardId] ? (
                        <Text style={styles.reqWardText}>
                          ↳ {wardNameCache[selectedRequest.endWardId]}
                        </Text>
                      ) : null}
                      {selectedRequest?.endAddressText ? (
                        <Text style={styles.reqDetailText} numberOfLines={1}>
                          🏁 {selectedRequest.endAddressText}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>

                {selectedRequest?.note ? (
                  <View style={styles.reqNoteBox}>
                    <Text style={styles.reqNoteText}>💬 "{selectedRequest.note}"</Text>
                  </View>
                ) : null}
              </View>

              {/* 2. Danh sách chuyến xe phù hợp để mời */}
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.inputLabel}>
                    Chuyến xe phù hợp của bạn ({filteredTripsForInvite.length}):
                  </Text>
                  {filteredTripsForInvite.length > 0 && (
                    <Text style={{ fontSize: 11, color: COLORS.success, fontWeight: '700' }}>
                      ✓ Trùng tuyến với khách
                    </Text>
                  )}
                </View>

                {filteredTripsForInvite.length > 0 ? (
                  <View style={styles.tripCardList}>
                    {filteredTripsForInvite.map((trip) => {
                      const isSelected = String(trip.id) === String(selectedTripId);
                      const depTimeStr = trip.departureTime
                        ? new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' • ' +
                        new Date(trip.departureTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                        : 'Linh hoạt';
                      const startProvName = getProvinceName(trip.startProvinceId) || trip.startAddressText || 'Điểm đi';
                      const endProvName = getProvinceName(trip.endProvinceId) || trip.endAddressText || 'Điểm đến';

                      const stops = Array.isArray(trip.stops) ? trip.stops : [];
                      const pickupStops = stops.filter((s) => s.stopType === 'PICKUP');
                      const dropoffStops = stops.filter((s) => s.stopType === 'DROPOFF');

                      // Deduplicate and resolve ward names for pickup
                      const pickupWards = [];
                      const seenP = new Set();
                      (pickupStops.length > 0 ? pickupStops : stops).forEach((s) => {
                        const name = s.addressText || wardNameCache[s.wardId] || '';
                        const key = String(s.wardId || name);
                        if (key && !seenP.has(key)) {
                          seenP.add(key);
                          pickupWards.push({
                            wardId: s.wardId,
                            name: name || (s.wardId ? `Phường/Xã #${s.wardId}` : 'Phường/Xã'),
                          });
                        }
                      });

                      // Deduplicate and resolve ward names for dropoff
                      const dropoffWards = [];
                      const seenD = new Set();
                      (dropoffStops.length > 0 ? dropoffStops : []).forEach((s) => {
                        const name = s.addressText || wardNameCache[s.wardId] || '';
                        const key = String(s.wardId || name);
                        if (key && !seenD.has(key)) {
                          seenD.add(key);
                          dropoffWards.push({
                            wardId: s.wardId,
                            name: name || (s.wardId ? `Phường/Xã #${s.wardId}` : 'Phường/Xã'),
                          });
                        }
                      });

                      return (
                        <TouchableOpacity
                          key={trip.id}
                          style={[styles.tripCardItem, isSelected && styles.tripCardItemActive]}
                          onPress={() => setSelectedTripId(trip.id)}
                          activeOpacity={0.88}
                        >
                          <View style={styles.tripCardItemTop}>
                            <View style={styles.tripRadioRow}>
                              <View style={[styles.tripRadioCircle, isSelected && styles.tripRadioCircleActive]}>
                                {isSelected && <View style={styles.tripRadioDot} />}
                              </View>
                              <View style={styles.tripTimePill}>
                                <Ionicons name="time-outline" size={13} color={COLORS.primaryDark} />
                                <Text style={styles.tripTimePillText}>{depTimeStr}</Text>
                              </View>
                            </View>
                            <View style={[styles.tripSeatBadge, trip.seatAvailable <= 2 ? styles.tripSeatBadgeWarn : styles.tripSeatBadgeOk]}>
                              <Ionicons name="people" size={12} color={trip.seatAvailable <= 2 ? '#D97706' : '#059669'} />
                              <Text style={[styles.tripSeatText, { color: trip.seatAvailable <= 2 ? '#D97706' : '#059669' }]}>
                                Còn {trip.seatAvailable} chỗ
                              </Text>
                            </View>
                          </View>

                          {/* Lộ trình chuyến với chi tiết Tỉnh và các Phường/Xã */}
                          <View style={styles.tripRouteContainer}>
                            {/* Điểm đón */}
                            <View style={styles.tripRouteStopRow}>
                              <View style={styles.tripRouteIconCol}>
                                <Ionicons name="radio-button-on" size={14} color={COLORS.primary} />
                                <View style={styles.tripRouteLine} />
                              </View>
                              <View style={styles.tripRouteDetailCol}>
                                <View style={styles.tripRouteHeadRow}>
                                  <Text style={styles.tripRouteProvText}>{startProvName}</Text>
                                  <View style={styles.tripTypeTagPickup}>
                                    <Text style={styles.tripTypeTagTextPickup}>Điểm đón</Text>
                                  </View>
                                </View>

                                {pickupWards.length > 0 ? (
                                  <View style={styles.tripWardsWrap}>
                                    {pickupWards.map((w, idx) => {
                                      const isMatch = selectedRequest?.startWardId && String(w.wardId) === String(selectedRequest.startWardId);
                                      return (
                                        <View
                                          key={`p-${w.wardId || idx}`}
                                          style={[styles.tripWardPill, isMatch && styles.tripWardPillMatch]}
                                        >
                                          {isMatch && <Ionicons name="checkmark-circle" size={11} color="#059669" style={{ marginRight: 3 }} />}
                                          <Text
                                            style={[styles.tripWardPillText, isMatch && styles.tripWardPillTextMatch]}
                                            numberOfLines={1}
                                          >
                                            {w.name}
                                          </Text>
                                        </View>
                                      );
                                    })}
                                  </View>
                                ) : (
                                  <Text style={styles.tripWardFallbackText} numberOfLines={1}>
                                    {trip.startAddressText && trip.startAddressText !== startProvName
                                      ? `📍 ${trip.startAddressText}`
                                      : 'Đón linh hoạt toàn tỉnh'}
                                  </Text>
                                )}
                              </View>
                            </View>

                            {/* Điểm trả */}
                            <View style={styles.tripRouteStopRow}>
                              <View style={styles.tripRouteIconCol}>
                                <Ionicons name="location" size={14} color="#EA580C" />
                              </View>
                              <View style={styles.tripRouteDetailCol}>
                                <View style={styles.tripRouteHeadRow}>
                                  <Text style={styles.tripRouteProvText}>{endProvName}</Text>
                                  <View style={styles.tripTypeTagDropoff}>
                                    <Text style={styles.tripTypeTagTextDropoff}>Điểm trả</Text>
                                  </View>
                                </View>

                                {dropoffWards.length > 0 ? (
                                  <View style={styles.tripWardsWrap}>
                                    {dropoffWards.map((w, idx) => {
                                      const isMatch = selectedRequest?.endWardId && String(w.wardId) === String(selectedRequest.endWardId);
                                      return (
                                        <View
                                          key={`d-${w.wardId || idx}`}
                                          style={[styles.tripWardPill, isMatch && styles.tripWardPillMatch]}
                                        >
                                          {isMatch && <Ionicons name="checkmark-circle" size={11} color="#059669" style={{ marginRight: 3 }} />}
                                          <Text
                                            style={[styles.tripWardPillText, isMatch && styles.tripWardPillTextMatch]}
                                            numberOfLines={1}
                                          >
                                            {w.name}
                                          </Text>
                                        </View>
                                      );
                                    })}
                                  </View>
                                ) : (
                                  <Text style={styles.tripWardFallbackText} numberOfLines={1}>
                                    {trip.endAddressText && trip.endAddressText !== endProvName
                                      ? `🏁 ${trip.endAddressText}`
                                      : 'Trả linh hoạt toàn tỉnh'}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </View>

                          {/* Giá & Xe */}
                          <View style={styles.tripCardItemBottom}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                              <Ionicons name="car-outline" size={14} color={COLORS.textMuted} />
                              <Text style={styles.tripVehicleName}>
                                {trip.vehicleBrand ? `${trip.vehicleBrand} ${trip.vehicleModel || ''}` : 'Xe của bạn'}
                              </Text>
                            </View>
                            <Text style={styles.tripPriceValue}>
                              {Number(trip.priceVnd || 0).toLocaleString('vi-VN')} đ
                              <Text style={styles.tripPriceUnit}>/ghế</Text>
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.noTripNotice}>
                    <View style={styles.noTripNoticeIcon}>
                      <Ionicons name="alert-circle-outline" size={32} color="#D97706" />
                    </View>
                    <Text style={styles.noTripNoticeTitle}>Không có chuyến xe trùng khớp</Text>
                    <Text style={styles.noTripNoticeDesc}>
                      Khách đang tìm xe từ{' '}
                      <Text style={{ fontWeight: 'bold', color: COLORS.text }}>
                        {getProvinceName(selectedRequest?.startProvinceId)}
                        {wardNameCache[selectedRequest?.startWardId] ? ` (${wardNameCache[selectedRequest.startWardId]})` : ''}
                      </Text>
                      {' '}➔{' '}
                      <Text style={{ fontWeight: 'bold', color: COLORS.text }}>
                        {getProvinceName(selectedRequest?.endProvinceId)}
                        {wardNameCache[selectedRequest?.endWardId] ? ` (${wardNameCache[selectedRequest.endWardId]})` : ''}
                      </Text>
                      {' '}với {selectedRequest?.seatTotal || 1} ghế.
                    </Text>
                    <Text style={styles.noTripNoticeSub}>
                      Bạn chưa tạo chuyến xe nào bao trọn điểm đón/trả của khách hoặc các chuyến trùng tuyến đã hết chỗ trống.
                    </Text>
                    <TouchableOpacity
                      style={styles.createMatchingTripBtn}
                      onPress={() => {
                        setSelectedRequest(null);
                        navigation.navigate('CreateTrip');
                      }}
                    >
                      <Ionicons name="add-circle" size={16} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={styles.createMatchingTripBtnText}>Tạo Chuyến Mới Tuyến Này</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* 3. Bảng báo giá chi tiết (Nếu đã chọn chuyến) */}
              {(() => {
                const selectedTrip = filteredTripsForInvite.find((t) => String(t.id) === String(selectedTripId));
                if (!selectedTrip) return null;
                const pricePerSeat = Number(selectedTrip.priceVnd || 0);
                const seats = Number(selectedRequest?.seatTotal || 1);
                const totalEstimated = pricePerSeat * seats;
                const sName = getProvinceName(selectedTrip.startProvinceId) || 'Điểm đón';
                const eName = getProvinceName(selectedTrip.endProvinceId) || 'Điểm trả';

                return (
                  <View style={styles.quoteSummaryCard}>
                    <View style={styles.quoteSummaryHeader}>
                      <Ionicons name="calculator-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.quoteSummaryTitle}>Chi tiết báo giá gửi khách</Text>
                    </View>
                    <View style={styles.quoteSummaryRow}>
                      <Text style={styles.quoteSummaryLabel}>Chuyến áp dụng:</Text>
                      <Text style={[styles.quoteSummaryVal, { color: COLORS.text, fontWeight: '700' }]}>{sName} ➔ {eName}</Text>
                    </View>
                    <View style={styles.quoteSummaryRow}>
                      <Text style={styles.quoteSummaryLabel}>Giá vé gốc chuyến:</Text>
                      <Text style={styles.quoteSummaryVal}>{pricePerSeat.toLocaleString('vi-VN')} đ/ghế</Text>
                    </View>
                    <View style={styles.quoteSummaryRow}>
                      <Text style={styles.quoteSummaryLabel}>Số ghế khách đặt:</Text>
                      <Text style={styles.quoteSummaryVal}>x {seats} ghế</Text>
                    </View>
                    <View style={styles.quoteSummaryDivider} />
                    <View style={styles.quoteSummaryRow}>
                      <Text style={styles.quoteSummaryTotalLabel}>Tổng tiền báo khách:</Text>
                      <Text style={styles.quoteSummaryTotalVal}>{totalEstimated.toLocaleString('vi-VN')} đ</Text>
                    </View>
                  </View>
                );
              })()}

              {/* 4. Tin nhắn nhanh */}
              {filteredTripsForInvite.length > 0 && (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.inputLabel}>Gửi kèm lời nhắn:</Text>
                  <View style={styles.chipRow}>
                    {['Xe trống, đón ngay!', 'Tiện đường giá tốt', 'Xe êm ái, đúng giờ', 'Đón tận nơi trả tận chỗ'].map((msg, i) => (
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
              )}
            </ScrollView>

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                (!selectedTripId || isSending || filteredTripsForInvite.length === 0) && styles.confirmBtnDisabled,
              ]}
              onPress={sendInvitation}
              disabled={!selectedTripId || isSending || filteredTripsForInvite.length === 0}
            >
              {isSending ? (
                <ActivityIndicator color={COLORS.surface} />
              ) : (
                <Text style={styles.confirmBtnText}>
                  {filteredTripsForInvite.length === 0
                    ? 'KHÔNG CÓ CHUYẾN XE PHÙ HỢP'
                    : selectedTripId
                      ? `GỬI BÁO GIÁ (${(
                        Number(filteredTripsForInvite.find((t) => String(t.id) === String(selectedTripId))?.priceVnd || 0) *
                        Number(selectedRequest?.seatTotal || 1)
                      ).toLocaleString('vi-VN')} đ)`
                      : 'VUI LÒNG CHỌN CHUYẾN XE'}
                </Text>
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

  // Structured route display (Tỉnh → Phường → Chi tiết)
  routeSection: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  routeIconBox: {
    width: 24,
    alignItems: 'center',
    paddingTop: 2,
  },
  routeConnector: {
    width: 2,
    height: 34,
    backgroundColor: '#CBD5E1',
    position: 'absolute',
    top: 20,
  },
  routeAddressBox: {
    flex: 1,
    paddingLeft: 8,
  },
  routeAddressText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 14,
  },
  routeWardText: {
    color: COLORS.primary,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  routeDetailText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 3,
    fontWeight: '500',
    lineHeight: 17,
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
  confirmBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  confirmBtnText: { color: COLORS.surface, fontWeight: '800', fontSize: 14 },

  // Summary Card of passenger's request inside modal
  reqSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reqSummaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reqBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reqBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reqBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
  reqRouteBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  reqRouteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reqRouteIconBox: {
    width: 20,
    alignItems: 'center',
    paddingTop: 2,
  },
  reqRouteConnector: {
    width: 2,
    height: 26,
    backgroundColor: '#CBD5E1',
    position: 'absolute',
    top: 18,
  },
  reqProvText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  reqWardText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  reqDetailText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  reqNoteBox: {
    marginTop: 8,
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  reqNoteText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },

  // Trip selection cards inside modal
  tripCardList: {
    gap: 10,
    marginTop: 4,
  },
  tripCardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  tripCardItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F9FF',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  tripCardItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripRadioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripRadioCircleActive: {
    borderColor: COLORS.primary,
  },
  tripRadioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: COLORS.primary,
  },
  tripTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tripTimePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  tripSeatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tripSeatBadgeOk: {
    backgroundColor: '#ECFDF5',
  },
  tripSeatBadgeWarn: {
    backgroundColor: '#FEF3C7',
  },
  tripSeatText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tripRoutePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  tripRoutePreviewPoint: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tripRoutePreviewText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  tripRouteContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tripRouteStopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tripRouteIconCol: {
    width: 20,
    alignItems: 'center',
    paddingTop: 2,
    marginRight: 8,
  },
  tripRouteLine: {
    width: 1.5,
    minHeight: 20,
    backgroundColor: '#CBD5E1',
    marginVertical: 2,
  },
  tripRouteDetailCol: {
    flex: 1,
    paddingBottom: 6,
  },
  tripRouteHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tripRouteProvText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  tripTypeTagPickup: {
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginLeft: 6,
  },
  tripTypeTagTextPickup: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  tripTypeTagDropoff: {
    backgroundColor: 'rgba(234, 88, 12, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginLeft: 6,
  },
  tripTypeTagTextDropoff: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C2410C',
  },
  tripWardsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  tripWardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tripWardPillMatch: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  tripWardPillText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
    maxWidth: 220,
  },
  tripWardPillTextMatch: {
    color: '#047857',
    fontWeight: '700',
  },
  tripWardFallbackText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: 1,
  },
  tripCardItemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripVehicleName: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  tripPriceValue: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.primary,
  },
  tripPriceUnit: {
    fontSize: 11,
    fontWeight: 'normal',
    color: COLORS.textMuted,
  },

  // Empty state when no trips match request
  noTripNotice: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 4,
  },
  noTripNoticeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  noTripNoticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 6,
  },
  noTripNoticeDesc: {
    fontSize: 12,
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 4,
  },
  noTripNoticeSub: {
    fontSize: 11,
    color: '#B45309',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  createMatchingTripBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  createMatchingTripBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Quote calculation summary card
  quoteSummaryCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  quoteSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  quoteSummaryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  quoteSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  quoteSummaryLabel: {
    fontSize: 12,
    color: '#047857',
  },
  quoteSummaryVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  quoteSummaryDivider: {
    height: 1,
    backgroundColor: '#A7F3D0',
    marginVertical: 6,
  },
  quoteSummaryTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  quoteSummaryTotalVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#047857',
  },

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

  // Pagination
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  pageBtnDisabled: {
    backgroundColor: COLORS.chipBg,
    opacity: 0.5,
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginHorizontal: 4,
  },
  pageBtnTextDisabled: {
    color: COLORS.textMuted,
  },
  pageInfoBadge: {
    alignItems: 'center',
  },
  pageInfoText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  pageTotalElementsText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
