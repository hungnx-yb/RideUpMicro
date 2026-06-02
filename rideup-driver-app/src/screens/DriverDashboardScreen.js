import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, ScrollView, 
  TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { useNavigation } from '@react-navigation/native';
import { chatSocket } from '../services/chatSocket';

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

  useEffect(() => {
    // Mở socket ngay khi load Dashboard (đảm bảo lúc auto-login vẫn bắt được socket)
    chatSocket.connect();
    
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
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

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER CAO CẤP */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerAppTitle}>RIDEUP</Text>
          <Text style={styles.headerTitle}>Tổng quan</Text>
        </View>
        <TouchableOpacity style={styles.avatarBox} activeOpacity={0.8} onPress={() => navigation.navigate('Profile')}>
          <Image source={require('../../assets/images/react-logo.png')} style={{ width: '100%', height: '100%' }} />
        </TouchableOpacity>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, backgroundColor: COLORS.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4, zIndex: 10 },
  headerAppTitle: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary, letterSpacing: 1, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  avatarBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(14, 165, 233, 0.1)', overflow: 'hidden', borderWidth: 2, borderColor: COLORS.surface, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  
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
  oppSub: { color: COLORS.textMuted, fontSize: 12 }
});
