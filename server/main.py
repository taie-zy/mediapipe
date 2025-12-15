import asyncio
import cv2
import mediapipe as mp
import websockets
import json

# Initialize MediaPipe Hands
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.5,
)

async def send_hand_landmarks(websocket):
    """Capture video, detect hand landmarks, and send them over WebSocket."""
    cap = cv2.VideoCapture(0)
    print("Camera opened.")
    try:
        while cap.isOpened():
            success, image = cap.read()
            if not success:
                print("Ignoring empty camera frame.")
                continue

            # Flip the image horizontally for a later selfie-view display, and convert
            # the BGR image to RGB.
            image = cv2.cvtColor(cv2.flip(image, 1), cv2.COLOR_BGR2RGB)
            
            # To improve performance, optionally mark the image as not writeable to
            # pass by reference.
            image.flags.writeable = False
            results = hands.process(image)
            image.flags.writeable = True

            landmarks_list = []
            if results.multi_hand_landmarks:
                for hand_landmarks in results.multi_hand_landmarks:
                    # Get all 21 landmarks
                    landmarks = []
                    for landmark in hand_landmarks.landmark:
                        landmarks.append({
                            "x": landmark.x,
                            "y": landmark.y,
                            "z": landmark.z,
                        })
                    landmarks_list.append(landmarks)

            # Send landmarks over websocket
            try:
                await websocket.send(json.dumps(landmarks_list))
            except websockets.exceptions.ConnectionClosed:
                print("Client disconnected. Stopping.")
                break
            
            # A small delay to prevent overwhelming the connection
            await asyncio.sleep(0.01)

    finally:
        cap.release()
        print("Camera released.")

async def main():
    """Starts the WebSocket server."""
    host = "localhost"
    port = 8765
    print(f"Starting WebSocket server on ws://{host}:{port}")
    async with websockets.serve(send_hand_landmarks, host, port):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server stopped by user.")
