import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Tỷ lệ thẻ CCCD tiêu chuẩn ID-1 (85.6mm x 53.98mm ~ 1.58:1)
const CARD_WIDTH = width * 0.88;
const CARD_HEIGHT = CARD_WIDTH / 1.58;
const QR_BOX_SIZE = width * 0.72; // Khung ô vuông quét QR riêng biệt

const COLORS = {
  primary: '#0ea5e9',
  surface: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.65)',
  cardBorder: '#38BDF8',
  white: '#FFFFFF',
  textMuted: '#94A3B8',
  error: '#EF4444',
};

export default function DocumentScannerModal({
  visible,
  title = 'Chụp Căn cước công dân',
  instruction = 'Đặt thẻ căn cước vừa khít vào khung viền dưới đây',
  scanQr = false,
  scanType = 'card', // 'card' (chữ nhật) hoặc 'qr' (ô vuông phóng to)
  zoomLevel = 0,
  onClose,
  onCapture,
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState('off');
  const [zoom, setZoom] = useState(0);
  const [previewUri, setPreviewUri] = useState(null);
  const [scannedQrData, setScannedQrData] = useState(null);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [isModalReady, setIsModalReady] = useState(false);
  const [cameraKey, setCameraKey] = useState(1);
  const cameraRef = useRef(null);
  const isQrProcessing = useRef(false);

  const isQrSquareMode = scanType === 'qr';

  useEffect(() => {
    if (visible) {
      setFlash('off');
      setPreviewUri(null);
      setIsModalReady(false);
      // Mặc định zoom 0.15 (~1.5x) khi chụp thẻ để giữ khoảng cách 15-20cm, tránh out nét tiêu cự cận cảnh.
      const defaultCardZoom = 0.15;
      const initialZoom = isQrSquareMode
        ? (zoomLevel > 0 ? zoomLevel : 0.3)
        : (zoomLevel > 0 ? zoomLevel : defaultCardZoom);
      setZoom(initialZoom);
      // Trên Android, CameraView cần mount sau khi hiệu ứng slide modal hoàn tất để tránh bị đen màn hình
      const timer = setTimeout(() => {
        setIsModalReady(true);
        setCameraKey((prev) => prev + 1);
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setFlash('off');
      setZoom(0.15);
      setIsModalReady(false);
    }
  }, [visible, isQrSquareMode, zoomLevel]);



  const [previewBase64, setPreviewBase64] = useState(null);

  const handleRetake = () => {
    setPreviewUri(null);
    setPreviewBase64(null);
    setScannedQrData(null);
    setTakingPhoto(false);
    isQrProcessing.current = false;
    // Tăng cameraKey để buộc camera re-mount và kích hoạt lại luồng quét Barcode/QR
    setCameraKey((prev) => prev + 1);
  };

  const handleClose = () => {
    setFlash('off');
    setPreviewUri(null);
    setPreviewBase64(null);
    setScannedQrData(null);
    setTakingPhoto(false);
    setIsModalReady(false);
    isQrProcessing.current = false;
    onClose();
  };

  const parseCccdQr = (data) => {
    if (!data || typeof data !== 'string') return null;
    const parts = data.split('|');
    if (parts.length >= 6) {
      const cccd = parts[0]?.trim();
      const fullName = parts[2]?.trim();
      const rawDob = parts[3]?.trim();
      const gender = parts[4]?.trim();
      const address = parts[5]?.trim();
      const rawIssueDate = parts[6]?.trim();

      let formattedDob = '';
      if (rawDob && rawDob.length === 8) {
        formattedDob = `${rawDob.slice(0, 2)}/${rawDob.slice(2, 4)}/${rawDob.slice(4, 8)}`;
      }

      let formattedIssueDate = '';
      if (rawIssueDate && rawIssueDate.length === 8) {
        formattedIssueDate = `${rawIssueDate.slice(0, 2)}/${rawIssueDate.slice(2, 4)}/${rawIssueDate.slice(4, 8)}`;
      }

      return {
        cccd,
        fullName,
        dob: formattedDob,
        gender,
        address,
        issueDate: formattedIssueDate,
        raw: data,
      };
    }
    return null;
  };

  // Hàm chuẩn hóa định dạng ngày từ nhiều kiểu khác nhau (DDMMYYYY, DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD...) về chuẩn DD/MM/YYYY
  const normalizeDate = (rawStr) => {
    if (!rawStr || typeof rawStr !== 'string') return null;
    const clean = rawStr.trim();
    if (!clean) return null;

    // 1. Dạng 8 số liền nhau: DDMMYYYY (vd: 17022003 -> 17/02/2003, 08112059 -> 08/11/2059)
    if (/^\d{8}$/.test(clean)) {
      return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4, 8)}`;
    }

    // 2. Dạng phân cách bởi gạch chéo (/), gạch ngang (-), chấm (.): DD/MM/YYYY hoặc DD-MM-YYYY
    const dmyMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (dmyMatch) {
      const d = dmyMatch[1].padStart(2, '0');
      const m = dmyMatch[2].padStart(2, '0');
      const y = dmyMatch[3];
      return `${d}/${m}/${y}`;
    }

    // 3. Dạng ISO: YYYY-MM-DD hoặc YYYY/MM/DD
    const isoMatch = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (isoMatch) {
      const y = isoMatch[1];
      const m = isoMatch[2].padStart(2, '0');
      const d = isoMatch[3].padStart(2, '0');
      return `${d}/${m}/${y}`;
    }

    return clean;
  };

  const parseGplxQr = (data) => {
    if (!data || typeof data !== 'string') return null;
    const cleanData = data.trim();

    // 1. Phân tích theo định dạng chuẩn phân cách bằng dấu chấm phẩy (;) của Tổng cục Đường bộ Việt Nam:
    // Cấu trúc: [Số GPLX];[Họ và tên];[Ngày sinh];[Hạng];[Ngày cấp];[Thời hạn];[Nơi cấp]
    // Ví dụ 1: 270223043616;KHÚC VĂN TUẤN;17022003;A1;22122022;Không thời hạn;Sở GTVT Tỉnh Bắc Ninh
    // Ví dụ 2: 151230002376;LÊ VƯƠNG THÚY;08112004;A1;14062023;Không thời hạn;Yên Bái
    // Ví dụ 3: 151230002376;LÊ VƯƠNG THÚY;08/11/2004;B1;01-10-2024;08112059;Hà Nội
    const semicolonParts = cleanData.split(';').map((s) => s.trim());
    if (semicolonParts.length >= 4) {
      const gplxNumber = semicolonParts[0] || null;
      const fullName = semicolonParts[1] || null;
      const rawDob = semicolonParts[2] || null;
      const gplxClassRaw = semicolonParts[3] || null;
      const rawIssueDate = semicolonParts[4] || null;
      const rawExpiry = semicolonParts[5] || null;
      const placeOfIssue = semicolonParts[6] || null;

      // Hạng bằng lái dạng String chuẩn (vd: 'A1', 'B1', 'B2'...)
      const mainClass = gplxClassRaw ? gplxClassRaw.toUpperCase() : '';
      let detectedClasses = [];
      if (gplxClassRaw) {
        detectedClasses = gplxClassRaw
          .split(/[\s,]+/)
          .map((c) => c.toUpperCase())
          .filter(Boolean);
      }

      // Kiểm tra Không thời hạn
      const isIndefinite =
        (rawExpiry &&
          (rawExpiry.toUpperCase().includes('KHONG THOI HAN') ||
            rawExpiry.toUpperCase().includes('KHÔNG THỜI HẠN') ||
            rawExpiry.toUpperCase().includes('VO THOI HAN') ||
            rawExpiry.toUpperCase().includes('VÔ THỜI HẠN'))) ||
        detectedClasses.includes('A1') ||
        detectedClasses.includes('A2') ||
        detectedClasses.includes('A3');

      // Chuẩn hóa ngày hết hạn, ngày sinh, ngày cấp về chuẩn DD/MM/YYYY
      const formattedExpiry = isIndefinite ? null : normalizeDate(rawExpiry);
      const formattedDob = normalizeDate(rawDob);
      const formattedIssueDate = normalizeDate(rawIssueDate);

      return {
        type: 'GPLX',
        gplxNumber,
        fullName,
        dob: formattedDob,
        gplxClass: mainClass, // Hạng bằng dạng String
        gplxClasses: detectedClasses,
        issueDate: formattedIssueDate,
        expiryDate: formattedExpiry,
        isIndefinite,
        placeOfIssue,
        raw: data,
      };
    }

    // 2. Fallback nếu mã QR ở định dạng khác (dấu gạch đứng |, khoảng trắng...)
    let detectedNumber = null;
    const numMatch = cleanData.match(/\b\d{12}\b/);
    if (numMatch) {
      detectedNumber = numMatch[0];
    }

    const validClasses = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'C', 'D', 'E', 'FB2', 'FC', 'FD', 'FE'];
    let detectedClasses = [];
    const tokens = cleanData.split(/[\s|,\/;:\-\n\r]+/);
    tokens.forEach((rawToken) => {
      const token = rawToken.toUpperCase().trim();
      if (validClasses.includes(token) && !detectedClasses.includes(token)) {
        detectedClasses.push(token);
      }
    });

    let isIndefinite = false;
    const upperData = cleanData.toUpperCase();
    if (
      upperData.includes('KHONG THOI HAN') ||
      upperData.includes('KHÔNG THỜI HẠN') ||
      upperData.includes('VO THOI HAN') ||
      upperData.includes('VÔ THỜI HẠN') ||
      (detectedClasses.length === 1 && ['A1', 'A2', 'A3'].includes(detectedClasses[0]))
    ) {
      isIndefinite = true;
    }

    let detectedExpiry = null;
    if (!isIndefinite) {
      const dateMatches = cleanData.match(/\b\d{2}\/\d{2}\/\d{4}\b/g);
      if (dateMatches && dateMatches.length > 0) {
        detectedExpiry = dateMatches[dateMatches.length - 1];
      }
    }

    if (detectedClasses.length > 0 || detectedNumber || detectedExpiry || isIndefinite) {
      return {
        type: 'GPLX',
        gplxNumber: detectedNumber,
        gplxClasses: detectedClasses,
        expiryDate: detectedExpiry,
        isIndefinite: isIndefinite,
        raw: data,
      };
    }
    return null;
  };

  const handleBarcodeScanned = async (scanResult) => {
    if (!scanQr || isQrProcessing.current || previewUri || takingPhoto) return;

    const { data, bounds } = scanResult || {};

    // 1. Kiểm tra tọa độ: Nếu hệ điều hành cung cấp bounds, đảm bảo mã QR phải nằm trong vùng khung camera
    if (bounds && bounds.origin && bounds.size) {
      const qrCenterX = bounds.origin.x + bounds.size.width / 2;
      const qrCenterY = bounds.origin.y + bounds.size.height / 2;

      // Giới hạn khung hình camera hiển thị (CARD_WIDTH x CARD_HEIGHT hoặc QR_BOX_SIZE)
      const targetWidth = isQrSquareMode ? QR_BOX_SIZE : CARD_WIDTH;
      const targetHeight = isQrSquareMode ? QR_BOX_SIZE : CARD_HEIGHT;

      // Nếu tâm mã QR bị lệch ra ngoài mép khung hình -> bỏ qua, chưa chụp
      if (
        qrCenterX < 0 ||
        qrCenterX > targetWidth ||
        qrCenterY < 0 ||
        qrCenterY > targetHeight
      ) {
        return;
      }
    }

    // 2. Thử nhận diện định dạng CCCD
    const parsedCccd = parseCccdQr(data);
    // 3. Thử nhận diện định dạng GPLX
    const parsedGplx = !parsedCccd ? parseGplxQr(data) : null;

    const parsed = parsedCccd || parsedGplx;
    if (!parsed) return;

    isQrProcessing.current = true;
    setScannedQrData(parsed);

    // Chụp lại ảnh thẻ để lưu làm ảnh chứng từ
    if (cameraRef.current) {
      try {
        setTakingPhoto(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          base64: true,
        });
        if (photo?.uri) {
          setPreviewUri(photo.uri);
          setPreviewBase64(photo.base64);
        }
      } catch (err) {
        console.log('Lỗi chụp sau khi quét QR:', err);
      } finally {
        setTakingPhoto(false);
      }
    }
  };

  const handleTakePicture = async () => {
    if (!cameraRef.current || takingPhoto) return;

    setTakingPhoto(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: true,
      });

      if (photo?.uri) {
        setPreviewUri(photo.uri);
        setPreviewBase64(photo.base64);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Lỗi', 'Không thể chụp ảnh. Vui lòng thử lại.');
    } finally {
      setTakingPhoto(false);
    }
  };

  const handleConfirmPhoto = () => {
    if (previewUri) {
      onCapture({ uri: previewUri, base64: previewBase64, qrData: scannedQrData });
      handleClose();
    }
  };

  const toggleFlash = () => {
    setFlash((prev) => (prev === 'off' ? 'on' : 'off'));
  };

  if (!visible) return null;

  // Nếu chưa có quyền camera -> hiển thị nút yêu cầu cấp quyền
  if (!permission || !permission.granted) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={COLORS.primary} />
          <Text style={styles.permissionTitle}>Yêu cầu quyền Camera</Text>
          <Text style={styles.permissionDesc}>
            Vui lòng cấp quyền camera để ứng dụng hiển thị khung quét và chụp ảnh thẻ căn cước trực tiếp.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Cho phép truy cập Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.permissionCloseBtn} onPress={handleClose}>
            <Text style={styles.permissionCloseBtnText}>Hủy bỏ</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onShow={() => {
        setIsModalReady(true);
        setCameraKey((prev) => prev + 1);
      }}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* THANH TIÊU ĐỀ MÀU XANH ĐỒNG BỘ VỚI APP */}
        <SafeAreaView style={styles.headerSafeArea}>
          <View style={styles.headerBar}>
            <TouchableOpacity onPress={handleClose} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            {/* Khoảng trống bên phải cân bằng với nút back */}
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>

        {previewUri ? (
          // 1. MÀN HÌNH XÁC NHẬN ẢNH CHỤP
          <View style={styles.previewContainer}>
            <View style={styles.cameraBoxWrapper}>
              <Image
                source={{ uri: previewUri }}
                style={[
                  styles.previewImage,
                  isQrSquareMode && styles.previewImageSquare,
                ]}
                resizeMode="cover"
              />
            </View>

            {/* Vùng giữa ảnh và nút xác nhận -> căn giữa dòng thông báo */}
            <View style={styles.infoBoxContainer}>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={22} color="#D97706" style={{ marginRight: 10 }} />
                <Text style={styles.infoBoxText}>
                  Vui lòng kiểm tra đảm bảo giấy tờ rõ nét, không bị mất góc, không bị chói lóa sáng.
                </Text>
              </View>
            </View>

            <View style={styles.previewBtnRow}>
              <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
                <Ionicons name="refresh" size={18} color="#475569" style={{ marginRight: 6 }} />
                <Text style={styles.retakeBtnText}>Chụp lại</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmPhoto}>
                <Ionicons name="checkmark" size={18} color={COLORS.white} style={{ marginRight: 6 }} />
                <Text style={styles.confirmBtnText}>Sử dụng ảnh</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // 2. MÀN HÌNH CHỤP: NỀN TRẮNG, KHUNG CAMERA CỐ ĐỊNH Ở GIỮA
          <View style={styles.bodyContent}>
            {/* KHUNG CAMERA CỐ ĐỊNH CHÍNH GIỮA (Ô VUÔNG KHI QUÉT QR, CHỮ NHẬT KHI CHỤP THẺ) */}
            <View style={styles.cameraBoxWrapper}>
              <View style={[styles.cameraBox, isQrSquareMode && styles.cameraBoxSquare]}>
                {isModalReady ? (
                  <CameraView
                    key={`camera-${cameraKey}`}
                    ref={cameraRef}
                    style={styles.cameraStream}
                    facing="back"
                    zoom={zoom}
                    enableTorch={flash === 'on'}
                    barcodeScannerSettings={scanQr ? { barcodeTypes: ['qr'] } : undefined}
                    onBarcodeScanned={scanQr ? handleBarcodeScanned : undefined}
                  />
                ) : (
                  <View style={styles.cameraLoading}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.cameraLoadingText}>Đang bật camera...</Text>
                  </View>
                )}

                {/* Tia quét laser hiệu ứng khi quét QR */}
                {isQrSquareMode && (
                  <View style={styles.qrScanTargetWrapper}>
                    <View style={styles.qrScanLine} />
                  </View>
                )}

                {/* 4 góc viền căn chỉnh của khung */}
                <View style={[styles.corner, styles.cornerTL, isQrSquareMode && styles.cornerSquare]} />
                <View style={[styles.corner, styles.cornerTR, isQrSquareMode && styles.cornerSquare]} />
                <View style={[styles.corner, styles.cornerBL, isQrSquareMode && styles.cornerSquare]} />
                <View style={[styles.corner, styles.cornerBR, isQrSquareMode && styles.cornerSquare]} />
              </View>

              {/* Nút tùy chỉnh mức độ phóng to zoom cho người dùng */}
              {isQrSquareMode && (
                <View style={styles.zoomControlRow}>
                  <Text style={styles.zoomLabel}>Thu phóng:</Text>
                  {[
                    { label: '1x', val: 0 },
                    { label: '2x (Tự động)', val: 0.3 },
                    { label: '3x', val: 0.55 },
                  ].map((lvl) => (
                    <TouchableOpacity
                      key={lvl.label}
                      style={[
                        styles.zoomChip,
                        Math.abs(zoom - lvl.val) < 0.08 && styles.zoomChipActive,
                      ]}
                      onPress={() => setZoom(lvl.val)}
                    >
                      <Text
                        style={[
                          styles.zoomChipText,
                          Math.abs(zoom - lvl.val) < 0.08 && styles.zoomChipTextActive,
                        ]}
                      >
                        {lvl.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Vùng giữa khung hình và nút chụp -> căn giữa dòng thông báo */}
            <View style={styles.infoBoxContainer}>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={22} color="#D97706" style={{ marginRight: 10, marginTop: 2 }} />
                <Text style={styles.infoBoxText}>
                  {instruction || 'Vui lòng đặt giấy tờ thẳng trong khung hình và đảm bảo hình ảnh rõ nét, không bị mất góc, lóa sáng.'}
                </Text>
              </View>
            </View>

            {/* Hàng điều khiển đáy: Nút Flash bên trái, Nút chụp ở giữa */}
            <View style={styles.bottomCaptureContainer}>
              {/* Nút bật/tắt đèn Flash trợ sáng bên trái */}
              <TouchableOpacity
                style={[styles.bottomFlashBtn, flash === 'on' && styles.bottomFlashBtnActive]}
                onPress={toggleFlash}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={flash === 'on' ? 'flashlight' : 'flashlight-outline'}
                  size={24}
                  color={flash === 'on' ? '#D97706' : '#64748B'}
                  style={{ transform: [{ rotate: '-45deg' }] }}
                />
              </TouchableOpacity>

              {/* Nút chụp ở giữa */}
              <TouchableOpacity
                style={[styles.outerCaptureRing, takingPhoto && { opacity: 0.6 }]}
                onPress={handleTakePicture}
                disabled={takingPhoto}
                activeOpacity={0.8}
              >
                <View style={styles.innerCaptureBtn}>
                  {takingPhoto ? (
                    <ActivityIndicator color={COLORS.primary} />
                  ) : (
                    <Ionicons name="camera" size={32} color="#64748B" />
                  )}
                </View>
              </TouchableOpacity>

              {/* Khối đệm bên phải để nút chụp luôn được căn chính giữa */}
              <View style={styles.bottomPlaceholder} />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Thanh tiêu đề trên cùng màu xanh
  headerSafeArea: {
    backgroundColor: COLORS.primary,
  },
  headerBar: {
    height: 54,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginLeft: 10,
  },
  flashBtn: {
    padding: 6,
  },

  // Thân màn hình nền trắng
  bodyContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
  },

  // KHUNG CẦN CHỤP NẰM CHÍNH GIỮA (Chỉ khung này hiện camera)
  cameraBoxWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  cameraBox: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#334155',
    position: 'relative',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  cameraBoxSquare: {
    width: QR_BOX_SIZE,
    height: QR_BOX_SIZE,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#38BDF8',
  },
  previewImageSquare: {
    width: QR_BOX_SIZE,
    height: QR_BOX_SIZE,
    borderRadius: 20,
  },
  cornerSquare: {
    width: 28,
    height: 28,
    borderColor: '#0284C7',
    borderWidth: 4,
  },
  qrScanTargetWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrScanLine: {
    width: '85%',
    height: 2,
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 5,
  },
  zoomControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
  },
  zoomLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 4,
  },
  zoomChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  zoomChipActive: {
    backgroundColor: COLORS.primary,
  },
  zoomChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  zoomChipTextActive: {
    color: '#FFFFFF',
  },
  cameraStream: {
    width: '100%',
    height: '100%',
  },
  cameraLoading: {
    flex: 1,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraLoadingText: {
    color: '#94A3B8',
    marginTop: 8,
    fontSize: 13,
  },

  // 4 góc khung căn chỉnh
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#38BDF8',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 14 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 14 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 14 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 14 },

  // Vùng căn giữa thông báo
  infoBoxContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  // Khung hướng dẫn màu vàng nhạt
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 14,
    marginVertical: 4,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 19,
    fontWeight: '500',
  },

  // Nút chụp kiểu vòng tròn ở đáy và nút flash bên cạnh
  bottomCaptureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
    width: '100%',
  },
  bottomFlashBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bottomFlashBtnActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  bottomPlaceholder: {
    width: 50,
    height: 50,
  },
  outerCaptureRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  innerCaptureBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Preview Mode
  previewContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 35,
    paddingTop: 10,
  },
  previewImage: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
  },
  previewBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 15,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  retakeBtnText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 15,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  confirmBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },

  // Permission Container
  permissionContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionDesc: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  permissionBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  permissionCloseBtn: { marginTop: 14, padding: 8 },
  permissionCloseBtnText: { color: '#64748B', fontSize: 14 },
});
