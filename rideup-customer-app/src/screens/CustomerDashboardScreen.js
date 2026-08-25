import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';

const { width } = Dimensions.get('window');

const COLORS = { 
  background: '#F8FAFC', surface: '#FFFFFF', primary: '#0ea5e9', 
  secondary: '#38bdf8', accent: '#f59e0b',
  text: '#0F172A', textMuted: '#64748B', error: '#ef4444', 
  border: '#E2E8F0', success: '#10b981', info: '#3b82f6' 
};

const SIZES = { small: 12, font: 14, medium: 16, large: 20, title: 26, hero: 32 };

const CustomerDashboardScreen = ({ navigation }) => {
  const [userName, setUserName] = useState('Khách hàng');
  const [avatar, setAvatar] = useState(null);
  const [greeting, setGreeting] = useState('Xin chào,');

  useEffect(() => {
    fetchProfile();
    updateGreeting();
  }, []);

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Chào buổi sáng,');
    else if (hour < 18) setGreeting('Chào buổi chiều,');
    else setGreeting('Chào buổi tối,');
  };

  const fetchProfile = async () => {
    try {
      const res = await apiService.getMyUserInfo();
      if (res?.data?.result) {
        setUserName(res.data.result.fullName || 'Khách hàng');
        setAvatar(res.data.result.avatarUrl);
      }
    } catch (error) {
      console.log('Error fetching profile', error);
    }
  };

  const services = [
    { id: 'xe_ghep', name: 'Xe Ghép', icon: 'people-outline', color: '#0ea5e9', bg: '#f0f9ff' },
    { id: 'bao_xe', name: 'Bao Xe', icon: 'car-sport-outline', color: '#10b981', bg: '#ecfdf5' },
    { id: 'san_bay', name: 'Sân Bay', icon: 'airplane-outline', color: '#8b5cf6', bg: '#f5f3ff' },
    { id: 'gui_hang', name: 'Gửi Hàng', icon: 'cube-outline', color: '#f59e0b', bg: '#fffbeb' },
  ];

  const promos = [
    { id: 1, title: 'Bạn mới đi ghép?', desc: 'Tặng ngay 50K cho chuyến xe ghép liên tỉnh đầu tiên.', color: '#0ea5e9' },
    { id: 2, title: 'Bao xe trọn gói', desc: 'Xe 4-7 chỗ đón tận nơi, giảm giá 10% dịp lễ.', color: '#10b981' },
    { id: 3, title: 'Gửi hàng hỏa tốc', desc: 'Nhận hàng ngay trong ngày, giá chỉ từ 50K.', color: '#f59e0b' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER: GREETING & AVATAR */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greetingText}>{greeting}</Text>
            <Text style={styles.nameText}>{userName} 👋</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <View style={styles.avatarContainer}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <Text style={styles.avatarLetter}>{userName.charAt(0).toUpperCase()}</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR (Hero Action) */}
        <View style={styles.searchSection}>
          <TouchableOpacity 
            style={styles.searchBar} 
            activeOpacity={0.9}
            onPress={() => navigation.navigate('SearchRide')}
          >
            <View style={styles.searchIconBox}>
              <Ionicons name="search" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.searchTextContainer}>
              <Text style={styles.searchTitle}>Bạn muốn đi tỉnh nào?</Text>
              <Text style={styles.searchSubtitle}>Tìm chuyến xe ghép, bao xe an toàn & tiết kiệm</Text>
            </View>
          </TouchableOpacity>

          {/* QUICK TAGS */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickTagsScroll}>
            <TouchableOpacity style={styles.quickTag}>
              <Ionicons name="time-outline" size={14} color={COLORS.primary} />
              <Text style={styles.quickTagText}>BX Mỹ Đình</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickTag}>
              <Ionicons name="airplane-outline" size={14} color={COLORS.primary} />
              <Text style={styles.quickTagText}>Sân bay Nội Bài</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickTag}>
              <Ionicons name="flash-outline" size={14} color={COLORS.primary} />
              <Text style={styles.quickTagText}>Hà Nội ⇄ Nam Định</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* QUICK SERVICES GRID */}
        <View style={styles.servicesGrid}>
          {services.map((svc) => (
            <TouchableOpacity 
              key={svc.id} 
              style={styles.serviceItem}
              onPress={() => navigation.navigate('SearchRide')}
            >
              <View style={[styles.serviceIconWrap, { backgroundColor: svc.bg }]}>
                <Ionicons name={svc.icon} size={28} color={svc.color} />
              </View>
              <Text style={styles.serviceText}>{svc.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ONGOING TRIP CARD (Boarding Pass Style) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Đặt chuyến ngay</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SearchRide')}>
              <Text style={styles.seeAllText}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.boardingPass}
            activeOpacity={0.95}
            onPress={() => navigation.navigate('SearchRide')}
          >
            {/* Cutouts for ticket effect */}
            <View style={styles.cutoutTop} />
            <View style={styles.cutoutBottom} />
            
            <View style={styles.bpLeft}>
              <View style={styles.bpBadge}>
                <Text style={styles.bpBadgeText}>TUYẾN PHỔ BIẾN</Text>
              </View>
              <Text style={styles.bpTitle}>Hà Nội ⇄ Tỉnh</Text>
              <Text style={styles.bpDesc}>Xe 4-7 chỗ rộng rãi, đưa đón tận nhà, khởi hành liên tục.</Text>
            </View>
            <View style={styles.bpRight}>
              <Ionicons name="location" size={32} color="#FFFFFF" style={{ opacity: 0.8 }} />
              <Ionicons name="car" size={50} color="#FFFFFF" style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.3 }} />
            </View>
          </TouchableOpacity>
        </View>

        {/* PROMO CAROUSEL */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Khuyến mãi cho bạn</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promoScroll}>
            {promos.map((promo) => (
              <View key={promo.id} style={[styles.promoCard, { backgroundColor: promo.color }]}>
                <View style={styles.promoIconBg}>
                  <Ionicons name="gift-outline" size={48} color="rgba(255,255,255,0.2)" />
                </View>
                <Text style={styles.promoTitle}>{promo.title}</Text>
                <Text style={styles.promoDesc}>{promo.desc}</Text>
                <TouchableOpacity style={styles.promoBtn}>
                  <Text style={[styles.promoBtnText, { color: promo.color }]}>Dùng ngay</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* QUICK DESTINATIONS */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Địa điểm yêu thích</Text>
          <View style={styles.destinationList}>
            <TouchableOpacity style={styles.destItem}>
              <View style={[styles.destIconWrap, { backgroundColor: 'rgba(14, 165, 233, 0.1)' }]}>
                <Ionicons name="home" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.destInfo}>
                <Text style={styles.destTitle}>Về nhà</Text>
                <Text style={styles.destSubtitle}>Thiết lập địa chỉ nhà</Text>
              </View>
              <Ionicons name="add-circle-outline" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
            <View style={styles.destDivider} />
            <TouchableOpacity style={styles.destItem}>
              <View style={[styles.destIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="briefcase" size={20} color={COLORS.success} />
              </View>
              <View style={styles.destInfo}>
                <Text style={styles.destTitle}>Đến công ty</Text>
                <Text style={styles.destSubtitle}>Thiết lập địa chỉ công ty</Text>
              </View>
              <Ionicons name="add-circle-outline" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 40 },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  headerTextContainer: { flex: 1 },
  greetingText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  nameText: { color: COLORS.text, fontSize: 20, fontWeight: '900', marginTop: 2 },
  avatarContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(14, 165, 233, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  avatar: { width: '100%', height: '100%', borderRadius: 22 },
  avatarLetter: { color: COLORS.primary, fontSize: 18, fontWeight: 'bold' },

  // Search Bar Hero
  searchSection: { marginBottom: 24 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, marginHorizontal: 20, padding: 12, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(14, 165, 233, 0.1)' },
  searchIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(14, 165, 233, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  searchTextContainer: { flex: 1 },
  searchTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800', marginBottom: 2 },
  searchSubtitle: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500' },
  
  quickTagsScroll: { paddingHorizontal: 20, gap: 8 },
  quickTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  quickTagText: { color: COLORS.text, fontSize: 11, fontWeight: '600', marginLeft: 4 },

  // Services Grid
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginBottom: 24 },
  serviceItem: { width: '25%', alignItems: 'center', paddingHorizontal: 4 },
  serviceIconWrap: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  serviceText: { color: COLORS.text, fontSize: 11, fontWeight: '700', textAlign: 'center' },

  // Sections
  sectionContainer: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '900', paddingHorizontal: 20, marginBottom: 12 },
  seeAllText: { color: COLORS.primary, fontSize: 13, fontWeight: 'bold', marginBottom: 2 },

  // Boarding Pass
  boardingPass: { flexDirection: 'row', backgroundColor: COLORS.primary, marginHorizontal: 20, borderRadius: 20, overflow: 'hidden', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  cutoutTop: { position: 'absolute', top: -10, left: '68%', width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.background, zIndex: 2 },
  cutoutBottom: { position: 'absolute', bottom: -10, left: '68%', width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.background, zIndex: 2 },
  bpLeft: { width: '70%', padding: 16, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed' },
  bpBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  bpBadgeText: { color: COLORS.surface, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  bpTitle: { color: COLORS.surface, fontSize: 18, fontWeight: '900', marginBottom: 6 },
  bpDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 12, lineHeight: 18, fontWeight: '500' },
  bpRight: { width: '30%', backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },

  // Promo Carousel
  promoScroll: { paddingHorizontal: 20, gap: 12, paddingBottom: 8 },
  promoCard: { width: width * 0.65, padding: 16, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  promoIconBg: { position: 'absolute', right: -5, bottom: -5 },
  promoTitle: { color: COLORS.surface, fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  promoDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginBottom: 16 },
  promoBtn: { backgroundColor: COLORS.surface, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start' },
  promoBtnText: { fontWeight: 'bold', fontSize: 11 },

  // Destinations
  destinationList: { backgroundColor: COLORS.surface, marginHorizontal: 20, borderRadius: 20, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  destItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  destIconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  destInfo: { flex: 1 },
  destTitle: { color: COLORS.text, fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  destSubtitle: { color: COLORS.textMuted, fontSize: 12 },
  destDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 48, marginVertical: 2 },

});

export default CustomerDashboardScreen;
