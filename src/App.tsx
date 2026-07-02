import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Video, 
  HelpCircle, 
  ChevronRight, 
  Compass, 
  Sparkles, 
  RotateCcw,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  Award,
  Volume2,
  VolumeX,
  Smartphone,
  Sliders,
  Maximize2,
  Tv,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Flame,
  UserCheck,
  Trophy,
  Zap,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Star,
  Check,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PreSessionWarmup from './components/PreSessionWarmup';
import SessionReportModal from './components/SessionReportModal';
import PostureProgress from './components/PostureProgress';
import CameraPostureTracker from './components/CameraPostureTracker';
import AIPostureAssistant from './components/AIPostureAssistant';
import PostureReportSection from './components/PostureReportSection';

// Dedicated Cooldown/Spam-proof Audio Voice Helper
function speakVoiceAlert(
  text: string, 
  isMuted: boolean, 
  lastSpokenTextRef: React.MutableRefObject<string>,
  lastSpeakTimeRef: React.MutableRefObject<number>,
  voicePace: 'standard' | 'slow' = 'standard'
) {
  if (isMuted) return;
  const now = Date.now();
  
  // Is this warning critical or corrective?
  const isCritical = text.includes("Do not") || text.includes("neck") || text.includes("straight") || text.includes("slouch");
  
  // Enforce a strict global spacing between ANY voice alerts to prevent annoying noise and rapid overlap.
  const globalCooldown = isCritical ? 3500 : 5000;
  if (now - lastSpeakTimeRef.current < globalCooldown) {
    return;
  }

  // Also prevent repeating the exact same feedback within 7 seconds
  if (text === lastSpokenTextRef.current && (now - lastSpeakTimeRef.current < 7000)) {
    return;
  }

  lastSpokenTextRef.current = text;
  lastSpeakTimeRef.current = now;

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    // Cancel any ongoing speaking immediately to keep the voice alert timely and clean
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    // Use highly polished, calm, natural human pacing (pitch 1.0 is standard human, 0.95 rate is calm and clear)
    utterance.rate = voicePace === 'slow' ? 0.80 : 0.95;
    utterance.pitch = 1.0; 
    window.speechSynthesis.speak(utterance);
  }
}

export const REHAB_EXERCISES = [
  {
    id: 'chin-tuck',
    name: 'Chin Tucks Test',
    indication: 'for neck strengthening and posture correction',
    bodyTarget: 'Deep Cervical Flexors (Longus Colli)',
    difficulty: 'Intermediate' as const,
    bgTheme: 'from-blue-50/70 to-indigo-50/80 border-blue-150 hover:border-blue-400 focus:ring-blue-200',
    iconColor: 'text-blue-600 bg-blue-100/80 border border-blue-200/50',
    description: 'Draws cervical spine straight back to relieve head-forward stress (Tex-Neck).',
    subtext: 'Pull your ears straight backwards horizontally, keeping eyes parallel to the floor.',
    repsPreset: 3,
    slider1Label: 'Cervical Retraction Depth',
    slider2Label: 'Downward Neck Nod Bend',
    slider1Max: 100,
    slider2Max: 100,
    defaultSlider1: 40,
    defaultSlider2: 50,
  },
  {
    id: 'door-frame',
    name: 'Door Frame Stretch',
    indication: 'for shoulder pain',
    bodyTarget: 'Pec Major & Anterior Deltoid',
    difficulty: 'Beginner' as const,
    bgTheme: 'from-emerald-50/70 to-teal-50/80 border-emerald-150 hover:border-emerald-400 focus:ring-emerald-200',
    iconColor: 'text-emerald-700 bg-emerald-100/80 border border-emerald-200/50',
    description: 'Opens rounded, slouching chest pockets to relieve shoulder joint compression.',
    subtext: 'Place arms at 90° on frame side boundaries, step forward slightly, and lift chest tall.',
    repsPreset: 3,
    slider1Label: 'Pectoral Extension Depth',
    slider2Label: 'Neck Forward Slouch Deviation',
    slider1Max: 100,
    slider2Max: 100,
    defaultSlider1: 30,
    defaultSlider2: 30,
  }
];

const getExerciseKey = (id: string): 'chintuck' | 'doorframe' | 'crossbody' | 'uppertrap' | 'handbehind' => {
  if (id === 'chin-tuck') return 'chintuck';
  if (id === 'door-frame') return 'doorframe';
  return 'chintuck';
};

export default function App() {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<'camera' | 'simulation' | 'report' | 'progress'>('camera');
  const [activeExerciseId, setActiveExerciseId] = useState<string>('chin-tuck');
  const [doorFrameOption, setDoorFrameOption] = useState<'A' | 'B' | 'C'>('B');
  const [crossBodySide, setCrossBodySide] = useState<'left' | 'right'>('left');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  
  // Pause/Resume and completedTests state managers
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [completedTests, setCompletedTests] = useState<string[]>([]);

  // Session parameters & active flow controls
  const [sessionActive, setSessionActive] = useState<boolean>(false);
  const [targetHoldDuration, setTargetHoldDuration] = useState<number>(3.0);
  const [targetRestDuration, setTargetRestDuration] = useState<number>(4.0);
  const [voicePace, setVoicePace] = useState<'standard' | 'slow'>('standard');

  // Session saving state safeguard to avoid double-logging
  const sessionSavedRef = useRef<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showWarmupModal, setShowWarmupModal] = useState<boolean>(false);

  // Calibration Variables
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false);
  const [baselineEarX, setBaselineEarX] = useState<number>(0.5);
  const [baselineNoseY, setBaselineNoseY] = useState<number>(0.4);
  const [baselineShoulderX, setBaselineShoulderX] = useState<number>(0.5);

  // Live posture state captured or simulated
  const [currentStage, setCurrentStage] = useState<'neutral' | 'correct' | 'bending' | 'forward'>('neutral');
  const [neckAngle, setNeckAngle] = useState<number>(36);
  const [alignmentScore, setAlignmentScore] = useState<number>(70);
  const [stabilityScore, setStabilityScore] = useState<number>(95);
  const [isCorrectInHold, setIsCorrectInHold] = useState<boolean>(false);

  // Collapsible Control Panel Panel settings
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);
  const [showMetrics, setShowMetrics] = useState<boolean>(true);
  const [sensitivity, setSensitivity] = useState<number>(50); // slider (1 to 100)
  const [controlPanelOpen, setControlPanelOpen] = useState<boolean>(true);

  // Exercise & Rep State
  const [repCount, setRepCount] = useState<number>(0);
  const [inWinningState, setInWinningState] = useState<boolean>(false);
  const [targetReps, setTargetReps] = useState<number>(10);
  const [holdTimer, setHoldTimer] = useState<number>(0);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [restRemaining, setRestRemaining] = useState<number>(0);

  // Active Session Analytics & Evaluation State
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [bendingViolations, setBendingViolations] = useState<number>(0);
  const [accumulatedAlignment, setAccumulatedAlignment] = useState<number>(0);
  const [alignmentSamples, setAlignmentSamples] = useState<number>(0);
  const [accumulatedStability, setAccumulatedStability] = useState<number>(0);
  const [stabilitySamples, setStabilitySamples] = useState<number>(0);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [movementHistory, setMovementHistory] = useState<Array<{ time: string; angle: number; alignment: number; stability: number; stage: string }>>([]);

  // Simulator controls
  const [simRetraction, setSimRetraction] = useState<number>(40); // 0 (Severe Forward) to 100 (Perfect Retro)
  const [simDownwardBend, setSimDownwardBend] = useState<number>(50); // 0 (Horizontal Neutral) to 100 (Deep nod downward)

  // Web camera / MediaPipe references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastStateRef = useRef<'neutral' | 'correct' | 'bending' | 'forward'>('neutral');

  // Cooldown Speech Refs to eliminate verbal repetition spam
  const lastSpokenTextRef = useRef<string>("");
  const lastSpeakTimeRef = useRef<number>(0);

  // Landmarks tracking frame history to calculate live stability score (movement jitter)
  const prevCoordinatesRef = useRef<{ noseY: number, earX: number } | null>(null);

  const activeExercise = REHAB_EXERCISES.find(ex => ex.id === activeExerciseId) || REHAB_EXERCISES[0];

  useEffect(() => {
    // Reset exercise session metrics when active exercise changes
    setRepCount(0);
    setSessionCompleted(false);
    setSessionActive(false); // require setup and start click
    setBendingViolations(0);
    setAccumulatedAlignment(0);
    setAlignmentSamples(0);
    setAccumulatedStability(0);
    setStabilitySamples(0);
    setTargetReps(activeExercise.repsPreset);
    setSimRetraction(activeExercise.defaultSlider1);
    setSimDownwardBend(activeExercise.defaultSlider2);
    sessionSavedRef.current = false;
    setIsPaused(false);
    setCompletedTests([]);

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    speakVoiceAlert(`Loading ${activeExercise.name} therapy. Let's begin.`, isMuted, lastSpokenTextRef, lastSpeakTimeRef, voicePace);
  }, [activeExerciseId]);

  // Load and apply Speech alerting for user state changes with debounce and cooldown protection 
  useEffect(() => {
    if (sessionCompleted || isPaused) {
      return;
    }

    // We want to debounce the verbal feedback so micro-oscillations don't cause chatter
    const handleSpeakDebounced = () => {
      if (currentStage === 'correct') {
        const correctAlert = activeExerciseId === 'door-frame' ? "Excellent door frame stretch! Hold chest tall."
          : activeExerciseId === 'cross-body' ? `Great ${crossBodySide === 'left' ? 'left' : 'right'} shoulder stretch! Hold the pull firmly.`
          : activeExerciseId === 'upper-trap' ? "Splendid side neck stretch! Feel the trap release."
          : activeExerciseId === 'hand-behind' ? "Ideal knuckles lift! Expand your collarbones."
          : "Correct Chin Tuck! Hold it right there.";
        speakVoiceAlert(correctAlert, isMuted, lastSpokenTextRef, lastSpeakTimeRef, voicePace);
      } else if (currentStage === 'bending') {
        const bendingAlert = activeExerciseId === 'door-frame' ? "Keep your neck straight, do not slouch forward."
          : activeExerciseId === 'cross-body' ? `Roll your active ${crossBodySide === 'left' ? 'left' : 'right'} shoulder down, away from your ear.`
          : activeExerciseId === 'upper-trap' ? "Relax your opposite shoulder. Keep it down low."
          : activeExerciseId === 'hand-behind' ? "Keep your back straight. Do not bend forward."
          : "Keep your head straight, do not bend down.";
        speakVoiceAlert(bendingAlert, isMuted, lastSpokenTextRef, lastSpeakTimeRef, voicePace);
      } else if (currentStage === 'forward') {
        const forwardAlert = activeExerciseId === 'door-frame' ? "Step forward slightly to expand the stretch."
          : activeExerciseId === 'cross-body' ? `Pull your ${crossBodySide === 'left' ? 'left' : 'right'} arm tighter across your chest.`
          : activeExerciseId === 'upper-trap' ? "Gently tilt your ear further to the side."
          : activeExerciseId === 'hand-behind' ? "Squeeze your shoulder blades and lift hands."
          : "Pull your chin straight back.";
        speakVoiceAlert(forwardAlert, isMuted, lastSpokenTextRef, lastSpeakTimeRef, voicePace);
      } else if (currentStage === 'neutral') {
        const neutralAlert = activeExerciseId === 'door-frame' ? "Neutral stance. Position arms on the frame."
          : activeExerciseId === 'cross-body' ? `Neutral arm posture. Reach ${crossBodySide === 'left' ? 'left' : 'right'} arm across.`
          : activeExerciseId === 'upper-trap' ? "Start looking straight. Lower your shoulder."
          : activeExerciseId === 'hand-behind' ? "Fingers interlaced. Stand tall."
          : "Keep central posture.";
        speakVoiceAlert(neutralAlert, isMuted, lastSpokenTextRef, lastSpeakTimeRef, voicePace);
      }
    };

    // Record bending violations immediately without debounce to keep logs accurate
    if (currentStage === 'bending' && lastStateRef.current !== 'bending') {
      if ((cameraActive || activeTab === 'simulation') && !sessionCompleted) {
        setBendingViolations(v => v + 1);
      }
    }

    if (lastStateRef.current !== currentStage) {
      lastStateRef.current = currentStage;
      
      const timer = setTimeout(() => {
        handleSpeakDebounced();
      }, 1200); // 1.2s stable hold duration required to trigger speech feedback

      return () => clearTimeout(timer);
    }
  }, [currentStage, isMuted, cameraActive, activeTab, sessionCompleted, activeExerciseId, isPaused, voicePace, crossBodySide]);

  // Handle Pause/Resume voice feedback
  useEffect(() => {
    if (isPaused) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      speakVoiceAlert("Exercise paused. Standing by.", isMuted, lastSpokenTextRef, lastSpeakTimeRef, voicePace);
    } else if (cameraActive && !sessionCompleted) {
      speakVoiceAlert("Exercise resumed. Let's continue.", isMuted, lastSpokenTextRef, lastSpeakTimeRef, voicePace);
    }
  }, [isPaused, cameraActive, sessionCompleted, isMuted, voicePace]);

  // Turn off the webcam camera when session is completed
  useEffect(() => {
    if (sessionCompleted) {
      stopCameraSystem();
    }
  }, [sessionCompleted]);

  // Active session timer and statistics compiler
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if ((cameraActive || activeTab === 'simulation') && !sessionCompleted && !isPaused) {
      interval = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
        
        // Every second, capture active scores to accumulators
        setAccumulatedAlignment((prev) => prev + alignmentScore);
        setAlignmentSamples((prev) => prev + 1);
        setAccumulatedStability((prev) => prev + stabilityScore);
        setStabilitySamples((prev) => prev + 1);

        // Capture snapshot for movement analyzer
        setMovementHistory((prev) => {
          const snapshot = {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            angle: neckAngle,
            alignment: alignmentScore,
            stability: stabilityScore,
            stage: currentStage
          };
          const updated = [...prev, snapshot];
          if (updated.length > 30) {
            return updated.slice(updated.length - 30);
          }
          return updated;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cameraActive, activeTab, sessionCompleted, isPaused, alignmentScore, stabilityScore, neckAngle, currentStage]);

  // Save telemetry analysis session to local storage progress database
  const saveSessionToLogs = (finalRepCount: number) => {
    if (sessionSavedRef.current || finalRepCount === 0) return;
    sessionSavedRef.current = true;

    // Compile averages over active duration samples
    const avgAlign = alignmentSamples > 0 ? Math.round(accumulatedAlignment / alignmentSamples) : alignmentScore;
    const avgStab = stabilitySamples > 0 ? Math.round(accumulatedStability / stabilitySamples) : stabilityScore;
    
    const newLog = {
      id: `session-${Date.now()}`,
      timestamp: new Date().toISOString(),
      dateString: new Date().toISOString().split('T')[0],
      duration: sessionDuration,
      repCount: finalRepCount,
      targetReps: targetReps,
      avgAlignment: avgAlign,
      avgStability: avgStab,
      bendingViolations: bendingViolations
    };

    try {
      const stored = localStorage.getItem('chin_tuck_session_logs');
      let currentLogs = [];
      if (stored) {
        currentLogs = JSON.parse(stored);
      }
      currentLogs.push(newLog);
      localStorage.setItem('chin_tuck_session_logs', JSON.stringify(currentLogs));
    } catch (e) {
      console.error("Failed to save session metrics to logs:", e);
    }
  };

  // Safe side effect monitoring to log data automatically when audit report is opened
  useEffect(() => {
    if (showReportModal && repCount > 0 && !sessionSavedRef.current) {
      saveSessionToLogs(repCount);
    }
  }, [showReportModal, repCount]);

  // Calibration tool
  const handleCalibrate = () => {
    setIsCalibrated(true);
    speakVoiceAlert("Standard cervical baseline calibrated.", isMuted, lastSpokenTextRef, lastSpeakTimeRef);
  };

  // State processor logic for Chin Tuck
  // - If ear moves backward relative to calibrated position, and nose remains stable on Y-axis -> "Correct Chin Tuck ✅"
  // - If nose goes downwards (increased Y) -> "Do not bend your neck ❌" (it's neck flexion!)
  // - Else -> "Pull your chin straight back"
  const processPostureCoordinates = (
    noseY: number, 
    earX: number, 
    earY: number, 
    shoulderX: number, 
    shoulderY: number
  ) => {
    // 0 is top, 1 is bottom in MediaPipe normalized coordinates
    // Lower nose Y = higher up. Higher nose Y = further down (bending)
    const noseBendDelta = noseY - baselineNoseY;
    
    // Calculate live stability score based on frame-by-frame coordinate velocity
    if (prevCoordinatesRef.current) {
      const dNose = Math.abs(noseY - prevCoordinatesRef.current.noseY);
      const dEar = Math.abs(earX - prevCoordinatesRef.current.earX);
      const speed = (dNose + dEar) * 1000; // convert to arbitrary scale
      const calculatedStability = Math.max(20, Math.min(100, Math.round(100 - speed)));
      // Apply light moving average
      setStabilityScore(prev => Math.round(prev * 0.85 + calculatedStability * 0.15));
    }
    prevCoordinatesRef.current = { noseY, earX };

    // Sensitivity-based horizontal thresholds
    // higher sensitivity state makes it tighter (need to retract of at least 0.045)
    // lower sensitivity makes it broader (need to retract only 0.02)
    const retractionThreshold = 0.02 + (sensitivity / 2000); // ranges roughly 0.02 to 0.07 (default is 0.045 at 50 sensitivity)

    // X distance from ear to shoulder center
    const earShoulderDist = Math.abs(earX - shoulderX);
    const neutralDist = Math.abs(baselineEarX - baselineShoulderX);
    
    // Is user bending head down?
    if (noseBendDelta > 0.08) {
      setCurrentStage('bending');
      setAlignmentScore(Math.max(15, Math.round(90 - (noseBendDelta * 350))));
      setNeckAngle(25);
      setIsCorrectInHold(false);
    } 
    // Has user retracted correctly?
    // Ear moves backward = closer to spine vertical plumbline (higher retraction score)
    else if (earX - baselineEarX > retractionThreshold || earShoulderDist < neutralDist - retractionThreshold) {
      setCurrentStage('correct');
      setAlignmentScore(Math.min(100, Math.round(94 + (Math.random() * 6))));
      setNeckAngle(54);
      setIsCorrectInHold(true);
    } 
    // Is head forward too much?
    else if (baselineEarX - earX > 0.035) {
      setCurrentStage('forward');
      setAlignmentScore(Math.max(20, Math.round(55 - (Math.abs(baselineEarX - earX) * 250))));
      setNeckAngle(18);
      setIsCorrectInHold(false);
    } 
    // Default neutral state
    else {
      setCurrentStage('neutral');
      setAlignmentScore(Math.round(75 + (Math.random() * 10)));
      setNeckAngle(38);
      setIsCorrectInHold(false);
    }
  };

  // SIMULATION SLIDERS CONTROLLER
  useEffect(() => {
    if (activeTab === 'simulation') {
      // Simulate live stability movement oscillation
      const mockJitter = Math.sin(Date.now() * 0.005) * 2;
      const computedMockStability = Math.round(currentStage === 'correct' ? 96 + mockJitter : currentStage === 'neutral' ? 88 + mockJitter : 62 + mockJitter);
      setStabilityScore(computedMockStability);

      // Extract exercise-specific thresholds
      let bendThreshold = 62;
      let correctThreshold = 70;
      let forwardThreshold = 35;

      if (activeExerciseId === 'door-frame') {
        bendThreshold = 60;
        correctThreshold = 68;
        forwardThreshold = 30;
      } else if (activeExerciseId === 'cross-body') {
        bendThreshold = 55;
        correctThreshold = 70;
        forwardThreshold = 35;
      } else if (activeExerciseId === 'upper-trap') {
        bendThreshold = 58;
        correctThreshold = 65;
        forwardThreshold = 30;
      } else if (activeExerciseId === 'hand-behind') {
        bendThreshold = 60;
        correctThreshold = 72;
        forwardThreshold = 35;
      }

      if (simDownwardBend > bendThreshold) {
        setCurrentStage('bending');
        setAlignmentScore(Math.max(20, 100 - simDownwardBend));
        setNeckAngle(22);
        setIsCorrectInHold(false);
      } else if (simRetraction > correctThreshold) {
        setCurrentStage('correct');
        setAlignmentScore(94);
        setNeckAngle(51);
        setIsCorrectInHold(true);
      } else if (simRetraction < forwardThreshold) {
        setCurrentStage('forward');
        setAlignmentScore(45);
        setNeckAngle(15);
        setIsCorrectInHold(false);
      } else {
        setCurrentStage('neutral');
        setAlignmentScore(75);
        setNeckAngle(38);
        setIsCorrectInHold(false);
      }
    }
  }, [simRetraction, simDownwardBend, activeTab, currentStage, activeExerciseId]);

  // Rest / Cooldown Timer manager between repetitions to enforce release-and-hold spacing
  useEffect(() => {
    if (restRemaining <= 0) return;
    
    const interval = setInterval(() => {
      setRestRemaining((prev) => {
        const next = Math.max(0, prev - 0.5);
        if (next === 0) {
          speakVoiceAlert("Ready! Begin holding posture.", isMuted, lastSpokenTextRef, lastSpeakTimeRef, voicePace);
        }
        return next;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [restRemaining, isMuted, voicePace]);

  // Interactive hold timer and Repetition counter
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if ((cameraActive || activeTab === 'simulation') && !isPaused && !sessionCompleted && restRemaining <= 0) {
      if (isCorrectInHold) {
        if (!inWinningState) {
          setInWinningState(true);
        }
        interval = setInterval(() => {
          setHoldTimer((prev) => {
            if (prev >= (targetHoldDuration - 0.5)) { // Dynamic correct hold gives a point + rep
              setRepCount((c) => {
                const nextCount = c + 1;

                if (activeExerciseId === 'door-frame') {
                  const testLabel = doorFrameOption === 'A' ? "Option A (Low Hands - Upper Pecs)" :
                                    doorFrameOption === 'B' ? "Option B (Mid 90° - Middle Pecs)" :
                                    "Option C (High Hands - Pec Minor)";
                  setCompletedTests(prevTests => {
                    if (!prevTests.includes(testLabel)) {
                      return [...prevTests, testLabel];
                    }
                    return prevTests;
                  });
                }

                if (nextCount >= targetReps) {
                  setSessionCompleted(true);
                  setSessionActive(false); // finish session active state
                  speakVoiceAlert("Completed! You have successfully satisfied all posture tests. Excellent job!", isMuted, lastSpokenTextRef, lastSpeakTimeRef, voicePace);
                  saveSessionToLogs(nextCount);
                  
                  // Auto-route to report tab
                  setTimeout(() => {
                    setActiveTab('report');
                  }, 1200);
                } else {
                  speakVoiceAlert(`Repetition ${nextCount} completed! Release posture and rest.`, isMuted, lastSpokenTextRef, lastSpeakTimeRef, voicePace);
                  setRestRemaining(targetRestDuration);
                }
                return nextCount;
              });

              setInWinningState(false);
              return 0;
            }
            return prev + 0.5;
          });
        }, 500);
      } else {
        setHoldTimer(0);
        setInWinningState(false);
      }
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCorrectInHold, inWinningState, targetReps, isMuted, cameraActive, activeTab, isPaused, sessionCompleted, activeExerciseId, doorFrameOption, restRemaining, targetHoldDuration, targetRestDuration, voicePace]);

  // Turn Camera on
  const startCameraSystem = async () => {
    setCameraActive(true);
  };

  const stopCameraSystem = () => {
    setCameraActive(false);
  };

  // Render Kinematic Simulation Canvas loop
  useEffect(() => {
    if (activeTab !== 'simulation') return;

    let animId: number;
    const render = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Draw high tech vector simulation skeleton
          const simulatedNoseY = currentStage === 'bending' ? 180 : 130;
          const simulatedEarX = currentStage === 'correct' ? 170 : currentStage === 'forward' ? 100 : 135;
          
          if (showSkeleton) {
            // Draw connection links
            ctx.strokeStyle = currentStage === 'correct' ? '#10b981' : currentStage === 'bending' ? '#f43f5e' : '#3b82f6';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(simulatedEarX, 100);
            ctx.lineTo(150, 200); // stable C7 base
            ctx.stroke();

            // Draw head node representation bounding box
            ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
            ctx.beginPath();
            ctx.arc(simulatedEarX - 10, simulatedNoseY - 20, 30, 0, 2 * Math.PI);
            ctx.fill();

            // Key landmark points
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(simulatedEarX, 100, 8, 0, 2 * Math.PI); // Ear
            ctx.fill();

            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(simulatedEarX - 35, simulatedNoseY, 8, 0, 2 * Math.PI); // Nose
            ctx.fill();

            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(150, 200, 10, 0, 2 * Math.PI); // Shoulder
            ctx.fill();
          } else {
            ctx.fillStyle = '#3b82f6';
            ctx.font = '10px monospace';
            ctx.fillText("SIMULATION MODE ACTIVE: SKELETON HIDDEN", 15, 25);
          }
        }
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [activeTab, currentStage, showSkeleton]);

  const handleResetSession = () => {
    setRepCount(0);
    setHoldTimer(0);
    setSessionCompleted(false);
    setSessionDuration(0);
    setBendingViolations(0);
    setAccumulatedAlignment(0);
    setAlignmentSamples(0);
    setAccumulatedStability(0);
    setStabilitySamples(0);
    setShowReportModal(false);
    sessionSavedRef.current = false;
    speakVoiceAlert("Session metrics reset. Let's start fresh.", isMuted, lastSpokenTextRef, lastSpeakTimeRef);
  };

  const selectExercise = (exerciseId: string) => {
    setActiveExerciseId(exerciseId);
    setHoldTimer(0);
    // Smooth scroll down to the active exercise station
    setTimeout(() => {
      const el = document.getElementById('active-training-station');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  };

  const handleWarmupComplete = () => {
    setShowWarmupModal(false);
    startCameraSystem();
  };

  const triggerPreSessionWarmup = () => {
    setShowWarmupModal(true);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-all">
      
      <PreSessionWarmup 
        isOpen={showWarmupModal} 
        onClose={() => setShowWarmupModal(false)} 
        onComplete={handleWarmupComplete} 
        isMuted={isMuted}
        voicePace={voicePace}
      />

      <SessionReportModal
        isOpen={showReportModal}
        duration={sessionDuration}
        repCount={repCount}
        targetReps={targetReps}
        avgAlignment={alignmentSamples > 0 ? Math.round(accumulatedAlignment / alignmentSamples) : alignmentScore}
        avgStability={stabilitySamples > 0 ? Math.round(accumulatedStability / stabilitySamples) : stabilityScore}
        bendingViolations={bendingViolations}
        onClose={() => setShowReportModal(false)}
        onRestart={handleResetSession}
        movementHistory={movementHistory}
        activeExerciseId={activeExerciseId}
      />

      {/* PROFESSIONAL CLINICAL NAVIGATION HEADER */}
      <header className="border-b border-blue-100 bg-white shadow-xs sticky top-0 z-40 px-4 py-3 md:px-6 md:py-4">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row justify-between items-center gap-4">
          
          {/* Logo & Medical Branding */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left w-full xl:w-auto">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200 shrink-0">
              <Activity size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <h1 className="font-display font-extrabold text-base md:text-lg text-slate-900 tracking-tight">
                  Chin Tuck Correction System
                </h1>
                <span className="text-[9px] font-mono font-bold tracking-widest bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 uppercase max-w-max">
                  Clinical Edition
                </span>
              </div>
              <p className="text-[10px] md:text-[11px] text-slate-500 font-medium">
                Active Computer-Vision Cervical Rehabilitation & Tex-Neck Prevention
              </p>
            </div>
          </div>

          {/* Quick Stats Summary & Audio Toggle */}
          <div className="flex flex-wrap items-center justify-center xl:justify-end gap-2 md:gap-3 w-full xl:w-auto">
            
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`px-3 py-2.5 md:py-1.5 rounded-lg border transition-all flex items-center justify-center gap-1.5 text-xs font-mono font-bold select-none cursor-pointer flex-1 sm:flex-none ${
                !isMuted 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 animate-pulse' 
                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
              }`}
              title={isMuted ? "Unmute Voice Guidance" : "Mute Alerts"}
            >
              {!isMuted ? <Volume2 size={14} /> : <VolumeX size={14} />}
              {!isMuted ? "VOICE ON" : "MUTED"}
            </button>

            <button
              onClick={() => setShowWarmupModal(true)}
              className="px-3 py-2.5 md:py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-mono font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 flex-1 sm:flex-none cursor-pointer"
              title="Interactive Pre-Session Warmup"
            >
              <Sparkles size={14} className="text-indigo-600 shrink-0" /> Warmup
            </button>

            <button
              onClick={() => setShowReportModal(true)}
              className="px-3 py-2.5 md:py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-mono font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 flex-1 sm:flex-none cursor-pointer"
              title="Show Postural Diagnostic Session Report Card"
            >
              <Activity size={14} className="text-emerald-600 shrink-0" /> Report
            </button>

            <button
              onClick={handleCalibrate}
              className="px-4 py-2.5 md:py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs shadow-blue-200 flex-1 sm:flex-none cursor-pointer"
            >
              <RotateCcw size={14} className="shrink-0" /> Calibrate
            </button>
          </div>

        </div>
      </header>

      {/* WORKSPACE CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 md:py-8 flex flex-col gap-8 transition-all">
        
        {/* HOMEPAGE CLINICAL REHABILITATION PLAN CATALOG */}
        <div className="bg-white border border-blue-100 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-2 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                <h2 className="font-display font-extrabold text-slate-900 text-base md:text-lg tracking-tight">
                  Therapist's Prescribed Posture Plan
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Tap on any clinical test or session below to unlock real-time movement analysis & tracking
              </p>
            </div>
            <div className="text-[10px] bg-slate-50 border border-slate-200 px-3 py-1 rounded-full text-slate-500 font-mono font-bold uppercase select-none">
              Scroll Sideways on Mobile 📱
            </div>
          </div>

          {/* Swipe-friendly Horizontal row on mobile, Elegant Grid on desktop */}
          <div className="flex overflow-x-auto gap-4 py-2 px-1 -mx-2 snap-x scroll-smooth no-scrollbar lg:grid lg:grid-cols-2 lg:overflow-visible lg:mx-0 lg:px-0">
            {REHAB_EXERCISES.map((ex) => {
              const isActive = ex.id === activeExerciseId;
              return (
                <div
                  key={ex.id}
                  onClick={() => selectExercise(ex.id)}
                  className={`flex-none w-[280px] lg:w-auto snap-center flex flex-col justify-between p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md select-none transform hover:-translate-y-0.5 active:scale-95 bg-gradient-to-br ${
                    isActive 
                      ? 'from-blue-600 to-indigo-700 text-white border-blue-600 shadow-md shadow-blue-200 ring-4 ring-blue-100 scale-[1.01]' 
                      : 'from-slate-50 to-white text-slate-900 border-slate-200 hover:border-blue-400'
                  }`}
                >
                  <div>
                    {/* Header: Badge difficulty and active state */}
                    <div className="flex justify-between items-center gap-2 mb-2">
                      <span className={`text-[9px] font-mono font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : ex.difficulty === 'Beginner' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}>
                        {ex.difficulty}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-mono bg-white text-blue-700 font-black px-2 py-0.5 rounded uppercase animate-pulse">
                          ACTIVE RUN
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-display font-black text-sm tracking-tight leading-snug line-clamp-1">
                      {ex.name}
                    </h3>
                    <p className={`text-[10px] font-medium leading-none mb-3 mt-1 ${
                      isActive ? 'text-blue-100' : 'text-slate-500'
                    }`}>
                      {ex.indication}
                    </p>

                    {/* Muscle Target */}
                    <div className={`text-[10px] font-mono py-1 px-2 rounded-md ${
                      isActive ? 'bg-white/10 text-white/90' : 'bg-slate-100 text-slate-600'
                    }`}>
                      Target: {ex.bodyTarget}
                    </div>

                    {/* Paragraph */}
                    <p className={`text-[11px] leading-relaxed mt-2.5 line-clamp-3 ${isActive ? 'text-white/80' : 'text-slate-600'}`}>
                      {ex.description}
                    </p>
                  </div>

                  {/* Footing button */}
                  <div className="mt-4 pt-3 border-t border-dashed border-slate-200/50 flex items-center justify-between">
                    <span className={`text-[9px] font-mono font-bold uppercase ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                      Target: {ex.repsPreset} Reps
                    </span>
                    <div className={`text-[10.5px] font-bold font-mono tracking-wide flex items-center gap-1 ${
                      isActive ? 'text-yellow-300 animate-pulse' : 'text-blue-600'
                    }`}>
                      {isActive ? 'Performing Live' : 'Open Session'} <ChevronRight size={13} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ACTIVE DIAGNOSTIC WORKSPACE anchor */}
        <div id="active-training-station" className="grid grid-cols-1 lg:grid-cols-12 gap-8 scroll-mt-24 transition-all col-span-12">
          
          {/* WEBCAM CAMERA CHAMBER (CENTER COLUMN) */}
          <section className="col-span-1 lg:col-span-6 order-1 lg:order-2 flex flex-col gap-6">
          
          {/* TAB CHANNEL */}
          <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200/60 flex flex-wrap sm:flex-nowrap gap-2">
            <button
              onClick={() => {
                setActiveTab('camera');
                if (!cameraActive) triggerPreSessionWarmup();
              }}
              className={`flex-1 min-w-[130px] py-3 rounded-xl text-xs font-mono font-extrabold tracking-wider transition-all flex items-center justify-center gap-2 ${
                activeTab === 'camera' 
                  ? 'bg-white text-blue-600 shadow-sm border border-blue-100' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Video size={14} /> DYNAMIC WEBCAM
            </button>
            <button
              onClick={() => {
                setActiveTab('simulation');
                stopCameraSystem();
              }}
              className={`flex-1 min-w-[130px] py-3 rounded-xl text-xs font-mono font-extrabold tracking-wider transition-all flex items-center justify-center gap-2 ${
                activeTab === 'simulation' 
                  ? 'bg-white text-blue-600 shadow-sm border border-blue-100' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sliders size={14} /> KINEMATIC SIMULATOR
            </button>
            <button
              onClick={() => {
                setActiveTab('report');
                stopCameraSystem();
              }}
              className={`flex-1 min-w-[130px] py-3 rounded-xl text-xs font-mono font-extrabold tracking-wider transition-all flex items-center justify-center gap-2 ${
                activeTab === 'report' 
                  ? 'bg-white text-blue-600 shadow-sm border border-blue-100' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              id="tab-btn-rehab-report"
            >
              <Award size={14} /> REHAB REPORT
            </button>
            <button
              onClick={() => {
                setActiveTab('progress');
                stopCameraSystem();
              }}
              className={`flex-1 min-w-[130px] py-3 rounded-xl text-xs font-mono font-extrabold tracking-wider transition-all flex items-center justify-center gap-2 ${
                activeTab === 'progress' 
                  ? 'bg-white text-blue-600 shadow-sm border border-blue-100' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Activity size={14} /> PROGRESS & GOALS
            </button>
          </div>

          {activeTab === 'progress' ? (
            <PostureProgress />
          ) : activeTab === 'report' ? (
            <PostureReportSection
              duration={sessionDuration}
              repCount={repCount}
              targetReps={targetReps}
              avgAlignment={alignmentSamples > 0 ? Math.round(accumulatedAlignment / alignmentSamples) : alignmentScore}
              avgStability={stabilitySamples > 0 ? Math.round(accumulatedStability / stabilitySamples) : stabilityScore}
              bendingViolations={bendingViolations}
              movementHistory={movementHistory}
              activeExerciseId={activeExerciseId}
              completedTests={completedTests}
              onRestart={() => {
                setRepCount(0);
                setSessionCompleted(false);
                setBendingViolations(0);
                setAccumulatedAlignment(0);
                setAlignmentSamples(0);
                setAccumulatedStability(0);
                setStabilitySamples(0);
                setSessionDuration(0);
                setMovementHistory([]);
                setIsPaused(false);
                setCompletedTests([]);
                sessionSavedRef.current = false;
                setActiveTab('camera');
              }}
              onGoToCamera={() => {
                setActiveTab('camera');
              }}
            />
          ) : (
            <>
              {!sessionActive ? (
                <div className="bg-white border border-blue-150 rounded-3xl p-6 md:p-8 shadow-xs flex flex-col gap-6 relative overflow-hidden" id="session-launcher-panel">
                  {/* Subtle decorative background glow */}
                  <div className="absolute top-0 right-0 w-36 h-36 bg-blue-100/40 rounded-full blur-3xl -z-10" />
                  
                  {/* Header */}
                  <div className="flex flex-col gap-1 text-center md:text-left">
                    <div className="inline-flex items-center justify-center md:justify-start gap-2 text-blue-600 font-mono text-xs font-extrabold tracking-widest uppercase">
                      <Zap size={14} className="text-yellow-500 animate-pulse" /> Posture Training Session Setup
                    </div>
                    <h3 className="font-display font-extrabold text-xl text-slate-900 tracking-tight">
                      Ready to start your {activeExercise.name}?
                    </h3>
                    <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
                      This computer-vision therapy session will track your movements and guide you with voice corrections. Customize your cadence below to prevent feeling rushed.
                    </p>
                  </div>

                  {/* Settings Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                    
                    {/* Cadence & Hold parameters */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-4">
                      <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-200/50">
                        <SlidersHorizontal size={14} className="text-blue-600" />
                        <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                          Exercise Cadence Settings
                        </span>
                      </div>

                      {/* Hold Duration Options */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono text-slate-500 block uppercase font-bold">
                          Hold Duration per Rep
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[3.0, 5.0, 10.0].map((sec) => (
                            <button
                              key={sec}
                              onClick={() => setTargetHoldDuration(sec)}
                              className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                                targetHoldDuration === sec
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
                              }`}
                            >
                              {sec.toFixed(1)}s {sec === 3 ? '(Fast)' : sec === 5 ? '(Stretch)' : '(Endure)'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Rest Interval Options */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono text-slate-500 block uppercase font-bold">
                          Intermission Rest Interval
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[2.0, 4.0, 6.0].map((sec) => (
                            <button
                              key={sec}
                              onClick={() => setTargetRestDuration(sec)}
                              className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                                targetRestDuration === sec
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
                              }`}
                            >
                              {sec.toFixed(1)}s {sec === 2 ? '(Quick)' : sec === 4 ? '(Standard)' : '(Relaxed)'}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10.5px] text-slate-400 font-mono">
                          * Slower interval reduces hurry and ensures baseline muscle reset.
                        </p>
                      </div>

                      {/* Target Reps Selection */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono text-slate-500 block uppercase font-bold">
                          Target Repetitions
                        </label>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[3, 5, 10, 15, 20].map((rep) => (
                            <button
                              key={rep}
                              onClick={() => setTargetReps(rep)}
                              className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                                targetReps === rep
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                              }`}
                            >
                              {rep}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>

                    {/* Voice Assistant panel */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-4">
                      <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-200/50">
                        <Volume2 size={14} className="text-blue-600" />
                        <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                          Voice Assistant Controls
                        </span>
                      </div>

                      {/* Voice Guidance Switch */}
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">Voice Guidance Alerts</span>
                          <span className="text-[10px] text-slate-400 leading-none">Speaks state & errors in real-time</span>
                        </div>
                        <button
                          onClick={() => setIsMuted(!isMuted)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-black border transition-all ${
                            !isMuted
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-slate-100 text-slate-500 border-slate-300'
                          }`}
                        >
                          {!isMuted ? 'ACTIVE ON' : 'MUTED'}
                        </button>
                      </div>

                      {/* Voice Pace Settings */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono text-slate-500 block uppercase font-bold">
                          Voice Assistant Pace
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setVoicePace('standard')}
                            className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                              voicePace === 'standard'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
                            }`}
                          >
                            Standard (1.05x speed)
                          </button>
                          <button
                            onClick={() => {
                              setVoicePace('slow');
                              if (typeof window !== 'undefined' && window.speechSynthesis) {
                                window.speechSynthesis.cancel();
                                const utterance = new SpeechSynthesisUtterance("Voice pace adjusted. Slow and mindful verbal alerts active.");
                                utterance.rate = 0.82;
                                utterance.pitch = 0.95;
                                window.speechSynthesis.speak(utterance);
                              }
                            }}
                            className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                              voicePace === 'slow'
                                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
                            }`}
                          >
                            Slow & Mindful (0.8x)
                          </button>
                        </div>
                      </div>

                      {/* Test voice assistant button */}
                      <button
                        onClick={() => {
                          if (typeof window !== 'undefined' && window.speechSynthesis) {
                            window.speechSynthesis.cancel();
                            const sampleText = activeExerciseId === 'door-frame'
                              ? "Excellent door frame stretch! Relax your shoulders and hold chest tall."
                              : "Pull your chin straight back and hold posture.";
                            const utterance = new SpeechSynthesisUtterance(sampleText);
                            utterance.rate = voicePace === 'slow' ? 0.82 : 1.05;
                            utterance.pitch = voicePace === 'slow' ? 0.95 : 1.05;
                            window.speechSynthesis.speak(utterance);
                          }
                        }}
                        className="py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-mono font-bold transition-all text-center cursor-pointer"
                      >
                        🔊 Test Assistant Voice
                      </button>

                    </div>
                  </div>

                  {/* Launch button */}
                  <div className="flex flex-col gap-2 mt-4 items-center">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSessionActive(true);
                        setIsPaused(false);
                        setRepCount(0);
                        setHoldTimer(0);
                        setRestRemaining(0);
                        setSessionCompleted(false);
                        if (activeTab === 'camera') {
                          startCameraSystem();
                        }
                        speakVoiceAlert(`Session launched. Prepare to start holding.`, isMuted, lastSpokenTextRef, lastSpeakTimeRef, voicePace);
                      }}
                      className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-mono font-black text-xs uppercase rounded-xl tracking-wider transition-all shadow-md border-none cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Play size={16} className="fill-current" />
                      🚀 Launch Posture Training Session
                    </motion.button>
                    <p className="text-[10px] text-slate-400 font-mono text-center">
                      * Uses web browser computer-vision. Your video is processed purely on-device and is never sent to any server.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {activeTab === 'camera' ? (
                    <div className="bg-white border border-blue-100 rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col gap-4 sm:gap-5 relative overflow-hidden" id="camera-workspace-panel">
                  {/* Live Indicator Overlays */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-blue-50/50 p-3 rounded-2xl border border-blue-100 gap-3">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    currentStage === 'correct' ? 'bg-emerald-500 animate-ping' : currentStage === 'bending' ? 'bg-rose-500 animate-bounce' : 'bg-blue-500'
                  }`} />
                  <span className="text-xs font-mono font-bold text-slate-700">FEEDBACK PIPELINE:</span>
                </div>
                
                {/* Bold colored feedback status badges */}
                <div className="text-xs font-bold font-mono text-center sm:text-right">
                  {currentStage === 'correct' && (
                    <span className="inline-block text-emerald-700 border border-emerald-300 bg-emerald-100 px-3.5 py-1 rounded-full shadow-xs">
                      Correct Chin Tuck ✅
                    </span>
                  )}
                  {currentStage === 'bending' && (
                    <span className="inline-block text-rose-700 border border-rose-300 bg-rose-100 px-3.5 py-1 rounded-full font-extrabold animate-pulse shadow-xs">
                      Do not bend your neck ❌
                    </span>
                  )}
                  {currentStage === 'forward' && (
                    <span className="inline-block text-amber-700 border border-amber-300 bg-amber-100 px-3.5 py-1 rounded-full shadow-xs animate-pulse">
                      Pull your chin straight back ⚠️
                    </span>
                  )}
                  {currentStage === 'neutral' && (
                    <span className="inline-block text-blue-700 border border-blue-300 bg-blue-50 px-3.5 py-1 rounded-full">
                      Neutral Baseline Stance
                    </span>
                  )}
                </div>
              </div>

              {/* DYNAMIC PROGRESS IN-STATE HOLD TIMER GAUGE (placed nicely over the tracker) */}
              <div className="relative">
                <CameraPostureTracker
                  exerciseId={getExerciseKey(activeExerciseId)}
                  crossBodySide={crossBodySide}
                  isActive={activeTab === 'camera' && !showWarmupModal}
                  onActiveChange={(active) => setCameraActive(active)}
                  onPostureDetected={(posture, confidence, angle) => {
                    setCurrentStage(posture);
                    if (angle > 0) {
                      setNeckAngle(angle);
                    }
                    setAlignmentScore(confidence);
                    setIsCorrectInHold(posture === 'correct');
                  }}
                />

                {/* DYNAMIC PROGRESS IN-STATE HOLD TIMER GAUGE */}
                {inWinningState && (
                  <div className="absolute top-3 right-3 bg-emerald-500 text-slate-950 font-mono font-bold text-xs px-3.5 py-1.5 rounded-full animate-pulse flex items-center gap-1.5 shadow-lg z-10">
                    <Flame size={14} className="animate-spin text-slate-950" />
                    HOLDING: {(holdTimer).toFixed(1)}s / 3.0s
                  </div>
                )}

                {/* REST AND RELEASE SPACER OVERLAY */}
                {restRemaining > 0 && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20">
                    <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-amber-500/30 bg-slate-900/95 shadow-2xl max-w-[280px] text-center font-mono">
                      <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase mb-1 flex items-center gap-1">
                        <Activity size={12} className="animate-pulse" /> RELAX & RELEASE
                      </span>
                      <span className="text-[11px] text-slate-350 mb-4 leading-normal font-medium">
                        Release your muscles to resting baseline before starting next hold
                      </span>
                      <div className="text-3xl font-black text-amber-400 animate-pulse font-mono tracking-tighter">
                        {restRemaining.toFixed(1)}s
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* BUTTON CONTROLS AND ACTION TRIPPERS */}
              <div className="flex flex-col sm:flex-row gap-3 mt-1">
                {/* Pause / Resume Button */}
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={`px-5 py-3 font-mono font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto ${
                    isPaused 
                      ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-200 border-none' 
                      : 'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700'
                  }`}
                  id="btn-pause-exercise"
                >
                  {isPaused ? <Play size={14} /> : <Pause size={14} />}
                  {isPaused ? "RESUME THERAPY" : "PAUSE THERAPY"}
                </button>

                {/* Complete Session Button */}
                <button
                  onClick={() => {
                    setSessionCompleted(true);
                    saveSessionToLogs(repCount || 1);
                    speakVoiceAlert("Session completed. View your ready report card now.", isMuted, lastSpokenTextRef, lastSpeakTimeRef);
                    setActiveTab('report');
                  }}
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-black text-xs uppercase rounded-xl tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto border-none"
                  id="btn-complete-session"
                >
                  <CheckCircle2 size={14} /> COMPLETE & REPORT
                </button>

                {/* Reset Score */}
                <button
                  onClick={handleResetSession}
                  className="px-5 py-3 border border-slate-250 hover:bg-slate-100 text-slate-600 text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto sm:ml-auto bg-white"
                  title="Reset active stats and counters"
                  id="btn-reset-workout-camera"
                >
                  <RotateCcw size={14} /> Reset Score
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-blue-100 rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col gap-4 sm:gap-5 relative overflow-hidden" id="simulation-workspace-panel">
              
              {/* Live Indicator Overlays */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-blue-50/50 p-3 rounded-2xl border border-blue-100 gap-3">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    currentStage === 'correct' ? 'bg-emerald-500 animate-ping' : currentStage === 'bending' ? 'bg-rose-500 animate-bounce' : 'bg-blue-500'
                  }`} />
                  <span className="text-xs font-mono font-bold text-slate-700">FEEDBACK PIPELINE:</span>
                </div>
                
                {/* Bold colored feedback status badges */}
                <div className="text-xs font-bold font-mono text-center sm:text-right">
                  {currentStage === 'correct' && (
                    <span className="inline-block text-emerald-700 border border-emerald-300 bg-emerald-100 px-3.5 py-1 rounded-full shadow-xs">
                      Correct Chin Tuck ✅
                    </span>
                  )}
                  {currentStage === 'bending' && (
                    <span className="inline-block text-rose-700 border border-rose-300 bg-rose-100 px-3.5 py-1 rounded-full font-extrabold animate-pulse shadow-xs">
                      Do not bend your neck ❌
                    </span>
                  )}
                  {currentStage === 'forward' && (
                    <span className="inline-block text-amber-700 border border-amber-300 bg-amber-100 px-3.5 py-1 rounded-full shadow-xs animate-pulse">
                      Pull your chin straight back ⚠️
                    </span>
                  )}
                  {currentStage === 'neutral' && (
                    <span className="inline-block text-blue-700 border border-blue-300 bg-blue-50 px-3.5 py-1 rounded-full">
                      Neutral Baseline Stance
                    </span>
                  )}
                </div>
              </div>

              {/* DYNAMIC DIAGNOSTIC VIEWPORT WITH CONDITIONAL RING FEEDBACK */}
              <div 
                className={`relative aspect-video w-full bg-slate-900 border overflow-hidden rounded-2xl shadow-inner flex items-center justify-center transition-all duration-300 ${
                  currentStage === 'correct' 
                    ? 'border-emerald-500 ring-4 ring-emerald-400/40 shadow-[0_0_30px_rgba(16,185,129,0.3)]' 
                    : currentStage === 'bending'
                    ? 'border-rose-500 ring-4 ring-rose-400/40 shadow-[0_0_30px_rgba(244,63,94,0.3)] animate-shake'
                    : currentStage === 'forward'
                    ? 'border-amber-400 ring-4 ring-amber-300/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                    : 'border-slate-800'
                }`}
              >
                {/* SIMULATION PREVIEW VIEWPORT */}
                <>
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={300}
                    className="absolute inset-0 w-full h-full bg-slate-950"
                  />
                  
                  <div className="absolute bottom-4 right-4 bg-slate-950/90 border border-slate-800 p-2.5 rounded-xl text-[9px] font-mono text-slate-400 max-w-xs leading-normal select-none">
                    <span className="text-blue-400 font-bold block uppercase mb-0.5">🎮 Simulation Sandbox</span>
                    Use sliders below to emulate severe forward heads or correct neck flexions.
                  </div>
                </>

                {/* OVERLAY CORNER TAGS */}
                <div className="absolute top-3 left-3 bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800 text-[9px] font-mono font-bold text-sky-400">
                  SIMULATOR: ACTIVE
                </div>

                {/* DYNAMIC PROGRESS IN-STATE HOLD TIMER GAUGE */}
                {inWinningState && (
                  <div className="absolute top-3 right-3 bg-emerald-500 text-slate-950 font-mono font-bold text-xs px-3.5 py-1.5 rounded-full animate-pulse flex items-center gap-1.5 shadow-lg">
                    <Flame size={14} className="animate-spin text-slate-950" />
                    HOLDING: {(holdTimer).toFixed(1)}s / 3.0s
                  </div>
                )}

                {/* REST AND RELEASE SPACER OVERLAY */}
                {restRemaining > 0 && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20">
                    <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-amber-500/30 bg-slate-900/95 shadow-2xl max-w-[280px] text-center font-mono">
                      <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase mb-1 flex items-center gap-1">
                        <Activity size={12} className="animate-pulse" /> RELAX & RELEASE
                      </span>
                      <span className="text-[11px] text-slate-350 mb-4 leading-normal font-medium">
                        Release your muscles to resting baseline before starting next hold
                      </span>
                      <div className="text-3xl font-black text-amber-400 animate-pulse font-mono tracking-tighter">
                        {restRemaining.toFixed(1)}s
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SIMULATOR SLIDERS PORT */}
              <div className="bg-slate-50 p-4 rounded-xl border border-blue-50 flex flex-col gap-4">
                
                {/* Horizontal neck retraction */}
                <div>
                  <div className="flex justify-between items-center mb-1 bg-white p-1 rounded border px-2">
                    <span className="text-xs font-bold text-slate-600">Simulate Retraction (Chin pull-back)</span>
                    <span className="text-xs font-mono font-bold text-blue-600">{simRetraction}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={simRetraction}
                    onChange={(e) => setSimRetraction(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                    id="slider-sim-retraction"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                    <span>Forward Slouch (Tex-neck)</span>
                    <span>Neutral Baseline</span>
                    <span>Correct Chin Tuck</span>
                  </div>
                </div>

                {/* Neck bending downward */}
                <div>
                  <div className="flex justify-between items-center mb-1 bg-white p-1 rounded border px-2">
                    <span className="text-xs font-bold text-slate-600">Simulate Downward Neck Flexion</span>
                    <span className="text-xs font-mono font-bold text-rose-600">{simDownwardBend}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={simDownwardBend}
                    onChange={(e) => setSimDownwardBend(Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                    id="slider-sim-downward-bend"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                    <span>Horizon Eye-axis (Correct)</span>
                    <span>Nod flexion</span>
                    <span>Severe Nod Downward (Incorrect)</span>
                  </div>
                </div>

              </div>

              {/* BUTTON CONTROLS AND ACTION TRIPPERS */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Pause / Resume Button */}
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={`px-5 py-3 font-mono font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto ${
                    isPaused 
                      ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-200 border-none' 
                      : 'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700'
                  }`}
                  id="btn-pause-exercise-sim"
                >
                  {isPaused ? <Play size={14} /> : <Pause size={14} />}
                  {isPaused ? "RESUME THERAPY" : "PAUSE THERAPY"}
                </button>

                {/* Complete Session Button */}
                <button
                  onClick={() => {
                    setSessionCompleted(true);
                    saveSessionToLogs(repCount || 1);
                    speakVoiceAlert("Session completed. View your ready report card now.", isMuted, lastSpokenTextRef, lastSpeakTimeRef);
                    setActiveTab('report');
                  }}
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-black text-xs uppercase rounded-xl tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto border-none"
                  id="btn-complete-session-sim"
                >
                  <CheckCircle2 size={14} /> COMPLETE & REPORT
                </button>

                {/* Reset Score */}
                <button
                  onClick={handleResetSession}
                  className="px-5 py-3 border border-slate-250 hover:bg-slate-100 text-slate-600 text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto sm:ml-auto bg-white"
                  title="Reset active stats and counters"
                  id="btn-reset-workout-sim"
                >
                  <RotateCcw size={14} /> Reset Score
                </button>
              </div>
            </div>
          )}

          {/* COLLAPSIBLE INTELLIGENT CLINICAL CONTROL PANEL */}
          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xs">
            <button 
              onClick={() => setControlPanelOpen(!controlPanelOpen)}
              className="w-full p-5 px-6 flex justify-between items-center bg-slate-50 hover:bg-slate-100/60 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold font-display text-slate-800">
                  Collapsible Calibration & Settings Panel
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-blue-600">
                {controlPanelOpen ? "[ HIDE SETTINGS ]" : "[ SHOW SETTINGS ]"}
              </span>
            </button>
            
            <AnimatePresence>
              {controlPanelOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
                    
                    {/* Toggles on-off state */}
                    <div className="flex flex-col gap-3">
                      <span className="text-[10px] font-mono tracking-wider font-extrabold text-slate-400 uppercase">
                        Visibility Controls
                      </span>
                      
                      <label className="flex items-center gap-3 bg-slate-50/50 p-2 rounded-xl text-xs font-semibold text-slate-700 border border-slate-100 cursor-pointer hover:bg-slate-50 select-none">
                        <input 
                          type="checkbox" 
                          checked={showSkeleton} 
                          onChange={(e) => setShowSkeleton(e.target.checked)}
                          className="accent-blue-600 rounded w-4 h-4" 
                        />
                        <span>Overlay MediaPipe Skeleton Lines</span>
                      </label>

                      <label className="flex items-center gap-3 bg-slate-50/50 p-2 rounded-xl text-xs font-semibold text-slate-700 border border-slate-100 cursor-pointer hover:bg-slate-50 select-none">
                        <input 
                          type="checkbox" 
                          checked={showMetrics} 
                          onChange={(e) => setShowMetrics(e.target.checked)}
                          className="accent-blue-600 rounded w-4 h-4" 
                        />
                        <span>Show Real-Time Metric Indicators</span>
                      </label>

                    </div>

                    {/* Sensitivity settings slider */}
                    <div className="flex flex-col gap-3.5">
                      <div className="flex justify-between items-center text-[10px] font-mono font-extrabold tracking-wider text-slate-400 uppercase">
                        <span>Pose Sensitivity Adapter</span>
                        <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{sensitivity}%</span>
                      </div>
                      
                      <div className="p-4 bg-slate-50/45 rounded-2xl border border-slate-100 flex flex-col gap-1">
                        <input 
                          type="range"
                          min="1"
                          max="100"
                          value={sensitivity}
                          onChange={(e) => setSensitivity(Number(e.target.value))}
                          className="w-full accent-blue-600 cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1 select-none">
                          <span>Loose Threshold</span>
                          <span>Default (50)</span>
                          <span>Strict Stance</span>
                        </div>
                      </div>
                      
                      <p className="text-[10px] text-slate-400 leading-normal font-mono select-none">
                        * Adjust if skeleton is unable to reliably trigger &apos;Correct Chin Tuck&apos; inside your lighting environments.
                      </p>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* DYNAMIC METRICS DASHBOARD */}
          {showMetrics && (
            <div className="bg-white border border-blue-50 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              <h3 className="text-sm font-bold font-display tracking-wide uppercase text-slate-800">
                Biomechanical Live Performance Dashboard
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-blue-50">
                  <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">Neck Extension Angle</span>
                  <span className="text-lg font-bold text-blue-600 font-display mt-1 block">{neckAngle}°</span>
                  <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 mt-1 uppercase">
                    <span className={`w-1.5 h-1.5 rounded-full ${neckAngle >= 50 ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                    {neckAngle >= 50 ? 'Posture Retracted' : 'Insufficient Pull'}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-blue-50">
                  <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">Stability Index</span>
                  <span className="text-lg font-bold text-slate-800 font-display mt-1 block">{stabilityScore}%</span>
                  <div className="w-full bg-slate-200 h-1 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${stabilityScore >= 85 ? 'bg-emerald-500' : stabilityScore >= 60 ? 'bg-amber-400' : 'bg-rose-500'}`} 
                      style={{ width: `${stabilityScore}%` }}
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-blue-50">
                  <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">Session State Badge</span>
                  <span className="text-sm font-bold text-slate-700 font-mono mt-1.5 block uppercase">
                    {currentStage === 'correct' ? '✅ Retracted' : currentStage === 'bending' ? '❌ Flexed Down' : currentStage === 'forward' ? '⚠️ Protruded' : 'Baseline'}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono block mt-1.5">
                    {repCount} / {targetReps} Reps Complete
                  </span>
                </div>

              </div>
            </div>
          )}
                  </>
                )}
              </>
            )}

          {/* TRAINING TARGET PROGRESS AND GOAL HUB */}
          <div className="bg-white border border-blue-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 select-none">
              <span className="text-[10px] font-mono font-bold tracking-widest text-blue-600 uppercase">
                Active Workout settings
              </span>
              <span className="text-xs font-bold text-slate-700">Set Objectives</span>
            </div>

            {/* Target Options and counter dials */}
            <div className="flex items-center justify-between gap-4 bg-slate-50 p-3.5 rounded-2xl border border-blue-50">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-mono tracking-wider font-bold mb-1">Target repetitions</label>
                <select
                  value={targetReps}
                  onChange={(e) => setTargetReps(Number(e.target.value))}
                  className="bg-white border border-slate-100 px-3 py-1.5 text-xs text-slate-700 font-semibold rounded-lg focus:outline-none focus:border-blue-600 outline-none"
                >
                  <option value={3}>3 Repetitions</option>
                  <option value={5}>5 Repetitions</option>
                  <option value={10}>10 Repetitions</option>
                  <option value={15}>15 Repetitions</option>
                  <option value={20}>20 Repetitions</option>
                </select>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">REPS ACHIEVED</span>
                <div className="text-2xl font-black font-display text-blue-600">{repCount} <span className="text-xs text-slate-450 font-normal">/ {targetReps}</span></div>
              </div>
            </div>

            {/* Workout session progress bar */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-600">Training Session Progress</span>
                <span className="text-blue-600">{Math.round((repCount / targetReps) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((repCount / targetReps) * 100))}%` }}
                />
              </div>
            </div>

            {/* CELEBRATION CONGRATS OVERLAY BANNER */}
            <AnimatePresence>
              {sessionCompleted && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-gradient-to-r from-emerald-500 to-teal-655 text-white p-4.5 rounded-2xl flex flex-col gap-2.5 shadow-md shadow-emerald-100 border border-emerald-400/20"
                >
                  <div className="flex items-center gap-2">
                    <Award size={18} className="text-yellow-300" />
                    <span className="font-bold text-xs font-display tracking-wide uppercase">Goals met! Set Completed</span>
                  </div>
                  <p className="text-[11px] leading-normal opacity-90 font-medium">
                    {activeExerciseId === 'door-frame'
                      ? `You have securely completed ${repCount} high quality door frame stretches. This expands pectoral muscle groups and opens up compressed shoulder joints. Great job!`
                      : `You have securely completed ${repCount} high quality chin tucks. This relieves muscular tension of the trapezii and occipitals. Great job!`}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => setShowReportModal(true)}
                      className="text-center py-2 bg-emerald-600 border border-emerald-400 hover:bg-emerald-700 text-white font-mono font-black text-[10px] tracking-widest uppercase rounded-lg cursor-pointer transition-colors"
                    >
                      VIEW ASSESSMENT REPORT CARD
                    </button>
                    <button
                      onClick={handleResetSession}
                      className="text-center py-2 bg-white text-emerald-800 font-mono font-black text-[10px] tracking-widest uppercase rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      START AN ADDITIONAL WORKOUT
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </section>

        {/* GEMINI AI CLINICIAN ASSISTANT PORT (RIGHT COLUMN - 3 COLS) */}
        <section className="col-span-1 lg:col-span-3 order-2 lg:order-3 flex flex-col gap-6">
          <AIPostureAssistant
            neckAngle={neckAngle}
            currentStage={currentStage}
            activeExerciseId={activeExerciseId}
            alignmentScore={alignmentScore}
            movementHistory={movementHistory}
          />
        </section>

        {/* BIOMECHANICS & COACHING REFERENCE (LEFT COLUMN - 3 COLS) */}
        <section className="col-span-1 lg:col-span-3 order-3 lg:order-1 flex flex-col gap-6">

          {/* DOOR FRAME STRETCH VARIATIONS (A, B, C) */}
          {activeExerciseId === 'door-frame' && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-150 rounded-3xl p-5 shadow-sm flex flex-col gap-3.5">
              <div className="flex justify-between items-center pb-2 border-b border-emerald-200/50">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold tracking-widest text-emerald-800 uppercase">
                    Select stretch angle (A, B, C)
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded">
                  {doorFrameOption === 'A' ? 'Upper Pecs' : doorFrameOption === 'B' ? 'Middle Pecs' : 'Pec Minor'}
                </span>
              </div>
              
              <p className="text-[11px] text-slate-650 leading-normal">
                Adjusting arm height relocates the muscle fibers stretched. Choose your target region based on your posture or discomfort:
              </p>
              
              <div className="grid grid-cols-3 gap-2">
                {/* Option A */}
                <button
                  onClick={() => setDoorFrameOption('A')}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center select-none cursor-pointer ${
                    doorFrameOption === 'A'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200 scale-102 font-bold'
                      : 'bg-white text-slate-700 border-slate-250 hover:border-emerald-400 hover:bg-emerald-50/20'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full font-mono font-black text-xs flex items-center justify-center ${
                    doorFrameOption === 'A' ? 'bg-white text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    A
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold tracking-tight">Low Hands</span>
                    <span className={`text-[8px] font-mono opacity-80 ${doorFrameOption === 'A' ? 'text-emerald-100' : 'text-slate-500'}`}>Upper Pecs</span>
                  </div>
                </button>

                {/* Option B */}
                <button
                  onClick={() => setDoorFrameOption('B')}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center select-none cursor-pointer ${
                    doorFrameOption === 'B'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200 scale-102 font-bold'
                      : 'bg-white text-slate-700 border-slate-250 hover:border-emerald-400 hover:bg-emerald-50/20'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full font-mono font-black text-xs flex items-center justify-center ${
                    doorFrameOption === 'B' ? 'bg-white text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    B
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold tracking-tight">Mid (90°)</span>
                    <span className={`text-[8px] font-mono opacity-80 ${doorFrameOption === 'B' ? 'text-emerald-100' : 'text-slate-500'}`}>Middle Pecs</span>
                  </div>
                </button>

                {/* Option C */}
                <button
                  onClick={() => setDoorFrameOption('C')}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center select-none cursor-pointer ${
                    doorFrameOption === 'C'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200 scale-102 font-bold'
                      : 'bg-white text-slate-700 border-slate-250 hover:border-emerald-400 hover:bg-emerald-50/20'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full font-mono font-black text-xs flex items-center justify-center ${
                    doorFrameOption === 'C' ? 'bg-white text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    C
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold tracking-tight">High Hands</span>
                    <span className={`text-[8px] font-mono opacity-80 ${doorFrameOption === 'C' ? 'text-emerald-100' : 'text-slate-500'}`}>Pec Minor</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* CROSS BODY SHOULSER STRETCH VARIATIONS (LEFT VS RIGHT) */}
          {activeExerciseId === 'cross-body' && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-150 rounded-3xl p-5 shadow-sm flex flex-col gap-3.5">
              <div className="flex justify-between items-center pb-2 border-b border-blue-200/50">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold tracking-widest text-blue-800 uppercase">
                    Select Target Arm
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-blue-200/60 text-blue-800 px-2 py-0.5 rounded">
                  {crossBodySide === 'left' ? 'Left Arm Stretch' : 'Right Arm Stretch'}
                </span>
              </div>
              
              <p className="text-[11px] text-slate-650 leading-normal">
                Physiotherapy protocols recommend stretching both shoulders. Toggle to isolate and track either your left or right side:
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                {/* Left Arm Option */}
                <button
                  onClick={() => setCrossBodySide('left')}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center select-none cursor-pointer ${
                    crossBodySide === 'left'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 scale-102 font-bold'
                      : 'bg-white text-slate-700 border-slate-250 hover:border-blue-400 hover:bg-blue-50/20'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full font-mono font-black text-xs flex items-center justify-center ${
                    crossBodySide === 'left' ? 'bg-white text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    L
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold tracking-tight">Left Shoulder</span>
                    <span className={`text-[8px] font-mono opacity-80 ${crossBodySide === 'left' ? 'text-blue-100' : 'text-slate-500'}`}>Stretch Left Arm</span>
                  </div>
                </button>

                {/* Right Arm Option */}
                <button
                  onClick={() => setCrossBodySide('right')}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center select-none cursor-pointer ${
                    crossBodySide === 'right'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 scale-102 font-bold'
                      : 'bg-white text-slate-700 border-slate-250 hover:border-blue-400 hover:bg-blue-50/20'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full font-mono font-black text-xs flex items-center justify-center ${
                    crossBodySide === 'right' ? 'bg-white text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    R
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold tracking-tight">Right Shoulder</span>
                    <span className={`text-[8px] font-mono opacity-80 ${crossBodySide === 'right' ? 'text-blue-100' : 'text-slate-500'}`}>Stretch Right Arm</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* SMART STEP COACHING UI */}
          <div className="bg-white border border-blue-150 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-bold font-mono tracking-widest text-slate-500 uppercase pb-2 border-b border-light-100">
              Smart step coaching sequence
            </h3>
            
            <div className="flex flex-col gap-3">
              
              {/* Step 1 */}
              <div className={`p-3 rounded-2xl border transition-colors flex items-start gap-4 ${
                repCount === 0 && currentStage === 'neutral' 
                  ? 'bg-blue-50/50 border-blue-200' 
                  : 'bg-slate-50/30 border-slate-100 opacity-60'
              }`}>
                <div className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                  repCount > 0 ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'
                }`}>
                  {repCount > 0 ? <Check size={12} className="stroke-[3]" /> : "1"}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    {activeExerciseId === 'door-frame' ? (
                      doorFrameOption === 'A' ? 'Position Hands Low' :
                      doorFrameOption === 'C' ? 'Extend Hands High' :
                      'Fix Elbow Positions at 90°'
                    )
                      : activeExerciseId === 'cross-body' ? (
                        crossBodySide === 'left' ? 'Reach Left Arm Across Chest' : 'Reach Right Arm Across Chest'
                      )
                      : activeExerciseId === 'upper-trap' ? 'Align Spine Level'
                      : activeExerciseId === 'hand-behind' ? 'Interlace fingers Behind Back'
                      : 'Sit Straight & Calibrate'}
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                    {activeExerciseId === 'door-frame' ? (
                      doorFrameOption === 'A' ? 'Secure hands low on the frame, below chest level, and stand directly in the center.' :
                      doorFrameOption === 'C' ? 'Place hands high up on the frame borders, above head level, and stand right in center.' :
                      'Secure forearms flat against door borders at 90° shoulder level. Stand right in center.'
                    )
                      : activeExerciseId === 'cross-body' ? (
                        crossBodySide === 'left' ? 'Lift left arm parallel to ground, hook opposite forearm over it, and calibrate.' : 'Lift right arm parallel to ground, hook opposite forearm over it, and calibrate.'
                      )
                      : activeExerciseId === 'upper-trap' ? 'Look straight into the webcam. Settle shoulders straight down and calibrate.'
                      : activeExerciseId === 'hand-behind' ? 'Clasp fingers snugly behind your lower tailbone and stand tall with feet straight.'
                      : 'Look directly at the screen vertically. Tap Calibrate at top to lock baseline stance.'}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`p-3 rounded-2xl border transition-colors flex items-start gap-4 ${
                currentStage === 'neutral' || currentStage === 'forward'
                  ? 'bg-amber-50/55 border-amber-200' 
                  : 'bg-slate-50/30 border-slate-100 opacity-60'
              }`}>
                <div className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                  currentStage === 'correct' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {currentStage === 'correct' ? <Check size={12} className="stroke-[3]" /> : "2"}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    {activeExerciseId === 'door-frame' ? (
                      doorFrameOption === 'A' ? 'Lean Chest Forward' :
                      doorFrameOption === 'C' ? 'Lean Down & Forward' :
                      'Lean Torso Gently Forward'
                    )
                      : activeExerciseId === 'cross-body' ? (
                        crossBodySide === 'left' ? 'Pull Left Arm Snugly Across' : 'Pull Right Arm Snugly Across'
                      )
                      : activeExerciseId === 'upper-trap' ? 'Slowly Tilt Head to the Side'
                      : activeExerciseId === 'hand-behind' ? 'Lift Knuckles Away from Spine'
                      : 'Pull Head Straight Back'}
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                    {activeExerciseId === 'door-frame' ? (
                      doorFrameOption === 'A' ? 'Step one leg forward to draw your upper torso through, focusing the stretch on upper fibers.' :
                      doorFrameOption === 'C' ? 'Step forward and sink your chest gently downward to stretch the pectoralis minor.' :
                      'Step one leg forward through the frame boundary until a deep middle chest stretch pulls.'
                    )
                      : activeExerciseId === 'cross-body' ? (
                        crossBodySide === 'left' ? 'Hook the left arm tighter and pull it backward securely across your upper pectoral frame.' : 'Hook the right arm tighter and pull it backward securely across your upper pectoral frame.'
                      )
                      : activeExerciseId === 'upper-trap' ? 'Slowly lower your left ear down sideways to stretch the right trapezius muscles.'
                      : activeExerciseId === 'hand-behind' ? 'Squeeze shoulder blades flat together and raise interlaced knuckles up away from pelvic spine.'
                      : 'Close a small imaginary drawer with your chin. Draw ears vertical past collarbone center.'}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className={`p-3 rounded-2xl border transition-colors flex items-start gap-4 ${
                currentStage === 'correct'
                  ? 'bg-emerald-50/60 border-emerald-300' 
                  : 'bg-slate-50/30 border-slate-100 opacity-60'
              }`}>
                <div className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                  holdTimer >= 2.5 ? 'bg-emerald-500 text-white' : 'bg-emerald-600 text-white animate-pulse'
                }`}>
                  "3"
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-850">
                    {activeExerciseId === 'door-frame' ? (
                      doorFrameOption === 'A' ? 'Isolate Upper Pec Release' :
                      doorFrameOption === 'C' ? 'Isolate Pec Minor Release' :
                      'Squeeze Scapulae'
                    )
                      : activeExerciseId === 'cross-body' ? (
                        crossBodySide === 'left' ? 'Stabilize Left Shoulder Stretch' : 'Stabilize Right Shoulder Stretch'
                      )
                      : activeExerciseId === 'upper-trap' ? 'Lateral Trap Release Hold'
                      : activeExerciseId === 'hand-behind' ? 'Tall Collarbone Splay Hold'
                      : 'Static Retraction Hold'}
                  </h4>
                  <p className="text-[11px] text-slate-650 leading-normal mt-0.5">
                    {activeExerciseId === 'door-frame' ? (
                      doorFrameOption === 'A' ? 'Inhale deeply, roll shoulders back and down, and secure upper chest stretch for 3 seconds.' :
                      doorFrameOption === 'C' ? 'Drop shoulders down away from ears, sink chest, and hold deep minor stretch for 3 seconds.' :
                      'Broaden your pectoral alignment, squeeze shoulder blades, and hold stretch for 3 seconds.'
                    )
                      : activeExerciseId === 'cross-body' ? (
                        crossBodySide === 'left' ? 'Keep spine straight and active left shoulder rolled low. Retain snug stretch for 3 seconds.' : 'Keep spine straight and active right shoulder rolled low. Retain snug stretch for 3 seconds.'
                      )
                      : activeExerciseId === 'upper-trap' ? 'Retain horizontal gaze plane. Steady gravity lateral lengthening stretch for 3 seconds.'
                      : activeExerciseId === 'hand-behind' ? 'Inhale deeply, lift ribs, and keep upper back flat. Retain extended hold for 3 seconds.'
                      : 'Secure and freeze the chin position. Avoid looking down! Hold steadily for 3 seconds.'}
                  </p>
                </div>
              </div>

              {/* Warnings check panel */}
              {currentStage === 'bending' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-700 animate-pulse">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <h5 className="text-[11px] font-bold">
                      {activeExerciseId === 'door-frame' ? 'Forward Slouching Poke'
                        : activeExerciseId === 'cross-body' ? (
                          crossBodySide === 'left' ? 'Left Shoulder Shrug Elevation' : 'Right Shoulder Shrug Elevation'
                        )
                        : activeExerciseId === 'upper-trap' ? 'Contralateral Shrug Fault'
                        : activeExerciseId === 'hand-behind' ? 'Lower Back Arch Bow'
                        : 'Neck Flexion Error'}
                    </h5>
                    <p className="text-[10px] leading-tight opacity-90 mt-0.5">
                      {activeExerciseId === 'door-frame' ? 'Your head is falling forward in slouch! Pull ears back up to isolate pectoral release safely.'
                        : activeExerciseId === 'cross-body' ? (
                          crossBodySide === 'left' ? 'You are shrugging your active left shoulder up. Roll it down to prevent collar pinching!' : 'You are shrugging your active right shoulder up. Roll it down to prevent collar pinching!'
                        )
                        : activeExerciseId === 'upper-trap' ? 'Avoid shrugging the opposite shoulder upward. Let it drop completely loose.'
                        : activeExerciseId === 'hand-behind' ? 'Do not fold or arch your lumbar spine forward! Keep lower abdomen tucked in.'
                        : 'You are tilting your chin down to cheat. Return gaze horizontal to earn rep counts!'}
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>

        </section>

        </div>
      </main>

      {/* CLINI-LOG SECURITY WATERMARK FOOTNOTE */}
      <footer className="border-t border-blue-100 py-6 px-6 bg-white text-center shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-slate-400 select-none">
          <p>© 2026 Posture Care. Built using MediaPipe Pose, Web Speech API & Tailwind for high-speed biomechanics coaching.</p>
          <div className="flex gap-4">
            <span className="hover:text-blue-600 transition-colors cursor-pointer">Rehab Protocol C7</span>
            <span>•</span>
            <span className="hover:text-blue-600 transition-colors cursor-pointer">Privacy Certified</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
