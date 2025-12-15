import cv2
import mediapipe as mp

# 初始化 MediaPipe 手部模型
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(static_image_mode=False, max_num_hands=1, min_detection_confidence=0.7)

cap = cv2.VideoCapture(0)

while cap.isOpened():
    success, image = cap.read()
    if not success:
        break

    # 转换颜色空间并处理
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = hands.process(image_rgb)

    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            # 提取食指指尖坐标 (Landmark 8)
            index_finger_tip = hand_landmarks.landmark[8]
            # 这里你可以将 index_finger_tip.x 和 y 发送给你的 3D 场景
            print(f"指尖位置: X={index_finger_tip.x}, Y={index_finger_tip.y}")

    cv2.imshow("Hand Tracking", image)
    if cv2.waitKey(5) & 0xFF == 27:
        break
cap.release()
