import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/apiService';
import FaceVerificationModal from '../components/FaceVerificationModal';
import DocumentScannerModal from '../components/DocumentScannerModal';

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
};

const VEHICLE_TYPE_OPTIONS = [
  { value: 'CAR_4_SEAT', label: 'Xe 4 chỗ', seats: '4' },
  { value: 'CAR_5_SEAT', label: 'Xe 5 chỗ', seats: '5' },
  { value: 'CAR_7_SEAT', label: 'Xe 7 chỗ', seats: '7' },
  { value: 'VAN_9_SEAT', label: 'Van 9 chỗ', seats: '9' },
  { value: 'VAN_12_SEAT', label: 'Van 12 chỗ', seats: '12' },
  { value: 'LIMOUSINE_9_SEAT', label: 'Limousine 9 chỗ', seats: '9' },
  { value: 'LIMOUSINE_11_SEAT', label: 'Limousine 11 chỗ', seats: '11' },
  { value: 'MINIBUS_16_SEAT', label: 'Minibus 16 chỗ', seats: '16' },
  { value: 'MINIBUS_24_SEAT', label: 'Minibus 24 chỗ', seats: '24' },
  { value: 'BUS_29_SEAT', label: 'Xe khách 29 chỗ', seats: '29' },
  { value: 'BUS_35_SEAT', label: 'Xe khách 35 chỗ', seats: '35' },
  { value: 'BUS_45_SEAT', label: 'Xe khách 45 chỗ', seats: '45' },
];

export default function DriverOnboardingScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);

  // QUẢN LÝ BƯỚC (1: Định danh, 2: Thông tin cá nhân, 3: GPLX & Phương tiện)
  const [currentStep, setCurrentStep] = useState(1);

  // BƯỚC 1: ĐỊNH DANH
  const [cccdFront, setCccdFront] = useState(null);
  const [cccdBack, setCccdBack] = useState(null);
  const [portraitImage, setPortraitImage] = useState(null);
  const [isFaceEnrolled, setIsFaceEnrolled] = useState(false);
  const [faceModalVisible, setFaceModalVisible] = useState(false);

  // BƯỚC 2: THÔNG TIN CÁ NHÂN (Tự động điền từ QR CCCD)
  const [cccd, setCccd] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // BƯỚC 3: GPLX & PHƯƠNG TIỆN
  const [gplxFront, setGplxFront] = useState(null);
  const [gplxBack, setGplxBack] = useState(null);
  const [gplx, setGplx] = useState('');
  const [gplxIssueDate, setGplxIssueDate] = useState('');
  const [gplxExpiryDate, setGplxExpiryDate] = useState('31/12/2030');
  const [gplxIssuePlace, setGplxIssuePlace] = useState('');
  const [isIndefiniteGplx, setIsIndefiniteGplx] = useState(false);
  const [gplxClasses, setGplxClasses] = useState(['B2']);
  const [gplxImage, setGplxImage] = useState(null);

  // Thông tin phương tiện
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [seatCapacity, setSeatCapacity] = useState('4');
  const [vehicleType, setVehicleType] = useState('CAR_4_SEAT');
  const [showVehicleTypePicker, setShowVehicleTypePicker] = useState(false);
  const [vehicleImage, setVehicleImage] = useState(null);
  const [registrationFront, setRegistrationFront] = useState(null);
  const [registrationBack, setRegistrationBack] = useState(null);

  // Quản lý lỗi validation
  const [errors, setErrors] = useState({});

  // Animated values để rung lắc từng ô
  const shakeAnimCccdFront = useRef(new Animated.Value(0)).current;
  const shakeAnimCccdBack = useRef(new Animated.Value(0)).current;
  const shakeAnimEkyc = useRef(new Animated.Value(0)).current;
  const shakeAnimCccd = useRef(new Animated.Value(0)).current;
  const shakeAnimName = useRef(new Animated.Value(0)).current;
  const shakeAnimPhone = useRef(new Animated.Value(0)).current;
  const shakeAnimGplx = useRef(new Animated.Value(0)).current;
  const shakeAnimGplxFrontImg = useRef(new Animated.Value(0)).current;
  const shakeAnimGplxBackImg = useRef(new Animated.Value(0)).current;
  const shakeAnimPlate = useRef(new Animated.Value(0)).current;
  const shakeAnimVehicleImg = useRef(new Animated.Value(0)).current;
  const shakeAnimRegistrationFront = useRef(new Animated.Value(0)).current;
  const shakeAnimRegistrationBack = useRef(new Animated.Value(0)).current;

  const triggerShake = (animValue) => {
    animValue.setValue(0);
    Animated.sequence([
      Animated.timing(animValue, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(animValue, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(animValue, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(animValue, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(animValue, { toValue: -4, duration: 60, useNativeDriver: true }),
      Animated.timing(animValue, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  // Modal Camera
  const [scannerConfig, setScannerConfig] = useState({
    visible: false,
    title: '',
    instruction: '',
    onCaptured: null,
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const res = await apiService.getMyDriverProfile();
      const data = res?.data?.result;
      setProfile(data);

      if (data && data.status === 'APPROVED' && data.isFaceEnrolled) {
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        return;
      }

      if (data) {
        // Nếu hồ sơ đã nộp hoàn chỉnh và đang chờ duyệt
        if (data.status === 'PENDING' && data.cccd && data.gplx) {
          setIsFaceEnrolled(!!data.isFaceEnrolled);
          setCccd(data.cccd);
          setGplx(data.gplx);
        } else if (data.status === 'REJECTED') {
          // Hồ sơ bị từ chối -> giữ profile để render màn hình REJECTED
        } else {
          // Chưa hoàn tất nộp hồ sơ mà thoát ra -> yêu cầu làm lại từ đầu (Bước 1)
          setCurrentStep(1);
          setIsFaceEnrolled(false);
          setCccd('');
          setGplx('');
        }
      } else {
        setCurrentStep(1);
        setIsFaceEnrolled(false);
      }
    } catch (error) {
      setProfile(null);
      setCurrentStep(1);
      setIsFaceEnrolled(false);
    }

    try {
      const userRes = await apiService.getMyUserInfo();
      const userData = userRes?.data?.result;
      if (userData) {
        if (userData.phoneNumber) setPhoneNumber(userData.phoneNumber);
        if (userData.fullName && !fullName) setFullName(userData.fullName);
      }
    } catch (err) {
      console.log('Không thể lấy info user:', err);
    } finally {
      setLoading(false);
    }
  };

  const openDocumentScanner = (
    title,
    instruction,
    onCaptured,
    scanQr = false,
    scanType = 'card',
    zoomLevel = 0
  ) => {
    setScannerConfig({
      visible: true,
      title,
      instruction,
      scanQr,
      scanType,
      zoomLevel,
      onCaptured,
    });
  };

  // Hàm trích xuất tự động thông tin từ mã QR thẻ Căn cước công dân (CCCD cũ hoặc mới)
  const applyQrDataToForm = (qrData) => {
    if (!qrData) return;
    const { cccd: qrCccd, fullName: qrFullName, dob: qrDob, gender: qrGender, address: qrAddress, issueDate: qrIssueDate } = qrData;
    if (qrCccd) {
      setCccd(qrCccd);
      setErrors((prev) => ({ ...prev, cccd: false }));
    }
    if (qrFullName) {
      setFullName(qrFullName);
      setErrors((prev) => ({ ...prev, fullName: false }));
    }
    if (qrDob) {
      setDob(qrDob);
    }
    if (qrGender) {
      setGender(qrGender);
    }
    if (qrAddress) {
      setAddress(qrAddress);
    }
    if (qrIssueDate) {
      setIssueDate(qrIssueDate);
    }
  };

  // Xử lý khi chụp xong mặt trước CCCD -> Tự điền thông tin nếu phát hiện mã QR
  const handleCccdFrontCaptured = (photoAsset) => {
    setCccdFront(photoAsset);
    setErrors((prev) => ({ ...prev, cccdFront: false }));

    if (photoAsset?.qrData) {
      applyQrDataToForm(photoAsset.qrData);
    }
  };

  // Xử lý khi chụp xong mặt sau CCCD -> Hỗ trợ thẻ Căn cước mới (mã QR ở mặt sau)
  const handleCccdBackCaptured = (photoAsset) => {
    setCccdBack(photoAsset);
    setErrors((prev) => ({ ...prev, cccdBack: false }));

    if (photoAsset?.qrData) {
      applyQrDataToForm(photoAsset.qrData);
    }
  };

  // Xử lý khi chụp Mặt Trước Bằng lái xe (GPLX)
  const handleGplxFrontCaptured = (photoAsset) => {
    setGplxFront(photoAsset);
    setGplxImage(photoAsset); // Giữ tương thích
    setErrors((prev) => ({ ...prev, gplxFront: false }));

    if (photoAsset?.qrData) {
      applyGplxQrToForm(photoAsset.qrData);
    }
  };

  // Xử lý khi chụp Mặt Sau Bằng lái xe (GPLX) -> Chứa mã QR theo chuẩn thẻ PET
  const handleGplxBackCaptured = (photoAsset) => {
    setGplxBack(photoAsset);
    setErrors((prev) => ({ ...prev, gplxBack: false }));

    if (photoAsset?.qrData) {
      applyGplxQrToForm(photoAsset.qrData);
    }
  };

  // Xử lý khi chụp Giấy đăng ký xe (Mặt trước)
  const handleRegistrationFrontCaptured = (photoAsset) => {
    setRegistrationFront(photoAsset);
    setErrors((prev) => ({ ...prev, registrationFront: false }));
  };

  // Xử lý khi chụp Giấy đăng ký xe (Mặt sau)
  const handleRegistrationBackCaptured = (photoAsset) => {
    setRegistrationBack(photoAsset);
    setErrors((prev) => ({ ...prev, registrationBack: false }));
  };

  // Xử lý khi chụp Ảnh xe thực tế
  const handleVehicleImageCaptured = (photoAsset) => {
    setVehicleImage(photoAsset);
    setErrors((prev) => ({ ...prev, vehicleImage: false }));
  };

  const applyGplxQrToForm = (qr) => {
    if (!qr) return;
    let fieldsFilled = [];

    if (qr.gplxNumber) {
      setGplx(qr.gplxNumber);
      setErrors((prev) => ({ ...prev, gplx: false }));
      fieldsFilled.push(`Số GPLX: ${qr.gplxNumber}`);
    }
    if (qr.fullName && !fullName) {
      setFullName(qr.fullName);
      fieldsFilled.push(`Họ tên: ${qr.fullName}`);
    }
    if (qr.dob && !dob) {
      setDob(qr.dob);
      fieldsFilled.push(`Ngày sinh: ${qr.dob}`);
    }
    const classStr = qr.gplxClass || (qr.gplxClasses ? qr.gplxClasses.join(', ') : '');
    if (classStr) {
      const classArr = classStr.split(/[\s,]+/).filter(Boolean);
      setGplxClasses(classArr);
      fieldsFilled.push(`Hạng: ${classStr}`);
    }
    if (qr.issueDate) {
      setGplxIssueDate(qr.issueDate);
      fieldsFilled.push(`Ngày cấp: ${qr.issueDate}`);
    }
    if (qr.placeOfIssue) {
      setGplxIssuePlace(qr.placeOfIssue);
      fieldsFilled.push(`Nơi cấp: ${qr.placeOfIssue}`);
    }
    if (qr.isIndefinite) {
      setIsIndefiniteGplx(true);
      setGplxExpiryDate('');
    } else if (qr.expiryDate) {
      setGplxExpiryDate(qr.expiryDate);
      setIsIndefiniteGplx(false);
    }
  };

  // Mở máy quét riêng biệt dành cho mã QR trên thẻ GPLX (Khung ô vuông & Tự động phóng to)
  const handleScanGplxQrOnly = () => {
    openDocumentScanner(
      'Quét Mã QR Bằng Lái Xe',
      'Hướng camera vào mã QR nhỏ ở mặt sau thẻ GPLX. Hệ thống đã tự động phóng to để nhận diện nhanh chóng.',
      (photoAsset) => {
        if (photoAsset?.qrData) {
          applyGplxQrToForm(photoAsset.qrData);
        }
      },
      true, // Bật chế độ quét QR
      'qr', // Chế độ ô vuông riêng biệt
      0.35 // Tự động phóng to zoom 2x-3x
    );
  };

  // Format ngày sinh DD/MM/YYYY tự động chèn dấu /
  const handleDobChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
    setDob(formatted);
  };

  // Format ngày cấp thẻ CCCD DD/MM/YYYY tự động chèn dấu /
  const handleIssueDateChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
    setIssueDate(formatted);
  };

  // Format ngày DD/MM/YYYY tự động chèn dấu /
  const handleDateChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
    setGplxExpiryDate(formatted);
  };

  // KIỂM TRA BƯỚC 1 -> CHUYỂN SANG BƯỚC 2
  const handleNextStep1 = () => {
    const newErrors = {};
    if (!cccdFront) {
      newErrors.cccdFront = true;
      triggerShake(shakeAnimCccdFront);
    }
    if (!cccdBack) {
      newErrors.cccdBack = true;
      triggerShake(shakeAnimCccdBack);
    }
    if (!isFaceEnrolled) {
      newErrors.ekyc = true;
      triggerShake(shakeAnimEkyc);
      if (!cccdFront || !cccdBack) {
        Alert.alert('Chưa hoàn tất CCCD', 'Vui lòng chụp đủ 2 mặt Căn cước công dân trước khi chụp ảnh chân dung.');
      } else {
        Alert.alert('Chưa chụp chân dung', 'Vui lòng bấm "Chụp ảnh chân dung để tiếp tục" để đối soát khuôn mặt với ảnh trên CCCD.');
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setCurrentStep(2);
  };

  // KIỂM TRA BƯỚC 2 -> CHUYỂN SANG BƯỚC 3 (Không được để trống bất kỳ trường nào)
  const handleNextStep2 = () => {
    const newErrors = {};
    if (!cccd.trim() || cccd.trim().length < 9) {
      newErrors.cccd = true;
      triggerShake(shakeAnimCccd);
    }
    if (!fullName.trim()) {
      newErrors.fullName = true;
      triggerShake(shakeAnimName);
    }
    if (!dob.trim()) {
      newErrors.dob = true;
    }
    if (!gender.trim()) {
      newErrors.gender = true;
    }
    if (!address.trim()) {
      newErrors.address = true;
    }
    if (!issueDate.trim()) {
      newErrors.issueDate = true;
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ tất cả các trường thông tin cá nhân.');
      return;
    }

    setCurrentStep(3);
  };

  // HOÀN TẤT BƯỚC 3 & GỬI TOÀN BỘ HỒ SƠ (Không được để trống bất kỳ trường nào)
  const handleSubmitAll = async () => {
    const newErrors = {};
    if (!gplxFront) {
      newErrors.gplxFront = true;
      triggerShake(shakeAnimGplxFrontImg);
    }
    if (!gplxBack) {
      newErrors.gplxBack = true;
      triggerShake(shakeAnimGplxBackImg);
    }
    if (!gplx.trim()) {
      newErrors.gplx = true;
      triggerShake(shakeAnimGplx);
    }
    if (!isIndefiniteGplx && !gplxExpiryDate.trim()) {
      newErrors.gplxExpiryDate = true;
    }
    if (!gplxIssueDate.trim()) {
      newErrors.gplxIssueDate = true;
    }
    if (!gplxIssuePlace.trim()) {
      newErrors.gplxIssuePlace = true;
    }
    if (!gplxClasses || gplxClasses.length === 0) {
      newErrors.gplxClasses = true;
    }
    if (!plateNumber.trim()) {
      newErrors.plateNumber = true;
      triggerShake(shakeAnimPlate);
    }
    if (!vehicleBrand.trim()) {
      newErrors.vehicleBrand = true;
    }
    if (!vehicleModel.trim()) {
      newErrors.vehicleModel = true;
    }
    if (!vehicleColor.trim()) {
      newErrors.vehicleColor = true;
    }
    if (!vehicleImage) {
      newErrors.vehicleImage = true;
      triggerShake(shakeAnimVehicleImg);
    }
    if (!registrationFront) {
      newErrors.registrationFront = true;
      triggerShake(shakeAnimRegistrationFront);
    }
    if (!registrationBack) {
      newErrors.registrationBack = true;
      triggerShake(shakeAnimRegistrationBack);
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      console.log('[DEBUG SUBMIT] Missing fields in Step 3:', Object.keys(newErrors));
      Alert.alert('Thiếu thông tin', 'Vui lòng cung cấp đầy đủ hình ảnh, thông tin GPLX và thông tin phương tiện.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Cập nhật thông tin cá nhân tài xế (Họ tên, ngày sinh, giới tính, nơi thường trú, ngày cấp)
      try {
        let formattedDob = null;
        if (dob && dob.includes('/')) {
          const p = dob.split('/');
          if (p.length === 3) formattedDob = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
        }

        let formattedIssueDate = null;
        if (issueDate && issueDate.includes('/')) {
          const p = issueDate.split('/');
          if (p.length === 3) formattedIssueDate = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
        }

        let mappedGender = null;
        if (gender) {
          const g = gender.trim().toUpperCase();
          if (g === 'NAM' || g === 'MALE') mappedGender = 'MALE';
          else if (g === 'NỮ' || g === 'NU' || g === 'FEMALE') mappedGender = 'FEMALE';
          else mappedGender = 'OTHER';
        }

        await apiService.updateMyUserInfo({
          fullName: fullName.trim(),
          phoneNumber: phoneNumber ? phoneNumber.trim() : undefined,
          dateOfBirth: formattedDob,
          gender: mappedGender,
          address: address ? address.trim() : undefined,
          cccdIssueDate: formattedIssueDate,
        });
      } catch (e) {
        console.log('Lỗi cập nhật user info:', e);
      }

      // 2. Gửi hồ sơ đăng ký tài xế (CCCD & GPLX 2 mặt)
      const formData = new FormData();
      formData.append('cccd', cccd.trim());
      formData.append('gplx', gplx.trim());
      if (!isIndefiniteGplx && gplxExpiryDate) {
        const parts = gplxExpiryDate.split('/');
        let formattedDate = gplxExpiryDate;
        if (parts.length === 3) {
          formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        formData.append('gplxExpiryDate', formattedDate);
      }

      if (gplxIssueDate) {
        const parts = gplxIssueDate.split('/');
        let formattedDate = gplxIssueDate;
        if (parts.length === 3) {
          formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        formData.append('gplxIssueDate', formattedDate);
      }

      if (gplxIssuePlace) {
        formData.append('gplxIssuePlace', gplxIssuePlace.trim());
      }

      if (gplxClasses && gplxClasses.length > 0) {
        gplxClasses.forEach((cls) => {
          formData.append('gplxClasses', cls);
        });
      }

      formData.append('cccdImageFront', {
        uri: cccdFront.uri,
        name: 'cccd_front.jpg',
        type: 'image/jpeg',
      });
      formData.append('cccdImageBack', {
        uri: cccdBack.uri,
        name: 'cccd_back.jpg',
        type: 'image/jpeg',
      });
      
      const primaryGplx = gplxFront || gplxBack;
      formData.append('gplxImage', {
        uri: primaryGplx.uri,
        name: 'gplx.jpg',
        type: 'image/jpeg',
      });
      if (gplxFront) {
        formData.append('gplxImageFront', {
          uri: gplxFront.uri,
          name: 'gplx_front.jpg',
          type: 'image/jpeg',
        });
      }
      if (gplxBack) {
        formData.append('gplxImageBack', {
          uri: gplxBack.uri,
          name: 'gplx_back.jpg',
          type: 'image/jpeg',
        });
      }

      // Thông tin phương tiện gửi cùng hồ sơ tài xế
      if (plateNumber.trim()) {
        formData.append('plateNumber', plateNumber.trim().toUpperCase());
        formData.append('vehicleBrand', vehicleBrand.trim());
        formData.append('vehicleModel', vehicleModel.trim());
        formData.append('vehicleColor', vehicleColor.trim());
        formData.append('vehicleYear', '2022');
        formData.append('seatCapacity', seatCapacity || '4');
        formData.append('vehicleType', vehicleType || 'CAR_4_SEAT');

        if (vehicleImage) {
          formData.append('vehicleImage', {
            uri: vehicleImage.uri,
            name: 'vehicle.jpg',
            type: 'image/jpeg',
          });
        }

        if (registrationFront) {
          formData.append('registrationImage', {
            uri: registrationFront.uri,
            name: 'registration_front.jpg',
            type: 'image/jpeg',
          });
          formData.append('registrationImageFront', {
            uri: registrationFront.uri,
            name: 'registration_front.jpg',
            type: 'image/jpeg',
          });
        }

        if (registrationBack) {
          formData.append('registrationImageBack', {
            uri: registrationBack.uri,
            name: 'registration_back.jpg',
            type: 'image/jpeg',
          });
        }
      }

      if (portraitImage) {
        formData.append('portraitImage', {
          uri: portraitImage.uri,
          name: 'portrait.jpg',
          type: 'image/jpeg',
        });
      }

      const res = await apiService.registerDriver(formData);
      const createdProfile = res?.data?.result;
      setProfile(createdProfile);

      Alert.alert(
        'Đăng ký hồ sơ hoàn tất!',
        'Hồ sơ của bạn đã được gửi thành công. Vui lòng chờ Ban Quản Trị duyệt để bắt đầu nhận chuyến đi.',
        [{ text: 'Đã hiểu', onPress: () => fetchInitialData() }]
      );
    } catch (error) {
      console.log('[DEBUG SUBMIT ERROR]', error.response?.status, error.response?.data || error.message);
      const msg = error.response?.data?.message || error.message || 'Không thể gửi hồ sơ. Vui lòng kiểm tra lại.';
      Alert.alert('Đăng ký thất bại', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('accessToken');
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang kiểm tra hồ sơ tài xế...</Text>
      </SafeAreaView>
    );
  }

  // HÀM RESET ĐỂ TÀI XẾ ĐĂNG KÝ LẠI HỒ SƠ SAU KHI BỊ REJECT
  const handleReRegister = () => {
    setProfile(null);
    setCurrentStep(1);
    setIsFaceEnrolled(false);
    setCccdFront(null);
    setCccdBack(null);
    setPortraitImage(null);
    setGplxFront(null);
    setGplxBack(null);
    setVehicleImage(null);
    setRegistrationFront(null);
    setRegistrationBack(null);
    setErrors({});
  };

  // NẾU HỒ SƠ BỊ TỪ CHỐI (REJECTED)
  if (profile && profile.status === 'REJECTED') {
    return (
      <SafeAreaView style={[styles.container, styles.center, { padding: 24 }]}>
        <View style={styles.rejectedBadge}>
          <Ionicons name="close" size={46} color="#FFF" />
        </View>
        <Text style={[styles.statusTitle, { color: COLORS.error }]}>Hồ Sơ Bị Từ Chối</Text>
        
        <View style={styles.reasonCard}>
          <Text style={styles.reasonLabel}>Lý do:</Text>
          <Text style={styles.reasonText}>
            {profile.rejectionReason && profile.rejectionReason.trim().length > 0
              ? profile.rejectionReason
              : 'Hồ sơ hoặc thông tin hình ảnh giấy tờ của bạn không đủ điều kiện xét duyệt. Vui lòng kiểm tra và đăng ký lại.'}
          </Text>
        </View>

        <TouchableOpacity style={styles.reRegisterBtn} onPress={handleReRegister}>
          <Ionicons name="create-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.reRegisterBtnText}>Đăng ký lại hồ sơ</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Đăng xuất tài khoản</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // NẾU HỒ SƠ ĐÃ NỘP ĐẦY ĐỦ (CÓ CCCD & GPLX) & ĐANG CHỜ DUYỆT
  if (profile && profile.status === 'PENDING' && profile.cccd && profile.gplx) {
    return (
      <SafeAreaView style={[styles.container, styles.center, { padding: 24 }]}>
        <View style={styles.pendingBadge}>
          <Ionicons name="time" size={60} color={COLORS.warning} />
        </View>
        <Text style={styles.statusTitle}>Hồ Sơ Đang Chờ Duyệt</Text>
        <Text style={styles.statusDesc}>
          Hồ sơ của bạn đã được tiếp nhận thành công. Ban Quản Trị đang tiến hành kiểm tra và duyệt hồ sơ trong thời gian sớm nhất.
        </Text>

        <TouchableOpacity style={styles.refreshBtn} onPress={fetchInitialData}>
          <Ionicons name="reload" size={18} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.refreshBtnText}>Kiểm tra trạng thái duyệt</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Đăng xuất tài khoản</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* THANH BƯỚC ĐIỀU HƯỚNG WIZARD (STEP INDICATOR) */}
      <View style={styles.wizardHeader}>
        <View style={styles.headerInfo}>
          <Text style={styles.logoText}>Ride<Text style={{ color: COLORS.primary }}>Up</Text> Driver</Text>
          <Text style={styles.wizardSubtitle}>Đăng Ký Trở Thành Đối Tác Tài Xế</Text>
        </View>

        <View style={styles.stepIndicatorRow}>
          {/* Bước 1 */}
          <TouchableOpacity
            style={styles.stepItem}
            onPress={() => currentStep > 1 && setCurrentStep(1)}
            disabled={currentStep === 1}
          >
            <View style={[styles.stepCircle, currentStep === 1 && styles.stepCircleActive, currentStep > 1 && styles.stepCircleDone]}>
              {currentStep > 1 ? (
                <Ionicons name="checkmark" size={16} color="#FFF" />
              ) : (
                <Text style={[styles.stepNumber, currentStep === 1 && styles.stepNumberActive]}>1</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, currentStep === 1 && styles.stepLabelActive]}>Định danh</Text>
          </TouchableOpacity>

          <View style={[styles.stepLine, currentStep > 1 && styles.stepLineActive]} />

          {/* Bước 2 */}
          <TouchableOpacity
            style={styles.stepItem}
            onPress={() => currentStep > 2 && setCurrentStep(2)}
            disabled={currentStep <= 2}
          >
            <View style={[styles.stepCircle, currentStep === 2 && styles.stepCircleActive, currentStep > 2 && styles.stepCircleDone]}>
              {currentStep > 2 ? (
                <Ionicons name="checkmark" size={16} color="#FFF" />
              ) : (
                <Text style={[styles.stepNumber, currentStep === 2 && styles.stepNumberActive]}>2</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, currentStep === 2 && styles.stepLabelActive]}>Thông tin</Text>
          </TouchableOpacity>

          <View style={[styles.stepLine, currentStep > 2 && styles.stepLineActive]} />

          {/* Bước 3 */}
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, currentStep === 3 && styles.stepCircleActive]}>
              <Text style={[styles.stepNumber, currentStep === 3 && styles.stepNumberActive]}>3</Text>
            </View>
            <Text style={[styles.stepLabel, currentStep === 3 && styles.stepLabelActive]}>GPLX & Xe</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {/* ============================================================================== */}
        {/* BƯỚC 1: ĐỊNH DANH (CHỤP CCCD 2 MẶT & eKYC) */}
        {/* ============================================================================== */}
        {currentStep === 1 && (
          <View style={styles.stepCard}>
            {/* Chụp 2 mặt CCCD */}
            <View style={styles.fieldSection}>
              <Text style={[styles.fieldLabel, (errors.cccdFront || errors.cccdBack) && styles.fieldLabelError]}>
                Chụp Căn cước công dân
              </Text>

              <View style={styles.imageRow}>
                {/* Mặt trước */}
                <Animated.View style={{ flex: 1, transform: [{ translateX: shakeAnimCccdFront }] }}>
                  <TouchableOpacity
                    style={[styles.imagePickerBox, errors.cccdFront && styles.imagePickerBoxError]}
                    onPress={() =>
                      openDocumentScanner(
                        'Mặt Trước',
                        'Hướng camera vào thẻ CCCD để tự động quét mã QR và chụp ảnh',
                        handleCccdFrontCaptured,
                        true
                      )
                    }
                  >
                    {cccdFront ? (
                      <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <Image source={{ uri: cccdFront.uri }} style={styles.docImage} />
                        <View style={styles.imageSuccessBadge}>
                          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <MaterialCommunityIcons name="card-account-details-outline" size={28} color={errors.cccdFront ? COLORS.error : COLORS.primary} />
                        <Text style={[styles.imagePlaceholderText, errors.cccdFront && styles.fieldLabelError]}>
                          Mặt trước
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {errors.cccdFront && <Text style={styles.errorHelperText}>Thiếu ảnh mặt trước</Text>}
                </Animated.View>

                {/* Mặt sau */}
                <Animated.View style={{ flex: 1, transform: [{ translateX: shakeAnimCccdBack }] }}>
                  <TouchableOpacity
                    style={[styles.imagePickerBox, errors.cccdBack && styles.imagePickerBoxError]}
                    onPress={() => {
                      const hasQrAlready = Boolean(cccdFront?.qrData);
                      openDocumentScanner(
                        'Mặt Sau',
                        hasQrAlready
                          ? 'Vui lòng đặt mặt sau thẻ căn cước vào khung hình, giữ máy thẳng đứng'
                          : 'Đặt mặt sau thẻ vào khung hình (tự động nhận diện mã QR với thẻ Căn cước mới)',
                        handleCccdBackCaptured,
                        !hasQrAlready // Chỉ bật bộ quét barcode/QR nếu mặt trước CHƯA quét được QR
                      );
                    }}
                  >
                    {cccdBack ? (
                      <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <Image source={{ uri: cccdBack.uri }} style={styles.docImage} />
                        <View style={styles.imageSuccessBadge}>
                          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <MaterialCommunityIcons name="card-account-details-outline" size={28} color={errors.cccdBack ? COLORS.error : COLORS.primary} />
                        <Text style={[styles.imagePlaceholderText, errors.cccdBack && styles.fieldLabelError]}>
                          Mặt sau
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {errors.cccdBack && <Text style={styles.errorHelperText}>Thiếu ảnh mặt sau</Text>}
                </Animated.View>
              </View>
            </View>

            {/* Quét khuôn mặt eKYC */}
            <View style={styles.fieldSection}>
              <Text style={[styles.fieldLabel, errors.ekyc && styles.fieldLabelError]}>
                Xác thực khuôn mặt
              </Text>
              <Animated.View style={{ transform: [{ translateX: shakeAnimEkyc }] }}>
                <TouchableOpacity
                  style={[
                    styles.ekycBox,
                    isFaceEnrolled
                      ? styles.ekycBoxSuccess
                      : !(cccdFront && cccdBack)
                      ? styles.ekycBoxDisabled
                      : styles.ekycBoxDefault,
                    errors.ekyc && styles.ekycBoxError,
                  ]}
                  onPress={() => {
                    if (!cccdFront || !cccdBack) {
                      Alert.alert(
                        'Chưa hoàn tất CCCD',
                        'Vui lòng chụp đủ cả 2 mặt thẻ Căn cước công dân trước khi chụp ảnh chân dung.'
                      );
                      return;
                    }
                    setErrors((prev) => ({ ...prev, ekyc: false }));
                    setFaceModalVisible(true);
                  }}
                >
                  <View style={styles.ekycIconWrap}>
                    <Ionicons
                      name={
                        isFaceEnrolled
                          ? 'shield-checkmark'
                          : !(cccdFront && cccdBack)
                          ? 'person-circle-outline'
                          : 'camera'
                      }
                      size={60}
                      color={
                        isFaceEnrolled
                          ? COLORS.success
                          : !(cccdFront && cccdBack)
                          ? COLORS.textMuted
                          : COLORS.primary
                      }
                    />
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text
                      style={[
                        styles.ekycTitle,
                        isFaceEnrolled && { color: COLORS.success, marginBottom: 0 },
                        !(cccdFront && cccdBack) && { color: COLORS.textMuted },
                      ]}
                    >
                      {isFaceEnrolled
                        ? 'Xác thực khuôn mặt thành công'
                        : !(cccdFront && cccdBack)
                        ? 'Hệ thống cần ảnh CCCD để xác thực khuôn mặt'
                        : 'Chụp ảnh chân dung để tiếp tục'}
                    </Text>
                  </View>
                </TouchableOpacity>
                {errors.ekyc && <Text style={styles.errorHelperText}>Bắt buộc phải chụp ảnh chân dung và đối soát thành công để tiếp tục</Text>}
              </Animated.View>
            </View>

            {/* Nút sang bước 2 */}
            <TouchableOpacity style={styles.actionBtn} onPress={handleNextStep1}>
              <Text style={styles.actionBtnText}>Tiếp tục</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* ============================================================================== */}
        {/* BƯỚC 2: THÔNG TIN CÁ NHÂN (TỰ ĐIỀN TỪ OCR + NHẬP SỐ ĐIỆN THOẠI) */}
        {/* ============================================================================== */}
        {currentStep === 2 && (
          <View style={styles.stepCard}>
            <View style={styles.stepTitleRow}>
              <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>BƯỚC 2</Text></View>
              <Text style={styles.stepMainTitle}>Thông Tin Chi Tiết</Text>
            </View>
            <Text style={styles.stepDescText}>
              Kiểm tra thông tin đã được tự động trích xuất từ thẻ Căn cước công dân.
            </Text>

            {/* Số CCCD */}
            <Animated.View style={[styles.inputGroup, { transform: [{ translateX: shakeAnimCccd }] }]}>
              <Text style={[styles.fieldLabel, errors.cccd && styles.fieldLabelError]}>Số Căn cước công dân</Text>
              <TextInput
                style={[styles.input, errors.cccd && styles.inputError]}
                placeholder=""
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                maxLength={12}
                value={cccd}
                onChangeText={(val) => {
                  setCccd(val.replace(/[^0-9]/g, ''));
                  if (errors.cccd) setErrors((prev) => ({ ...prev, cccd: false }));
                }}
              />
              {errors.cccd && <Text style={styles.errorHelperText}>Vui lòng nhập số Căn cước công dân</Text>}
            </Animated.View>

            {/* Họ và tên */}
            <Animated.View style={[styles.inputGroup, { transform: [{ translateX: shakeAnimName }] }]}>
              <Text style={[styles.fieldLabel, errors.fullName && styles.fieldLabelError]}>Họ và tên</Text>
              <TextInput
                style={[styles.input, errors.fullName && styles.inputError]}
                placeholder=""
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="characters"
                value={fullName}
                onChangeText={(val) => {
                  setFullName(val);
                  if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: false }));
                }}
              />
              {errors.fullName && <Text style={styles.errorHelperText}>Vui lòng nhập họ và tên</Text>}
            </Animated.View>

            {/* Ngày sinh */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, errors.dob && styles.fieldLabelError]}>Ngày sinh</Text>
              <TextInput
                style={[styles.input, errors.dob && styles.inputError]}
                placeholder="--/--/----"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                maxLength={10}
                value={dob}
                onChangeText={(val) => {
                  handleDobChange(val);
                  if (errors.dob) setErrors((prev) => ({ ...prev, dob: false }));
                }}
              />
              {errors.dob && <Text style={styles.errorHelperText}>Vui lòng nhập ngày sinh</Text>}
            </View>

            {/* Giới tính */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, errors.gender && styles.fieldLabelError]}>Giới tính</Text>
              <View style={[styles.typeSelectorRow, errors.gender && styles.inputError]}>
                <TouchableOpacity
                  style={[styles.typeBtn, gender === 'Nam' && styles.typeBtnActive]}
                  onPress={() => {
                    setGender('Nam');
                    if (errors.gender) setErrors((prev) => ({ ...prev, gender: false }));
                  }}
                >
                  <Text style={[styles.typeBtnText, gender === 'Nam' && styles.typeBtnTextActive]}>
                    Nam
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeBtn, gender === 'Nữ' && styles.typeBtnActive]}
                  onPress={() => {
                    setGender('Nữ');
                    if (errors.gender) setErrors((prev) => ({ ...prev, gender: false }));
                  }}
                >
                  <Text style={[styles.typeBtnText, gender === 'Nữ' && styles.typeBtnTextActive]}>
                    Nữ
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.gender && <Text style={styles.errorHelperText}>Vui lòng chọn giới tính</Text>}
            </View>

            {/* Nơi thường trú */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, errors.address && styles.fieldLabelError]}>Nơi thường trú</Text>
              <TextInput
                style={[styles.input, errors.address && styles.inputError]}
                placeholder=""
                placeholderTextColor={COLORS.textMuted}
                value={address}
                onChangeText={(val) => {
                  setAddress(val);
                  if (errors.address) setErrors((prev) => ({ ...prev, address: false }));
                }}
              />
              {errors.address && <Text style={styles.errorHelperText}>Vui lòng nhập nơi thường trú</Text>}
            </View>

            {/* Ngày cấp thẻ CCCD */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, errors.issueDate && styles.fieldLabelError]}>Ngày cấp</Text>
              <TextInput
                style={[styles.input, errors.issueDate && styles.inputError]}
                placeholder="--/--/----"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                maxLength={10}
                value={issueDate}
                onChangeText={(val) => {
                  handleIssueDateChange(val);
                  if (errors.issueDate) setErrors((prev) => ({ ...prev, issueDate: false }));
                }}
              />
              {errors.issueDate && <Text style={styles.errorHelperText}>Vui lòng nhập ngày cấp thẻ</Text>}
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.prevBtn} onPress={() => setCurrentStep(1)}>
                <Ionicons name="arrow-back" size={18} color="#475569" style={{ marginRight: 6 }} />
                <Text style={styles.prevBtnText}>Quay lại</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, { flex: 2 }]} onPress={handleNextStep2}>
                <Text style={styles.actionBtnText}>Tiếp tục</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ============================================================================== */}
        {/* BƯỚC 3: GIẤY PHÉP LÁI XE & THÔNG TIN PHƯƠNG TIỆN */}
        {/* ============================================================================== */}
        {currentStep === 3 && (
          <View style={styles.stepCard}>
            <View style={styles.stepTitleRow}>
              <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>BƯỚC 3</Text></View>
              <Text style={styles.stepMainTitle}>GPLX & Phương Tiện</Text>
            </View>
            <Text style={styles.stepDescText}>
              Cung cấp Giấy phép lái xe và thông tin phương tiện.
            </Text>

            {/* 1. CHỤP 2 MẶT GIẤY PHÉP LÁI XE ĐỂ NỘP DUYỆT */}
            <View style={styles.fieldSection}>
              <Text style={[styles.fieldLabel, (errors.gplxFront || errors.gplxBack) && styles.fieldLabelError]}>
                Chụp Giấy phép lái xe
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
                Chụp mặt sau bằng lái xe để tự động lấy thông tin 
              </Text>

              <View style={styles.imageRow}>
                {/* Mặt trước */}
                <Animated.View style={{ flex: 1, transform: [{ translateX: shakeAnimGplxFrontImg }] }}>
                  <TouchableOpacity
                    style={[styles.imagePickerBox, errors.gplxFront && styles.imagePickerBoxError]}
                    onPress={() =>
                      openDocumentScanner(
                        'Mặt Trước',
                        'Đặt mặt trước bằng lái xe vào giữa khung hình căn chỉnh',
                        handleGplxFrontCaptured,
                        false
                      )
                    }
                  >
                    {gplxFront ? (
                      <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <Image source={{ uri: gplxFront.uri }} style={styles.docImage} />
                        <View style={styles.imageSuccessBadge}>
                          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <MaterialCommunityIcons name="card-account-details-outline" size={28} color={errors.gplxFront ? COLORS.error : COLORS.primary} />
                        <Text style={[styles.imagePlaceholderText, errors.gplxFront && styles.fieldLabelError]}>
                          Mặt trước
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {errors.gplxFront && <Text style={styles.errorHelperText}>Thiếu ảnh mặt trước</Text>}
                </Animated.View>

                {/* Mặt sau */}
                <Animated.View style={{ flex: 1, transform: [{ translateX: shakeAnimGplxBackImg }] }}>
                  <TouchableOpacity
                    style={[styles.imagePickerBox, errors.gplxBack && styles.imagePickerBoxError]}
                    onPress={() =>
                      openDocumentScanner(
                        'Mặt Sau',
                        'Hướng camera vào mặt sau thẻ GPLX để tự động quét mã QR và chụp ảnh',
                        handleGplxBackCaptured,
                        true
                      )
                    }
                  >
                    {gplxBack ? (
                      <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <Image source={{ uri: gplxBack.uri }} style={styles.docImage} />
                        <View style={styles.imageSuccessBadge}>
                          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <MaterialCommunityIcons name="card-account-details-outline" size={28} color={errors.gplxBack ? COLORS.error : COLORS.primary} />
                        <Text style={[styles.imagePlaceholderText, errors.gplxBack && styles.fieldLabelError]}>
                          Mặt sau
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {errors.gplxBack && <Text style={styles.errorHelperText}>Thiếu ảnh mặt sau</Text>}
                </Animated.View>
              </View>
            </View>

            {/* 2. CÁC TRƯỜNG THÔNG TIN GPLX & PHƯƠNG TIỆN: CHỈ HIỂN THỊ SAU KHI ĐÃ CHỤP XONG MẶT SAU GPLX */}
            {Boolean(gplxBack) && (
              <View style={{ marginTop: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="checkmark-done-circle" size={20} color={COLORS.success} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text }}>
                    Thông tin Giấy phép lái xe
                  </Text>
                </View>

                {/* Số GPLX */}
                <Animated.View style={[styles.inputGroup, { transform: [{ translateX: shakeAnimGplx }] }]}>
                  <Text style={[styles.fieldLabel, errors.gplx && styles.fieldLabelError]}>Số Giấy phép lái xe</Text>
                  <TextInput
                    style={[styles.input, errors.gplx && styles.inputError]}
                    placeholder=""
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    maxLength={12}
                    value={gplx}
                    onChangeText={(val) => {
                      setGplx(val.replace(/[^0-9]/g, ''));
                      if (errors.gplx) setErrors((prev) => ({ ...prev, gplx: false }));
                    }}
                  />
                  {errors.gplx && <Text style={styles.errorHelperText}>Vui lòng nhập số GPLX</Text>}
                </Animated.View>

                {/* Hàng 1: Ngày cấp GPLX & Ngày hết hạn GPLX cùng 1 hàng */}
                <View style={styles.inputRow}>
                  {/* Ngày cấp GPLX */}
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <View style={{ height: 20, justifyContent: 'center', marginBottom: 6 }}>
                      <Text style={[styles.fieldLabel, { marginBottom: 0 }, errors.gplxIssueDate && styles.fieldLabelError]}>Ngày cấp</Text>
                    </View>
                    <TextInput
                      style={[styles.input, errors.gplxIssueDate && styles.inputError]}
                      placeholder="--/--/----"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numeric"
                      maxLength={10}
                      value={gplxIssueDate}
                      onChangeText={(val) => {
                        const cleaned = val.replace(/[^0-9]/g, '');
                        if (cleaned.length <= 2) setGplxIssueDate(cleaned);
                        else if (cleaned.length <= 4) setGplxIssueDate(`${cleaned.slice(0, 2)}/${cleaned.slice(2)}`);
                        else setGplxIssueDate(`${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`);
                        if (errors.gplxIssueDate) setErrors((prev) => ({ ...prev, gplxIssueDate: false }));
                      }}
                    />
                    {errors.gplxIssueDate && <Text style={styles.errorHelperText}>Thiếu ngày cấp</Text>}
                  </View>

                  {/* Ngày hết hạn GPLX */}
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <View style={{ height: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={[styles.fieldLabel, { marginBottom: 0 }, errors.gplxExpiryDate && styles.fieldLabelError]}>Hết hạn</Text>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                        onPress={() => {
                          setIsIndefiniteGplx((prev) => !prev);
                          if (errors.gplxExpiryDate) setErrors((prev) => ({ ...prev, gplxExpiryDate: false }));
                        }}
                      >
                        <Ionicons
                          name={isIndefiniteGplx ? 'checkbox' : 'square-outline'}
                          size={16}
                          color={isIndefiniteGplx ? COLORS.primary : COLORS.textMuted}
                          style={{ marginRight: 2 }}
                        />
                        <Text style={{ fontSize: 11, color: isIndefiniteGplx ? COLORS.primary : COLORS.textMuted, fontWeight: '600' }}>
                          Vô thời hạn
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={[
                        styles.input,
                        isIndefiniteGplx && { backgroundColor: '#F1F5F9', color: COLORS.textMuted },
                        errors.gplxExpiryDate && styles.inputError,
                      ]}
                      placeholder={isIndefiniteGplx ? 'Vô hạn' : '--/--/----'}
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numeric"
                      maxLength={10}
                      value={isIndefiniteGplx ? 'Không thời hạn' : gplxExpiryDate}
                      editable={!isIndefiniteGplx}
                      onChangeText={(val) => {
                        handleDateChange(val);
                        if (errors.gplxExpiryDate) setErrors((prev) => ({ ...prev, gplxExpiryDate: false }));
                      }}
                    />
                    {errors.gplxExpiryDate && <Text style={styles.errorHelperText}>Thiếu hạn dùng</Text>}
                  </View>
                </View>

                {/* Hàng 2: Nơi cấp GPLX riêng 1 hàng */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, errors.gplxIssuePlace && styles.fieldLabelError]}>Nơi cấp Giấy phép lái xe</Text>
                  <TextInput
                    style={[styles.input, errors.gplxIssuePlace && styles.inputError]}
                    placeholder=""
                    placeholderTextColor={COLORS.textMuted}
                    value={gplxIssuePlace}
                    onChangeText={(val) => {
                      setGplxIssuePlace(val);
                      if (errors.gplxIssuePlace) setErrors((prev) => ({ ...prev, gplxIssuePlace: false }));
                    }}
                  />
                  {errors.gplxIssuePlace && <Text style={styles.errorHelperText}>Vui lòng nhập nơi cấp Giấy phép lái xe</Text>}
                </View>

                {/* Hạng Giấy phép lái xe */}
                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={[styles.fieldLabel, errors.gplxClasses && styles.fieldLabelError]}>Hạng</Text>
                    <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '600' }}>
                      Đã chọn: {gplxClasses.length > 0 ? gplxClasses.join(', ') : 'Chưa chọn'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {['B1', 'B2', 'C', 'D', 'E', 'F'].map((cls) => {
                      const isSelected = gplxClasses.includes(cls);
                      return (
                        <TouchableOpacity
                          key={cls}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (isSelected) {
                              setGplxClasses((prev) => prev.filter((item) => item !== cls));
                            } else {
                              setGplxClasses((prev) => [...prev, cls]);
                            }
                            if (errors.gplxClasses) setErrors((prev) => ({ ...prev, gplxClasses: false }));
                          }}
                          style={{
                            paddingVertical: 7,
                            paddingHorizontal: 14,
                            borderRadius: 8,
                            borderWidth: 1.5,
                            borderColor: isSelected ? COLORS.primary : COLORS.border,
                            backgroundColor: isSelected ? '#F0F9FF' : '#FAFAFA',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '700',
                              color: isSelected ? COLORS.primary : COLORS.text,
                            }}
                          >
                            {cls}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {errors.gplxClasses && <Text style={styles.errorHelperText}>Vui lòng chọn ít nhất 1 hạng bằng lái</Text>}
                </View>

                {/* THÔNG TIN PHƯƠNG TIỆN */}
                <View style={styles.vehicleSectionHeader}>
                  <Ionicons name="car-sport" size={20} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.vehicleSectionTitle}>Thông tin phương tiện đăng ký</Text>
                </View>

                {/* Biển số xe */}
                <Animated.View style={[styles.inputGroup, { transform: [{ translateX: shakeAnimPlate }] }]}>
                  <Text style={[styles.fieldLabel, errors.plateNumber && styles.fieldLabelError]}>Biển số xe</Text>
                  <TextInput
                    style={[styles.input, errors.plateNumber && styles.inputError]}
                    placeholder="Ví dụ:29X1-88888"
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="characters"
                    value={plateNumber}
                    onChangeText={(val) => {
                      setPlateNumber(val);
                      if (errors.plateNumber) setErrors((prev) => ({ ...prev, plateNumber: false }));
                    }}
                  />
                  {errors.plateNumber && <Text style={styles.errorHelperText}>Vui lòng nhập biển số xe</Text>}
                </Animated.View>

                <View style={styles.inputRow}>
                  {/* Hãng xe */}
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, errors.vehicleBrand && styles.fieldLabelError]}>Hãng xe</Text>
                    <TextInput
                      style={[styles.input, errors.vehicleBrand && styles.inputError]}
                      placeholder=""
                      placeholderTextColor={COLORS.textMuted}
                      value={vehicleBrand}
                      onChangeText={(val) => {
                        setVehicleBrand(val);
                        if (errors.vehicleBrand) setErrors((prev) => ({ ...prev, vehicleBrand: false }));
                      }}
                    />
                    {errors.vehicleBrand && <Text style={styles.errorHelperText}>Vui lòng nhập hãng xe</Text>}
                  </View>

                  {/* Dòng xe */}
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, errors.vehicleModel && styles.fieldLabelError]}>Dòng xe</Text>
                    <TextInput
                      style={[styles.input, errors.vehicleModel && styles.inputError]}
                      placeholder=""
                      placeholderTextColor={COLORS.textMuted}
                      value={vehicleModel}
                      onChangeText={(val) => {
                        setVehicleModel(val);
                        if (errors.vehicleModel) setErrors((prev) => ({ ...prev, vehicleModel: false }));
                      }}
                    />
                    {errors.vehicleModel && <Text style={styles.errorHelperText}>Vui lòng nhập dòng xe</Text>}
                  </View>
                </View>

                {/* Màu xe */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, errors.vehicleColor && styles.fieldLabelError]}>Màu xe</Text>
                  <TextInput
                    style={[styles.input, errors.vehicleColor && styles.inputError]}
                    placeholder=""
                    placeholderTextColor={COLORS.textMuted}
                    value={vehicleColor}
                    onChangeText={(val) => {
                      setVehicleColor(val);
                      if (errors.vehicleColor) setErrors((prev) => ({ ...prev, vehicleColor: false }));
                    }}
                  />
                  {errors.vehicleColor && <Text style={styles.errorHelperText}>Vui lòng nhập màu xe</Text>}
                </View>

                {/* Loại xe ô tô (Dropdown) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Loại xe ô tô</Text>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 14,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setShowVehicleTypePicker(true)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="car-sport" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 14, color: COLORS.text, fontWeight: '600' }}>
                        {VEHICLE_TYPE_OPTIONS.find((v) => v.value === vehicleType)?.label || 'Chọn loại xe'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: COLORS.textMuted, marginRight: 6 }}>
                        {seatCapacity} chỗ
                      </Text>
                      <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* 1. Ảnh xe thực tế */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, errors.vehicleImage && styles.fieldLabelError]}>
                    Ảnh xe thực tế
                  </Text>
                  <Animated.View style={{ transform: [{ translateX: shakeAnimVehicleImg }] }}>
                    <TouchableOpacity
                      style={[
                        styles.imagePickerBox,
                        { height: 110 },
                        errors.vehicleImage && styles.imagePickerBoxError,
                      ]}
                      onPress={() =>
                        openDocumentScanner(
                          'Ảnh Xe Thực Tế',
                          'Hướng camera chụp rõ toàn cảnh phương tiện của bạn',
                          handleVehicleImageCaptured,
                          false
                        )
                      }
                    >
                      {vehicleImage ? (
                        <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                          <Image source={{ uri: vehicleImage.uri }} style={styles.docImage} />
                          <View style={styles.imageSuccessBadge}>
                            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                          </View>
                        </View>
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <Ionicons
                            name="car-sport"
                            size={28}
                            color={errors.vehicleImage ? COLORS.error : COLORS.primary}
                          />
                          <Text
                            style={[
                              styles.imagePlaceholderText,
                              errors.vehicleImage && styles.fieldLabelError,
                            ]}
                          >
                            Chụp ảnh xe thực tế
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                  {errors.vehicleImage && (
                    <Text style={styles.errorHelperText}>Vui lòng chụp ảnh xe thực tế</Text>
                  )}
                </View>

                {/* 2. Ảnh Giấy đăng ký xe 2 mặt */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Giấy đăng ký xe</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {/* Mặt trước đăng ký xe */}
                    <Animated.View style={{ flex: 1, transform: [{ translateX: shakeAnimRegistrationFront }] }}>
                      <TouchableOpacity
                        style={[
                          styles.imagePickerBox,
                          { height: 105 },
                          errors.registrationFront && styles.imagePickerBoxError,
                        ]}
                        onPress={() =>
                          openDocumentScanner(
                            'Đăng Ký Xe Mặt Trước',
                            'Hướng camera chụp rõ toàn bộ mặt trước Giấy đăng ký xe',
                            handleRegistrationFrontCaptured,
                            false
                          )
                        }
                      >
                        {registrationFront ? (
                          <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                            <Image source={{ uri: registrationFront.uri }} style={styles.docImage} />
                            <View style={styles.imageSuccessBadge}>
                              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                            </View>
                          </View>
                        ) : (
                          <View style={styles.imagePlaceholder}>
                            <MaterialCommunityIcons
                              name="card-account-details-outline"
                              size={28}
                              color={errors.registrationFront ? COLORS.error : COLORS.primary}
                            />
                            <Text
                              style={[
                                styles.imagePlaceholderText,
                                errors.registrationFront && styles.fieldLabelError,
                              ]}
                            >
                              Mặt trước
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                      {errors.registrationFront && (
                        <Text style={styles.errorHelperText}>Thiếu mặt trước</Text>
                      )}
                    </Animated.View>

                    {/* Mặt sau đăng ký xe */}
                    <Animated.View style={{ flex: 1, transform: [{ translateX: shakeAnimRegistrationBack }] }}>
                      <TouchableOpacity
                        style={[
                          styles.imagePickerBox,
                          { height: 105 },
                          errors.registrationBack && styles.imagePickerBoxError,
                        ]}
                        onPress={() =>
                          openDocumentScanner(
                            'Đăng Ký Xe Mặt Sau',
                            'Hướng camera chụp rõ toàn bộ mặt sau Giấy đăng ký xe',
                            handleRegistrationBackCaptured,
                            false
                          )
                        }
                      >
                        {registrationBack ? (
                          <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                            <Image source={{ uri: registrationBack.uri }} style={styles.docImage} />
                            <View style={styles.imageSuccessBadge}>
                              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                            </View>
                          </View>
                        ) : (
                          <View style={styles.imagePlaceholder}>
                            <MaterialCommunityIcons
                              name="card-account-details-outline"
                              size={28}
                              color={errors.registrationBack ? COLORS.error : COLORS.primary}
                            />
                            <Text
                              style={[
                                styles.imagePlaceholderText,
                                errors.registrationBack && styles.fieldLabelError,
                              ]}
                            >
                              Mặt sau
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                      {errors.registrationBack && (
                        <Text style={styles.errorHelperText}>Thiếu mặt sau</Text>
                      )}
                    </Animated.View>
                  </View>
                </View>

                {/* Nút gửi toàn bộ hồ sơ */}
                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.prevBtn} onPress={() => setCurrentStep(2)}>
                    <Ionicons name="arrow-back" size={18} color="#475569" style={{ marginRight: 6 }} />
                    <Text style={styles.prevBtnText}>Quay lại</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { flex: 2 }, submitting && { opacity: 0.7 }]}
                    onPress={handleSubmitAll}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Text style={styles.actionBtnText}>Hoàn tất & Nộp hồ sơ</Text>
                        <Ionicons name="checkmark-done" size={18} color="#FFF" style={{ marginLeft: 6 }} />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Nút quay lại bước 2 khi chưa chụp mặt sau GPLX */}
            {!Boolean(gplxBack) && (
              <View style={[styles.btnRow, { marginTop: 24 }]}>
                <TouchableOpacity style={styles.prevBtn} onPress={() => setCurrentStep(2)}>
                  <Ionicons name="arrow-back" size={18} color="#475569" style={{ marginRight: 6 }} />
                  <Text style={styles.prevBtnText}>Quay lại</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Đăng xuất tài khoản</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>

      {/* Modal eKYC Camera */}
      <FaceVerificationModal
        visible={faceModalVisible}
        mode="enroll"
        cccdBase64={cccdFront?.base64}
        onClose={() => setFaceModalVisible(false)}
        onSuccess={(resultData, capturedImg) => {
          setFaceModalVisible(false);
          setIsFaceEnrolled(true);
          if (capturedImg) {
            setPortraitImage(capturedImg);
          }
          setErrors((prev) => ({ ...prev, ekyc: false }));
          Alert.alert(
            'Xác thực thành công',
            'Khuôn mặt của bạn đã trùng khớp với ảnh chân dung trên thẻ CCCD.',
            [
              {
                text: 'Tiếp tục',
                onPress: () => setCurrentStep(2),
              },
            ]
          );
        }}
      />

      {/* Modal Khung Camera Chụp Giấy Tờ */}
      <DocumentScannerModal
        visible={scannerConfig.visible}
        title={scannerConfig.title}
        instruction={scannerConfig.instruction}
        scanQr={scannerConfig.scanQr}
        scanType={scannerConfig.scanType}
        zoomLevel={scannerConfig.zoomLevel}
        onClose={() => setScannerConfig((prev) => ({ ...prev, visible: false }))}
        onCapture={(photoAsset) => {
          if (scannerConfig.onCaptured) {
            scannerConfig.onCaptured(photoAsset);
          }
        }}
      />
      {/* Modal Dropdown Chọn Loại Xe Ô Tô */}
      <Modal
        visible={showVehicleTypePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowVehicleTypePicker(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            justifyContent: 'flex-end',
          }}
          activeOpacity={1}
          onPress={() => setShowVehicleTypePicker(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '65%',
              paddingTop: 16,
              paddingBottom: Platform.OS === 'ios' ? 34 : 20,
            }}
          >
            {/* Header Modal */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingBottom: 14,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.border,
              }}
            >
              <View>
                <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.text }}>
                  Chọn loại xe ô tô
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
                  Danh sách loại xe được hệ thống RideUp hỗ trợ
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowVehicleTypePicker(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#F1F5F9',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Danh sách lựa chọn */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              {VEHICLE_TYPE_OPTIONS.map((opt) => {
                const isSelected = vehicleType === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    activeOpacity={0.7}
                    onPress={() => {
                      setVehicleType(opt.value);
                      setSeatCapacity(opt.seats);
                      setShowVehicleTypePicker(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      marginVertical: 3,
                      backgroundColor: isSelected ? '#F0F9FF' : 'transparent',
                      borderWidth: isSelected ? 1.5 : 1,
                      borderColor: isSelected ? COLORS.primary : '#F1F5F9',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons
                        name="car-sport"
                        size={20}
                        color={isSelected ? COLORS.primary : COLORS.textMuted}
                        style={{ marginRight: 12 }}
                      />
                      <View>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: isSelected ? '700' : '600',
                            color: isSelected ? COLORS.primary : COLORS.text,
                          }}
                        >
                          {opt.label}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },
  loadingText: { marginTop: 12, color: COLORS.textMuted, fontSize: 14 },

  // WIZARD HEADER & STEP INDICATOR
  wizardHeader: {
    backgroundColor: COLORS.surface,
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  headerInfo: { alignItems: 'center', marginBottom: 14 },
  logoText: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  wizardSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  stepItem: { alignItems: 'center' },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: COLORS.primary,
  },
  stepCircleDone: {
    backgroundColor: COLORS.success,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  stepNumberActive: {
    color: '#FFF',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  stepLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
    marginBottom: 16,
  },
  stepLineActive: {
    backgroundColor: COLORS.success,
  },

  // STEP CARD
  stepCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepBadge: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  stepBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stepMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  stepDescText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 19,
    marginBottom: 18,
  },

  // FIELD STYLES
  fieldSection: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  fieldLabelError: { color: COLORS.error },
  inputGroup: { marginBottom: 14 },
  inputRow: { flexDirection: 'row', gap: 12 },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: '#FAFAFA',
  },
  inputError: {
    borderColor: COLORS.error,
    backgroundColor: '#FEF2F2',
  },
  errorHelperText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },

  // IMAGE PICKER
  imageRow: { flexDirection: 'row', gap: 12 },
  imagePickerBox: {
    flex: 1,
    height: 105,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    overflow: 'hidden',
  },
  imagePickerBoxError: {
    borderColor: COLORS.error,
    backgroundColor: '#FEF2F2',
  },
  docImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageSuccessBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFF',
    borderRadius: 10,
  },
  imagePlaceholder: { alignItems: 'center' },
  imagePlaceholderText: { fontSize: 12, color: COLORS.primary, marginTop: 4, fontWeight: '600' },

  // EKYC BOX
  ekycBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 76,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  ekycBoxDefault: {
    backgroundColor: '#F0F9FF',
    borderColor: COLORS.primary,
  },
  ekycBoxDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    opacity: 0.85,
  },
  ekycBoxSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: COLORS.success,
  },
  ekycBoxError: {
    backgroundColor: '#FEF2F2',
    borderColor: COLORS.error,
  },
  ekycIconWrap: { marginRight: 12 },
  ekycTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  ekycSubtitle: { fontSize: 12, color: COLORS.textMuted, lineHeight: 16 },

  // VEHICLE SECTION
  vehicleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  vehicleSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    height: 46,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
  },
  typeBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  typeBtnActive: {
    backgroundColor: '#FFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  typeBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // QR SCAN BANNER (GPLX)
  qrScanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  qrScanBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrScanBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0369A1',
  },
  autoBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  autoBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  qrScanBannerDesc: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
  },

  // BUTTONS
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  prevBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  prevBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  actionBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  logoutBtn: { marginTop: 16, alignItems: 'center', paddingVertical: 8 },
  logoutBtnText: { color: COLORS.error, fontSize: 14, fontWeight: '600' },

  // PENDING STATUS
  pendingBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  statusDesc: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
    marginBottom: 24,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  refreshBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // REJECTED STATUS
  rejectedBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  reasonCard: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 14,
  },
  reasonLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.error,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonText: {
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 22,
    fontWeight: '500',
  },
  reRegisterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
  },
  reRegisterBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
