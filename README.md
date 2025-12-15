# MediaPipe Hand Tracking with Three.js

This project uses MediaPipe to track hand landmarks from a webcam and visualizes them in real-time in a 3D scene using Three.js.

## Architecture

*   **Backend (Python):** A Python script in the `server/` directory captures video from the webcam, uses MediaPipe to detect 3D hand landmarks, and streams the coordinates over a WebSocket connection.
*   **Frontend (JavaScript/Three.js):** An HTML and JavaScript application in the `client/` directory connects to the WebSocket server, receives the landmark data, and uses Three.js to render the hand skeleton in 3D.

## How to Run

### 1. Backend Server

First, make sure you have Python 3 installed.

1.  **Navigate to the server directory:**
    ```bash
    cd server
    ```

2.  **Create a virtual environment (optional but recommended):**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

3.  **Install the required Python packages:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the server:**
    ```bash
    python main.py
    ```

    The server will start and wait for a client to connect on `ws://localhost:8765`. It will also try to access your webcam.

### 2. Frontend Client

1.  **Open the `client/index.html` file in your web browser.**

    You don't need a web server for the client, you can open the file directly from your filesystem (e.g., `file:///.../client/index.html`).

2.  **Allow browser access to the local WebSocket.**
    If you see a connection error, your browser might be blocking the connection from a `file://` URL to `localhost`. The easiest way to solve this is to serve the `client` directory using a simple local web server. If you have Python installed, you can do this:
    ```bash
    # From the 'client' directory
    python -m http.server
    ```
    Then, navigate to `http://localhost:8000` in your browser.

### 3. See the Magic

*   Once the server is running and you've opened `index.html` in your browser, the frontend will connect to the backend.
*   Show your hand to the webcam.
*   You should see a 3D representation of your hand landmarks rendered in the browser window, moving in real-time as you move your hand.

