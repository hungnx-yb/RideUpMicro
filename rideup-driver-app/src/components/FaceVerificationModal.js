import React, { useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../services/apiService';

const { width } = Dimensions.get('window');

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
  mode = 'verify', // 'enroll' (Đăng ký eKYC) hoặc 'verify' (Điểm danh / Bật Online)
  onSuccess,
}) {
  const [capturedImage, setCapturedImage] = useState(null); // { uri, base64 }
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const isEnrollMode = mode === 'enroll';
  const modalTitle = isEnrollMode ? 'Đăng ký khuôn mặt (eKYC)' : 'Xác minh điểm danh tài xế';

  const resetState = () => {
    setCapturedImage(null);
    setLoading(false);
    setVerificationResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const takePhotoWithCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cấp quyền camera', 'Ứng dụng cần quyền sử dụng camera để quét khuôn mặt tài xế.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setCapturedImage({
          uri: asset.uri,
          base64: asset.base64,
        });
        setVerificationResult(null);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Lỗi', 'Không thể khởi động camera. Vui lòng thử lại.');
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cấp quyền thư viện', 'Ứng dụng cần quyền chọn ảnh từ thư viện.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setCapturedImage({
          uri: asset.uri,
          base64: asset.base64,
        });
        setVerificationResult(null);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể mở thư viện ảnh.');
    }
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
        res = await apiService.enrollDriverFace(capturedImage.base64);
      } else {
        res = await apiService.verifyDriverFace(capturedImage.base64);
      }

      const resultData = res?.data?.result;

      if (isEnrollMode) {
        setVerificationResult({
          success: true,
          title: 'Đăng ký thành công',
          message: 'Khuôn mặt đã được quét và mã hóa an toàn vào hệ thống eKYC.',
        });
      } else {
        setVerificationResult({
          success: true,
          title: 'Xác thực thành công',
          similarity: resultData?.similarity,
          livenessScore: resultData?.livenessScore,
          message: resultData?.message || 'Xác minh danh tính tài xế thành công!',
        });
      }

      if (onSuccess) {
        onSuccess(resultData);
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
              <View style={[styles.modeBadge, isEnrollMode ? styles.enrollBadge : styles.verifyBadge]}>
                <Ionicons
                  name={isEnrollMode ? 'shield-checkmark' : 'scan'}
                  size={16}
                  color={isEnrollMode ? COLORS.success : COLORS.primary}
                />
                <Text
                  style={[
                    styles.modeBadgeText,
                    { color: isEnrollMode ? COLORS.success : COLORS.primary },
                  ]}
                >
                  {isEnrollMode ? 'eKYC AI' : 'Điểm danh 1:1'}
                </Text>
              </View>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
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
                <View style={styles.scanTargetBox}>
                  <View style={styles.faceOvalPlaceholder}>
                    <Ionicons name="person-outline" size={80} color="#94A3B8" />
                  </View>
                  {/* Bốn góc viền sinh trắc học */}
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>

                <Text style={styles.instructionsTitle}>Hướng dẫn quét khuôn mặt:</Text>
                <View style={styles.tipsList}>
                  <View style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                    <Text style={styles.tipText}>Đưa khuôn mặt vào giữa khung hình, nhìn thẳng.</Text>
                  </View>
                  <View style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                    <Text style={styles.tipText}>Không đeo kính râm, khẩu trang hoặc mũ trùm.</Text>
                  </View>
                  <View style={styles.tipRow}>
                    <Ionicons name="shield-outline" size={16} color={COLORS.warning} />
                    <Text style={styles.tipText}>Hệ thống AI sẽ tự động chống ảnh in hoặc ảnh màn hình.</Text>
                  </View>
                </View>

                <View style={styles.captureActions}>
                  <TouchableOpacity style={styles.primaryCaptureBtn} onPress={takePhotoWithCamera}>
                    <Ionicons name="camera" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryCaptureBtnText}>Mở Camera Chụp Live</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.secondaryPickBtn} onPress={pickImageFromGallery}>
                    <Ionicons name="images-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.secondaryPickBtnText}>Chọn ảnh từ thư viện</Text>
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
                      {verificationResult.similarity !== undefined && (
                        <Text style={styles.resultMetrics}>
                          Độ tương đồng: <Text style={{ fontWeight: '700' }}>{verificationResult.similarity}%</Text> | Người thật: <Text style={{ fontWeight: '700' }}>{verificationResult.livenessScore}%</Text>
                        </Text>
                      )}
                      <Text style={styles.resultMessage}>{verificationResult.message}</Text>
                    </View>
                  </View>
                )}

                {/* Nút hành động */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.btnRetake, loading && { opacity: 0.5 }]}
                    onPress={() => setCapturedImage(null)}
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
                          <Text style={styles.btnConfirmText}>
                            {isEnrollMode ? 'Xác nhận Đăng ký' : 'Xác thực Điểm danh'}
                          </Text>
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
  scanTargetBox: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
    position: 'relative',
  },
  faceOvalPlaceholder: {
    width: 160,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
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
    width: 200,
    height: 200,
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
