import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';
import DropdownSelect from '../components/DropdownSelect'; // Assuming this exists as in the customer app

const COLORS = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  primary: '#0ea5e9',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  success: '#10b981',
};

export default function MarketplaceScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [provinces, setProvinces] = useState([]);
  const [startProvinceId, setStartProvinceId] = useState('');
  const [endProvinceId, setEndProvinceId] = useState('');
  
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);

  // Invitation Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [myTrips, setMyTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [quickMessage, setQuickMessage] = useState('Xe trống, sẵn sàng đón ngay!');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchProvinces();
    fetchRequests();
    fetchMyStartedTrips();
  }, []);

  const fetchProvinces = async () => {
    try {
      const res = await apiService.getAllProvinces();
      if (res.data.code === 1000) {
        setProvinces(res.data.result.map(p => ({ id: p.id, name: p.name })));
      }
    } catch (e) {
      console.warn('Cannot fetch provinces', e);
    }
  };

  const fetchMyStartedTrips = async () => {
    try {
      const res = await apiService.getDriverTrips({ page: 0, size: 50 });
      if (res.data.code === 1000) {
        const trips = res.data.result.content || [];
        // Only get trips that are OPEN or STARTED to invite
        const availableTrips = trips.filter(t => t.status === 'STARTED' || t.status === 'OPEN');
        setMyTrips(availableTrips.map(t => ({ 
          id: t.id, 
          name: `${t.startProvinceName} -> ${t.endProvinceName} (${new Date(t.departureTime).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})})` 
        })));
      }
    } catch (e) {
      console.warn('Cannot fetch driver trips', e);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startProvinceId) params.startProvinceId = startProvinceId;
      if (endProvinceId) params.endProvinceId = endProvinceId;
      
      const res = await apiService.getMarketplaceTripRequests(params);
      if (res.data.code === 1000) {
        setRequests(res.data.result.content || []);
      } else {
        setRequests([]);
      }
    } catch (e) {
      console.warn('Fetch requests error:', e);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInvite = (req) => {
    setSelectedRequest(req);
    setSelectedTripId(myTrips.length > 0 ? myTrips[0].id : '');
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
        message: quickMessage
      };
      const res = await apiService.sendTripRequestInvitation(payload);
      if (res.data.code === 1000) {
        Alert.alert('Thành công', 'Đã gửi lời mời đến khách hàng!');
        setSelectedRequest(null);
        // Refresh requests or optimistic UI
        fetchRequests();
      } else {
        Alert.alert('Lỗi', res.data.message || 'Không thể gửi lời mời.');
      }
    } catch (error) {
      Alert.alert('Lỗi', error?.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setIsSending(false);
    }
  };

  const renderRequestCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>{(item.passengerName || 'K').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.passengerInfo}>
          <Text style={styles.passengerName}>{item.passengerName || 'Khách Hàng'}</Text>
          <Text style={styles.requestTime}>Cần đi lúc: {new Date(item.fromTime).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</Text>
        </View>
        <View style={styles.seatBadge}>
          <Ionicons name="people" size={14} color={COLORS.primary} />
          <Text style={styles.seatText}>{item.seatTotal} ghế</Text>
        </View>
      </View>

      <View style={styles.routeBox}>
        <View style={styles.routePoint}>
          <Ionicons name="location" size={18} color={COLORS.primary} />
          <Text style={styles.routeText} numberOfLines={1}>{item.startProvinceName}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <Ionicons name="flag" size={18} color="#F59E0B" />
          <Text style={styles.routeText} numberOfLines={1}>{item.endProvinceName}</Text>
        </View>
      </View>

      {item.note && (
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>"{item.note}"</Text>
        </View>
      )}

      <TouchableOpacity style={styles.inviteBtn} onPress={() => handleOpenInvite(item)}>
        <Ionicons name="paper-plane" size={18} color={COLORS.surface} style={{ marginRight: 8 }} />
        <Text style={styles.inviteBtnText}>MỜI ĐI XE NÀY</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Chợ Khách</Text>
          <Text style={styles.headerSub}>Tìm khách nhanh chóng dọc đường</Text>
        </View>
      </View>

      {/* Sticky Filter */}
      <View style={styles.filterCard}>
        <TouchableOpacity style={styles.cardHeaderToggle} onPress={() => setIsFilterExpanded(!isFilterExpanded)} activeOpacity={0.8}>
          <Text style={styles.cardTitle}>Bộ Lọc Tìm Khách</Text>
          <Ionicons name={isFilterExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.primary} />
        </TouchableOpacity>

        {isFilterExpanded && (
          <View style={styles.filterBody}>
            <View style={styles.filterRow}>
              <View style={styles.filterCol}>
                <Text style={styles.filterLabel}>TỪ TỈNH</Text>
                <DropdownSelect
                  label="Tỉnh đi"
                  placeholder="Chọn tỉnh đi"
                  value={startProvinceId}
                  options={provinces}
                  onSelect={setStartProvinceId}
                />
              </View>
              <View style={styles.filterCol}>
                <Text style={styles.filterLabel}>ĐẾN TỈNH</Text>
                <DropdownSelect
                  label="Tỉnh đến"
                  placeholder="Chọn tỉnh đến"
                  value={endProvinceId}
                  options={provinces}
                  onSelect={setEndProvinceId}
                />
              </View>
            </View>
            <TouchableOpacity style={styles.searchBtn} onPress={fetchRequests}>
              <Text style={styles.searchBtnText}>LỌC YÊU CẦU</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestCard}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Ionicons name="search-outline" size={60} color={COLORS.border} />
              <Text style={styles.emptyText}>Chưa có khách nào đang tìm xe.</Text>
            </View>
          }
        />
      )}

      {/* Invite Modal */}
      <Modal visible={!!selectedRequest} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Gửi Lời Mời</Text>
              <TouchableOpacity onPress={() => setSelectedRequest(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Mời khách {selectedRequest?.passengerName} đi tuyến {selectedRequest?.startProvinceName} ➔ {selectedRequest?.endProvinceName}.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Chọn chuyến xe của bạn:</Text>
              <DropdownSelect
                label="Chuyến xe"
                placeholder="Chọn chuyến xe đang mở/chạy"
                value={selectedTripId}
                options={myTrips}
                onSelect={setSelectedTripId}
              />
              {myTrips.length === 0 && (
                <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>Bạn chưa có chuyến xe nào đang mở.</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gửi tin nhắn nhanh:</Text>
              <View style={styles.chipRow}>
                {['Xe trống, đón ngay!', 'Mình tiện đường, giá rẻ', 'Xe 7 chỗ rộng rãi'].map((msg, i) => (
                  <TouchableOpacity 
                    key={i} 
                    style={[styles.chip, quickMessage === msg && styles.chipActive]}
                    onPress={() => setQuickMessage(msg)}
                  >
                    <Text style={[styles.chipText, quickMessage === msg && styles.chipTextActive]}>{msg}</Text>
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
                <Text style={styles.confirmBtnText}>GỬI LỜI MỜI</Text>
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
  header: { padding: 20, backgroundColor: COLORS.surface, elevation: 4, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  headerSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  
  filterCard: { backgroundColor: COLORS.surface, margin: 16, marginBottom: 8, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  cardHeaderToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  filterBody: { marginTop: 16, borderTopWidth: 1, borderTopColor: COLORS.background, paddingTop: 16 },
  filterRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  filterCol: { flex: 1 },
  filterLabel: { fontSize: 11, fontWeight: 'bold', color: COLORS.textMuted, marginBottom: 6 },
  searchBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  searchBtnText: { color: COLORS.surface, fontWeight: '800', fontSize: 14 },

  listContainer: { padding: 16, paddingBottom: 100 },
  emptyText: { color: COLORS.textMuted, marginTop: 12, fontSize: 14 },

  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(14, 165, 233, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  passengerInfo: { flex: 1 },
  passengerName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  requestTime: { fontSize: 12, color: COLORS.primary, marginTop: 2, fontWeight: '600' },
  seatBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(14, 165, 233, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
  seatText: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary },

  routeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, padding: 12, borderRadius: 12, gap: 12, marginBottom: 12 },
  routePoint: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeText: { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1 },
  routeLine: { width: 1, height: 20, backgroundColor: COLORS.border, marginHorizontal: 4 },

  noteBox: { marginBottom: 16, paddingHorizontal: 4 },
  noteText: { fontStyle: 'italic', color: COLORS.textMuted, fontSize: 13 },

  inviteBtn: { backgroundColor: COLORS.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12 },
  inviteBtnText: { color: COLORS.surface, fontWeight: '800', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  modalSub: { fontSize: 14, color: COLORS.textMuted, marginBottom: 24, lineHeight: 20 },
  
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: 'rgba(14, 165, 233, 0.1)', borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textMuted },
  chipTextActive: { color: COLORS.primary, fontWeight: '600' },

  confirmBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  confirmBtnText: { color: COLORS.surface, fontWeight: 'bold', fontSize: 16 },
});
