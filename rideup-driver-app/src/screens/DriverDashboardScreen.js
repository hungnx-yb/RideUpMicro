import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, ScrollView, 
  TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import { useNavigation } from '@react-navigation/native';
import { chatSocket } from '../services/chatSocket';

const { width } = Dimensions.get('window');

const COLORS = {
  background: '#121212', surface: '#1E1E1E', primary: '#0ea5e9',
  text: '#FFFFFF', textMuted: '#94a3b8', border: '#334155',
  success: '#10b981', warning: '#f59e0b', error: '#ef4444',
  accent: '#6366f1' // Thêm màu nhấn cho sinh động
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
      <View style={styles.header}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarBox}>
            <Ionicons name="person" size={24} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.greeting}>Xin chào Đối tác,</Text>
            <Text style={styles.title}>Tổng quan hôm nay</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboardData(true)} tintColor={COLORS.primary} />
        }
      >
        {/* DOANH THU CHÍNH */}
        <View style={styles.revenueCard}>
          <View style={styles.revenueTop}>
            <Text style={styles.revenueLabel}>TỔNG DOANH THU (TẠM TÍNH)</Text>
            <Ionicons name="wallet-outline" size={20} color="rgba(255,255,255,0.7)" />
          </View>
          <Text style={styles.revenueValue}>{formatMoney(stats.totalRevenue)}</Text>
          
          <View style={styles.revenueBottom}>
            <View style={styles.revenueStatBox}>
              <Text style={styles.revenueStatNum}>{stats.tripsCompleted}</Text>
              <Text style={styles.revenueStatLabel}>Hoàn thành</Text>
            </View>
            <View style={styles.revenueDivider} />
            <View style={styles.revenueStatBox}>
              <Text style={styles.revenueStatNum}>{stats.activeTrips}</Text>
              <Text style={styles.revenueStatLabel}>Chuyến chờ</Text>
            </View>
            <View style={styles.revenueDivider} />
            <View style={styles.revenueStatBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.revenueStatNum}>{stats.rating}</Text>
                <Ionicons name="star" size={14} color={COLORS.warning} />
              </View>
              <Text style={styles.revenueStatLabel}>Đánh giá</Text>
            </View>
          </View>
        </View>

        {/* CHUYẾN ĐI TIẾP THEO */}
        <Text style={styles.sectionTitle}>Chuyến đi tiếp theo</Text>
        {upcomingTrip ? (
          <View style={styles.nextTripCard}>
            <View style={styles.nextTripHeader}>
              <View style={styles.badgeOpen}>
                <Text style={styles.badgeText}>SẮP KHỞI HÀNH</Text>
              </View>
              <Text style={styles.nextTripTime}>
                {new Date(upcomingTrip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            
            <View style={styles.routeBox}>
              <View style={styles.routeItem}>
                <Ionicons name="location-outline" size={18} color={COLORS.textMuted} />
                <Text style={styles.routeText}>{upcomingTrip.startAddressText}</Text>
              </View>
              <View style={styles.routeDivider} />
              <View style={styles.routeItem}>
                <Ionicons name="location" size={18} color={COLORS.primary} />
                <Text style={styles.routeText}>{upcomingTrip.endAddressText}</Text>
              </View>
            </View>

            <View style={styles.nextTripFooter}>
              <View style={styles.nextTripInfo}>
                <Ionicons name="people" size={16} color={COLORS.textMuted} />
                <Text style={styles.nextTripInfoText}>Trống {upcomingTrip.seatAvailable}/{upcomingTrip.seatTotal} ghế</Text>
              </View>
              <TouchableOpacity 
                style={styles.detailBtn}
                onPress={() => navigation.navigate('DriverTrips')}
              >
                <Text style={styles.detailBtnText}>Chi tiết</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyNextTrip}>
            <Ionicons name="car-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyNextTripText}>Bạn chưa có chuyến nào sắp tới.</Text>
            <TouchableOpacity style={styles.emptyNextTripBtn} onPress={() => navigation.navigate('CreateTrip')}>
              <Text style={styles.emptyNextTripBtnText}>Mở chuyến ngay</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* DỊCH VỤ & TIỆN ÍCH (Giống "Khám phá đa dịch vụ") */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Dịch vụ & Tiện ích</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicesScroll}>
          <TouchableOpacity style={styles.serviceCard} activeOpacity={0.9}>
            <View style={[styles.serviceIconWrap, { backgroundColor: 'rgba(14, 165, 233, 0.1)' }]}>
              <Ionicons name="shield-checkmark" size={36} color={COLORS.primary} />
            </View>
            <Text style={styles.serviceTitle}>Bảo hiểm</Text>
            <View style={[styles.serviceBadge, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.serviceBadgeText}>Đăng ký ngay</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.serviceCard} activeOpacity={0.9}>
            <View style={[styles.serviceIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <Ionicons name="wallet" size={36} color={COLORS.warning} />
            </View>
            <Text style={styles.serviceTitle}>Vay tiêu dùng</Text>
            <View style={[styles.serviceBadge, { backgroundColor: COLORS.warning }]}>
              <Text style={styles.serviceBadgeText}>Lãi suất 1.5%</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.serviceCard} activeOpacity={0.9}>
            <View style={[styles.serviceIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Ionicons name="cash" size={36} color={COLORS.success} />
            </View>
            <Text style={styles.serviceTitle}>Gói tiết kiệm</Text>
            <View style={[styles.serviceBadge, { backgroundColor: COLORS.success }]}>
              <Text style={styles.serviceBadgeText}>Ưu đãi 25%</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* TIN TỨC & CẨM NANG (Grid 2 cột giống "Giảm đến 66K") */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Cẩm nang & Tin tức</Text>
        <View style={styles.newsGrid}>
          {/* Card 1 */}
          <TouchableOpacity style={styles.newsCard} activeOpacity={0.9}>
            <View style={[styles.newsImagePlaceholder, { backgroundColor: '#FFD700' }]}>
              <Ionicons name="flash" size={48} color="#FFF" style={{ position: 'absolute', bottom: -10, right: -10, opacity: 0.5 }} />
              <Ionicons name="car" size={40} color="#000" />
            </View>
            <View style={styles.newsContent}>
              <Text style={styles.newsTitle} numberOfLines={2}>Thưởng giờ vàng 50K</Text>
              <View style={styles.newsTag}>
                <Text style={styles.newsTagText}>Khuyến mãi</Text>
              </View>
              <Text style={styles.newsSubText}>Xem ngay</Text>
            </View>
          </TouchableOpacity>

          {/* Card 2 */}
          <TouchableOpacity style={styles.newsCard} activeOpacity={0.9}>
            <View style={[styles.newsImagePlaceholder, { backgroundColor: '#0ea5e9' }]}>
              <Ionicons name="star" size={48} color="#FFF" style={{ position: 'absolute', bottom: -10, right: -10, opacity: 0.5 }} />
              <Ionicons name="chatbubbles" size={40} color="#FFF" />
            </View>
            <View style={styles.newsContent}>
              <Text style={styles.newsTitle} numberOfLines={2}>Tiêu chuẩn phục vụ 5 sao</Text>
              <View style={styles.newsTag}>
                <Text style={styles.newsTagText}>Cẩm nang</Text>
              </View>
              <Text style={styles.newsSubText}>Học ngay</Text>
            </View>
          </TouchableOpacity>

          {/* Card 3 */}
          <TouchableOpacity style={styles.newsCard} activeOpacity={0.9}>
            <View style={[styles.newsImagePlaceholder, { backgroundColor: '#10b981' }]}>
              <Ionicons name="map" size={48} color="#FFF" style={{ position: 'absolute', bottom: -10, right: -10, opacity: 0.5 }} />
              <Ionicons name="location" size={40} color="#FFF" />
            </View>
            <View style={styles.newsContent}>
              <Text style={styles.newsTitle} numberOfLines={2}>Bản đồ điểm nóng</Text>
              <View style={styles.newsTag}>
                <Text style={styles.newsTagText}>Tính năng mới</Text>
              </View>
              <Text style={styles.newsSubText}>Khám phá</Text>
            </View>
          </TouchableOpacity>

          {/* Card 4 */}
          <TouchableOpacity style={styles.newsCard} activeOpacity={0.9}>
            <View style={[styles.newsImagePlaceholder, { backgroundColor: '#ef4444' }]}>
              <Ionicons name="shield-half" size={48} color="#FFF" style={{ position: 'absolute', bottom: -10, right: -10, opacity: 0.5 }} />
              <Ionicons name="help-buoy" size={40} color="#FFF" />
            </View>
            <View style={styles.newsContent}>
              <Text style={styles.newsTitle} numberOfLines={2}>Trung tâm hỗ trợ tài xế</Text>
              <View style={styles.newsTag}>
                <Text style={styles.newsTagText}>Hỗ trợ</Text>
              </View>
              <Text style={styles.newsSubText}>Liên hệ</Text>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 16 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(14, 165, 233, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(14, 165, 233, 0.3)' },
  greeting: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  title: { color: COLORS.text, fontSize: 20, fontWeight: 'bold' },
  
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  // Revenue Card
  revenueCard: { backgroundColor: COLORS.primary, borderRadius: 24, padding: 24, shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 15, elevation: 8, marginBottom: 32 },
  revenueTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  revenueLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  revenueValue: { color: '#FFF', fontSize: 36, fontWeight: '900', letterSpacing: -1, marginBottom: 24 },
  
  revenueBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 16, padding: 16 },
  revenueStatBox: { flex: 1, alignItems: 'center' },
  revenueStatNum: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  revenueStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
  revenueDivider: { width: 1, height: '80%', backgroundColor: 'rgba(255,255,255,0.2)' },

  // Sections
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 16, letterSpacing: 0.5 },

  // Next Trip
  nextTripCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  nextTripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  badgeOpen: { backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  badgeText: { color: COLORS.success, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  nextTripTime: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  
  routeBox: { marginBottom: 16 },
  routeItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  routeDivider: { height: 16, width: 2, backgroundColor: COLORS.border, marginLeft: 8, marginVertical: 4 },
  
  nextTripFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 16 },
  nextTripInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nextTripInfoText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500' },
  detailBtn: { backgroundColor: 'rgba(14, 165, 233, 0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  detailBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: 'bold' },

  // Empty Trip
  emptyNextTrip: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed' },
  emptyNextTripText: { color: COLORS.textMuted, fontSize: 14, marginVertical: 16 },
  emptyNextTripBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyNextTripBtnText: { color: COLORS.background, fontSize: 14, fontWeight: 'bold' },

  // Services
  servicesScroll: { gap: 16, paddingRight: 20 },
  serviceCard: { width: 140, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  serviceIconWrap: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  serviceTitle: { color: COLORS.text, fontSize: 14, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  serviceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  serviceBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  // News Grid
  newsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  newsCard: { width: '47%', backgroundColor: COLORS.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, marginBottom: 4 },
  newsImagePlaceholder: { height: 110, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  newsContent: { padding: 12 },
  newsTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600', lineHeight: 20, marginBottom: 8, height: 40 },
  newsTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(14, 165, 233, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 8 },
  newsTagText: { color: COLORS.primary, fontSize: 10, fontWeight: 'bold' },
  newsSubText: { color: COLORS.textMuted, fontSize: 12 }
});
