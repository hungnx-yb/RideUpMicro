import os
import cv2
import numpy as np

from src.anti_spoof_predict import AntiSpoofPredict
from src.generate_patches import CropImage
from src.utility import parse_model_name


def test_webcam(model_dir="./resources/anti_spoof_models", camera_id=0, device_id=0):
    predictor = AntiSpoofPredict(device_id)
    image_cropper = CropImage()

    model_files = [f for f in os.listdir(model_dir) if f.endswith('.pth')]
    if not model_files:
        print(f"[Error] No .pth model files found in: {model_dir}")
        return

    print(f"Opening Webcam (ID: {camera_id})... Press 'q' or 'ESC' to quit.")
    cap = cv2.VideoCapture(camera_id, cv2.CAP_DSHOW)
    if not cap.isOpened():
        cap = cv2.VideoCapture(camera_id)
    
    if not cap.isOpened():
        print(f"[Warning] Cannot open camera ID: {camera_id}. Searching for other available cameras...")
        found = False
        for alt_id in [1, 2, 0]:
            if alt_id == camera_id:
                continue
            alt_cap = cv2.VideoCapture(alt_id, cv2.CAP_DSHOW)
            if not alt_cap.isOpened():
                alt_cap = cv2.VideoCapture(alt_id)
            if alt_cap.isOpened():
                print(f"[Info] Found working camera at ID: {alt_id}")
                cap = alt_cap
                found = True
                break
            alt_cap.release()

        if not found or not cap.isOpened():
            print(f"[Error] Cannot open any camera. Please check your camera connection or privacy settings.")
            return

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[Error] Cannot read frame from camera.")
            break

        try:
            image_bbox = predictor.get_bbox(frame)
            prediction = np.zeros((1, 3))

            for model_name in model_files:
                model_path = os.path.join(model_dir, model_name)
                h_input, w_input, model_type, scale = parse_model_name(model_name)
                
                if scale is not None:
                    param = {
                        "org_img": frame,
                        "bbox": image_bbox,
                        "scale": scale,
                        "out_w": w_input,
                        "out_h": h_input,
                        "crop": True
                    }
                    img = image_cropper.crop(**param)
                else:
                    img = cv2.resize(frame, (w_input, h_input))
                    
                prediction += predictor.predict(img, model_path)

            label = np.argmax(prediction)
            value = prediction[0][label] / len(model_files)
            
            if label == 1:
                result_text = f"REAL FACE: {value*100:.1f}%"
                color = (0, 255, 0)
            else:
                result_text = f"SPOOF / FAKE: {value*100:.1f}%"
                color = (0, 0, 255)

            cv2.rectangle(frame, (image_bbox[0], image_bbox[1]),
                          (image_bbox[0] + image_bbox[2], image_bbox[1] + image_bbox[3]), color, 2)
            cv2.putText(frame, result_text, (image_bbox[0], max(20, image_bbox[1] - 10)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

        except Exception as e:
            cv2.putText(frame, "No Face Detected", (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        cv2.imshow("Face Anti-Spoofing Live Test (Press 'q' to quit)", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == 27:
            break

    cap.release()
    cv2.destroyAllWindows()
    print("Camera closed.")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Live Face Anti-Spoofing Webcam Test")
    parser.add_argument("--model_dir", type=str, default="./resources/anti_spoof_models", help="Model directory")
    parser.add_argument("--camera_id", type=int, default=0, help="Camera device index (default: 0)")
    parser.add_argument("--device_id", type=int, default=0, help="GPU device ID or CPU (default: 0)")
    args = parser.parse_args()

    test_webcam(model_dir=args.model_dir, camera_id=args.camera_id, device_id=args.device_id)
