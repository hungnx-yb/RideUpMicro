import os
import cv2
import base64
import logging
from contextlib import asynccontextmanager
from typing import List, Optional

import numpy as np
import torch
from PIL import Image
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from facenet_pytorch import InceptionResnetV1

from src.anti_spoof_predict import AntiSpoofPredict
from src.generate_patches import CropImage
from src.utility import parse_model_name

# Tải cấu hình từ file .env nếu có
load_dotenv()

# Cấu hình logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ai-service")

# Biến môi trường cấu hình
PORT = int(os.getenv("SERVER_PORT", "8000"))
HOST = os.getenv("SERVER_HOST", "0.0.0.0")
APP_NAME = os.getenv("APP_NAME", "ai-service")
EUREKA_SERVER = os.getenv("EUREKA_SERVER", "http://localhost:8761/eureka")
ENABLE_EUREKA = os.getenv("ENABLE_EUREKA", "true").lower() in ("true", "1", "yes")
INSTANCE_HOST = os.getenv("INSTANCE_HOST", "localhost")
DEFAULT_THRESHOLD = float(os.getenv("DEFAULT_SIMILARITY_THRESHOLD", "0.65"))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "resources", "anti_spoof_models")

# Các đối tượng mô hình AI toàn cục
predictor: Optional[AntiSpoofPredict] = None
image_cropper: Optional[CropImage] = None
resnet: Optional[InceptionResnetV1] = None
model_files: List[str] = []
eureka_initialized = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    global predictor, image_cropper, resnet, model_files, eureka_initialized

    # 1. Khởi tạo & nạp các mô hình AI vào bộ nhớ
    logger.info("Đang nạp các mô hình Face Detection, Anti-Spoofing và FaceNet...")
    resource_dir = os.path.join(BASE_DIR, "resources")
    predictor = AntiSpoofPredict(0, resource_dir=resource_dir)
    image_cropper = CropImage()
    resnet = InceptionResnetV1(pretrained="vggface2").eval()

    if os.path.exists(MODEL_DIR):
        model_files = [f for f in os.listdir(MODEL_DIR) if f.endswith(".pth")]
    else:
        logger.warning(f"Không tìm thấy thư mục mô hình anti-spoof tại {MODEL_DIR}")
        model_files = []

    logger.info(f"Nạp thành công mô hình AI! Số lượng mô hình Anti-Spoof: {len(model_files)}")

    # 2. Đăng ký dịch vụ với Eureka Server (nếu bật)
    if ENABLE_EUREKA:
        try:
            import httpx

            # Kiểm tra nhanh xem Eureka Discovery Server có đang chạy hay không
            eureka_online = False
            try:
                async with httpx.AsyncClient(timeout=1.5) as client:
                    resp = await client.get(EUREKA_SERVER)
                    if resp.status_code < 500:
                        eureka_online = True
            except Exception:
                eureka_online = False

            if eureka_online:
                import py_eureka_client.eureka_client as eureka_client

                logger.info(f"Đang kết nối và đăng ký với Eureka Server tại: {EUREKA_SERVER}...")
                await eureka_client.init_async(
                    eureka_server=EUREKA_SERVER,
                    app_name=APP_NAME,
                    instance_port=PORT,
                    instance_host=INSTANCE_HOST,
                    health_check_url=f"http://{INSTANCE_HOST}:{PORT}/api/ai/health",
                    status_page_url=f"http://{INSTANCE_HOST}:{PORT}/api/ai/health",
                    home_page_url=f"http://{INSTANCE_HOST}:{PORT}",
                )
                eureka_initialized = True
                logger.info(f"Đăng ký thành công {APP_NAME} vào Eureka Discovery Server!")
            else:
                logger.info(
                    f"Eureka Server ({EUREKA_SERVER}) chưa online. AI Service đang chạy ở chế độ độc lập (Standalone)."
                )
        except Exception as e:
            logger.warning(
                f"Không thể kết nối đến Eureka Server: {e}. Service vẫn tiếp tục chạy chế độ độc lập."
            )

    yield

    # Cleanup khi shutdown dịch vụ
    if eureka_initialized:
        try:
            import py_eureka_client.eureka_client as eureka_client

            logger.info("Đang hủy đăng ký khỏi Eureka Server...")
            await eureka_client.stop_async()
            logger.info("Đã hủy đăng ký Eureka thành công.")
        except Exception as e:
            logger.error(f"Lỗi khi hủy đăng ký Eureka: {e}")


app = FastAPI(
    title="RideUp Driver Face Verification AI Service",
    description="Microservice AI nhận diện và xác thực khuôn mặt tài xế, tích hợp Anti-Spoofing (Liveness Detection)",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware hỗ trợ Web và Microservices
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# DATA MODELS (PYDANTIC DTO)
# ==============================================================================
class ExtractEmbeddingRequest(BaseModel):
    image_base64: str = Field(..., description="Chuỗi base64 của ảnh chân dung")
    check_liveness: bool = Field(True, description="Có kiểm tra chống giả mạo (liveness) hay không")


class ExtractEmbeddingResponse(BaseModel):
    status: str
    is_real: bool
    liveness_score: float
    embedding: List[float] = []
    message: str = ""


class VerifyDriverRequest(BaseModel):
    image_base64: str = Field(..., description="Ảnh chụp khuôn mặt tài xế lúc điểm danh/mở app")
    target_embedding: List[float] = Field(..., description="Mảng vector 512 chiều đã lưu trong Database")
    threshold: Optional[float] = Field(DEFAULT_THRESHOLD, description="Ngưỡng so khớp similarity (0.0 -> 1.0)")


class VerifyDriverResponse(BaseModel):
    status: str
    is_real: bool
    is_verified: bool
    liveness_score: float
    similarity: float
    threshold: float
    message: str


class CompareFacesRequest(BaseModel):
    image1_base64: str = Field(..., description="Ảnh 1 (Ví dụ: Chân dung trên thẻ CCCD)")
    image2_base64: str = Field(..., description="Ảnh 2 (Ảnh selfie lúc đăng ký)")
    threshold: Optional[float] = Field(DEFAULT_THRESHOLD, description="Ngưỡng so khớp tương đồng")
    check_liveness: bool = Field(True, description="Kiểm tra liveness trên ảnh 2")


class CompareFacesResponse(BaseModel):
    status: str
    is_real: bool
    is_matched: bool
    similarity: float
    threshold: float
    message: str


class HealthResponse(BaseModel):
    status: str
    service: str
    models_loaded: int
    eureka_registered: bool


# ==============================================================================
# UTILITY FUNCTIONS
# ==============================================================================
def decode_base64_image(base64_str: str) -> Optional[np.ndarray]:
    """Giải mã chuỗi base64 thành ảnh OpenCV BGR"""
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_data = base64.b64decode(base64_str)
        np_arr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        logger.error(f"Lỗi giải mã ảnh base64: {e}")
        return None


def cosine_similarity(emb1: List[float], emb2: List[float]) -> float:
    """Tính Cosine Similarity giữa 2 vector khuôn mặt"""
    a = np.array(emb1, dtype=np.float32)
    b = np.array(emb2, dtype=np.float32)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def check_liveness(frame: np.ndarray, image_bbox: list) -> tuple[bool, float]:
    """Kiểm tra Anti-Spoofing bằng tổ hợp MiniFASNet"""
    if not model_files or predictor is None or image_cropper is None:
        return True, 1.0

    prediction = np.zeros((1, 3))
    for model_name in model_files:
        model_path = os.path.join(MODEL_DIR, model_name)
        h_input, w_input, model_type, scale = parse_model_name(model_name)
        if scale is not None:
            param = {
                "org_img": frame,
                "bbox": image_bbox,
                "scale": scale,
                "out_w": w_input,
                "out_h": h_input,
                "crop": True,
            }
            img = image_cropper.crop(**param)
        else:
            img = cv2.resize(frame, (w_input, h_input))
        prediction += predictor.predict(img, model_path)

    label = int(np.argmax(prediction))
    liveness_score = float(prediction[0][label] / len(model_files))
    is_real = label == 1
    return is_real, liveness_score


def extract_face_embedding(face_crop: np.ndarray) -> np.ndarray:
    """Trích xuất vector 512 chiều từ vùng khuôn mặt qua FaceNet (InceptionResnetV1)"""
    face_rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
    face_pil = Image.fromarray(face_rgb).resize((160, 160))
    face_tensor = torch.tensor(np.float32(face_pil)).permute(2, 0, 1).unsqueeze(0)
    face_tensor = (face_tensor - 127.5) / 128.0
    with torch.no_grad():
        embedding = resnet(face_tensor).numpy()[0]
    return embedding


# ==============================================================================
# CONTROLLER ENDPOINTS
# ==============================================================================
@app.get("/health", response_model=HealthResponse)
@app.get("/api/ai/health", response_model=HealthResponse)
@app.get("/api/v1/health", response_model=HealthResponse)
async def health_check():
    """Kiểm tra tình trạng sức khỏe của AI Service"""
    return HealthResponse(
        status="UP",
        service=APP_NAME,
        models_loaded=len(model_files),
        eureka_registered=eureka_initialized,
    )


@app.post("/api/ai/extract-embedding", response_model=ExtractEmbeddingResponse)
@app.post("/api/v1/extract-embedding", response_model=ExtractEmbeddingResponse)
async def extract_embedding(req: ExtractEmbeddingRequest):
    """
    Dành cho Identity Service khi duyệt đăng ký tài xế (eKYC):
    Kiểm tra liveness (chống chụp màn hình/in ảnh) và trích xuất vector 512 chiều để lưu vào DB.
    """
    frame = decode_base64_image(req.image_base64)
    if frame is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chuỗi base64 ảnh không hợp lệ")

    try:
        bbox = predictor.get_bbox(frame)
        x, y, w, h = bbox
        face_crop = frame[max(0, y) : y + h, max(0, x) : x + w]
        if face_crop.size == 0:
            return ExtractEmbeddingResponse(
                status="rejected",
                is_real=False,
                liveness_score=0.0,
                embedding=[],
                message="Không phát hiện khuôn mặt trong ảnh",
            )

        is_real = True
        liveness_score = 1.0
        if req.check_liveness:
            is_real, liveness_score = check_liveness(frame, bbox)
            if not is_real:
                return ExtractEmbeddingResponse(
                    status="rejected",
                    is_real=False,
                    liveness_score=round(liveness_score * 100, 2),
                    embedding=[],
                    message="Ảnh không hợp lệ: Phát hiện giả mạo khuôn mặt (ảnh chụp lại màn hình hoặc in trên giấy)",
                )

        embedding = extract_face_embedding(face_crop).tolist()
        return ExtractEmbeddingResponse(
            status="success",
            is_real=is_real,
            liveness_score=round(liveness_score * 100, 2),
            embedding=embedding,
            message="Trích xuất vector khuôn mặt thành công",
        )
    except Exception as e:
        logger.error(f"Lỗi trích xuất vector khuôn mặt: {e}")
        return ExtractEmbeddingResponse(
            status="error",
            is_real=False,
            liveness_score=0.0,
            embedding=[],
            message=f"Lỗi xử lý AI: {str(e)}",
        )


@app.post("/api/ai/verify-driver", response_model=VerifyDriverResponse)
@app.post("/api/v1/verify-driver", response_model=VerifyDriverResponse)
async def verify_driver(req: VerifyDriverRequest):
    """
    Dành cho Identity Service khi tài xế điểm danh hoặc bật nhận chuyến:
    So khớp 1:1 giữa ảnh selfie vừa chụp với vector khuôn mặt gốc đã lưu trong DB.
    """
    frame = decode_base64_image(req.image_base64)
    if frame is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chuỗi base64 ảnh không hợp lệ")

    if not req.target_embedding or len(req.target_embedding) != 512:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="target_embedding bắt buộc phải là mảng vector 512 chiều",
        )

    threshold = req.threshold if req.threshold is not None else DEFAULT_THRESHOLD

    try:
        bbox = predictor.get_bbox(frame)
        x, y, w, h = bbox

        # 1. Kiểm tra Liveness (Anti-Spoofing)
        is_real, liveness_score = check_liveness(frame, bbox)
        if not is_real:
            return VerifyDriverResponse(
                status="success",
                is_real=False,
                is_verified=False,
                liveness_score=round(liveness_score * 100, 2),
                similarity=0.0,
                threshold=round(threshold * 100, 2),
                message="Cảnh báo giả mạo: Phát hiện khuôn mặt không phải người thật (ảnh chụp lại/màn hình)",
            )

        # 2. Cắt khuôn mặt và trích xuất vector hiện tại
        face_crop = frame[max(0, y) : y + h, max(0, x) : x + w]
        if face_crop.size == 0:
            return VerifyDriverResponse(
                status="rejected",
                is_real=True,
                is_verified=False,
                liveness_score=round(liveness_score * 100, 2),
                similarity=0.0,
                threshold=round(threshold * 100, 2),
                message="Không thể nhận diện khuôn mặt tài xế trong góc máy này",
            )

        current_embedding = extract_face_embedding(face_crop)

        # 3. So khớp Cosine Similarity
        similarity = cosine_similarity(current_embedding, req.target_embedding)
        is_verified = bool(similarity >= threshold)

        return VerifyDriverResponse(
            status="success",
            is_real=True,
            is_verified=is_verified,
            liveness_score=round(liveness_score * 100, 2),
            similarity=round(similarity * 100, 2),
            threshold=round(threshold * 100, 2),
            message="Xác thực danh tính tài xế thành công"
            if is_verified
            else "Khuôn mặt không khớp với hồ sơ tài xế đã đăng ký",
        )
    except Exception as e:
        logger.error(f"Lỗi xác minh tài xế: {e}")
        return VerifyDriverResponse(
            status="error",
            is_real=False,
            is_verified=False,
            liveness_score=0.0,
            similarity=0.0,
            threshold=round(threshold * 100, 2),
            message=f"Lỗi khi đối chiếu khuôn mặt: {str(e)}",
        )


@app.post("/api/ai/compare-faces", response_model=CompareFacesResponse)
@app.post("/api/v1/compare-faces", response_model=CompareFacesResponse)
async def compare_faces(req: CompareFacesRequest):
    """
    So khớp trực tiếp 2 ảnh:
    Ảnh 1 (Ví dụ: Chân dung trên CCCD) và Ảnh 2 (Ảnh chụp trực tiếp của tài xế).
    """
    img1 = decode_base64_image(req.image1_base64)
    img2 = decode_base64_image(req.image2_base64)

    if img1 is None or img2 is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ảnh cung cấp không hợp lệ")

    threshold = req.threshold if req.threshold is not None else DEFAULT_THRESHOLD

    try:
        bbox1 = predictor.get_bbox(img1)
        bbox2 = predictor.get_bbox(img2)

        x1, y1, w1, h1 = bbox1
        x2, y2, w2, h2 = bbox2

        crop1 = img1[max(0, y1) : y1 + h1, max(0, x1) : x1 + w1]
        crop2 = img2[max(0, y2) : y2 + h2, max(0, x2) : x2 + w2]

        if crop1.size == 0 or crop2.size == 0:
            return CompareFacesResponse(
                status="rejected",
                is_real=False,
                is_matched=False,
                similarity=0.0,
                threshold=round(threshold * 100, 2),
                message="Một trong hai ảnh không tìm thấy khuôn mặt rõ ràng",
            )

        is_real = True
        if req.check_liveness:
            is_real, _ = check_liveness(img2, bbox2)
            if not is_real:
                return CompareFacesResponse(
                    status="rejected",
                    is_real=False,
                    is_matched=False,
                    similarity=0.0,
                    threshold=round(threshold * 100, 2),
                    message="Ảnh 2 không đạt yêu cầu liveness (nghi vấn giả mạo)",
                )

        emb1 = extract_face_embedding(crop1)
        emb2 = extract_face_embedding(crop2)

        similarity = cosine_similarity(emb1, emb2)
        is_matched = bool(similarity >= threshold)

        return CompareFacesResponse(
            status="success",
            is_real=is_real,
            is_matched=is_matched,
            similarity=round(similarity * 100, 2),
            threshold=round(threshold * 100, 2),
            message="Hai khuôn mặt trùng khớp" if is_matched else "Hai khuôn mặt không trùng khớp",
        )
    except Exception as e:
        logger.error(f"Lỗi so khớp 2 ảnh: {e}")
        return CompareFacesResponse(
            status="error",
            is_real=False,
            is_matched=False,
            similarity=0.0,
            threshold=round(threshold * 100, 2),
            message=f"Lỗi hệ thống: {str(e)}",
        )


# ==============================================================================
# 5. ENDPOINT OCR ĐỌC SỐ CĂN CƯỚC CÔNG DÂN TỪ ẢNH CHỤP
# ==============================================================================
class OcrIdCardRequest(BaseModel):
    image_base64: str = Field(..., description="Ảnh thẻ CCCD định dạng Base64")


class OcrIdCardResponse(BaseModel):
    status: str
    id_number: Optional[str] = None
    full_name: Optional[str] = None
    dob: Optional[str] = None
    all_texts: List[str] = []
    message: str


ocr_reader = None


def get_ocr_reader():
    global ocr_reader
    if ocr_reader is None:
        try:
            import easyocr

            logger.info("Đang khởi tạo EasyOCR reader (Vietnamese & English)...")
            ocr_reader = easyocr.Reader(["vi", "en"], gpu=torch.cuda.is_available())
            logger.info("Khởi tạo EasyOCR thành công!")
        except Exception as e:
            logger.error(f"Lỗi khởi tạo EasyOCR: {e}")
    return ocr_reader


@app.post("/api/ai/ocr-id-card", response_model=OcrIdCardResponse)
async def ocr_id_card(req: OcrIdCardRequest):
    """
    Trích xuất số Căn cước công dân (12 chữ số), họ tên và ngày sinh từ ảnh chụp thẻ CCCD.
    """
    try:
        img_np = decode_base64_image(req.image_base64)
        reader = get_ocr_reader()
        if reader is None:
            raise HTTPException(status_code=500, detail="Mô hình OCR chưa sẵn sàng")

        # Chạy nhận diện chữ từ ảnh
        results = reader.readtext(img_np)
        extracted_texts = [res[1].strip() for res in results if res[1].strip()]
        logger.info(f"Kết quả OCR nhận diện được {len(extracted_texts)} đoạn text: {extracted_texts}")

        import re

        found_id = None
        found_name = None
        found_dob = None

        # 1. Tìm số CCCD (12 số)
        for text in extracted_texts:
            digits = re.sub(r"\D", "", text)
            if len(digits) == 12:
                found_id = digits
                break

        if not found_id:
            combined_digits = re.sub(r"\D", "", " ".join(extracted_texts))
            match = re.search(r"\d{12}", combined_digits)
            if match:
                found_id = match.group(0)

        # 2. Tìm Họ và tên & Ngày sinh theo keyword
        for i, text in enumerate(extracted_texts):
            lower_txt = text.lower()
            # Tìm ngày sinh DD/MM/YYYY
            date_match = re.search(r"\b(\d{2}/\d{2}/\d{4})\b", text)
            if date_match and not found_dob:
                found_dob = date_match.group(1)

            # Tìm Họ và tên (dòng kế tiếp sau "Họ và tên" / "Full name" hoặc chữ in hoa dài)
            if ("họ và tên" in lower_txt or "họ tên" in lower_txt or "full name" in lower_txt) and i + 1 < len(extracted_texts):
                candidate_name = extracted_texts[i + 1].strip()
                # Thường họ tên in hoa và không chứa số
                if not re.search(r"\d", candidate_name) and len(candidate_name.split()) >= 2:
                    found_name = candidate_name.upper()

        # Nếu chưa tìm thấy họ tên bằng nhãn, tìm dòng chữ IN HOA không có số có từ 2-4 từ
        if not found_name:
            for text in extracted_texts:
                clean_t = text.strip()
                if (
                    clean_t.isupper()
                    and not re.search(r"\d", clean_t)
                    and len(clean_t.split()) in (2, 3, 4, 5)
                    and "CỘNG HÒA" not in clean_t
                    and "VIỆT NAM" not in clean_t
                    and "ĐỘC LẬP" not in clean_t
                    and "CĂN CƯỚC" not in clean_t
                    and "CÔNG DÂN" not in clean_t
                ):
                    found_name = clean_t
                    break

        if found_id or found_name:
            return OcrIdCardResponse(
                status="success",
                id_number=found_id,
                full_name=found_name,
                dob=found_dob,
                all_texts=extracted_texts,
                message="Trích xuất thông tin CCCD thành công",
            )
        else:
            return OcrIdCardResponse(
                status="not_found",
                id_number=None,
                full_name=None,
                dob=None,
                all_texts=extracted_texts,
                message="Không tìm thấy thông tin trên thẻ CCCD",
            )
    except Exception as e:
        logger.error(f"Lỗi OCR đọc CCCD: {e}")
        return OcrIdCardResponse(
            status="error",
            id_number=None,
            full_name=None,
            dob=None,
            all_texts=[],
            message=f"Lỗi xử lý OCR: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host=HOST, port=PORT, reload=False)

