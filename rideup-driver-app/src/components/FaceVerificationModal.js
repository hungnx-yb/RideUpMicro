import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Path } from 'react-native-svg';
import { apiService } from '../services/apiService';

const { width } = Dimensions.get('window');

// Khung camera trong modal (modal rộng width - 32, padding 20 mỗi bên)
const CAMERA_BOX_WIDTH = Math.min(width - 72, 320);
const CAMERA_BOX_HEIGHT = Math.round(CAMERA_BOX_WIDTH * 1.4);
// Khung khuôn mặt dạng kim cương bo cong: hẹp ở trán, rộng nhất ở gò má, thon dần xuống cằm
const FACE_GUIDE_WIDTH = Math.round(CAMERA_BOX_WIDTH * 0.66);
const FACE_GUIDE_HEIGHT = Math.round(FACE_GUIDE_WIDTH * 1.45);
// Vị trí khung khuôn mặt: căn giữa ngang, hơi lệch lên để chừa chỗ cho dòng gợi ý ở đáy
const HINT_SPACE = 24;
const FACE_GUIDE_X = (CAMERA_BOX_WIDTH - FACE_GUIDE_WIDTH) / 2;
const FACE_GUIDE_Y = (CAMERA_BOX_HEIGHT - FACE_GUIDE_HEIGHT - HINT_SPACE) / 2;

const buildDiamondFacePath = (x, y, w, h) => {
  const cx = x + w / 2;
  const top = y;
  const bottom = y + h;
  const cheekY = y + h * 0.42; // Ngang gò má = điểm rộng nhất
  const left = x;
  const right = x + w;
  // Tay nắm ngắn => góc kim cương rõ nét nhưng vẫn bo mềm
  const topHandle = w * 0.31;
  const chinHandle = w * 0.23;
  const upperSideHandle = h * 0.23;
  const lowerSideHandle = h * 0.29;
  return [
    `M ${cx} ${top}`,
    `C ${cx + topHandle} ${top} ${right} ${cheekY - upperSideHandle} ${right} ${cheekY}`,
    `C ${right} ${cheekY + lowerSideHandle} ${cx + chinHandle} ${bottom} ${cx} ${bottom}`,
    `C ${cx - chinHandle} ${bottom} ${left} ${cheekY + lowerSideHandle} ${left} ${cheekY}`,
    `C ${left} ${cheekY - upperSideHandle} ${cx - topHandle} ${top} ${cx} ${top}`,
    'Z',
  ].join(' ');
};

const FACE_GUIDE_PATH = buildDiamondFacePath(FACE_GUIDE_X, FACE_GUIDE_Y, FACE_GUIDE_WIDTH, FACE_GUIDE_HEIGHT);
// Lớp phủ tối = cả khung camera trừ đi lỗ hình khuôn mặt (fillRule evenodd)
// AI service trả điểm theo thang 0-100 (vd 63.39); vẫn hỗ trợ thang 0-1 cho dữ liệu cũ
const toPercent = (score) => {
  if (score == null || Number.isNaN(Number(score))) return null;
  const value = Number(score);
  return Math.round(value > 1 ? value : value * 100);
};

const FACE_MASK_PATH =`M 0 0 H ${CAMERA_BOX_WIDTH} V ${CAMERA_BOX_HEIGHT} H 0 Z ${FACE_GUIDE_PATH}`;

const COLORS = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  primary: '#0ea5e9',
  primaryDark: '#0284c7',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  overlay: 'rgba(15, 23, 42, 0.75)',
};

export default function FaceVerificationModal({
  visible,
  onClose,
  mode = 'enroll', // 'enroll' (Chụp chân dung eKYC) hoặc 'verify' (Xác minh khuôn mặt)
  cccdBase64 = null,
  onSuccess,
}) {
  const [capturedImage, setCapturedImage] = useState(null); // { uri, base64 }
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const cameraRef = useRef(null);

  // Trên Android, CameraView cần mount sau khi hiệu ứng slide của modal xong để tránh màn hình đen
  const [isModalReady, setIsModalReady] = useState(false);
  useEffect(() => {
    if (!visible) {
      setIsModalReady(false);
      return undefined;
    }
    const timer = setTimeout(() => setIsModalReady(true), 350);
    return () => clearTimeout(timer);
  }, [visible]);

  const isEnrollMode = mode === 'enroll';
  const modalTitle = isEnrollMode ? 'Chụp ảnh chân dung' : 'Xác minh khuôn mặt';

  const resetState = () => {
    setCapturedImage(null);
    setLoading(false);
    setVerificationResult(null);
    setIsCameraReady(false);
    setTakingPhoto(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const takePhotoWithCamera = async () => {
    if (!cameraRef.current || !isCameraReady || takingPhoto) return;

    setTakingPhoto(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      });
      if (photo?.uri) {
        setCapturedImage({ uri: photo.uri, base64: photo.base64 });
        setVerificationResult(null);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Lỗi', 'Không thể chụp ảnh. Vui lòng thử lại.');
    } finally {
      setTakingPhoto(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setVerificationResult(null);
    setIsCameraReady(false);
  };

  const renderCameraArea = () => {
    if (!permission) {
      return (
        <View style={styles.cameraPlaceholder}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.cameraPlaceholder}>
          <Ionicons name="camera-outline" size={48} color="#94A3B8" />
          <Text style={styles.permissionText}>
            Ứng dụng cần quyền camera để chụp ảnh khuôn mặt tài xế.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Cho phép truy cập Camera</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraBox}>
        {isModalReady ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="front"
            // Lat anh dau ra cua camera truoc cho khop voi preview kieu guong.
            // Dung prop cua CameraView thay cho takePictureAsync({ mirror }) da deprecated (expo-camera 58).
            mirror
            onCameraReady={() => setIsCameraReady(true)}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.cameraLoading]}>
            <ActivityIndicator size="large" color="#FFF" />
          </View>
        )}

        {/* Lớp phủ tối xung quanh + viền nét đứt đánh dấu vị trí khuôn mặt */}
        <Svg
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          width={CAMERA_BOX_WIDTH}
          height={CAMERA_BOX_HEIGHT}
        >
          <Path d={FACE_MASK_PATH} fill="rgba(15, 23, 42, 0.55)" fillRule="evenodd" />
          <Path
            d={FACE_GUIDE_PATH}
            fill="none"
            stroke="#38BDF8"
            strokeWidth={3}
            strokeDasharray="10 8"
          />
        </Svg>

        <View pointerEvents="none" style={styles.cameraHint}>
          <Text style={styles.cameraHintText}>Đặt khuôn mặt vừa khung hình</Text>
        </View>
      </View>
    );
  };



  const submitFaceVerification = async () => {
    if (!capturedImage || !capturedImage.base64) {
      Alert.alert('Chưa có ảnh', 'Vui lòng chụp ảnh khuôn mặt trước khi tiếp tục.');
      return;
    }

    setLoading(true);
    setVerificationResult(null);

    try {
      let res;
      if (isEnrollMode) {
        res = await apiService.enrollDriverFace(capturedImage.base64, cccdBase64);
      } else {
        res = await apiService.verifyDriverFace(capturedImage.base64);
      }

      const resultData = res?.data?.result;

      if (isEnrollMode) {
        const similarityPercent = toPercent(resultData?.faceMatchScore);
        setVerificationResult({
          success: true,
          title: 'Đăng ký thành công',
          similarity: similarityPercent,
          message: similarityPercent 
            ? `Độ trùng khớp với CCCD: ${similarityPercent}%. Khuôn mặt đã được xác thực an toàn.`
            : 'Khuôn mặt đã được quét và mã hóa an toàn vào hệ thống eKYC.',
        });
      } else {
        setVerificationResult({
          success: true,
          title: 'Xác thực thành công',
          similarity: toPercent(resultData?.similarity),
          message: resultData?.message || 'Xác minh danh tính tài xế thành công!',
        });
      }

      if (onSuccess) {
        onSuccess(resultData, capturedImage);
      }
    } catch (error) {
      console.error('Face verification error:', error?.response?.data || error.message);
      const errorMsg =
        error?.response?.data?.message ||
        'Không thể xác minh khuôn mặt. Vui lòng đảm bảo chụp ảnh người thật, đủ ánh sáng và thử lại.';

      setVerificationResult({
        success: false,
        title: 'Xác thực không thành công',
        message: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.modalTitle}>Chụp ảnh chân dung</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          <View style={styles.body}>
            {!capturedImage ? (
              // Trạng thái chuẩn bị chụp
              <View style={styles.emptyState}>
                {renderCameraArea()}

                <View style={styles.tipsList}>
                  <View style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                    <Text style={styles.tipText}>Đưa khuôn mặt vào giữa khung hình, nhìn thẳng.</Text>
                  </View>
                  <View style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                    <Text style={styles.tipText}>Không đeo kính râm, khẩu trang hoặc mũ trùm.</Text>
                  </View>
                </View>

                <View style={styles.captureActions}>
                  <TouchableOpacity
                    style={[
                      styles.primaryCaptureBtn,
                      (!permission?.granted || !isCameraReady || takingPhoto) && { opacity: 0.6 },
                    ]}
                    onPress={takePhotoWithCamera}
                    disabled={!permission?.granted || !isCameraReady || takingPhoto}
                  >
                    {takingPhoto ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="camera" size={20} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.primaryCaptureBtnText}>Chụp ảnh</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Trạng thái đã chụp được ảnh
              <View style={styles.previewState}>
                <View style={styles.previewImageContainer}>
                  <Image source={{ uri: capturedImage.uri }} style={styles.previewImage} />
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />

                  {loading && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="large" color="#FFF" />
                      <Text style={styles.loadingText}>AI đang phân tích Liveness & So khớp vector...</Text>
                    </View>
                  )}
                </View>

                {/* Kết quả sau khi AI xử lý */}
                {verificationResult && (
                  <View
                    style={[
                      styles.resultCard,
                      verificationResult.success ? styles.resultSuccessCard : styles.resultErrorCard,
                    ]}
                  >
                    <Ionicons
                      name={verificationResult.success ? 'checkmark-circle' : 'alert-circle'}
                      size={24}
                      color={verificationResult.success ? COLORS.success : COLORS.error}
                      style={{ marginRight: 8 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.resultTitle,
                          { color: verificationResult.success ? COLORS.success : COLORS.error },
                        ]}
                      >
                        {verificationResult.title}
                      </Text>
                      {verificationResult.similarity != null && (
                        <Text style={styles.resultMetrics}>
                          Độ tương đồng: <Text style={{ fontWeight: '700' }}>{verificationResult.similarity}%</Text>
                        </Text>
                      )}
                      {/* Chỉ hiện lời giải thích khi thất bại; khi thành công đã có tiêu đề + độ tương đồng */}
                      {!verificationResult.success && (
                        <Text style={styles.resultMessage}>{verificationResult.message}</Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Nút hành động */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.btnRetake, loading && { opacity: 0.5 }]}
                    onPress={handleRetake}
                    disabled={loading}
                  >
                    <Ionicons name="refresh" size={18} color={COLORS.textMuted} style={{ marginRight: 6 }} />
                    <Text style={styles.btnRetakeText}>Chụp lại</Text>
                  </TouchableOpacity>

                  {!verificationResult?.success ? (
                    <TouchableOpacity
                      style={[styles.btnConfirm, loading && { opacity: 0.7 }]}
                      onPress={submitFaceVerification}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-done" size={18} color="#FFF" style={{ marginRight: 6 }} />
                              <Text style={styles.btnConfirmText}>Xác nhận ảnh chụp</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.btnFinish} onPress={handleClose}>
                      <Text style={styles.btnFinishText}>Hoàn tất</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: width - 32,
    maxWidth: 420,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flex: 1,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  enrollBadge: {
    backgroundColor: '#ECFDF5',
  },
  verifyBadge: {
    backgroundColor: '#E0F2FE',
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    alignItems: 'center',
  },
  emptyState: {
    width: '100%',
    alignItems: 'center',
  },
  cameraBox: {
    width: CAMERA_BOX_WIDTH,
    height: CAMERA_BOX_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    marginVertical: 12,
  },
  cameraLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
  cameraPlaceholder: {
    width: CAMERA_BOX_WIDTH,
    height: CAMERA_BOX_HEIGHT,
    borderRadius: 18,
    marginVertical: 12,
    padding: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  permissionBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  permissionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cameraHint: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cameraHintText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: COLORS.primary,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },

  instructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 8,
  },
  tipsList: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginLeft: 8,
    flex: 1,
  },
  captureActions: {
    width: '100%',
    gap: 10,
  },
  primaryCaptureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryCaptureBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  secondaryPickBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  previewState: {
    width: '100%',
    alignItems: 'center',
  },
  previewImageContainer: {
    width: CAMERA_BOX_WIDTH,
    height: CAMERA_BOX_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  resultCard: {
    width: '100%',
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  resultSuccessCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  resultErrorCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  resultMetrics: {
    fontSize: 12,
    color: COLORS.text,
    marginBottom: 4,
  },
  resultMessage: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  btnRetake: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnRetakeText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  btnConfirm: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 12,
  },
  btnConfirmText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  btnFinish: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: 13,
    borderRadius: 12,
  },
  btnFinishText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
