import React, { useEffect, useRef, useState } from 'react';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { 
  Camera, 
  CameraOff, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Loader2, 
  Sliders,
  Check,
  ExternalLink
} from 'lucide-react';

interface CameraPostureTrackerProps {
  exerciseId: 'chintuck' | 'doorframe' | 'crossbody' | 'uppertrap' | 'handbehind';
  crossBodySide?: 'left' | 'right';
  onPostureDetected: (
    posture: 'correct' | 'forward' | 'bending', 
    confidence: number, 
    angle: number
  ) => void;
  isActive: boolean;
  onActiveChange?: (active: boolean) => void;
}

export default function CameraPostureTracker({
  exerciseId,
  crossBodySide = 'left',
  onPostureDetected,
  isActive,
  onActiveChange
}: CameraPostureTrackerProps) {
  // State for MediaPipe Model
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(true);
  const [modelError, setModelError] = useState<string | null>(null);

  // State for Webcam Stream
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSuspended, setIsSuspended] = useState<boolean>(false);
  const [reconnecting, setReconnecting] = useState<boolean>(false);

  // Metrics state
  const [cvaAngle, setCvaAngle] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(100);
  const [fps, setFps] = useState<number>(0);
  const [currentDetectedPosture, setCurrentDetectedPosture] = useState<'correct' | 'forward' | 'bending'>('correct');

  const [doorFrameAngles, setDoorFrameAngles] = useState({
    leftShoulderAbd: 90,
    rightShoulderAbd: 90,
    leftElbowFlex: 90,
    rightElbowFlex: 90,
    torsoLean: 0,
    symmetryScore: 100
  });

  // Tracking line style select
  const [lineStyle, setLineStyle] = useState<'cyber' | 'grid' | 'clinical'>('cyber');

  // Simulated landmarks for when webcam is inactive
  const simLandmarksRef = useRef<any[]>([]);

  // Get simulated targets based on posture state
  const getSimulatedTarget = (posture: 'correct' | 'forward' | 'bending', exId: string) => {
    const list: any[] = [];
    if (exId === 'chintuck') {
      if (posture === 'correct') {
        list[0] = { x: 0.41, y: 0.31, visibility: 0.99 }; // nose
        list[7] = { x: 0.49, y: 0.25, visibility: 0.99 }; // leftEar
        list[8] = { x: 0.51, y: 0.24, visibility: 0.99 }; // rightEar
        list[11] = { x: 0.52, y: 0.51, visibility: 0.99 }; // leftShoulder
        list[12] = { x: 0.55, y: 0.53, visibility: 0.99 }; // rightShoulder
      } else if (posture === 'forward') {
        list[0] = { x: 0.32, y: 0.34, visibility: 0.99 }; // nose
        list[7] = { x: 0.41, y: 0.28, visibility: 0.99 }; // leftEar
        list[8] = { x: 0.43, y: 0.27, visibility: 0.99 }; // rightEar
        list[11] = { x: 0.52, y: 0.51, visibility: 0.99 }; // leftShoulder
        list[12] = { x: 0.55, y: 0.53, visibility: 0.99 }; // rightShoulder
      } else { // 'bending'
        list[0] = { x: 0.24, y: 0.38, visibility: 0.99 }; // nose
        list[7] = { x: 0.34, y: 0.32, visibility: 0.99 }; // leftEar
        list[8] = { x: 0.36, y: 0.31, visibility: 0.99 }; // rightEar
        list[11] = { x: 0.52, y: 0.45, visibility: 0.99 }; // leftShoulder
        list[12] = { x: 0.55, y: 0.47, visibility: 0.99 }; // rightShoulder
      }
    } else {
      // doorframe / shoulder exercises with rich kinetic landmarks
      if (posture === 'correct') {
        list[0] = { x: 0.50, y: 0.24, visibility: 0.99 }; // nose
        list[7] = { x: 0.47, y: 0.22, visibility: 0.99 }; // leftEar
        list[8] = { x: 0.53, y: 0.22, visibility: 0.99 }; // rightEar
        list[11] = { x: 0.38, y: 0.40, visibility: 0.99 }; // leftShoulder
        list[12] = { x: 0.62, y: 0.40, visibility: 0.99 }; // rightShoulder
        list[13] = { x: 0.22, y: 0.40, visibility: 0.99 }; // leftElbow
        list[14] = { x: 0.78, y: 0.40, visibility: 0.99 }; // rightElbow
        list[15] = { x: 0.22, y: 0.20, visibility: 0.99 }; // leftWrist
        list[16] = { x: 0.78, y: 0.20, visibility: 0.99 }; // rightWrist
        list[23] = { x: 0.41, y: 0.75, visibility: 0.99 }; // leftHip
        list[24] = { x: 0.59, y: 0.75, visibility: 0.99 }; // rightHip
      } else if (posture === 'forward') {
        list[0] = { x: 0.50, y: 0.29, visibility: 0.99 }; // nose (leaning further/slouching)
        list[7] = { x: 0.46, y: 0.27, visibility: 0.99 }; // leftEar
        list[8] = { x: 0.54, y: 0.27, visibility: 0.99 }; // rightEar
        list[11] = { x: 0.38, y: 0.42, visibility: 0.99 }; // leftShoulder
        list[12] = { x: 0.62, y: 0.42, visibility: 0.99 }; // rightShoulder
        list[13] = { x: 0.24, y: 0.44, visibility: 0.99 }; // leftElbow
        list[14] = { x: 0.76, y: 0.44, visibility: 0.99 }; // rightElbow
        list[15] = { x: 0.28, y: 0.24, visibility: 0.99 }; // leftWrist
        list[16] = { x: 0.72, y: 0.24, visibility: 0.99 }; // rightWrist
        list[23] = { x: 0.41, y: 0.75, visibility: 0.99 }; // leftHip
        list[24] = { x: 0.59, y: 0.75, visibility: 0.99 }; // rightHip
      } else { // bending (poor symmetry or shrugged shoulders)
        list[0] = { x: 0.50, y: 0.24, visibility: 0.99 }; // nose
        list[7] = { x: 0.47, y: 0.20, visibility: 0.99 }; // leftEar
        list[8] = { x: 0.53, y: 0.22, visibility: 0.99 }; // rightEar
        list[11] = { x: 0.38, y: 0.33, visibility: 0.99 }; // leftShoulder (elevated shrugged up!)
        list[12] = { x: 0.62, y: 0.43, visibility: 0.99 }; // rightShoulder (low/different height)
        list[13] = { x: 0.22, y: 0.35, visibility: 0.99 }; // leftElbow
        list[14] = { x: 0.78, y: 0.43, visibility: 0.99 }; // rightElbow
        list[15] = { x: 0.22, y: 0.15, visibility: 0.99 }; // leftWrist
        list[16] = { x: 0.78, y: 0.23, visibility: 0.99 }; // rightWrist
        list[23] = { x: 0.41, y: 0.75, visibility: 0.99 }; // leftHip
        list[24] = { x: 0.59, y: 0.75, visibility: 0.99 }; // rightHip
      }
    }
    return list;
  };

  // Draw simulated scanner grid in deep-slate when webcam is inactive
  const drawDiagnosticGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, timestamp: number) => {
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, Math.max(width, height));
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(51, 65, 85, 0.15)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    ctx.beginPath();
    for (let x = 0; x < width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(14, 165, 233, 0.04)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 120, 0, 2 * Math.PI);
    ctx.arc(width / 2, height / 2, 220, 0, 2 * Math.PI);
    ctx.stroke();

    const len = 15;
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
    ctx.lineWidth = 2;
    const margin = 20;
    ctx.beginPath();
    ctx.moveTo(margin, margin); ctx.lineTo(margin + len, margin);
    ctx.moveTo(margin, margin); ctx.lineTo(margin, margin + len);
    ctx.moveTo(width - margin, margin); ctx.lineTo(width - margin - len, margin);
    ctx.moveTo(width - margin, margin); ctx.lineTo(width - margin, margin + len);
    ctx.moveTo(margin, height - margin); ctx.lineTo(margin + len, height - margin);
    ctx.moveTo(margin, height - margin); ctx.lineTo(margin, height - margin - len);
    ctx.moveTo(width - margin, height - margin); ctx.lineTo(width - margin - len, height - margin);
    ctx.moveTo(width - margin, height - margin); ctx.lineTo(width - margin, height - margin - len);
    ctx.stroke();

    const scanlineY = (timestamp / 20) % (height + 100) - 50;
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.08)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, scanlineY);
    ctx.lineTo(width, scanlineY);
    ctx.stroke();
  };

  // Calibration flow state
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [calibrationCountdown, setCalibrationCountdown] = useState<number>(3);
  const [baselineShoulderY, setBaselineShoulderY] = useState<number | null>(null);

  // Start countdown state before video analysis begins
  const [startCountdown, setStartCountdown] = useState<number | null>(null);
  const lastTriggerKeyRef = useRef<string>('');

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Model & Loop Refs
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastActiveTimeRef = useRef<number>(performance.now());

  // FPS tracking refs
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  // Calibration accumulator
  const tempShoulderYAccumulatorRef = useRef<number[]>([]);
  const lastStateUpdateRef = useRef<number>(0);

  // Load MediaPipe Model
  useEffect(() => {
    let active = true;

    async function loadModel() {
      try {
        setIsLoadingModel(true);
        setModelError(null);

        // Load WASM FilesetResolver from jsdelivr
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );

        if (!active) return;

        // Create PoseLandmarker using specified task file
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 1
        });

        if (!active) {
          landmarker.close();
          return;
        }

        poseLandmarkerRef.current = landmarker;
        setIsLoadingModel(false);
      } catch (err: any) {
        console.error("Failed to load MediaPipe Pose Landmarker:", err);
        if (active) {
          setModelError("Failed to load pose detection model. Please check your network connection.");
          setIsLoadingModel(false);
        }
      }
    }

    loadModel();

    return () => {
      active = false;
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
        poseLandmarkerRef.current = null;
      }
    };
  }, []);

  // Monitor exerciseId changes and reset calibration
  useEffect(() => {
    setBaselineShoulderY(null);
    tempShoulderYAccumulatorRef.current = [];
  }, [exerciseId]);

  // Start Camera System
  const startCamera = async () => {
    try {
      setCameraError(null);
      setIsSuspended(false);
      lastActiveTimeRef.current = performance.now();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("WebRTC camera media APIs are not supported in this browser environment or are blocked.");
      }

      let stream: MediaStream;
      try {
        // Attempt user-facing front-facing standard constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        });
      } catch (firstErr) {
        console.warn("Front-facing webcam constraints rejected, trying fallback any-video constraint...", firstErr);
        // Fall back to a completely barebones video constraint
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                setCameraActive(true);
                setCameraError(null);
                setIsSuspended(false);
                lastActiveTimeRef.current = performance.now();
                if (onActiveChange) onActiveChange(true);
              })
              .catch(pErr => {
                console.error("Video playback was blocked by browser.", pErr);
                setCameraError("Video playback was blocked by browser. Please tap play or interact with the screen to begin.");
              });
          }
        };
      }
    } catch (err: any) {
      console.error("Detailed Camera Access Diagnostics:", err);
      let friendlyMessage = "Camera permission denied or camera not available.";
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes("denied")) {
        friendlyMessage = "Camera access denied. Please click the camera/lock icon in your browser URL bar to grant permissions, or try opening this application in a new tab.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        friendlyMessage = "No camera hardware detected. Please ensure a webcam is connected and recognized by your system.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        friendlyMessage = "Camera is already in use by another application or browser tab. Please close other apps and try again.";
      } else if (err.name === 'OverconstrainedError') {
        friendlyMessage = "Webcam cannot satisfy resolution constraints. Try a different video device.";
      } else {
        friendlyMessage = err.message || "Failed to establish a webcam link. Standby manual simulation mode activated.";
      }

      setCameraError(friendlyMessage);
      setCameraActive(false);
      if (onActiveChange) onActiveChange(false);
    }
  };

  // Stop Camera System
  const stopCamera = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    if (onActiveChange) onActiveChange(false);
  };

  // Reconnect with retry mechanism
  const attemptReconnect = async () => {
    try {
      setReconnecting(true);
      console.log("Attempting to reconnect video stream...");
      
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      setIsSuspended(false);
      setCameraError(null);
      lastActiveTimeRef.current = performance.now();
      
      await new Promise(resolve => setTimeout(resolve, 800));
      await startCamera();
    } catch (err) {
      console.error("Reconnect attempt failed:", err);
      setCameraError("Failed to reconnect camera. Please verify device connection and permissions.");
    } finally {
      setReconnecting(false);
    }
  };

  // Auto-start camera when active tab/visibility matches
  useEffect(() => {
    if (isActive && !isLoadingModel && !modelError && !cameraActive && !cameraError) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isActive, isLoadingModel]);

  // Calibration countdown timer
  useEffect(() => {
    if (!isCalibrating) return;

    if (calibrationCountdown > 0) {
      const timer = setTimeout(() => {
        setCalibrationCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsCalibrating(false);
      if (tempShoulderYAccumulatorRef.current.length > 0) {
        const avgY = tempShoulderYAccumulatorRef.current.reduce((a, b) => a + b, 0) / tempShoulderYAccumulatorRef.current.length;
        setBaselineShoulderY(avgY);
      }
    }
  }, [isCalibrating, calibrationCountdown]);

  // Calibration trigger
  const triggerCalibration = () => {
    setIsCalibrating(true);
    setCalibrationCountdown(3);
    tempShoulderYAccumulatorRef.current = [];
  };

  // Speak starting countdown numbers using clean Web Speech API
  const speakCountdownNumber = (num: number) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      let text = '';
      if (num === 1) text = 'One';
      else if (num === 2) text = 'Two';
      else if (num === 3) text = 'Three';
      else if (num === 4) text = 'Begin analysis!';
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Trigger starting countdown on activation, webcam start, or exercise transition
  useEffect(() => {
    if (!isActive) {
      setStartCountdown(null);
      return;
    }
    const triggerKey = `${cameraActive}-${exerciseId}`;
    if (lastTriggerKeyRef.current !== triggerKey) {
      lastTriggerKeyRef.current = triggerKey;
      setStartCountdown(1);
    }
  }, [isActive, cameraActive, exerciseId]);

  // Starting countdown timer loop
  useEffect(() => {
    if (startCountdown === null) return;

    speakCountdownNumber(startCountdown);

    const timer = setTimeout(() => {
      if (startCountdown < 3) {
        setStartCountdown(startCountdown + 1);
      } else if (startCountdown === 3) {
        setStartCountdown(4); // GO!
      } else {
        setStartCountdown(null); // Finish countdown and start tracking
      }
    }, 1100);

    return () => clearTimeout(timer);
  }, [startCountdown]);

  // Run Real-time Detection & Simulation Frame Loop
  useEffect(() => {
    const runFrame = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        requestRef.current = requestAnimationFrame(runFrame);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        requestRef.current = requestAnimationFrame(runFrame);
        return;
      }

      const timestamp = performance.now();

      if (cameraActive && videoRef.current) {
        const video = videoRef.current;
        // Sync canvas sizing with active webcam frame
        if (video.videoWidth > 0 && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        let trackFailedOrEnded = false;
        if (mediaStreamRef.current) {
          const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
          if (videoTrack && videoTrack.readyState === 'ended') {
            trackFailedOrEnded = true;
          }
        }

        const isStalledOrSuspended = video.paused || video.ended || trackFailedOrEnded;

        if (video.currentTime !== lastVideoTimeRef.current && !isStalledOrSuspended) {
          lastVideoTimeRef.current = video.currentTime;
          lastActiveTimeRef.current = timestamp;
          if (isSuspended) {
            setIsSuspended(false);
          }

          try {
            if (poseLandmarkerRef.current) {
              const results = poseLandmarkerRef.current.detectForVideo(video, timestamp);
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              // FPS counter
              frameCountRef.current++;
              const now = performance.now();
              if (now - lastFrameTimeRef.current >= 1000) {
                setFps(Math.round((frameCountRef.current * 1000) / (now - lastFrameTimeRef.current)));
                frameCountRef.current = 0;
                lastFrameTimeRef.current = now;
              }

              if (results && results.landmarks && results.landmarks.length > 0) {
                const landmarks = results.landmarks[0];
                if (startCountdown === null) {
                  processLivePose(landmarks);
                  drawSkeleton(ctx, landmarks, canvas.width, canvas.height);
                } else {
                  // Keep screen clean with a subtle message during counting
                  ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
              } else {
                ctx.fillStyle = 'rgba(30, 41, 59, 0.45)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 13px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText("POSITION SKELETON WITHIN FEED CHANNEL", canvas.width / 2, canvas.height / 2);
              }
            }
          } catch (err) {
            console.error("Frame detection loop failed:", err);
          }
        } else {
          const idleDuration = timestamp - lastActiveTimeRef.current;
          if ((idleDuration > 4000 || isStalledOrSuspended) && !isSuspended) {
            console.warn(`Anatomical feed stream suspension detected. Idle duration: ${Math.round(idleDuration)}ms`);
            setIsSuspended(true);
          }

          if (isSuspended) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText("WEBCAM STREAM SUSPENDED", canvas.width / 2, canvas.height / 2 - 10);
            ctx.fillText("CLICK 'ATTEMPT RECONNECT' TO RE-INITIALIZE FEED", canvas.width / 2, canvas.height / 2 + 15);
          }
        }
      } else {
        // --- SIMULATED OVERRIDE MODE ---
        if (canvas.width !== 640 || canvas.height !== 480) {
          canvas.width = 640;
          canvas.height = 480;
        }

        // Draw deep space grid background
        drawDiagnosticGrid(ctx, canvas.width, canvas.height, timestamp);

        // Get simulated targets and lerp for smooth biological transitions
        const target = getSimulatedTarget(currentDetectedPosture, exerciseId);
        if (simLandmarksRef.current.length === 0) {
          simLandmarksRef.current = target;
        }

        const lerpFactor = 0.12;
        const breathingOffset = Math.sin(timestamp / 400) * 0.006;

        simLandmarksRef.current = simLandmarksRef.current.map((pt, i) => {
          const targetPt = target[i];
          if (!targetPt) return pt;
          // Organic breathing on nose and ears, smaller on shoulders
          const breathingY = (i === 0 || i === 7 || i === 8) ? breathingOffset : breathingOffset * 0.3;
          return {
            x: pt.x + (targetPt.x - pt.x) * lerpFactor,
            y: pt.y + (targetPt.y - pt.y) * lerpFactor + breathingY,
            visibility: 0.99
          };
        });

        // Evaluate joint positions and update metrics/postures once countdown is clear
        if (startCountdown === null) {
          processLivePose(simLandmarksRef.current);
          drawSkeleton(ctx, simLandmarksRef.current, canvas.width, canvas.height);
        } else {
          // Softly pulse the instructions during simulated warmup count
          ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText("CALIBRATING SYNTHETIC BIOMECHANICS VECTORS...", canvas.width / 2, canvas.height / 2 + 80);
        }

        // Simulated FPS counter
        frameCountRef.current++;
        const now = performance.now();
        if (now - lastFrameTimeRef.current >= 1000) {
          setFps(Math.round((frameCountRef.current * 1000) / (now - lastFrameTimeRef.current)));
          frameCountRef.current = 0;
          lastFrameTimeRef.current = now;
        }
      }

      requestRef.current = requestAnimationFrame(runFrame);
    };

    requestRef.current = requestAnimationFrame(runFrame);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [cameraActive, exerciseId, crossBodySide, isCalibrating, calibrationCountdown, currentDetectedPosture, baselineShoulderY, lineStyle, startCountdown]);

  // Helper to calculate angle between vertex and two points in 2D space
  const calculateAngle = (vertex: any, pt1: any, pt2: any) => {
    if (!vertex || !pt1 || !pt2) return 0;
    const v1 = { x: pt1.x - vertex.x, y: pt1.y - vertex.y };
    const v2 = { x: pt2.x - vertex.x, y: pt2.y - vertex.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    if (mag1 === 0 || mag2 === 0) return 0;
    const cosAngle = dot / (mag1 * mag2);
    const clamped = Math.max(-1, Math.min(1, cosAngle));
    return Math.round(Math.acos(clamped) * 180 / Math.PI);
  };

  // Main evaluation logic of key joints
  const processLivePose = (landmarks: any[]) => {
    const nose = landmarks[0];
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftHip = landmarks[23] || (leftShoulder ? { x: leftShoulder.x, y: leftShoulder.y + 0.4, visibility: 0.5 } : null);
    const rightHip = landmarks[24] || (rightShoulder ? { x: rightShoulder.x, y: rightShoulder.y + 0.4, visibility: 0.5 } : null);

    // Determine the side of the body that is most visible to the camera
    const leftVis = (leftEar ? (leftEar.visibility ?? 0) : 0) + (leftShoulder ? (leftShoulder.visibility ?? 0) : 0);
    const rightVis = (rightEar ? (rightEar.visibility ?? 0) : 0) + (rightShoulder ? (rightShoulder.visibility ?? 0) : 0);
    const useLeftSide = leftVis >= rightVis;

    const trackEar = useLeftSide ? (leftEar || rightEar) : (rightEar || leftEar);
    const trackShoulder = useLeftSide ? (leftShoulder || rightShoulder) : (rightShoulder || leftShoulder);

    if (!nose || !trackEar || !trackShoulder) return;

    // Calculate visibility confidence
    const avgVis = (nose.visibility + trackEar.visibility + trackShoulder.visibility) / 3;
    const confidenceScore = Math.round((avgVis || 0.85) * 100);
    setConfidence(confidenceScore);

    // Save calibration baseline values
    if (isCalibrating) {
      tempShoulderYAccumulatorRef.current.push(trackShoulder.y);
      return;
    }

    let detectedState: 'correct' | 'forward' | 'bending' = 'correct';
    let calculatedCva = 0;
    let representativeAngle = 0;

    // Process CVA for Chin Tuck exercise
    if (exerciseId === 'chintuck') {
      const dx = Math.abs(trackEar.x - trackShoulder.x);
      const dy = Math.abs(trackShoulder.y - trackEar.y);
      calculatedCva = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);
      setCvaAngle(calculatedCva);
      representativeAngle = calculatedCva;

      if (calculatedCva > 50) {
        detectedState = 'correct';
      } else if (calculatedCva >= 40) {
        detectedState = 'forward';
      } else {
        detectedState = 'bending';
      }
    } else {
      // Evaluation for Door Frame Stretch Posture Test
      const leftShoulderAbd = leftShoulder && leftHip && leftElbow ? calculateAngle(leftShoulder, leftHip, leftElbow) : 90;
      const rightShoulderAbd = rightShoulder && rightHip && rightElbow ? calculateAngle(rightShoulder, rightHip, rightElbow) : 90;
      const leftElbowFlex = leftElbow && leftShoulder && leftWrist ? calculateAngle(leftElbow, leftShoulder, leftWrist) : 90;
      const rightElbowFlex = rightElbow && rightShoulder && rightWrist ? calculateAngle(rightElbow, rightShoulder, rightWrist) : 90;

      // Torso lean calculation
      let torsoLean = 0;
      if (leftShoulder && rightShoulder && leftHip && rightHip) {
        const midShoulder = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 };
        const midHip = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };
        const dy = midHip.y - midShoulder.y;
        const dx = midHip.x - midShoulder.x;
        torsoLean = Math.round(Math.abs(Math.atan2(dx, dy) * 180 / Math.PI));
      }

      // Left/Right symmetry score
      const abdDiff = Math.abs(leftShoulderAbd - rightShoulderAbd);
      const flexDiff = Math.abs(leftElbowFlex - rightElbowFlex);
      const symmetryScore = Math.max(20, Math.min(100, Math.round(100 - (abdDiff + flexDiff) * 1.5)));

      setDoorFrameAngles({
        leftShoulderAbd,
        rightShoulderAbd,
        leftElbowFlex,
        rightElbowFlex,
        torsoLean,
        symmetryScore
      });

      // Pass the average abduction angle as the primary angle metric
      representativeAngle = Math.round((leftShoulderAbd + rightShoulderAbd) / 2);

      // Rule-based classification
      const shouldersShrugged = (leftShoulder && leftEar && leftShoulder.y < leftEar.y) || 
                               (rightShoulder && rightEar && rightShoulder.y < rightEar.y) ||
                               (baselineShoulderY !== null && (baselineShoulderY - trackShoulder.y) > 0.045);

      const poorSymmetry = abdDiff > 25 || flexDiff > 25;
      const elbowsTooLow = leftElbowFlex < 60 || rightElbowFlex < 60;

      if (shouldersShrugged || poorSymmetry) {
        detectedState = 'bending';
      } else if (elbowsTooLow || representativeAngle < 70) {
        detectedState = 'forward'; // needs to pull arms up/step more
      } else {
        detectedState = 'correct';
      }
    }

    const now = Date.now();
    if (now - lastStateUpdateRef.current >= 500) {
      lastStateUpdateRef.current = now;
      setCurrentDetectedPosture(detectedState);
      onPostureDetected(detectedState, confidenceScore, representativeAngle);
    }
  };

  // Canvas skeletal drawings with interactive protractors and guide silhouettes
  const drawSkeleton = (ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number) => {
    const nose = landmarks[0];
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];
    const leftMouth = landmarks[9];
    const rightMouth = landmarks[10];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];

    // Helper to flip X coordinate for unmirrored canvas text readability
    const getX = (pt: any) => (1 - pt.x) * width;
    const getY = (pt: any) => pt.y * height;

    // --- DRAW GUIDE SILHOUETTE FIRST (BACKGROUND LAYOUT GUIDES) ---
    if (exerciseId === 'chintuck') {
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      // Head circle
      ctx.arc(width * 0.48, height * 0.26, 38, 0, Math.PI * 2);
      ctx.stroke();
      // Neck / spine curve
      ctx.beginPath();
      ctx.moveTo(width * 0.48, height * 0.32);
      ctx.quadraticCurveTo(width * 0.52, height * 0.42, width * 0.53, height * 0.55);
      // Shoulder / chest curve
      ctx.moveTo(width * 0.53, height * 0.55);
      ctx.quadraticCurveTo(width * 0.44, height * 0.58, width * 0.41, height * 0.65);
      ctx.stroke();
      
      // Text hint
      ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText("ALIGN SIDE PROFILE HERE", width * 0.48, height * 0.15);
      ctx.restore();
    } else {
      // Doorway Frame Silhouette
      ctx.save();
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.10)';
      ctx.lineWidth = 3;
      
      // Door frame left & right lines
      ctx.beginPath();
      ctx.moveTo(width * 0.18, 0); ctx.lineTo(width * 0.18, height);
      ctx.moveTo(width * 0.82, 0); ctx.lineTo(width * 0.82, height);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Head
      ctx.arc(width * 0.5, height * 0.24, 26, 0, Math.PI * 2);
      ctx.stroke();
      // Torso Box
      ctx.beginPath();
      ctx.moveTo(width * 0.36, height * 0.42);
      ctx.lineTo(width * 0.64, height * 0.42);
      ctx.lineTo(width * 0.61, height * 0.76);
      ctx.lineTo(width * 0.39, height * 0.76);
      ctx.closePath();
      ctx.stroke();

      // Arms on Frame
      ctx.beginPath();
      ctx.moveTo(width * 0.36, height * 0.42);
      ctx.lineTo(width * 0.20, height * 0.42);
      ctx.lineTo(width * 0.20, height * 0.22);
      
      ctx.moveTo(width * 0.64, height * 0.42);
      ctx.lineTo(width * 0.80, height * 0.42);
      ctx.lineTo(width * 0.80, height * 0.22);
      ctx.stroke();

      // Text hint
      ctx.fillStyle = 'rgba(14, 165, 233, 0.3)';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText("ALIGN DOORWAY FRAME STRETCH PROFILE HERE", width * 0.5, height * 0.13);
      ctx.restore();
    }

    if (!nose) return;

    const leftVis = (leftEar ? (leftEar.visibility ?? 0) : 0) + (leftShoulder ? (leftShoulder.visibility ?? 0) : 0);
    const rightVis = (rightEar ? (rightEar.visibility ?? 0) : 0) + (rightShoulder ? (rightShoulder.visibility ?? 0) : 0);
    const useLeftSide = leftVis >= rightVis;

    const activeEar = useLeftSide ? (leftEar || rightEar) : (rightEar || leftEar);
    const activeShoulder = useLeftSide ? (leftShoulder || rightShoulder) : (rightShoulder || leftShoulder);
    const activeMouth = useLeftSide ? (leftMouth || rightMouth) : (rightMouth || leftMouth);
    const inactiveEar = useLeftSide ? rightEar : leftEar;
    const inactiveShoulder = useLeftSide ? rightShoulder : leftShoulder;
    const inactiveMouth = useLeftSide ? leftMouth : rightMouth;

    // Anatomically calculate Chin point located below the nose / mouth and slightly back towards the ear
    const activeChin = (activeMouth && activeEar && activeShoulder) ? {
      x: activeMouth.x + (activeEar.x - activeMouth.x) * 0.28,
      y: activeMouth.y + (activeShoulder.y - activeMouth.y) * 0.16,
      visibility: 0.99
    } : (nose && activeEar && activeShoulder) ? {
      x: nose.x + (activeEar.x - nose.x) * 0.45,
      y: nose.y + (activeShoulder.y - nose.y) * 0.28,
      visibility: 0.99
    } : (nose && activeShoulder) ? {
      x: nose.x + (activeShoulder.x - nose.x) * 0.2,
      y: nose.y + (activeShoulder.y - nose.y) * 0.25,
      visibility: 0.95
    } : nose ? {
      x: nose.x,
      y: nose.y + 0.05,
      visibility: 0.90
    } : null;

    const inactiveChin = (inactiveMouth && inactiveEar && inactiveShoulder) ? {
      x: inactiveMouth.x + (inactiveEar.x - inactiveMouth.x) * 0.28,
      y: inactiveMouth.y + (inactiveShoulder.y - inactiveMouth.y) * 0.16,
      visibility: 0.99
    } : (nose && inactiveEar && inactiveShoulder) ? {
      x: nose.x + (inactiveEar.x - nose.x) * 0.45,
      y: nose.y + (inactiveShoulder.y - nose.y) * 0.28,
      visibility: 0.99
    } : (nose && inactiveShoulder) ? {
      x: nose.x + (inactiveShoulder.x - nose.x) * 0.2,
      y: nose.y + (inactiveShoulder.y - nose.y) * 0.25,
      visibility: 0.95
    } : nose ? {
      x: nose.x,
      y: nose.y + 0.05,
      visibility: 0.90
    } : null;

    let color = '#ef4444'; // Red fault
    if (currentDetectedPosture === 'correct') color = '#10b981'; // Green correct
    else if (currentDetectedPosture === 'forward') color = '#f59e0b'; // Amber warning

    // Draw high-contrast animated connection line helper
    const drawAnimatedContrastLine = (p1: any, p2: any, activeColor: string, isInactive: boolean = false) => {
      if (!p1 || !p2) return;
      const x1 = getX(p1);
      const y1 = getY(p1);
      const x2 = getX(p2);
      const y2 = getY(p2);

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // 1. Thick flowing neon aura background glow
      ctx.strokeStyle = isInactive ? 'rgba(148, 163, 184, 0.08)' : activeColor;
      ctx.lineWidth = isInactive ? 3 : 7;
      ctx.shadowBlur = isInactive ? 0 : 12;
      ctx.shadowColor = activeColor;
      ctx.globalAlpha = isInactive ? 0.25 : 0.35;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // 2. Ultra-high-contrast crisp white central core line
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
      ctx.lineWidth = isInactive ? 1.5 : 2.5;
      ctx.strokeStyle = isInactive ? 'rgba(148, 163, 184, 0.4)' : '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // 3. Dynamic animated laser-dash crawling effect overlay
      if (!isInactive) {
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 12]);
        // Crawl along the vector line using elapsed performance time
        ctx.lineDashOffset = -performance.now() / 15;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.restore();
    };

    if (exerciseId === 'chintuck') {
      // Connect profile outline with animated lines specifically between nose, ear, shoulder, and chin landmarks
      if (nose && activeChin) {
        drawAnimatedContrastLine(nose, activeChin, color);
      }
      if (activeChin && activeEar) {
        drawAnimatedContrastLine(activeChin, activeEar, color);
      }
      if (activeEar && activeShoulder) {
        drawAnimatedContrastLine(activeEar, activeShoulder, color);
      }

      // Connect inactive profile landmarks softly
      if (nose && inactiveChin) {
        drawAnimatedContrastLine(nose, inactiveChin, color, true);
      }
      if (inactiveChin && inactiveEar) {
        drawAnimatedContrastLine(inactiveChin, inactiveEar, color, true);
      }
      if (inactiveEar && inactiveShoulder) {
        drawAnimatedContrastLine(inactiveEar, inactiveShoulder, color, true);
      }

      // Collarbone bridge
      if (leftShoulder && rightShoulder) {
        drawAnimatedContrastLine(leftShoulder, rightShoulder, '#0ea5e9'); // glowing sky-blue
      }
    } else {
      // Doorframe stretch - connect complete upper skeletal framework with animated contrast lines
      
      // Left Arm
      if (leftShoulder && leftElbow && leftWrist) {
        drawAnimatedContrastLine(leftShoulder, leftElbow, color);
        drawAnimatedContrastLine(leftElbow, leftWrist, color);
      }

      // Right Arm
      if (rightShoulder && rightElbow && rightWrist) {
        drawAnimatedContrastLine(rightShoulder, rightElbow, color);
        drawAnimatedContrastLine(rightElbow, rightWrist, color);
      }

      // Collarbone & Spine line
      if (leftShoulder && rightShoulder) {
        drawAnimatedContrastLine(leftShoulder, rightShoulder, '#0ea5e9');

        if (leftHip && rightHip) {
          const midShoulder = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 };
          const midHip = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };
          
          drawAnimatedContrastLine(midShoulder, midHip, color);

          // Hip boundary
          const hx1 = getX(leftHip);
          const hy1 = getY(leftHip);
          const hx2 = getX(rightHip);
          const hy2 = getY(rightHip);
          ctx.save();
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(hx1, hy1);
          ctx.lineTo(hx2, hy2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // Draw concentric HUD joint nodes with dynamic lock/weak states
    const drawJoint = (pt: any, label: string, isA: boolean) => {
      if (!pt) return;
      const cx = getX(pt);
      const cy = getY(pt);
      const isLowVis = (pt.visibility ?? 1.0) < 0.5;
      
      // Determine color based on tracking status
      let nodeColor = color;
      if (!isA) {
        nodeColor = '#94a3b8'; // Grey/slate for inactive side
      } else if (isLowVis) {
        nodeColor = '#ef4444'; // Red alert for active but weak visibility
      }

      ctx.save();
      
      // 1. Glowing soft ambient background aura
      ctx.shadowBlur = isA ? 14 : 4;
      ctx.shadowColor = nodeColor;
      ctx.fillStyle = isA ? `${nodeColor}33` : 'rgba(148, 163, 184, 0.15)'; // Alpha transparency
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, 2 * Math.PI);
      ctx.fill();
      
      // 2. High-contrast solid inner circular node
      ctx.shadowBlur = 0;
      ctx.fillStyle = nodeColor;
      ctx.beginPath();
      ctx.arc(cx, cy, 5.5, 0, 2 * Math.PI);
      ctx.fill();

      // High-contrast white pinpoint center for ultimate visibility over webcam frames
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, 2 * Math.PI);
      ctx.fill();

      // 3. Dynamic rotating outer tracker halo ring
      ctx.strokeStyle = nodeColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      // Radius pulses gently over time
      const pulseRadius = 11 + Math.sin(performance.now() / 110) * 1.5;
      ctx.arc(cx, cy, pulseRadius, 0, 2 * Math.PI);
      ctx.stroke();

      // 4. Draw outer crosshair target ticks (rotating based on time to show active processing)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(performance.now() / 450); // slow rotation
      ctx.strokeStyle = isA ? '#ffffff' : 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-pulseRadius - 5, 0); ctx.lineTo(-pulseRadius, 0);
      ctx.moveTo(pulseRadius, 0); ctx.lineTo(pulseRadius + 5, 0);
      ctx.moveTo(0, -pulseRadius - 5); ctx.lineTo(0, -pulseRadius);
      ctx.moveTo(0, pulseRadius); ctx.lineTo(0, pulseRadius + 5);
      ctx.stroke();
      ctx.restore();

      // 5. Draw status tag text (LOCKED/WEAK/STANDBY)
      const statusText = !isA ? 'STANDBY' : isLowVis ? 'WEAK' : 'LOCKED';
      const statusColor = !isA ? '#64748b' : isLowVis ? '#ef4444' : '#10b981';

      // Draw metadata label badge
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'; // semi-transparent background
      ctx.beginPath();
      ctx.roundRect(cx + 18, cy - 14, 88, 25, 4);
      ctx.fill();
      ctx.strokeStyle = isA ? nodeColor : 'rgba(148, 163, 184, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(label, cx + 22, cy - 4);

      ctx.fillStyle = statusColor;
      ctx.font = '900 7px monospace';
      ctx.fillText(statusText, cx + 22, cy + 6);
      
      ctx.fillStyle = '#94a3b8';
      ctx.font = '6px monospace';
      ctx.fillText(`C:${(pt.visibility ?? 1.0).toFixed(2)}`, cx + 64, cy + 6);

      ctx.restore();
    };

    if (exerciseId === 'chintuck') {
      drawJoint(nose, 'NOSE', true);
      if (activeChin) drawJoint(activeChin, 'CHIN', true);
      drawJoint(activeEar, 'EAR', true);
      drawJoint(activeShoulder, 'SHOULDER', true);
      if (inactiveEar) drawJoint(inactiveEar, 'EAR [INACTIVE]', false);
      if (inactiveShoulder) drawJoint(inactiveShoulder, 'SHOULDER [INACTIVE]', false);

      // Spine vertical dash reference axis
      const sMidX = rightShoulder && leftShoulder ? (leftShoulder.x + rightShoulder.x) / 2 : (leftShoulder?.x || rightShoulder?.x || 0.5);
      const sMidY = rightShoulder && leftShoulder ? (leftShoulder.y + rightShoulder.y) / 2 : (leftShoulder?.y || rightShoulder?.y || 0.5);
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo((1 - sMidX) * width, sMidY * height);
      ctx.lineTo((1 - sMidX) * width, (sMidY + 0.22) * height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw CVA Angle Protractor overlay
      if (activeEar && activeShoulder) {
        const ex = getX(activeEar);
        const ey = getY(activeEar);
        const sx = getX(activeShoulder);
        const sy = getY(activeShoulder);
        
        const angleToEar = Math.atan2(ey - sy, ex - sx);

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy - 60);
        ctx.stroke();
        ctx.setLineDash([]);

        // Angular arc tracer
        const isEarOnLeft = ex < sx;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx, sy, 40, -Math.PI / 2, angleToEar, isEarOnLeft);
        ctx.stroke();
        ctx.restore();

        // Angle Label Bubble
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        ctx.roundRect(ex - 45, ey - 38, 90, 24, 6);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`CVA: ${cvaAngle}°`, ex, ey - 22);
        ctx.restore();
      }
    } else {
      // Draw all Door Frame Stretch joints with active labels
      drawJoint(nose, 'NOSE', true);
      if (leftShoulder) drawJoint(leftShoulder, 'L SHOULDER', true);
      if (rightShoulder) drawJoint(rightShoulder, 'R SHOULDER', true);
      if (leftElbow) drawJoint(leftElbow, 'L ELBOW', true);
      if (rightElbow) drawJoint(rightElbow, 'R ELBOW', true);
      if (leftWrist) drawJoint(leftWrist, 'L WRIST', true);
      if (rightWrist) drawJoint(rightWrist, 'R WRIST', true);
      if (leftHip) drawJoint(leftHip, 'L HIP', false);
      if (rightHip) drawJoint(rightHip, 'R HIP', false);

      // --- DRAW DYNAMIC INTERACTIVE PROTRACTOR ARCS ON JOINTS ---
      const drawAngleArc = (vertex: any, pt1: any, pt2: any, angleVal: number, colorStr: string, label: string) => {
        if (!vertex || !pt1 || !pt2) return;
        const vx = getX(vertex);
        const vy = getY(vertex);
        const dx1 = getX(pt1) - vx;
        const dy1 = getY(pt1) - vy;
        const dx2 = getX(pt2) - vx;
        const dy2 = getY(pt2) - vy;
        
        const a1 = Math.atan2(dy1, dx1);
        const a2 = Math.atan2(dy2, dx2);
        
        ctx.save();
        ctx.strokeStyle = colorStr;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(vx, vy, 26, a1, a2, a1 > a2);
        ctx.stroke();
        
        // Label badge
        const midAngle = (a1 + a2) / 2;
        const tx = vx + Math.cos(midAngle) * 44;
        const ty = vy + Math.sin(midAngle) * 44;
        
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(tx - 30, ty - 9, 60, 18, 4);
        ctx.fill();
        ctx.strokeStyle = colorStr;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${label}: ${angleVal}°`, tx, ty + 3);
        ctx.restore();
      };

      // Draw shoulder abductions
      if (leftShoulder && leftHip && leftElbow) {
        drawAngleArc(leftShoulder, leftHip, leftElbow, doorFrameAngles.leftShoulderAbd, '#38bdf8', 'L ABD');
      }
      if (rightShoulder && rightHip && rightElbow) {
        drawAngleArc(rightShoulder, rightHip, rightElbow, doorFrameAngles.rightShoulderAbd, '#38bdf8', 'R ABD');
      }

      // Draw elbow flexions
      if (leftElbow && leftShoulder && leftWrist) {
        drawAngleArc(leftElbow, leftShoulder, leftWrist, doorFrameAngles.leftElbowFlex, '#10b981', 'L FLEX');
      }
      if (rightElbow && rightShoulder && rightWrist) {
        drawAngleArc(rightElbow, rightShoulder, rightWrist, doorFrameAngles.rightElbowFlex, '#10b981', 'R FLEX');
      }
    }

    // --- BOTTOM ALIGNMENT / CONFIDENCE HUD WATERMARK BADGE ---
    ctx.save();
    if (confidence >= 70) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
      ctx.beginPath();
      ctx.roundRect(width - 130, height - 32, 120, 22, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('✓ ALIGNMENT IDEAL', width - 70, height - 18);
    } else {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.beginPath();
      ctx.roundRect(width - 190, height - 32, 180, 22, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ WEAK VISIBILITY: ADJUST LIGHTING', width - 95, height - 18);
    }
    ctx.restore();
  };

  // Manual Trigger for Sandbox simulation fallback when webcam fails
  const handleManualTrigger = (posture: 'correct' | 'forward' | 'bending') => {
    setCurrentDetectedPosture(posture);
    const mockAngle = posture === 'correct' ? 54 : posture === 'forward' ? 44 : 28;
    onPostureDetected(posture, 100, mockAngle);
  };

  return (
    <div className="flex flex-col gap-4 w-full" id="camera-tracker-panel">
      
      {/* Dynamic Viewport Card */}
      <div className="relative aspect-video w-full bg-slate-950 border border-slate-800 overflow-hidden rounded-2xl shadow-inner flex items-center justify-center">
        
        {/* Loading Spinner Model */}
        {isLoadingModel && cameraActive && (
          <div className="absolute inset-0 bg-slate-950/90 z-20 flex flex-col items-center justify-center p-6 gap-3 text-center">
            <Loader2 className="animate-spin text-blue-500 stroke-[2.5]" size={36} />
            <p className="text-sm font-semibold text-slate-100">Loading pose model...</p>
            <p className="text-xs text-slate-400 max-w-xs">Fetching high precision WASM neural models. Please wait.</p>
          </div>
        )}

        {/* Model Error Overlay */}
        {modelError && cameraActive && (
          <div className="absolute inset-0 bg-slate-950/95 z-20 flex flex-col items-center justify-center p-6 gap-3 text-center">
            <AlertTriangle className="text-rose-500 animate-bounce" size={36} />
            <p className="text-sm font-semibold text-slate-100">Model Download Failure</p>
            <p className="text-xs text-rose-300 max-w-xs">{modelError}</p>
          </div>
        )}

        {/* Stream Suspended Overlay */}
        {cameraActive && isSuspended && (
          <div className="absolute inset-0 bg-slate-950/90 z-20 flex flex-col items-center justify-center p-6 gap-3 text-center">
            <AlertTriangle className="text-amber-500 animate-pulse" size={36} />
            <div>
              <p className="text-sm font-bold text-amber-400">Anatomical Feed Suspended</p>
              <p className="text-xs text-slate-300 mt-1 max-w-sm">
                The webcam stream has frozen, paused, or was suspended by the system power manager.
              </p>
            </div>
            <button
              onClick={attemptReconnect}
              disabled={reconnecting}
              className="mt-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white font-sans font-black text-xs rounded-xl tracking-wide transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {reconnecting ? (
                <>
                  <Loader2 className="animate-spin" size={13} /> RECONNECTING...
                </>
              ) : (
                <>
                  <RefreshCw size={13} /> ATTEMPT RECONNECT
                </>
              )}
            </button>
          </div>
        )}

        {/* Always-mounted Live Camera Stream elements */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${cameraActive ? "block" : "hidden"}`}
        />
        
        {/* Mirror overlay skeleton (Always block so simulation is drawn) */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none block"
        />

        {/* Compact webcam offline banner */}
        {!cameraActive && (
          <div className="absolute top-12 left-3 right-3 bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between gap-3 text-left z-10 shadow-lg">
            <div className="flex items-center gap-2.5">
              <CameraOff className="text-sky-400 shrink-0" size={18} />
              <div>
                <span className="text-xs font-extrabold text-slate-100 block">Biomechanical Virtual Simulator</span>
                <span className="text-[10px] text-slate-400 block leading-normal">
                  Webcam offline. Use manual controls below to test biomechanics.
                </span>
              </div>
            </div>
            <button
              onClick={startCamera}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-[10px] rounded-lg tracking-wider transition-all whitespace-nowrap cursor-pointer shadow-sm"
            >
              START WEBCAM
            </button>
          </div>
        )}

        {/* Compact camera error banner */}
        {!cameraActive && cameraError && (
          <div className="absolute bottom-3 left-3 right-3 bg-rose-950/95 backdrop-blur-md px-4 py-3 rounded-xl border border-rose-800/60 flex flex-col gap-2 text-left z-10 shadow-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={16} />
              <div>
                <span className="text-xs font-bold text-rose-200 block">Camera Permission Blocked</span>
                <span className="text-[10px] text-rose-300 block leading-normal">
                  {cameraError}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] rounded-lg transition-all flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={11} /> Open in New Tab
              </a>
              <button
                onClick={startCamera}
                className="flex-1 text-center py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] rounded-lg transition-all"
              >
                Retry Link
              </button>
            </div>
          </div>
        )}

        {/* Calibration Countdown Overlay */}
        {isCalibrating && (
          <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-xs flex flex-col items-center justify-center text-white z-10 font-sans">
            <Sparkles size={36} className="text-amber-400 animate-spin mb-2" />
            <span className="text-lg font-extrabold uppercase tracking-widest">Calibrating Base...</span>
            <span className="text-3xl font-black mt-1 animate-ping">{calibrationCountdown}</span>
          </div>
        )}

        {/* Starting Countdown Overlay */}
        {startCountdown !== null && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 font-sans">
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-sky-500/30 bg-slate-900/90 shadow-2xl max-w-[280px] text-center">
              <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-black mb-1">
                PREPARING FEED
              </span>
              <span className="text-[11px] text-slate-400 mb-5 leading-normal font-medium">
                Reposition yourself and stand steady
              </span>
              
              {startCountdown <= 3 ? (
                <div className="flex items-center justify-center w-20 h-20 rounded-full border-4 border-dashed border-sky-400/40 animate-[spin_6s_linear_infinite] relative">
                  <span className="absolute text-4xl font-black text-sky-400 font-mono tracking-tighter select-none animate-pulse">
                    {startCountdown}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400/80 relative animate-pulse">
                    <span className="text-lg font-bold text-emerald-400 animate-bounce select-none">
                      GO!
                    </span>
                  </div>
                </div>
              )}
              
              <span className="text-[9px] font-mono text-slate-500 mt-5 block">
                Analysis will begin automatically
              </span>
            </div>
          </div>
        )}

        {/* Dynamic Watermark Tag */}
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 rounded border border-slate-700/60 text-[9px] font-mono font-bold text-sky-400 select-none">
          AI PIPELINE: {cameraActive ? 'STREAMING' : 'VIRTUAL SIMULATOR'}
        </div>
      </div>

      {/* Real-time Status metrics Bar */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {exerciseId === 'chintuck' ? (
          <>
            <div>
              <span className="text-[10px] font-bold font-mono text-slate-500 uppercase block">Craniovertebral Angle</span>
              <span className="text-sm font-mono font-extrabold text-slate-900 mt-1 block">
                {cvaAngle}°
              </span>
              <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">Ideal: &gt;50°</span>
            </div>

            <div>
              <span className="text-[10px] font-bold font-mono text-slate-500 uppercase block">Head Deviation</span>
              <span className="text-sm font-mono font-extrabold text-amber-600 mt-1 block">
                {cvaAngle < 50 ? `${50 - cvaAngle}° Forward` : 'None (Neutral)'}
              </span>
              <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">Protrusion offset</span>
            </div>
          </>
        ) : (
          <>
            <div>
              <span className="text-[10px] font-bold font-mono text-slate-500 uppercase block">Shoulder Abductions</span>
              <div className="flex justify-center items-center gap-2 mt-1">
                <span className="text-xs font-mono font-extrabold text-slate-800 bg-blue-100/60 border border-blue-200 px-1.5 py-0.5 rounded">
                  L: {doorFrameAngles.leftShoulderAbd}°
                </span>
                <span className="text-xs font-mono font-extrabold text-slate-800 bg-blue-100/60 border border-blue-200 px-1.5 py-0.5 rounded">
                  R: {doorFrameAngles.rightShoulderAbd}°
                </span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono mt-1 block">Target: ~90°</span>
            </div>

            <div>
              <span className="text-[10px] font-bold font-mono text-slate-500 uppercase block">Elbow Flexions</span>
              <div className="flex justify-center items-center gap-2 mt-1">
                <span className="text-xs font-mono font-extrabold text-slate-800 bg-emerald-100/60 border border-emerald-200 px-1.5 py-0.5 rounded">
                  L: {doorFrameAngles.leftElbowFlex}°
                </span>
                <span className="text-xs font-mono font-extrabold text-slate-800 bg-emerald-100/60 border border-emerald-200 px-1.5 py-0.5 rounded">
                  R: {doorFrameAngles.rightElbowFlex}°
                </span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono mt-1 block">Target: ~90°</span>
            </div>
          </>
        )}

        <div>
          <span className="text-[10px] font-bold font-mono text-slate-500 uppercase block">
            {exerciseId === 'chintuck' ? 'Tracking Confidence' : 'Bilateral Symmetry'}
          </span>
          <span className={`text-sm font-mono font-extrabold mt-1 block ${
            exerciseId === 'chintuck'
              ? confidence >= 70 ? 'text-emerald-600' : 'text-rose-500'
              : doorFrameAngles.symmetryScore >= 80 ? 'text-emerald-600' : 'text-amber-500'
          }`}>
            {exerciseId === 'chintuck' ? `${confidence}%` : `${doorFrameAngles.symmetryScore}%`}
          </span>
          <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">
            {exerciseId === 'chintuck' ? 'Optical signal accuracy' : `Torso Lean: ${doorFrameAngles.torsoLean}°`}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold font-mono text-slate-500 uppercase block">Clinical Posture Status</span>
          <div className="flex justify-center mt-1.5">
            <span className={`text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full ${
              currentDetectedPosture === 'correct' 
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : currentDetectedPosture === 'forward'
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-rose-100 text-rose-800 border border-rose-300'
            }`}>
              {currentDetectedPosture === 'correct' ? 'IDEAL CORRECT' : currentDetectedPosture === 'forward' ? 'DEVIATION' : 'FAULT DETECTED'}
            </span>
          </div>
          <span className="text-[9px] text-blue-500 font-mono font-bold mt-1.5 block">
            {fps} FPS TELEMETRY
          </span>
        </div>
      </div>

      {/* Core Button Action controls */}
      <div className="flex flex-wrap items-center gap-3 w-full">
        {cameraActive ? (
          <>
            <button
              onClick={stopCamera}
              className="flex-1 min-w-[140px] py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer text-center font-sans tracking-wide"
            >
              STOP WEBCAM FEED
            </button>
            {isSuspended && (
              <button
                onClick={attemptReconnect}
                disabled={reconnecting}
                className="flex-1 min-w-[140px] py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 animate-pulse"
              >
                {reconnecting ? (
                  <>
                    <Loader2 className="animate-spin" size={12} /> RECONNECTING...
                  </>
                ) : (
                  <>
                    <RefreshCw size={12} /> ATTEMPT RECONNECT
                  </>
                )}
              </button>
            )}
            <button
              onClick={triggerCalibration}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs rounded-xl transition-all border border-slate-200 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={12} className={isCalibrating ? 'animate-spin' : ''} />
              CALIBRATE BASELINE
            </button>
          </>
        ) : (
          /* Fallback UI: Manual simulation buttons */
          <div className="w-full border border-dashed border-slate-200 bg-slate-50/50 p-4 rounded-xl flex flex-col gap-3">
            <span className="text-xs font-bold font-mono text-slate-500 flex items-center gap-1.5">
              <Sliders size={12} /> MANUAL SIMULATION OVERRIDE CONTROLS
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleManualTrigger('correct')}
                className={`py-2 px-3 text-xs font-bold font-mono rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  currentDetectedPosture === 'correct'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-extrabold shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {currentDetectedPosture === 'correct' && <Check size={12} />}
                Neutral (Correct)
              </button>
              <button
                onClick={() => handleManualTrigger('forward')}
                className={`py-2 px-3 text-xs font-bold font-mono rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  currentDetectedPosture === 'forward'
                    ? 'bg-amber-50 text-amber-700 border-amber-300 font-extrabold shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {currentDetectedPosture === 'forward' && <Check size={12} />}
                Forward (Warning)
              </button>
              <button
                onClick={() => handleManualTrigger('bending')}
                className={`py-2 px-3 text-xs font-bold font-mono rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  currentDetectedPosture === 'bending'
                    ? 'bg-rose-50 text-rose-700 border-rose-300 font-extrabold shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {currentDetectedPosture === 'bending' && <Check size={12} />}
                Flexed (Fault)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
