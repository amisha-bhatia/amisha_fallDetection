import React, { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  PoseLandmarker,
  DrawingUtils
} from "@mediapipe/tasks-vision";

function FallDetectionNew() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [fallDetected, setFallDetected] = useState(false);
  const poseLandmarkerRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
      );

      const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1
      });

      poseLandmarkerRef.current = poseLandmarker;

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;

      videoRef.current.onloadeddata = () => {
        videoRef.current.play();
        requestAnimationFrame(detect);
      };
    };

    const detect = async () => {
      if (
        !videoRef.current ||
        videoRef.current.readyState < 2 ||
        !poseLandmarkerRef.current
      ) {
        requestAnimationFrame(detect);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // ✅ Fix warning by syncing canvas with video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const results = await poseLandmarkerRef.current.detectForVideo(
        video,
        performance.now()
      );

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (results.landmarks.length > 0) {
        const drawingUtils = new DrawingUtils(ctx);
        drawingUtils.drawLandmarks(results.landmarks[0]);

        // Fall detection logic
        const leftShoulder = results.landmarks[0][11];
        const rightShoulder = results.landmarks[0][12];
        const leftHip = results.landmarks[0][23];
        const rightHip = results.landmarks[0][24];

        const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
        const avgHipY = (leftHip.y + rightHip.y) / 2;
        const avgShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
        const avgHipX = (leftHip.x + rightHip.x) / 2;

        const verticalDistance = Math.abs(avgShoulderY - avgHipY);
        const horizontalDistance = Math.abs(avgShoulderX - avgHipX);

        setFallDetected(horizontalDistance > verticalDistance * 1.5);
      }

      requestAnimationFrame(detect);
    };

    // ✅ This should be outside detect()
    init();
  }, []);

  return (
    <div style={{ textAlign: "center" }}>
      <h2>🧠 Fall Detection (No WebAssembly Bug)</h2>
      <video ref={videoRef} style={{ display: "none" }} playsInline></video>
      <canvas ref={canvasRef} width="640" height="480" style={{ border: "2px solid black" }} />
      {fallDetected && (
        <div style={{
          color: "white",
          background: "red",
          fontSize: "24px",
          fontWeight: "bold",
          padding: "10px",
          marginTop: "10px"
        }}>
          ⚠️ Fall Detected!
        </div>
      )}
    </div>
  );
}

export default FallDetectionNew;

