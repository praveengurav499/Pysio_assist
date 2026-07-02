import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Award, 
  Clock, 
  CheckCircle2, 
  RotateCcw, 
  Flame, 
  Activity, 
  AlertTriangle, 
  Zap, 
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  X,
  Loader2,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SessionReportModalProps {
  isOpen: boolean;
  duration: number; // in seconds
  repCount: number;
  targetReps: number;
  avgAlignment: number;
  avgStability: number;
  bendingViolations: number;
  onClose: () => void;
  onRestart: () => void;
  movementHistory?: Array<{ time: string; angle: number; alignment: number; stability: number; stage: string }>;
  activeExerciseId: string;
}

export default function SessionReportModal({
  isOpen,
  duration,
  repCount,
  targetReps,
  avgAlignment,
  avgStability,
  bendingViolations,
  onClose,
  onRestart,
  movementHistory = [],
  activeExerciseId
}: SessionReportModalProps) {
  if (!isOpen) return null;

  const [aiReport, setAiReport] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showTechDetails, setShowTechDetails] = useState<boolean>(false);

  const fetchAiReport = async () => {
    setLoadingAi(true);
    setAiError(null);
    try {
      // Use the deep movement sequence analysis if we have historical logs
      if (movementHistory && movementHistory.length > 0) {
        const response = await fetch('/api/analyze-movement-sequence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movementHistory,
            activeExerciseId: activeExerciseId === 'door-frame' || activeExerciseId === 'doorframe' ? 'door-frame' : 'chin-tuck'
          })
        });

        if (!response.ok) throw new Error("Could not fetch movement trajectory audit.");
        const data = await response.json();
        setAiReport(data);
        return;
      }

      const postureStatus = avgAlignment >= 75 ? 'correct' : 'incorrect';
      const headPosition = bendingViolations > 3 ? 'forward' : 'aligned';
      const shoulderAlignment = avgStability >= 80 ? 'good' : 'uneven';

      const response = await fetch('/api/analyze-posture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          neckAngle: Math.round(avgAlignment * 0.6),
          idealAngle: 50,
          headPosition,
          shoulderAlignment,
          postureStatus,
          activeExerciseId: activeExerciseId === 'door-frame' || activeExerciseId === 'doorframe' ? 'door-frame' : 'chin-tuck'
        })
      });

      if (!response.ok) throw new Error("Could not fetch AI advice.");
      const data = await response.json();
      setAiReport(data);
    } catch (err) {
      console.error(err);
      setAiError("Could not retrieve AI prescription report.");
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAiReport();
    }
  }, [isOpen]);

  // Format Elapsed Time
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  // Generate Medical Prescription Feedback based on user stats
  const getClinicalPrescription = () => {
    const isDoorFrame = activeExerciseId === 'door-frame' || activeExerciseId === 'doorframe';
    
    if (isDoorFrame) {
      if (bendingViolations === 0 && avgAlignment >= 80) {
        return {
          rating: '★ ★ ★ ★ ★',
          verdict: 'Excellent Shoulder Openness!',
          advice: 'Outstanding form! You achieved great shoulder abduction and elbow flexion symmetry. This opens up tight chest muscles and counteracts rounded-shoulder posture. Keep practicing this 3-5 times a week!',
          color: 'text-emerald-700',
          bg: 'bg-emerald-50/70 border-emerald-100'
        };
      } else if (bendingViolations > 3) {
        return {
          rating: '★ ★ ★ ☆ ☆',
          verdict: 'Asymmetrical/Shrugged Shoulders',
          advice: 'You did a good job stretching, but you had a tendency to shrug or lean unevenly during holds. Try to keep your shoulders relaxed down away from your ears, and maintain even symmetry on both sides next time.',
          color: 'text-amber-700',
          bg: 'bg-amber-50/70 border-amber-100'
        };
      } else if (avgAlignment < 75) {
        return {
          rating: '★ ★ ☆ ☆ ☆',
          verdict: 'Initial Stretch Stage',
          advice: 'Keep practicing! Focus on raising your elbows to a full 90-degree position against the door frame. Keep your chest tall and step into the stretch gently until you feel a comfortable tension across your chest.',
          color: 'text-blue-700',
          bg: 'bg-blue-50/70 border-blue-100'
        };
      } else {
        return {
          rating: '★ ★ ★ ★ ☆',
          verdict: 'Great Shoulder Stretch',
          advice: 'Very clean form! You maintained steady, even chest extension. Just make sure to keep your head aligned and eyes parallel to the floor to prevent chin protrusion during deeper steps.',
          color: 'text-indigo-700',
          bg: 'bg-indigo-50/75 border-indigo-150'
        };
      }
    } else {
      if (bendingViolations === 0 && avgAlignment >= 88) {
        return {
          rating: '★ ★ ★ ★ ★',
          verdict: 'Excellent Posture Control!',
          advice: 'Outstanding form! You pulled your ears straight back over your shoulders perfectly without tilting your head down. This activates the deep core muscles of your neck, reversing the common computer-slouch strain. Keep practicing like this 3 block times a week!',
          color: 'text-emerald-700',
          bg: 'bg-emerald-50/70 border-emerald-100'
        };
      } else if (bendingViolations > 3) {
        return {
          rating: '★ ★ ★ ☆ ☆',
          verdict: 'Head Tilted Downwards',
          advice: 'You did a great job pulling your neck back, but you had a habit of looking or nodding downwards. To get the best results and avoid neck strain, try looking straight ahead into your webcam and keep your eyes parallel with the floor next time.',
          color: 'text-amber-700',
          bg: 'bg-amber-55/70 border-amber-100'
        };
      } else if (avgAlignment < 75) {
        return {
          rating: '★ ★ ☆ ☆ ☆',
          verdict: 'Initial Practice Stage',
          advice: 'Keep going! You are still building up strength. To reach the perfect posture alignment, try pulling your entire chin straight back horizontally (like making a double chin), rather than just leaning your neck. Try the warmup stretch to loosen up!',
          color: 'text-blue-700',
          bg: 'bg-blue-50/70 border-blue-100'
        };
      } else {
        return {
          rating: '★ ★ ★ ★ ☆',
          verdict: 'Great Posture Alignment',
          advice: 'Very clean form! You maintained steady, robust holds and aligned your chin beautifully. Just make sure to keep your eyes fixed exactly at eye level during high holds to eliminate minor tilts.',
          color: 'text-indigo-700',
          bg: 'bg-indigo-50/75 border-indigo-150'
        };
      }
    }
  };

  const presc = getClinicalPrescription();
  const completionRate = Math.min(100, Math.round((repCount / targetReps) * 100));

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity duration-300 pointer-events-auto"
        onClick={onClose}
      />

      {/* Frame Alignment Container */}
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all w-full max-w-2xl border border-blue-105 flex flex-col pointer-events-auto"
        >
          {/* Top Rainbow Stripe branding */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-600" />

          {/* Close trigger top-right */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all cursor-pointer z-10"
            aria-label="Close"
          >
            <X size={18} className="stroke-[2.5]" />
          </button>

          {/* Header Medical Diagnostics Title */}
          <div className="p-6 md:p-8 pb-4">
            <div className="flex items-center gap-2">
              <span className="p-1 px-3 rounded-full bg-emerald-50 text-emerald-700 font-mono text-[9px] font-extrabold tracking-widest uppercase">
                Session Accomplishments
              </span>
              <span className="flex items-center gap-1 text-[9px] font-bold text-blue-600 font-mono bg-blue-50 px-2.5 py-0.5 rounded-full select-none">
                <ShieldCheck size={11} /> CERTIFIED REHAB REPORT
              </span>
            </div>
            
            <h2 className="text-2xl font-black text-slate-800 tracking-tight mt-1.5 leading-none">
              Physical Therapy Assessment Card
            </h2>
            <p className="text-xs text-slate-500 mt-2.5 font-medium leading-relaxed">
              Diagnostic posture analysis generated across custom computer-vision parameters during your active {activeExerciseId === 'door-frame' || activeExerciseId === 'doorframe' ? 'door frame stretch' : 'chin tuck'} exercises.
            </p>
          </div>

          {/* Content Scroll Shell */}
          <div className="p-6 md:p-8 pt-0 flex flex-col gap-6">
            
            {/* Core Achievement Ribbon */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-slate-900 text-white rounded-3xl p-5 border border-slate-950 relative overflow-hidden">
              {/* Background abstract overlay grids */}
              <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:10px_10px]" />
              
              {/* Box 1: Rep/Stretch Progress */}
              <div className="flex items-center gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/5 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={22} className="stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    {activeExerciseId === 'door-frame' || activeExerciseId === 'doorframe' ? 'Stretches Met' : 'Reps Met'}
                  </span>
                  <p className="text-lg font-black font-mono mt-0.5">{repCount} <span className="text-[11px] text-slate-400 font-normal">/ {targetReps}</span></p>
                </div>
              </div>

              {/* Box 2: Time Duration */}
              <div className="flex items-center gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/5 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Clock size={22} className="stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">Active Time</span>
                  <p className="text-lg font-black font-mono mt-0.5">{formatTime(duration)}</p>
                </div>
              </div>

              {/* Box 3: Stability Score */}
              <div className="flex items-center gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/5 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Activity size={22} className="stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    {activeExerciseId === 'door-frame' || activeExerciseId === 'doorframe' ? 'Bilateral Symmetry' : 'Stability Rate'}
                  </span>
                  <p className="text-lg font-black font-mono mt-0.5 text-emerald-400">{avgStability}%</p>
                </div>
              </div>
            </div>

            {/* Diagnostic Parameters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Left Diagnostics Column: Alignment Metrics */}
              <div className="flex flex-col gap-4">
                <h3 className="text-[10px] font-mono font-extrabold tracking-wider text-slate-400 uppercase pb-1 border-b border-slate-100">
                  Biomechanical Posture Parameters
                </h3>

                {/* Alignment Score Row */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Activity size={14} className="text-blue-500" /> {activeExerciseId === 'door-frame' || activeExerciseId === 'doorframe' ? 'Shoulder Abduction Level' : 'Alignment Accuracy'}
                    </span>
                    <span className="font-mono text-sm text-blue-600">{avgAlignment}%</span>
                  </div>
                  {/* Slider bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        avgAlignment >= 85 ? 'bg-emerald-500' : avgAlignment >= 70 ? 'bg-amber-400' : 'bg-rose-500'
                      }`}
                      style={{ width: `${avgAlignment}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal select-none font-sans">
                    {activeExerciseId === 'door-frame' || activeExerciseId === 'doorframe' 
                      ? "Measures chest extension depth and pectoral stretch intensity achieved based on your upper shoulder vectors."
                      : "Measures how far back you pulled your ears over your shoulders, reversing the forward computer slump."}
                  </p>
                </div>

                {/* Stability rating card */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-indigo-500" /> {activeExerciseId === 'door-frame' || activeExerciseId === 'doorframe' ? 'Bilateral Angle Balance' : 'Stabilization Steadiness'}
                    </span>
                    <span className="font-mono text-sm text-indigo-600">{avgStability}%</span>
                  </div>
                  {/* Slider bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${avgStability}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal select-none font-sans">
                    {activeExerciseId === 'door-frame' || activeExerciseId === 'doorframe'
                      ? "Measures the geometric symmetry between left and right shoulders & elbows to guarantee balanced muscular loading."
                      : "Measures how steady you held your neck position without shaking or twitching during the exercise holds."}
                  </p>
                </div>

              </div>

              {/* Right Diagnostics Column: Posture Fault Violations */}
              <div className="flex flex-col gap-4">
                <h3 className="text-[10px] font-mono font-extrabold tracking-wider text-slate-400 uppercase pb-1 border-b border-slate-100">
                  Postural Errors & Warnings
                </h3>

                {/* Bending warnings violations */}
                <div className="flex-1 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <AlertTriangle size={14} className="text-rose-500" /> {activeExerciseId === 'door-frame' || activeExerciseId === 'doorframe' ? 'Asymmetry & Shrugging Faults' : 'Looking Down Faults'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {activeExerciseId === 'door-frame' || activeExerciseId === 'doorframe' ? 'Shoulder shrugging or uneven tilt' : 'Head tilting or gaze dipping'}
                      </span>
                    </div>
                    <span className={`font-mono font-black text-lg px-2.5 py-0.5 rounded-xl border ${
                      bendingViolations > 3 
                        ? 'text-rose-600 bg-rose-50 border-rose-250 animate-pulse' 
                        : bendingViolations > 0 
                        ? 'text-amber-600 bg-amber-55 border-amber-200' 
                        : 'text-emerald-600 bg-emerald-50 border-emerald-100'
                    }`}>
                      {bendingViolations} times
                    </span>
                  </div>

                  <div className="border-t border-slate-200/60 pt-3 mt-3">
                    <p className="text-[11px] text-slate-600 leading-normal font-sans">
                      {activeExerciseId === 'door-frame' || activeExerciseId === 'doorframe'
                        ? (bendingViolations === 0 
                          ? "✓ Perfect! You kept your shoulders square and symmetric the entire time." 
                          : `You shrugged your shoulders or stood unevenly ${bendingViolations} times. Keep shoulders relaxed and level!`)
                        : (bendingViolations === 0 
                          ? "✓ Perfect! You kept your gaze straight ahead the entire time." 
                          : `You tilted your face down to look at the screen ${bendingViolations} times. Remember to keep eyes straight and parallel to the ground!`)}
                    </p>
                  </div>
                </div>

                {/* Progress chart representation */}
                <div className="p-3 bg-blue-50/40 rounded-2xl border border-blue-100/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-amber-500" />
                    <span className="text-[10px] font-bold text-blue-800 font-mono uppercase">Workout Set Success</span>
                  </div>
                  <span className="text-[11px] font-mono font-extrabold text-blue-700 bg-white border border-blue-100 px-2 py-0.5 rounded-lg shadow-2xs">
                    {completionRate}% TARGET MET
                  </span>
                </div>

              </div>

            </div>

            {/* Gemini AI Clinician Prescription Card */}
            <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/50 p-5 rounded-3xl border border-indigo-100 flex flex-col gap-3">
              <div className="flex justify-between items-center pb-2 border-b border-indigo-200/40">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-600 animate-pulse" />
                  <span className="text-xs font-black tracking-wide uppercase font-sans text-indigo-700">
                    Gemini AI Clinician Audit
                  </span>
                </div>
                <span className="text-[9px] font-mono font-bold text-slate-400">POWERED BY GEMINI 3.5-FLASH</span>
              </div>

              {loadingAi ? (
                <div className="py-4 flex flex-col items-center justify-center gap-2 text-center">
                  <Loader2 className="animate-spin text-indigo-600" size={24} />
                  <span className="text-xs font-bold text-slate-600">Generating physical therapy prescription...</span>
                </div>
              ) : aiError ? (
                <div className="flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 bg-white border border-slate-150 px-2.5 py-1 rounded-xl">
                      Standard Diagnostic Fallback
                    </span>
                    <span className="text-xs text-indigo-600 font-bold">{presc.rating}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {presc.advice}
                  </p>
                  <button 
                    onClick={fetchAiReport}
                    className="self-start text-[10px] text-blue-600 hover:text-blue-700 font-mono font-extrabold underline cursor-pointer"
                  >
                    Retry generating AI prescription
                  </button>
                </div>
              ) : aiReport ? (
                <div className="flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-950 bg-white border border-indigo-100 px-2.5 py-1 rounded-xl shadow-3xs">
                      Diagnosis: {aiReport.smoothnessScore ? `Kinematic Smoothness ${aiReport.smoothnessScore}%` : (aiReport.status === 'correct' ? 'Optimal Performance' : 'Correction Needed')}
                    </span>
                    <span className="text-xs text-indigo-600 font-bold">{presc.rating}</span>
                  </div>
                  <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                    {aiReport.verdict || (aiReport.message ? `"${aiReport.message}"` : '')}
                  </p>

                  {/* Dynamic Trajectory Audit Sub-sections if available */}
                  {aiReport.stabilityReport && (
                    <div className="bg-white border border-slate-100 p-2.5 rounded-xl flex flex-col gap-0.5 shadow-3xs">
                      <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp size={11} className="text-blue-500" /> Hold Steadiness Check
                      </span>
                      <p className="text-[11px] text-slate-600 leading-normal">{aiReport.stabilityReport}</p>
                    </div>
                  )}

                  {aiReport.rangeOfMotionReport && (
                    <div className="bg-white border border-slate-100 p-2.5 rounded-xl flex flex-col gap-0.5 shadow-3xs">
                      <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Activity size={11} className="text-indigo-500" /> Range of Motion Profile
                      </span>
                      <p className="text-[11px] text-slate-600 leading-normal">{aiReport.rangeOfMotionReport}</p>
                    </div>
                  )}

                  {aiReport.fatigueAssessment && (
                    <div className="bg-white border border-slate-100 p-2.5 rounded-xl flex flex-col gap-0.5 shadow-3xs">
                      <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle size={11} className="text-rose-500" /> Muscle Fatigue Check
                      </span>
                      <p className="text-[11px] text-slate-600 leading-normal">{aiReport.fatigueAssessment}</p>
                    </div>
                  )}

                  {(aiReport.tips || aiReport.details) && (aiReport.tips || aiReport.details).length > 0 && (
                    <div className="mt-1 flex flex-col gap-1.5">
                      <span className="text-[9.5px] font-mono font-black uppercase text-indigo-800 tracking-wider">Clinician Corrective Instructions:</span>
                      {(aiReport.tips || aiReport.details).map((tip: string, index: number) => (
                        <div key={index} className="flex items-start gap-1.5 text-xs text-slate-600 font-sans leading-normal font-medium">
                          <span className="text-indigo-500 mt-0.5">•</span>
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {presc.advice}
                  </p>
                  <button
                    onClick={fetchAiReport}
                    className="self-start mt-1 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-black text-[10px] uppercase rounded-lg tracking-wider transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles size={11} /> Request Deep Gemini Prescription Audit
                  </button>
                </div>
              )}
            </div>

            {/* Technical Architecture & Data Flow Accordion */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
              <button
                onClick={() => setShowTechDetails(!showTechDetails)}
                className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Activity size={15} className="text-slate-600" />
                  <span className="text-xs font-bold text-slate-700 font-mono uppercase tracking-wide">
                    Anatomical Tracking & Data Flow
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-400 font-mono">
                  {showTechDetails ? "HIDE INFO" : "VIEW INFO"}
                </span>
              </button>
              
              {showTechDetails && (
                <div className="p-4 md:p-5 border-t border-slate-200 bg-slate-50/30 flex flex-col gap-4 text-xs text-slate-600 leading-relaxed">
                  <div>
                    <span className="font-bold text-slate-800 block mb-1">1. Frame Ingestion & WASM Inference</span>
                    <p className="text-[11px] text-slate-500">
                      The webcam streams frames at 30 FPS. The browser utilizes Google MediaPipe's lightweight WASM Neural Network locally in the client to isolate facial and skeletal landmark coordinates (x, y, z, visibility) in 3D space.
                    </p>
                  </div>
                  
                  <div>
                    <span className="font-bold text-slate-800 block mb-1">2. Biomechanical Vector Formulae</span>
                    <p className="text-[11px] text-slate-500">
                      We compute the <span className="font-bold text-slate-700">Cervical Vertebral Angle (CVA)</span> using the relative vectors between the ear, shoulder, and a vertical baseline reference line:
                    </p>
                    <div className="my-2 bg-slate-900 text-slate-200 font-mono text-[10px] p-2.5 rounded-lg border border-slate-950 overflow-x-auto">
                      CVA = Math.round(Math.atan2(dy, dx) * 180 / Math.PI)
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Our custom mirror coordinate system automatically corrects horizontal coordinate flips (<code className="bg-slate-100 px-1 rounded text-rose-600">1 - x</code>) for accurate graphical overlays on mirrored webcam video feeds.
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-800 block mb-1">3. Throttled Posture State Pipeline</span>
                    <p className="text-[11px] text-slate-500">
                      To prevent frame-by-frame flickering, clinical computations are filtered through a 500ms state engine. This translates raw coordinate streams into definitive posture states (<span className="text-emerald-600 font-bold bg-emerald-50 px-1 rounded">CORRECT</span>, <span className="text-amber-600 font-bold bg-amber-50 px-1 rounded">FORWARD</span>, or <span className="text-rose-600 font-bold bg-rose-50 px-1 rounded">BENDING</span>), feeding directly into 3D avatar morphs, speech coach guidance, and the session progress logs.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Footer Controls */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            
            <div className="text-[11px] font-mono text-slate-400 select-none">
              * Relieve cervical fatigue: repeat every 4 hours if sitting prolonged.
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={onRestart}
                className="flex-1 sm:flex-initial px-5 py-2.5 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-mono font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <RotateCcw size={14} /> Practice Again
              </button>

              <button
                onClick={onClose}
                className="flex-1 sm:flex-initial px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-200 cursor-pointer text-center"
              >
                Accept & Exit <ArrowRight size={14} />
              </button>
            </div>

          </div>

        </motion.div>
      </div>
    </div>
  );
}
