import os
import cv2
import numpy as np
import argparse

from src.anti_spoof_predict import AntiSpoofPredict
from src.generate_patches import CropImage
from src.utility import parse_model_name


def test(image_path, model_dir, device_id=0):
    predictor = AntiSpoofPredict(device_id)
    image_cropper = CropImage()
    
    if not os.path.exists(image_path):
        print(f"[Error] Image file not found at: {image_path}")
        print("Please provide a valid image path using --image_path <path_to_image>")
        return

    image = cv2.imread(image_path)
    if image is None:
        print(f"[Error] Cannot read image file at: {image_path}")
        return

    print(f"Processing image: {image_path}...")
    image_bbox = predictor.get_bbox(image)
    print(f"Detected face at Bounding Box [x, y, w, h]: {image_bbox}")

    prediction = np.zeros((1, 3))

    model_files = [f for f in os.listdir(model_dir) if f.endswith('.pth')]
    if not model_files:
        print(f"[Error] No .pth model files found in directory: {model_dir}")
        return

    for model_name in model_files:
        model_path = os.path.join(model_dir, model_name)
        h_input, w_input, model_type, scale = parse_model_name(model_name)
        
        if scale is not None:
            param = {
                "org_img": image,
                "bbox": image_bbox,
                "scale": scale,
                "out_w": w_input,
                "out_h": h_input,
                "crop": True
            }
            img = image_cropper.crop(**param)
        else:
            img = cv2.resize(image, (w_input, h_input))
            
        prediction += predictor.predict(img, model_path)

    # Label 1: Real Face, Label 0/2: Fake Face / Spoof
    label = np.argmax(prediction)
    value = prediction[0][label] / len(model_files)
    
    if label == 1:
        result_text = f"REAL FACE ({value*100:.1f}%)"
        print(f"\n===> RESULT: REAL FACE - Confidence: {value*100:.2f}%")
        color = (0, 255, 0)
    else:
        result_text = f"FAKE / SPOOF ({value*100:.1f}%)"
        print(f"\n===> RESULT: FAKE / SPOOF - Confidence: {value*100:.2f}%")
        color = (0, 0, 255)

    # Draw bounding box and result label
    cv2.rectangle(image, (image_bbox[0], image_bbox[1]),
                  (image_bbox[0] + image_bbox[2], image_bbox[1] + image_bbox[3]), color, 2)
    cv2.putText(image, result_text, (image_bbox[0], max(20, image_bbox[1] - 10)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
    
    output_path = "test_result.jpg"
    cv2.imwrite(output_path, image)
    print(f"Output saved to: {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test Anti-Spoofing Model")
    parser.add_argument("--image_path", type=str, default="./resources/test_image.jpg", help="Path to test image")
    parser.add_argument("--model_dir", type=str, default="./resources/anti_spoof_models", help="Model directory")
    parser.add_argument("--device_id", type=int, default=0, help="Device ID (0 for CPU/GPU)")
    args = parser.parse_args()

    test(args.image_path, args.model_dir, args.device_id)
