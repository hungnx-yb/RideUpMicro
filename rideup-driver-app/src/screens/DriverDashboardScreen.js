import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions, Image, Modal, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { chatSocket } from '../services/chatSocket';
import { notificationSocket } from '../services/notificationSocket';


const { width } = Dimensions.get('window');

const COLORS = {
  background: '#F8FAFC', surface: '#FFFFFF', primary: '#0ea5e9',
  text: '#0F172A', textMuted: '#64748B', border: '#E2E8F0',
  success: '#10b981', warning: '#f59e0b', error: '#ef4444'
};

const formatMoney = (val) => {
  if (!val) return '0 đ';
  return Number(val).toLocaleString('vi-VN') + ' đ';
};

export default function DriverDashboardScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    tripsCompleted: 0,
    activeTrips: 0,
    rating: 5.0
  });
  const [upcomingTrip, setUpcomingTrip] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [driverInfo, setDriverInfo] = useState(null);
  const [resultModal, setResultModal] = useState(null); // { type: 'success'|'reject'|'error'|'debt', bookingId }

  useFocusEffect(
    React.useCallback(() => {
      // Mở socket ngay khi load Dashboard
      chatSocket.connect();

      fetchDashboardData();
      return () => { };
    }, [])
  );

  const handleIncomingBooking = async (msg) => {
    // Điều hướng tài xế về màn hình Dashboard ngay lập tức nếu họ đang ở màn hình khác (Ví, Profile...)
    navigation.navigate('Dashboard');
    setLoading(true);
    try {
      if (!msg.metadata) return fetchDashboardData(true);
      const meta = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;

      if (meta.bookingId && meta.tripId) {
        // Đợi thêm 1 chút phòng hờ DB chưa commit xong
        await new Promise(r => setTimeout(r, 1000));

        // Lấy danh sách chuyến đi để gắn kèm thông tin hành trình
        const tripsRes = await apiService.getDriverTrips({ size: 100, page: 0 });
        const tripDetails = tripsRes?.data?.result?.find(t => t.id === meta.tripId);

        // Gọi API lấy trực tiếp booking khách hàng
        const bookingRes = await apiService.getBookingDetail(meta.bookingId);
        const bookingData = bookingRes?.data?.result;

        if (bookingData) {
          const enrichedBooking = { ...bookingData, tripDetails };
          setPendingRequests(prev => {
            if (prev.find(b => b.id === enrichedBooking.id)) return prev;
            return [enrichedBooking, ...prev];
          });
        } else {
          fetchDashboardData(true);
        }
      } else {
        fetchDashboardData(true);
      }
    } catch (err) {
      console.warn("Failed to fetch incoming booking directly:", err);
      fetchDashboardData(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let unsubscribe;
    const setup = async () => {
      // Initial fetch
      fetchDashboardData();
      // Setup Socket
      await notificationSocket.connect();

      unsubscribe = notificationSocket.subscribe((msg) => {
        const titleLower = (msg.title || '').toLowerCase();
        if (titleLower.includes('đặt') || titleLower.includes('booking') || titleLower.includes('khẩn')) {
          Alert.alert(
            "🚀 CÓ YÊU CẦU ĐẶT XE!",
            "Bạn vừa nhận được một yêu cầu đặt chỗ mới từ khách hàng. Vui lòng kiểm tra ngay!",
            [
              {
                text: "Để sau",
                style: "cancel",
              },
              {
                text: "Xem ngay",
                onPress: () => handleIncomingBooking(msg)
              }
            ]
          );
        } else {
          // Nếu thông báo khác, đợi 1 chút để đảm bảo DB đã sync xong
          setTimeout(() => fetchDashboardData(true), 1500);
        }
      });
    };
    setup();
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Lấy thông tin tài xế
      const userRes = await apiService.getMyUserInfo().catch(() => null);
      if (userRes && userRes.data && userRes.data.result) {
        setDriverInfo(userRes.data.result);
      }

      // TODO: Tích hợp API thống kê thực tế nếu có
      // Tạm thời lấy danh sách chuyến xe để tự tính toán
      const res = await apiService.getDriverTrips({ size: 100, page: 0 });
      const trips = res?.data?.result || [];

      let revenue = 0;
      let completed = 0;
      let active = 0;
      let nextTrip = null;

      const now = new Date();

      trips.forEach(t => {
        const status = (t.status || '').toUpperCase();

        // Tính doanh thu dựa trên số ghế đã được đặt
        if (status === 'COMPLETED' || status === 'STARTED' || status === 'FULL') {
          const booked = Math.max((t.seatTotal || 0) - (t.seatAvailable || 0), 0);
          revenue += (t.priceVnd || 0) * booked;
        }

        if (status === 'COMPLETED') completed++;
        if (status === 'OPEN' || status === 'STARTED' || status === 'FULL') active++;

        // Tìm chuyến đi sắp tới gần nhất
        const tripDate = new Date(t.departureTime);
        if (tripDate > now && (status === 'OPEN' || status === 'FULL')) {
          if (!nextTrip || tripDate < new Date(nextTrip.departureTime)) {
            nextTrip = t;
          }
        }
      });

      setStats({
        totalRevenue: revenue,
        tripsCompleted: completed,
        activeTrips: active,
        rating: 4.9 // Dummy rating
      });
      setUpcomingTrip(nextTrip);

      // Fetch pending requests for all active trips
      let pending = [];
      const activeTripsList = trips.filter(t => t.status === 'OPEN' || t.status === 'FULL');
      for (const trip of activeTripsList) {
        const bookingRes = await apiService.getBookingsByTripId(trip.id).catch(() => null);
        const bookings = bookingRes?.data?.result || [];
        const waiting = bookings.filter(b => b.status === 'WAITING_DRIVER_APPROVAL');

        // Gắn thêm thông tin chuyến đi vào booking để hiển thị
        const enrichedWaiting = waiting.map(b => ({ ...b, tripDetails: trip }));
        pending = [...pending, ...enrichedWaiting];
      }
      setPendingRequests(pending);

    } catch (error) {
      console.log('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const handleApprove = async (bookingId) => {
    setActionLoading(true);
    try {
      await apiService.approveBooking(bookingId);
      await fetchDashboardData(true);
      setResultModal({ type: 'success', bookingId });
    } catch (e) {
      const errorCode = e.response?.data?.code;
      const errorMessage = e.response?.data?.message || '';
      if (errorCode === 6001 || errorCode === 8001 || errorMessage.includes('ACCOUNT_BLOCKED_DUE_TO_DEBT')) {
        setResultModal({ type: 'debt', bookingId });
      } else {
        setResultModal({ type: 'error', message: errorMessage || 'Không thể nhận chuyến lúc này' });
      }
      console.log('Approve Error', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (bookingId) => {
    setActionLoading(true);
    try {
      await apiService.rejectBooking(bookingId);
      await fetchDashboardData(true);
      setResultModal({ type: 'reject', bookingId });
    } catch (e) {
      console.log('Reject Error', e);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER TÀI XẾ (NHỎ GỌN) */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.greetingText}>Ngày mới tốt lành,</Text>
          <Text style={styles.nameText}>{driverInfo?.fullName || 'Tài xế'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity style={styles.notificationBtn}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarContainer} activeOpacity={0.8} onPress={() => navigation.navigate('Profile')}>
            {driverInfo?.avatarUrl ? (
              <Image source={{ uri: driverInfo.avatarUrl }} style={styles.avatar} />
            ) : (
              <Text style={styles.avatarLetter}>{(driverInfo?.fullName || 'T')[0].toUpperCase()}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboardData(true)} tintColor={COLORS.primary} />}
      >
        {/* TRẠNG THÁI HOẠT ĐỘNG */}
        <View style={styles.statusBanner}>
          <View style={styles.statusDotWrapper}>
            <View style={styles.statusDot} />
            <View style={styles.statusPulse} />
          </View>
          <Text style={styles.statusText}>Bạn đang trực tuyến và sẵn sàng nhận chuyến</Text>
        </View>


        {/* THẺ DOANH THU & HIỆU SUẤT TỔNG HỢP */}
        <View style={styles.revenueCard}>
          <View style={styles.revenueTop}>
            <View>
              <Text style={styles.revenueLabel}>DOANH THU HÔM NAY</Text>
              <Text style={styles.revenueValue}>{formatMoney(stats.totalRevenue || 450000)}</Text>
            </View>
            <TouchableOpacity style={styles.walletBtn}>
              <Text style={styles.walletBtnText}>Rút tiền</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Ionicons name="car" size={18} color="#FFF" />
              <View style={styles.statInfo}>
                <Text style={styles.statVal}>{stats.tripsCompleted || 3}</Text>
                <Text style={styles.statDesc}>Chuyến</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Ionicons name="checkmark-done-circle" size={18} color="#FFF" />
              <View style={styles.statInfo}>
                <Text style={styles.statVal}>98%</Text>
                <Text style={styles.statDesc}>Tỉ lệ nhận</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Ionicons name="star" size={18} color="#FFD700" />
              <View style={styles.statInfo}>
                <Text style={styles.statVal}>{stats.rating}</Text>
                <Text style={styles.statDesc}>Đánh giá</Text>
              </View>
            </View>
          </View>
        </View>

        {/* LƯỚI TÍNH NĂNG NHANH (QUICK ACTIONS) */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Ionicons name="wallet" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.actionText}>Ví tài xế</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <Ionicons name="time" size={24} color={COLORS.warning} />
            </View>
            <Text style={styles.actionText}>Lịch sử</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <Ionicons name="bar-chart" size={24} color="#8b5cf6" />
            </View>
            <Text style={styles.actionText}>Thống kê</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <Ionicons name="headset" size={24} color={COLORS.error} />
            </View>
            <Text style={styles.actionText}>Hỗ trợ</Text>
          </TouchableOpacity>
        </View>

        {/* CHUYẾN ĐI SẮP TỚI (DẠNG VÉ BOARDING PASS) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Chuyến đi tiếp theo</Text>
          <TouchableOpacity onPress={() => navigation.navigate('DriverTrips')}>
            <Text style={styles.seeAllText}>Tất cả</Text>
          </TouchableOpacity>
        </View>

        {upcomingTrip ? (
          <View style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="time" size={16} color={COLORS.text} />
                <Text style={styles.ticketTime}>
                  {new Date(upcomingTrip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.ticketBadge}>
                <Text style={styles.ticketBadgeText}>SẮP KHỞI HÀNH</Text>
              </View>
            </View>

            <View style={styles.ticketBody}>
              <View style={styles.routeItem}>
                <View style={[styles.routeDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.routeText} numberOfLines={1}>{upcomingTrip.startAddressText}</Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routeItem}>
                <View style={[styles.routeDot, { backgroundColor: COLORS.error }]} />
                <Text style={styles.routeText} numberOfLines={1}>{upcomingTrip.endAddressText}</Text>
              </View>
            </View>

            <View style={styles.ticketDividerWrap}>
              <View style={styles.ticketNotchLeft} />
              <View style={styles.ticketDashedLine} />
              <View style={styles.ticketNotchRight} />
            </View>

            <View style={styles.ticketFooter}>
              <View style={styles.ticketMeta}>
                <Text style={styles.ticketMetaLabel}>TÌNH TRẠNG</Text>
                <Text style={styles.ticketMetaValue}>{upcomingTrip.seatTotal - upcomingTrip.seatAvailable}/{upcomingTrip.seatTotal} ghế đã đặt</Text>
              </View>
              <TouchableOpacity style={styles.detailBtn} onPress={() => navigation.navigate('DriverTrips')}>
                <Text style={styles.detailBtnText}>Bắt đầu</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.background} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.emptyTicket} activeOpacity={0.8} onPress={() => navigation.navigate('CreateTrip')}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="add" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTicketTitle}>Chưa có chuyến đi nào</Text>
            <Text style={styles.emptyTicketSub}>Tạo ngay chuyến đi mới để bắt đầu nhận khách</Text>
          </TouchableOpacity>
        )}

        {/* CẢNH BÁO YÊU CẦU CHỜ DUYỆT (DI CHUYỂN XUỐNG DƯỚI) */}
        {pendingRequests.length > 0 && (
          <View style={[styles.pendingSection, { marginTop: 24 }]}>
            <Text style={styles.pendingTitle}>YÊU CẦU ĐẶT XE MỚI ({pendingRequests.length})</Text>
            {pendingRequests.map(req => (
              <View key={req.id} style={styles.pendingCard}>
                <View style={styles.pendingHeader}>
                  <Text style={styles.pendingTimer}>⏱️ Chờ xác nhận (Hủy sau 14:59)</Text>
                  {/* Đã bỏ phương thức thanh toán theo yêu cầu */}
                </View>
                <View style={styles.pendingBody}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {req.userAvatar ? (
                        <Image source={{ uri: req.userAvatar }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                      ) : (
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                            {(req.userName || 'K')[0].toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: COLORS.text }}>
                          {req.userName || 'Khách hàng'}
                        </Text>
                        <Text style={{ fontSize: 11, color: COLORS.textMuted }}>ID: {req.bookingCode || req.customerId?.substring(0, 6)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.pendingRoute}>
                    <View style={styles.routeRow}>
                      <View style={[styles.routeDotLine, { backgroundColor: COLORS.primary }]} />
                      <Text style={styles.pendingRouteText} numberOfLines={2}>
                        <Text style={{ fontWeight: 'bold' }}>Đón:</Text> {req.pickupAddressText || req.tripDetails?.startAddressText}
                      </Text>
                    </View>
                    <View style={styles.routeDivider} />
                    <View style={styles.routeRow}>
                      <View style={[styles.routeDotLine, { backgroundColor: COLORS.error }]} />
                      <Text style={styles.pendingRouteText} numberOfLines={2}>
                        <Text style={{ fontWeight: 'bold' }}>Trả:</Text> {req.dropoffAddressText || req.tripDetails?.endAddressText}
                      </Text>
                    </View>
                  </View>

                  {req.note ? (
                    <View style={styles.noteBox}>
                      <Ionicons name="chatbubble-ellipses-outline" size={14} color={COLORS.textMuted} />
                      <Text style={styles.noteText} numberOfLines={2}>Ghi chú: {req.note}</Text>
                    </View>
                  ) : null}

                  <View style={styles.pendingMetaBox}>
                    <View style={styles.metaItem}>
                      <Ionicons name="people-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.metaText}>{req.seatCount || 1} ghế</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="cash-outline" size={16} color={COLORS.success} />
                      <Text style={[styles.metaText, { color: COLORS.success, fontWeight: 'bold' }]}>
                        {formatMoney(req.totalAmount)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.pendingActions}>
                  <TouchableOpacity style={styles.btnReject} onPress={() => handleReject(req.id)} disabled={actionLoading}>
                    <Text style={styles.btnRejectText}>TỪ CHỐI</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnApprove} onPress={() => handleApprove(req.id)} disabled={actionLoading}>
                    <Text style={styles.btnApproveText}>NHẬN CHUYẾN</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* THÔNG TIN BỔ ÍCH / ĐIỂM NÓNG */}
        <Text style={[styles.sectionTitle, { marginTop: 32, marginBottom: 16 }]}>Cơ hội thu nhập</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opportunitiesScroll}>
          <TouchableOpacity style={styles.oppCard} activeOpacity={0.9}>
            <View style={styles.oppIconWrap}>
              <Ionicons name="flame" size={24} color={COLORS.error} />
            </View>
            <View>
              <Text style={styles.oppTitle}>Nhu cầu cao: Hà Nội</Text>
              <Text style={styles.oppSub}>Đang có 120 khách chờ đi tỉnh</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.oppCard} activeOpacity={0.9}>
            <View style={[styles.oppIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="gift" size={24} color={COLORS.success} />
            </View>
            <View>
              <Text style={styles.oppTitle}>Thưởng giờ vàng</Text>
              <Text style={styles.oppSub}>Hoàn thành 3 chuyến nhận 100K</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

      </ScrollView>

      {/* MODAL KẾT QUẢ CHẤP NHẬN / HỦY */}
      <Modal visible={!!resultModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.resultModal}>
            {resultModal?.type === 'success' && (
              <>
                <View style={[styles.resultIconWrap, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                  <Ionicons name="checkmark-circle" size={56} color={COLORS.success} />
                </View>
                <Text style={styles.resultTitle}>Nhận chuyến thành công!</Text>
                <Text style={styles.resultDesc}>Bạn đã tiếp nhận yêu cầu đặt xe. Hãy nhắn tin để xác nhận điểm đón với khách hàng nhé.</Text>
                <View style={styles.resultActions}>
                  <TouchableOpacity style={styles.resultBtnSecondary} onPress={() => setResultModal(null)}>
                    <Text style={styles.resultBtnSecondaryText}>Đóng</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.resultBtnPrimary, { backgroundColor: COLORS.success }]} onPress={() => { setResultModal(null); navigation.navigate('Chat', { bookingId: resultModal.bookingId }); }}>
                    <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
                    <Text style={styles.resultBtnPrimaryText}>Nhắn tin ngay</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {resultModal?.type === 'reject' && (
              <>
                <View style={[styles.resultIconWrap, { backgroundColor: 'rgba(100,116,139,0.12)' }]}>
                  <Ionicons name="close-circle" size={56} color={COLORS.textMuted} />
                </View>
                <Text style={styles.resultTitle}>Đã hủy yêu cầu</Text>
                <Text style={styles.resultDesc}>Bạn đã từ chối yêu cầu đặt xe này. Khách hàng sẽ được thông báo và tìm tài xế khác.</Text>
                <View style={styles.resultActions}>
                  <TouchableOpacity style={[styles.resultBtnPrimary, { backgroundColor: COLORS.textMuted }]} onPress={() => setResultModal(null)}>
                    <Text style={styles.resultBtnPrimaryText}>Đã hiểu</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {resultModal?.type === 'debt' && (
              <>
                <View style={[styles.resultIconWrap, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                  <Ionicons name="warning" size={56} color={COLORS.warning} />
                </View>
                <Text style={styles.resultTitle}>Tạm khóa nhận chuyến</Text>
                <Text style={styles.resultDesc}>Dư nợ hoa hồng của bạn đã vượt mức 500.000đ. Vui lòng thanh toán để tiếp tục hoạt động.</Text>
                <View style={styles.resultActions}>
                  <TouchableOpacity style={styles.resultBtnSecondary} onPress={() => setResultModal(null)}>
                    <Text style={styles.resultBtnSecondaryText}>Đóng</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.resultBtnPrimary, { backgroundColor: COLORS.warning }]} onPress={() => { setResultModal(null); navigation.navigate('Wallet'); }}>
                    <Ionicons name="wallet" size={16} color="#fff" />
                    <Text style={styles.resultBtnPrimaryText}>Đi tới Ví</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {resultModal?.type === 'error' && (
              <>
                <View style={[styles.resultIconWrap, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                  <Ionicons name="alert-circle" size={56} color={COLORS.error} />
                </View>
                <Text style={styles.resultTitle}>Đã có lỗi xảy ra</Text>
                <Text style={styles.resultDesc}>{resultModal?.message || 'Không thể nhận chuyến lúc này. Vui lòng thử lại.'}</Text>
                <View style={styles.resultActions}>
                  <TouchableOpacity style={[styles.resultBtnPrimary, { backgroundColor: COLORS.error }]} onPress={() => setResultModal(null)}>
                    <Text style={styles.resultBtnPrimaryText}>Đóng</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  headerTextContainer: { flex: 1 },
  greetingText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  nameText: { color: COLORS.text, fontSize: 20, fontWeight: '900', marginTop: 2 },
  avatarContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(14, 165, 233, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  avatar: { width: '100%', height: '100%', borderRadius: 22 },
  avatarLetter: { color: COLORS.primary, fontSize: 18, fontWeight: 'bold' },
  
  notificationBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  notificationBadge: { position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.error, borderWidth: 1, borderColor: COLORS.surface },

  scrollContent: { padding: 20, paddingBottom: 40 },

  // Status
  statusBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 20 },
  statusDotWrapper: { position: 'relative', width: 12, height: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success, zIndex: 2 },
  statusPulse: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.success, opacity: 0.4 },
  statusText: { color: COLORS.success, fontSize: 13, fontWeight: 'bold' },

  // Revenue Card
  revenueCard: { backgroundColor: COLORS.primary, borderRadius: 24, padding: 20, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8, marginBottom: 24 },
  revenueTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  revenueLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
  revenueValue: { color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  walletBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  walletBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold', marginRight: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 16, padding: 16 },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statInfo: { justifyContent: 'center' },
  statVal: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  statDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' },
  statDivider: { width: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.2)' },

  // Quick Actions
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  actionItem: { alignItems: 'center', flex: 1 },
  actionIconBox: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },

  // Sections
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  seeAllText: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold' },

  // Ticket (Boarding Pass)
  ticketCard: { backgroundColor: COLORS.surface, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 4, marginBottom: 8 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 16 },
  ticketTime: { color: COLORS.text, fontSize: 16, fontWeight: '900' },
  ticketBadge: { backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  ticketBadgeText: { color: COLORS.success, fontSize: 10, fontWeight: 'bold' },
  ticketBody: { paddingHorizontal: 20, paddingBottom: 16 },
  routeItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  routeLine: { width: 2, height: 20, backgroundColor: COLORS.border, marginLeft: 4, marginVertical: 4 },
  routeText: { color: COLORS.text, fontSize: 15, fontWeight: '700', flex: 1 },
  ticketDividerWrap: { flexDirection: 'row', alignItems: 'center', height: 1 },
  ticketNotchLeft: { width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.background, marginLeft: -8 },
  ticketDashedLine: { flex: 1, height: 1, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', marginHorizontal: 4 },
  ticketNotchRight: { width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.background, marginRight: -8 },
  ticketFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  ticketMetaLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
  ticketMetaValue: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  detailBtnText: { color: COLORS.background, fontSize: 13, fontWeight: 'bold' },

  // Empty Ticket
  emptyTicket: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(14, 165, 233, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTicketTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  emptyTicketSub: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },

  // Opportunities
  opportunitiesScroll: { gap: 12, paddingRight: 20, paddingBottom: 10 },
  oppCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, minWidth: 260, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  oppIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center' },
  oppTitle: { color: COLORS.text, fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  oppSub: { color: COLORS.textMuted, fontSize: 12 },

  // Pending Requests
  pendingSection: { marginBottom: 24 },
  pendingTitle: { color: COLORS.error, fontSize: 13, fontWeight: '900', marginBottom: 12, letterSpacing: 1 },
  pendingCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 2, borderColor: 'rgba(239,68,68,0.2)', shadowColor: COLORS.error, shadowOpacity: 0.1, shadowRadius: 15, elevation: 5, marginBottom: 16 },
  pendingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  pendingTimer: { color: COLORS.error, fontSize: 13, fontWeight: 'bold' },
  paymentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  paymentBadgeText: { fontSize: 11, fontWeight: 'bold' },
  pendingBody: { marginBottom: 16 },
  pendingCustomer: { fontSize: 13, fontWeight: 'bold', color: COLORS.textMuted },
  pendingRoute: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  routeDotLine: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  routeDivider: { width: 2, height: 16, backgroundColor: COLORS.border, marginLeft: 3, marginVertical: 2 },
  pendingRouteText: { fontSize: 13, color: COLORS.text, flex: 1, lineHeight: 18 },
  noteBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', padding: 10, borderRadius: 8, gap: 6, marginBottom: 12, borderWidth: 1, borderColor: '#FEF3C7' },
  noteText: { color: '#92400E', fontSize: 12, flex: 1, fontStyle: 'italic' },
  pendingMetaBox: { flexDirection: 'row', gap: 16, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  pendingActions: { flexDirection: 'row', gap: 12 },
  btnReject: { flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnRejectText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '800' },
  btnApprove: { flex: 1, backgroundColor: COLORS.success, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnApproveText: { color: '#FFF', fontSize: 14, fontWeight: '800' },

  // Result Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  resultModal: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 28, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 16 },
  resultIconWrap: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  resultTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text, marginBottom: 10, textAlign: 'center' },
  resultDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  resultActions: { flexDirection: 'row', gap: 12, width: '100%' },
  resultBtnSecondary: { flex: 1, backgroundColor: COLORS.background, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  resultBtnSecondaryText: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  resultBtnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, gap: 6 },
  resultBtnPrimaryText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
});
