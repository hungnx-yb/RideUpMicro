import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { apiService } from '../services/apiService';
import { NotificationContext } from '../context/NotificationContext';

const { width } = Dimensions.get('window');

const COLORS = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  primary: '#0ea5e9',
  primaryDark: '#0284c7',
  accent: '#f59e0b',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

const formatMoney = (val) => {
  if (!val && val !== 0) return '0 đ';
  return Number(val).toLocaleString('vi-VN') + ' đ';
};

const formatDate = (iso) => {
  if (!iso) return '--';
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatTime = (iso) => {
  if (!iso) return '--';
  const d = new Date(iso);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'CONFIRMED':
      return { label: 'Đã chốt xe', bg: 'rgba(16,185,129,0.12)', color: '#10B981', icon: 'checkmark-circle' };
    case 'WAITING_DRIVER_APPROVAL':
      return { label: 'Chờ tài xế duyệt', bg: 'rgba(245,158,11,0.12)', color: '#D97706', icon: 'time' };
    case 'PENDING_PAYMENT':
      return { label: 'Chờ thanh toán', bg: 'rgba(14,165,233,0.12)', color: '#0284C7', icon: 'card' };
    case 'STARTED':
      return { label: 'Đang di chuyển', bg: 'rgba(16,185,129,0.15)', color: '#059669', icon: 'car-sport' };
    case 'RESERVED':
      return { label: 'Đang giữ chỗ', bg: 'rgba(139,92,246,0.12)', color: '#7C3AED', icon: 'bookmark' };
    default:
      return { label: status || 'Đang xử lý', bg: '#F1F5F9', color: '#64748B', icon: 'ellipse' };
  }
};

const CustomerDashboardScreen = ({ navigation }) => {
  const { unreadCount } = useContext(NotificationContext);
  const [userName, setUserName] = useState('Khách hàng');
  const [avatar, setAvatar] = useState(null);
  const [greeting, setGreeting] = useState('Xin chào,');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [activeRequest, setActiveRequest] = useState(null);
  const [availableTrips, setAvailableTrips] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Chào buổi sáng,');
    else if (hour < 18) setGreeting('Chào buổi chiều,');
    else setGreeting('Chào buổi tối,');
  };

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      updateGreeting();

      // Gọi đồng thời tất cả API thực tế từ backend
      const [userRes, bookingsRes, requestsRes, provRes, tripsRes] = await Promise.all([
        apiService.getMyUserInfo().catch(() => null),
        apiService.getMyBookings().catch(() => null),
        apiService.getMyTripRequests({ size: 10, page: 0 }).catch(() => null),
        apiService.getAllProvinces().catch(() => null),
        apiService.getAllTrips({ page: 0, size: 10 }).catch(() => null),
      ]);

      // 1. Thông tin người dùng
      if (userRes?.data?.result) {
        setUserName(userRes.data.result.fullName || 'Khách hàng');
        setAvatar(userRes.data.result.avatarUrl);
      }

      // 2. Danh sách tỉnh thành
      if (provRes?.data?.result && Array.isArray(provRes.data.result)) {
        setProvinces(provRes.data.result);
      }

      // 3. Chuyến đi sắp tới (chỉ hiện chuyến tương lai, tối đa 3)
      const rawBookings = bookingsRes?.data?.result ?? (Array.isArray(bookingsRes?.data) ? bookingsRes.data : []);
      const bookingList = Array.isArray(rawBookings) ? rawBookings : [];
      
      const activeStatuses = ['STARTED', 'CONFIRMED', 'WAITING_DRIVER_APPROVAL', 'PENDING_PAYMENT', 'RESERVED'];
      const candidates = bookingList.filter(b => activeStatuses.includes(b.status));

      if (candidates.length > 0) {
        // Lấy chi tiết trip cho mỗi booking để biết departureTime
        const bookingsWithTrips = await Promise.all(
          candidates.map(async (booking) => {
            let trip = null;
            if (booking.tripId) {
              try {
                const tripRes = await apiService.getTripDetail(booking.tripId);
                if (tripRes?.data?.result) {
                  trip = tripRes.data.result;
                }
              } catch (e) {
                console.log('Error fetching trip detail for booking:', booking.id, e);
              }
            }
            return { booking, trip };
          })
        );

        // Chỉ giữ lại chuyến có departureTime trong tương lai
        const nowMs = new Date().getTime();
        const futureBookings = bookingsWithTrips.filter(({ booking, trip }) => {
          const depTime = trip?.departureTime || booking.departureTime;
          if (!depTime) return true; // Giữ lại nếu không có thông tin thời gian
          return new Date(depTime).getTime() > nowMs;
        });

        // Sắp xếp theo thời gian khởi hành gần nhất trước
        futureBookings.sort((a, b) => {
          const timeA = new Date(a.trip?.departureTime || a.booking.departureTime || a.booking.createdAt).getTime();
          const timeB = new Date(b.trip?.departureTime || b.booking.departureTime || b.booking.createdAt).getTime();
          return timeA - timeB;
        });

        // Giới hạn tối đa 3 chuyến
        setUpcomingBookings(futureBookings.slice(0, 3));
      } else {
        setUpcomingBookings([]);
      }

      // 4. Yêu cầu tìm xe đang mở trên Marketplace (Active Trip Request)
      const rawRequests = requestsRes?.data?.result?.items || requestsRes?.data?.result || [];
      const requestList = Array.isArray(rawRequests) ? rawRequests : [];
      const openReq = requestList.find(r => r.status === 'OPEN');
      setActiveRequest(openReq || null);

      // 5. Chuyến xe thực tế đang mở bán từ database (Real Trips from DB)
      const rawTrips = tripsRes?.data?.result ?? (Array.isArray(tripsRes?.data) ? tripsRes.data : []);
      const tripList = Array.isArray(rawTrips) ? rawTrips : (rawTrips?.items || []);
      const now = new Date();
      const validTrips = tripList.filter(t => {
        const status = (t.status || '').toUpperCase();
        const depTime = new Date(t.departureTime);
        return (status === 'OPEN' || status === 'FULL') && depTime > now && (t.seatAvailable || 0) > 0;
      });
      setAvailableTrips(validTrips.slice(0, 4));

    } catch (error) {
      console.log('Error fetching customer dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData(false);
    }, [fetchDashboardData])
  );

  // Lấy các tuyến thực tế từ danh sách chuyến xe trong DB (Unique Start ⇄ End)
  const realRouteChips = React.useMemo(() => {
    const map = new Map();
    availableTrips.forEach(t => {
      const key = `${t.startAddressText || ''}->${t.endAddressText || ''}`;
      if (t.startAddressText && t.endAddressText && !map.has(key)) {
        map.set(key, {
          startText: t.startAddressText,
          endText: t.endAddressText,
          startProvinceId: t.startProvinceId,
          endProvinceId: t.endProvinceId,
        });
      }
    });
    return Array.from(map.values()).slice(0, 5);
  }, [availableTrips]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboardData(true)} colors={[COLORS.primary]} />
        }
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.greetingText}>{greeting}</Text>
            <Text style={styles.nameText} numberOfLines={1}>{userName} 👋</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => navigation.navigate('Notifications')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.8}
            >
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <Text style={styles.avatarLetter}>{(userName || 'K').charAt(0).toUpperCase()}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SEARCH BAR HERO ── */}
        <View style={styles.searchHeroContainer}>
          <TouchableOpacity
            style={styles.searchHeroBar}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('SearchRide')}
          >
            <View style={styles.searchHeroIconCircle}>
              <Ionicons name="search" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.searchHeroContent}>
              <Text style={styles.searchHeroTitle}>Bạn muốn đi đâu?</Text>
              <Text style={styles.searchHeroSub}>Tìm chuyến xe ghép đón tận nơi, tiết kiệm tới 60%</Text>
            </View>
            <View style={styles.searchHeroActionPill}>
              <Text style={styles.searchHeroActionText}>Tìm xe</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFF" />
            </View>
          </TouchableOpacity>

          {/* Quick Route Suggestion Chips (Tạo tự động từ các chuyến xe thật đang mở) */}
          {realRouteChips.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickChipsScroll}
            >
              {realRouteChips.map((r, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.quickChip}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('SearchRide', {
                    startProvinceId: r.startProvinceId,
                    endProvinceId: r.endProvinceId
                  })}
                >
                  <Ionicons name="navigate-circle-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.quickChipText}>{r.startText} ⇄ {r.endText}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── 4 PHÍM TẮT DỊCH VỤ CỐT LÕI ── */}
        <View style={styles.coreActionsGrid}>
          <TouchableOpacity
            style={styles.coreActionItem}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('SearchRide')}
          >
            <View style={[styles.coreActionIconCircle, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="car-sport" size={26} color="#0284C7" />
            </View>
            <Text style={styles.coreActionLabel}>Tìm xe ghép</Text>
            <Text style={styles.coreActionSub}>Tuyến có sẵn</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.coreActionItem}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('SearchRide', { openPostRequest: true })}
          >
            <View style={[styles.coreActionIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <View style={styles.badgeNewWrap}>
                <Text style={styles.badgeNewText}>Mới</Text>
              </View>
              <Ionicons name="radio" size={26} color="#D97706" />
            </View>
            <Text style={styles.coreActionLabel}>Đăng tìm xe</Text>
            <Text style={styles.coreActionSub}>Phát tín hiệu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.coreActionItem}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('MyTrips', { initialTab: 'BOOKINGS' })}
          >
            <View style={[styles.coreActionIconCircle, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="ticket" size={26} color="#7C3AED" />
            </View>
            <Text style={styles.coreActionLabel}>Vé của tôi</Text>
            <Text style={styles.coreActionSub}>Lịch sử chuyến</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.coreActionItem}
            activeOpacity={0.8}
            onPress={() => setShowPolicyModal(true)}
          >
            <View style={[styles.coreActionIconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="shield-checkmark" size={26} color="#16A34A" />
            </View>
            <Text style={styles.coreActionLabel}>An toàn & Cọc</Text>
            <Text style={styles.coreActionSub}>Hoàn 100%</Text>
          </TouchableOpacity>
        </View>

        {/* ── ACTIVE / UPCOMING TRIP CARD ── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Chuyến đi sắp tới</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('MyTrips', { initialTab: 'BOOKINGS' })}>
              <Text style={styles.seeAllText}>Tất cả vé</Text>
            </TouchableOpacity>
          </View>

          {upcomingBookings.length > 0 ? (
            <View style={{ gap: 12 }}>
              {upcomingBookings.map(({ booking: bk, trip: tr }) => {
                const badge = getStatusBadge(bk.status);
                return (
                  <View key={bk.id} style={styles.activeBookingCard}>
                    {/* Card Header */}
                    <View style={styles.activeBookingHeader}>
                      <View style={styles.timeTag}>
                        <Ionicons name="time-outline" size={14} color={COLORS.primaryDark} />
                        <Text style={styles.timeTagText}>
                          {formatTime(tr?.departureTime || bk.createdAt)} • {formatDate(tr?.departureTime || bk.createdAt)}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Ionicons name={badge.icon} size={12} color={badge.color} style={{ marginRight: 4 }} />
                        <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                    </View>

                    {/* Route */}
                    <View style={styles.activeBookingRoute}>
                      <View style={styles.routeItem}>
                        <View style={[styles.routeDot, { backgroundColor: COLORS.primary }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.routeLabel}>ĐIỂM ĐÓN</Text>
                          <Text style={styles.routeText} numberOfLines={1}>
                            {bk.pickupAddressText || tr?.startAddressText || 'Điểm đón theo yêu cầu'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.routeConnector} />

                      <View style={styles.routeItem}>
                        <View style={[styles.routeDot, { backgroundColor: COLORS.error }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.routeLabel}>ĐIỂM ĐẾN</Text>
                          <Text style={styles.routeText} numberOfLines={1}>
                            {bk.dropoffAddressText || tr?.endAddressText || 'Điểm đến theo yêu cầu'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Meta & Actions */}
                    <View style={styles.activeBookingFooter}>
                      <View>
                        <Text style={styles.footerSubText}>{bk.seatCount || 1} ghế • Mã: {bk.bookingCode || bk.id?.slice(0, 8)}</Text>
                        <Text style={styles.footerPrice}>{formatMoney(bk.totalAmount)}</Text>
                      </View>

                      <View style={styles.footerBtnGroup}>
                        {bk.status === 'CONFIRMED' && (
                          <TouchableOpacity
                            style={styles.btnChatDriver}
                            onPress={() => navigation.navigate('BookingChat', {
                              bookingId: bk.id,
                              driverName: tr?.driverName || 'Tài xế',
                              vehicleInfo: tr?.vehiclePlateNumber || 'Xe chuyến đi',
                            })}
                          >
                            <Ionicons name="chatbubble-ellipses" size={15} color="#0284C7" />
                            <Text style={styles.btnChatDriverText}>Chat</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={styles.btnViewBooking}
                          onPress={() => navigation.navigate('BookingDetail', {
                            booking: { ...bk, trip: tr }
                          })}
                        >
                          <Text style={styles.btnViewBookingText}>Chi tiết</Text>
                          <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyBookingCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="car-outline" size={32} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>Bạn chưa có chuyến xe nào</Text>
              <Text style={styles.emptySub}>
                Tìm chuyến xe ghép liên tỉnh đón tận nơi hoặc phát tín hiệu tìm xe để tài xế phục vụ bạn!
              </Text>
              <TouchableOpacity
                style={styles.emptyCtaBtn}
                onPress={() => navigation.navigate('SearchRide')}
              >
                <Ionicons name="search" size={15} color="#FFF" />
                <Text style={styles.emptyCtaText}>Tìm chuyến xe ngay</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── RADAR TÌM XE TRÊN MARKETPLACE (Nếu có yêu cầu đang mở) ── */}
        {activeRequest && (
          <View style={styles.sectionWrap}>
            <TouchableOpacity
              style={styles.radarCard}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('MyTrips', { initialTab: 'REQUESTS' })}
            >
              <View style={styles.radarIconWrap}>
                <Ionicons name="radio" size={24} color="#D97706" />
              </View>
              <View style={styles.radarContent}>
                <View style={styles.radarHeaderRow}>
                  <Text style={styles.radarBadgeText}>ĐANG PHÁT TÍN HIỆU</Text>
                  <Text style={styles.radarTimeText}>{formatTime(activeRequest.createdAt)}</Text>
                </View>
                <Text style={styles.radarRoute} numberOfLines={1}>
                  {activeRequest.startProvinceName} ⇄ {activeRequest.endProvinceName}
                </Text>
                <Text style={styles.radarDesc}>
                  Đang quét tài xế gần bạn • Nhấn để xem danh sách lời mời
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D97706" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── CHUYẾN XE ĐANG MỞ BÁN (LẤY TỪ DB THẬT 100%) ── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="flash-outline" size={18} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Chuyến xe đang mở bán</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('SearchRide')}>
              <Text style={styles.seeAllText}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          {availableTrips.length > 0 ? (
            <View style={styles.routesGrid}>
              {availableTrips.map(trip => (
                <TouchableOpacity
                  key={trip.id}
                  style={styles.tripCard}
                  activeOpacity={0.88}
                  onPress={() => navigation.navigate('SearchRide', { directTrip: trip })}
                >
                  <View style={styles.tripCardTop}>
                    <View style={styles.tripTimeBadge}>
                      <Ionicons name="time-outline" size={12} color={COLORS.primaryDark} />
                      <Text style={styles.tripTimeText}>{formatTime(trip.departureTime)}</Text>
                    </View>
                    <Text style={styles.tripDateText}>{formatDate(trip.departureTime)}</Text>
                  </View>

                  <View style={styles.tripRouteWrap}>
                    <Text style={styles.tripRouteText} numberOfLines={1}>
                      <Text style={{ color: COLORS.primaryDark, fontWeight: 'bold' }}>{trip.startAddressText || 'Điểm đi'}</Text>
                      {' ➔ '}
                      <Text style={{ color: COLORS.error, fontWeight: 'bold' }}>{trip.endAddressText || 'Điểm đến'}</Text>
                    </Text>
                  </View>

                  <View style={styles.tripDriverRow}>
                    <Ionicons name="person-circle-outline" size={16} color={COLORS.textMuted} />
                    <Text style={styles.tripDriverName} numberOfLines={1}>{trip.driverName || 'Tài xế RideUp'}</Text>
                    {trip.driverRating ? (
                      <View style={styles.tripRatingWrap}>
                        <Ionicons name="star" size={11} color="#F59E0B" />
                        <Text style={styles.tripRatingText}>{Number(trip.driverRating).toFixed(1)}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.tripCardBottom}>
                    <View>
                      <Text style={styles.tripSeatText}>Còn {trip.seatAvailable || 0} ghế</Text>
                    </View>
                    <Text style={styles.tripPrice}>{formatMoney(trip.priceVnd)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyTripsBox}>
              <Ionicons name="compass-outline" size={28} color={COLORS.textMuted} />
              <Text style={styles.emptyTripsTitle}>Chưa có chuyến xe nào mở bán mới</Text>
              <Text style={styles.emptyTripsSub}>
                Bạn có thể tự đăng yêu cầu di chuyển trên Chợ tìm xe để các tài xế liên hệ nhận chuyến.
              </Text>
              <TouchableOpacity
                style={styles.emptyTripsBtn}
                onPress={() => navigation.navigate('SearchRide', { openPostRequest: true })}
              >
                <Ionicons name="radio" size={14} color="#D97706" />
                <Text style={styles.emptyTripsBtnText}>Đăng tìm xe ngay</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── CAM KẾT AN TOÀN & MINH BẠCH ── */}
        <View style={[styles.sectionWrap, { marginBottom: 30 }]}>
          <TouchableOpacity
            style={styles.trustBanner}
            activeOpacity={0.9}
            onPress={() => setShowPolicyModal(true)}
          >
            <View style={styles.trustIconCircle}>
              <Ionicons name="shield-checkmark" size={28} color="#16A34A" />
            </View>
            <View style={styles.trustContent}>
              <Text style={styles.trustTitle}>Cam kết bảo vệ hành khách 100%</Text>
              <Text style={styles.trustDesc}>
                Hủy miễn phí trước 2 tiếng • Tài xế xác thực sinh trắc học • Hoàn tiền tự động
              </Text>
            </View>
            <Ionicons name="information-circle-outline" size={20} color="#16A34A" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── MODAL CHÍNH SÁCH BẢO VỆ & HỦY VÉ ── */}
      <Modal visible={showPolicyModal} transparent animationType="fade" onRequestClose={() => setShowPolicyModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.policyModalCard}>
            <View style={styles.policyModalHeader}>
              <View style={styles.policyModalIconCircle}>
                <Ionicons name="shield-checkmark" size={24} color="#16A34A" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.policyModalTitle}>Chính sách & An toàn</Text>
                <Text style={styles.policyModalSub}>RideUp cam kết bảo vệ quyền lợi tối đa</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPolicyModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              <View style={styles.policyItem}>
                <View style={styles.policyItemDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.policyItemTitle}>Hủy vé & Hoàn tiền linh hoạt</Text>
                  <Text style={styles.policyItemDesc}>
                    Hành khách được hoàn lại 100% tiền cọc khi hủy trước giờ khởi hành trên 2 tiếng. Nếu hủy cận giờ, tiền cọc sẽ được chuyển hỗ trợ chi phí cho tài xế.
                  </Text>
                </View>
              </View>

              <View style={styles.policyItem}>
                <View style={styles.policyItemDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.policyItemTitle}>Tài xế xác minh danh tính 100%</Text>
                  <Text style={styles.policyItemDesc}>
                    Toàn bộ tài xế bắt buộc xác thực CCCD gắn chip, Bằng lái xe hợp lệ và eKYC sinh trắc học khuôn mặt trước khi nhận khách.
                  </Text>
                </View>
              </View>

              <View style={styles.policyItem}>
                <View style={styles.policyItemDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.policyItemTitle}>Đổi điểm đón/trả tiện lợi</Text>
                  <Text style={styles.policyItemDesc}>
                    Hỗ trợ gửi yêu cầu đổi điểm đón/trả tối đa 2 lần trước giờ chạy 2 tiếng. Tài xế sẽ phản hồi duyệt trong vòng 15 phút.
                  </Text>
                </View>
              </View>

              <View style={styles.policyItem}>
                <View style={styles.policyItemDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.policyItemTitle}>Không phụ thu phát sinh</Text>
                  <Text style={styles.policyItemDesc}>
                    Giá vé hiển thị là giá trọn gói cuối cùng theo lộ trình đã đăng ký, cam kết không ép giá hay tính thêm phí ẩn trên xe.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.policyCloseBtn} onPress={() => setShowPolicyModal(false)}>
              <Text style={styles.policyCloseBtnText}>Đã hiểu & Đồng ý</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTextWrap: { flex: 1 },
  greetingText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  nameText: { color: COLORS.text, fontSize: 20, fontWeight: '900', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.error,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
    elevation: 2,
  },
  avatar: { width: '100%', height: '100%', borderRadius: 21 },
  avatarLetter: { color: COLORS.primaryDark, fontSize: 17, fontWeight: 'bold' },

  // Search Hero
  searchHeroContainer: { marginBottom: 20 },
  searchHeroBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(14, 165, 233, 0.15)',
    marginBottom: 10,
  },
  searchHeroIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchHeroContent: { flex: 1 },
  searchHeroTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800', marginBottom: 2 },
  searchHeroSub: { color: COLORS.textMuted, fontSize: 11, fontWeight: '500' },
  searchHeroActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
    marginLeft: 8,
  },
  searchHeroActionText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  quickChipsScroll: { paddingHorizontal: 20, gap: 8 },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickChipText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },

  // Core Actions Grid
  coreActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  coreActionItem: {
    width: (width - 40 - 36) / 4,
    alignItems: 'center',
  },
  coreActionIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  badgeNewWrap: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeNewText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  coreActionLabel: { color: COLORS.text, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  coreActionSub: { color: COLORS.textMuted, fontSize: 10, marginTop: 2, textAlign: 'center' },

  // Section General
  sectionWrap: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '900' },
  seeAllText: { color: COLORS.primaryDark, fontSize: 13, fontWeight: '700' },

  // Active Booking Card
  activeBookingCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(14, 165, 233, 0.2)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  activeBookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeTagText: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '700' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  activeBookingRoute: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  routeItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeConnector: { width: 2, height: 14, backgroundColor: COLORS.border, marginLeft: 3, marginVertical: 2 },
  routeLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  routeText: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginTop: 1 },
  activeBookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerSubText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  footerPrice: { color: COLORS.success, fontSize: 17, fontWeight: '900', marginTop: 1 },
  footerBtnGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnChatDriver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  btnChatDriverText: { color: '#0284C7', fontSize: 12, fontWeight: '800' },
  btnViewBooking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  btnViewBookingText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

  // Empty Booking Card
  emptyBookingCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  emptySub: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 14 },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  emptyCtaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  // Radar Marketplace Card
  radarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  radarIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radarContent: { flex: 1 },
  radarHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  radarBadgeText: { color: '#B45309', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  radarTimeText: { color: '#92400E', fontSize: 10 },
  radarRoute: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  radarDesc: { color: '#78350F', fontSize: 11, marginTop: 2 },

  // Real Trips Grid
  routesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    gap: 12,
  },
  tripCard: {
    width: (width - 40 - 12) / 2,
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  tripCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tripTimeText: { color: COLORS.primaryDark, fontSize: 11, fontWeight: '800' },
  tripDateText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600' },
  tripRouteWrap: { marginBottom: 8 },
  tripRouteText: { fontSize: 12, lineHeight: 16, color: COLORS.text },
  tripDriverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tripDriverName: { fontSize: 11, color: COLORS.textMuted, flex: 1, fontWeight: '500' },
  tripRatingWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  tripRatingText: { fontSize: 10, fontWeight: '700', color: '#D97706' },
  tripCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripSeatText: { color: COLORS.success, fontSize: 10.5, fontWeight: '700' },
  tripPrice: { color: COLORS.primaryDark, fontSize: 13.5, fontWeight: '900' },

  // Empty Real Trips Box
  emptyTripsBox: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTripsTitle: { color: COLORS.text, fontSize: 13, fontWeight: '800', marginTop: 6, marginBottom: 2 },
  emptyTripsSub: { color: COLORS.textMuted, fontSize: 11.5, textAlign: 'center', lineHeight: 16, marginBottom: 10 },
  emptyTripsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  emptyTripsBtnText: { color: '#B45309', fontSize: 11, fontWeight: '800' },

  // Trust Banner
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  trustIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trustContent: { flex: 1, marginRight: 8 },
  trustTitle: { color: '#166534', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  trustDesc: { color: '#15803D', fontSize: 11, lineHeight: 16 },

  // Policy Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  policyModalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  policyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  policyModalIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  policyModalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  policyModalSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  policyItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginTop: 6,
  },
  policyItemTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text, marginBottom: 2 },
  policyItemDesc: { fontSize: 11.5, color: COLORS.textMuted, lineHeight: 17 },
  policyCloseBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  policyCloseBtnText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
});

export default CustomerDashboardScreen;
