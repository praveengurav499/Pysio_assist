import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Clock, 
  CheckCircle2, 
  RotateCcw, 
  Flame, 
  Activity, 
  AlertTriangle, 
  Zap, 
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Play,
  HelpCircle,
  Video
} from 'lucide-react';
import { motion } from 'motion/react';

interface PostureReportSectionProps {
  duration: number; // in seconds
  repCount: number;
  targetReps: number;
  avgAlignment: number;
  avgStability: number;
  bendingViolations: number;
  movementHistory?: Array<{ time: string; angle: number; alignment: number; stability: number; stage: string }>;
  activeExerciseId: string;
  completedTests?: string[];
  onRestart: () => void;
  onGoToCamera: () => void;
}

export default function PostureReportSection({
  duration,
  repCount,
  targetReps,
  avgAlignment,
  avgStability,
  bendingViolations,
  movementHistory = [],
  activeExerciseId,
  completedTests = [],
  onRestart,
  onGoToCamera
}: PostureReportSectionProps) {
  const [aiReport, setAiReport] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchAiReport = async () => {
    if (repCount === 0 && duration < 3) return; // don't fetch if no activity
    setLoadingAi(true);
    setAiError(null);
    try {
      // Fetch report from backend with explicit instructions to use understanding, patient-friendly words
      if (movementHistory && movementHistory.length > 0) {
        const response = await fetch('/api/analyze-movement-sequence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movementHistory,
            activeExerciseId: activeExerciseId === 'door-frame' ? 'door-frame' : 'chin-tuck'
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
          activeExerciseId: activeExerciseId === 'door-frame' ? 'door-frame' : 'chin-tuck'
        })
      });

      if (!response.ok) throw new Error("Could not fetch AI advice.");
      const data = await response.json();
      setAiReport(data);
    } catch (err) {
      console.error(err);
      setAiError("Could not retrieve AI assessment using plain-English understanding words.");
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    fetchAiReport();
  }, [repCount, duration, activeExerciseId]);

  // Format Elapsed Time into friendly text
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s} seconds`;
    return `${m} min ${s} sec`;
  };

  // Human-friendly plain English clinical explanations ("understanding words")
  const getEasyAdvice = () => {
    const isDoorFrame = activeExerciseId === 'door-frame';
    
    if (isDoorFrame) {
      if (repCount === 0) {
        return {
          rating: 'Ready to Start',
          verdict: 'Your Stretch Report is Waiting!',
          advice: 'Complete a workout session using the webcam or simulator, and we will automatically create an easy-to-understand summary of your chest flexibility and shoulder balance here!',
          color: 'text-blue-700 bg-blue-50/75 border-blue-100'
        };
      }
      
      if (bendingViolations === 0 && avgAlignment >= 80) {
        return {
          rating: '★ ★ ★ ★ ★ Excellent Form',
          verdict: 'Beautiful Chest Opening & Symmetry!',
          advice: 'Perfect! You stood straight, kept your arms level, and stepped forward smoothly. This stretches out tight chest muscles from computer-slouching and helps prevent shoulder pinching. Excellent work!',
          color: 'text-emerald-700 bg-emerald-50/80 border-emerald-100'
        };
      } else if (bendingViolations > 2) {
        return {
          rating: '★ ★ ★ ☆ ☆ Good Effort',
          verdict: 'Shoulders Shrugged or Slanted',
          advice: 'You got a great chest stretch, but you had a habit of shrugging your shoulders up or leaning to one side. Try to keep both shoulders level, relaxed, and rolled down away from your ears to get a safer stretch.',
          color: 'text-amber-700 bg-amber-50/85 border-amber-100'
        };
      } else {
        return {
          rating: '★ ★ ★ ★ ☆ Very Good Form',
          verdict: 'Deep Stretch and Steady Balance',
          advice: 'Great job stretching out your chest! You maintained steady arm angles. Next time, focus on keeping your head tall and eyes straight ahead, to avoid pushing your neck too far forward when you step into the door frame.',
          color: 'text-indigo-700 bg-indigo-50/75 border-indigo-150'
        };
      }
    } else {
      if (repCount === 0) {
        return {
          rating: 'Ready to Start',
          verdict: 'Your Posture Report is Waiting!',
          advice: 'Complete a workout session using the webcam or simulator, and we will automatically create an easy-to-understand summary of your neck muscle strength and posture alignment here!',
          color: 'text-blue-700 bg-blue-50/75 border-blue-100'
        };
      }

      if (bendingViolations === 0 && avgAlignment >= 88) {
        return {
          rating: '★ ★ ★ ★ ★ Perfect Form',
          verdict: 'Ideal Neck Alignment!',
          advice: 'Wonderful job! You pulled your ears straight back over your shoulders without looking down. This strengthens the small supporting muscles in the front of your neck, which helps prevent head-forward neck strain. Keep it up!',
          color: 'text-emerald-700 bg-emerald-50/80 border-emerald-100'
        };
      } else if (bendingViolations > 2) {
        return {
          rating: '★ ★ ★ ☆ ☆ Good Start',
          verdict: 'Looking Down Instead of Straight',
          advice: 'You pulled your head back nicely, but you kept tilting your chin down to look at the screen. Looking down strains your neck joints. Try looking straight ahead as if making a subtle "double chin", and keep your eyes level with the wall.',
          color: 'text-amber-700 bg-amber-50/85 border-amber-100'
        };
      } else {
        return {
          rating: '★ ★ ★ ★ ☆ Great Form',
          verdict: 'Steady Holds and Strong Alignment',
          advice: 'Superb alignment! You held your head back steadily. Just focus on relaxing your upper shoulders and traps next time, keeping them relaxed and level to prevent muscle tightness.',
          color: 'text-indigo-700 bg-indigo-50/75 border-indigo-150'
        };
      }
    }
  };

  const simplePrescription = getEasyAdvice();
  const completionRate = Math.min(100, Math.round((repCount / (targetReps || 3)) * 100));

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-sm flex flex-col gap-6" id="embedded-report-section">
      {/* Header section with badge */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 px-3 rounded-full bg-blue-50 text-blue-700 font-mono text-[9px] font-extrabold tracking-widest uppercase">
              REHAB REPORT SECTION
            </span>
            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 font-mono bg-emerald-50 px-2.5 py-0.5 rounded-full">
              <ShieldCheck size={11} /> PATIENT-FRIENDLY SUMMARY
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight mt-1.5 leading-tight">
            Personal Posture Assessment & Advice
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            This section translates complex joint coordinates into simple, everyday words to help you understand your recovery!
          </p>
        </div>

        {repCount > 0 && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onRestart}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-mono font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <RotateCcw size={13} /> Practice Again
            </button>
          </div>
        )}
      </div>

      {repCount === 0 ? (
        /* EMPTY STATE - NO REPORT YET */
        <div className="py-14 text-center flex flex-col items-center justify-center gap-4 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500">
            <Activity size={24} className="animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">No Exercise Data Recorded Yet</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              We compile your customized, patient-friendly report using plain English immediately after you practice. Click the button below to start your webcam or use the simulator!
            </p>
          </div>
          <button
            onClick={onGoToCamera}
            className="mt-2 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-mono font-black text-xs uppercase rounded-xl tracking-wider transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Video size={13} /> START EXERCISE TRACKER
          </button>
        </div>
      ) : (
        /* ACTIVE REPORT CARD */
        <div className="flex flex-col gap-6">
          
          {/* Main Stat Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900 text-white rounded-2xl p-5 border border-slate-950 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:10px_10px]" />
            
            {/* Box 1: Reps */}
            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 relative z-10">
              <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-450 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} className="stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[8.5px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                  {activeExerciseId === 'door-frame' ? 'STRETCHES DONE' : 'REPETITIONS DONE'}
                </span>
                <p className="text-base font-black font-mono mt-0.5">{repCount} <span className="text-xs text-slate-450 font-normal">/ {targetReps}</span></p>
              </div>
            </div>

            {/* Box 2: Time */}
            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 relative z-10">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Clock size={18} className="stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[8.5px] font-mono font-bold text-slate-400 uppercase tracking-widest">PRACTICE TIME</span>
                <p className="text-base font-black font-mono mt-0.5">{formatTime(duration)}</p>
              </div>
            </div>

            {/* Box 3: Stability */}
            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 relative z-10">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Activity size={18} className="stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[8.5px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                  {activeExerciseId === 'door-frame' ? 'ARM SYMMETRY' : 'HOLD STEADINESS'}
                </span>
                <p className="text-base font-black font-mono mt-0.5 text-emerald-400">{avgStability}%</p>
              </div>
            </div>
          </div>

          {/* DIFFERENT COMPLETED TESTS SUB-SECTION FOR DOOR FRAME STRETCH */}
          {activeExerciseId === 'door-frame' && completedTests.length > 0 && (
            <div className="bg-emerald-50/50 border border-emerald-150 rounded-2xl p-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-1.5">
                <Award size={15} className="text-emerald-700" />
                <span className="text-xs font-black tracking-wider text-emerald-800 uppercase font-sans">
                  Completed Stretch Variations (Tests Profile)
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-normal">
                You successfully tested and exercised different chest muscle groups during this session to target varied fibers:
              </p>
              <div className="flex flex-wrap gap-2">
                {completedTests.map((test, index) => (
                  <span 
                    key={index} 
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-emerald-200 text-emerald-800 text-[10px] font-mono font-bold shadow-3xs"
                  >
                    <CheckCircle2 size={10} className="text-emerald-600" /> {test}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Easy-to-read clinical prescription feedback */}
          <div className={`p-5 rounded-2xl border ${simplePrescription.color} flex flex-col gap-2`}>
            <div className="flex justify-between items-center pb-1.5 border-b border-black/5">
              <span className="text-xs font-black uppercase tracking-wider">
                {simplePrescription.rating}
              </span>
              <span className="text-[10px] font-mono font-bold uppercase">PHYSICAL THERAPIST SUMMARY</span>
            </div>
            <h4 className="font-bold text-sm leading-tight mt-1">{simplePrescription.verdict}</h4>
            <p className="text-xs leading-relaxed font-medium mt-1">
              {simplePrescription.advice}
            </p>
          </div>

          {/* Interactive Metrics Breakdown with understanding labels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Box 1: Upright Neck / Chest Extension */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Activity size={14} className="text-blue-500" /> 
                  {activeExerciseId === 'door-frame' ? 'Chest Extension (How deep you stretched)' : 'Head Upright Angle (How far back you pulled)'}
                </span>
                <span className="font-mono text-xs text-blue-600 font-bold">{avgAlignment}% score</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    avgAlignment >= 85 ? 'bg-emerald-500' : avgAlignment >= 70 ? 'bg-amber-400' : 'bg-rose-500'
                  }`}
                  style={{ width: `${avgAlignment}%` }}
                />
              </div>
              <p className="text-[10.5px] text-slate-500 leading-normal font-sans">
                {activeExerciseId === 'door-frame' 
                  ? "This shows how well you stepped forward to pull your upper chest and shoulders back to expand your lung cage."
                  : "This measures your ability to align your ears right over your shoulders horizontally, resetting computer-neck strain."}
              </p>
            </div>

            {/* Box 2: Hand Symmetry / Hold Stability */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-indigo-500" /> 
                  {activeExerciseId === 'door-frame' ? 'Left-vs-Right Arm Symmetry' : 'Neck Hold Steadiness'}
                </span>
                <span className="font-mono text-xs text-indigo-600 font-bold">{avgStability}% score</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${avgStability}%` }}
                />
              </div>
              <p className="text-[10.5px] text-slate-500 leading-normal font-sans">
                {activeExerciseId === 'door-frame'
                  ? "Measures whether your left and right elbows were balanced symmetrically, ensuring you do not twist or overload one side."
                  : "Measures whether you held your chin back smoothly without jittering, shaking, or drifting forward during the 3-second holds."}
              </p>
            </div>
          </div>

          {/* Fault Warnings Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-rose-500 animate-bounce" /> 
                {activeExerciseId === 'door-frame' ? 'Shoulder Shrugging or Slouching' : 'Looking Down Slips'}
              </span>
              <p className="text-[10.5px] text-slate-500 leading-normal mt-0.5 max-w-md">
                {activeExerciseId === 'door-frame'
                  ? "Shrugging neck muscles or standing unevenly places awkward pressure on your collar joint."
                  : "Looking down at the screen bends your neck downwards and cheats the exercises. Always look straight!"}
              </p>
            </div>
            <div className="shrink-0 font-mono text-xs font-black px-3 py-1 rounded-xl bg-white border border-slate-200">
              {bendingViolations === 0 ? (
                <span className="text-emerald-600 font-bold">✓ PERFECT BALANCE</span>
              ) : (
                <span className="text-rose-600 font-bold">{bendingViolations} SLIPS DETECTED</span>
              )}
            </div>
          </div>

          {/* Gemini AI Clinician Audit with easy-to-understand words */}
          <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/50 p-5 rounded-2xl border border-indigo-150/70 flex flex-col gap-3">
            <div className="flex justify-between items-center pb-2 border-b border-indigo-200/45">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-600 animate-pulse" />
                <span className="text-xs font-black uppercase font-sans text-indigo-700">
                  Gemini Plain-English AI Evaluation
                </span>
              </div>
              <span className="text-[8px] font-mono font-bold text-slate-400">POWERED BY GEMINI AI</span>
            </div>

            {loadingAi ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-center">
                <Activity className="animate-spin text-indigo-600" size={24} />
                <span className="text-xs font-bold text-slate-600">Translating biomechanics into simple advice...</span>
              </div>
            ) : aiError ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                  {simplePrescription.advice}
                </p>
                <button 
                  onClick={fetchAiReport}
                  className="self-start text-[10px] text-blue-600 hover:text-blue-700 font-mono font-extrabold underline cursor-pointer"
                >
                  Retry calling Gemini Plain-English Auditor
                </button>
              </div>
            ) : aiReport ? (
              <div className="flex flex-col gap-3">
                <div className="bg-white/90 border border-indigo-100 p-3 rounded-xl shadow-3xs">
                  <span className="text-[9px] font-mono font-black text-indigo-800 uppercase tracking-wider block">CLINICAL CONCLUSION</span>
                  <p className="text-xs text-slate-700 leading-relaxed font-semibold mt-1">
                    {aiReport.verdict || (aiReport.message ? `"${aiReport.message}"` : '')}
                  </p>
                </div>

                {/* Plain-EnglishTrajectory audit parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {aiReport.stabilityReport && (
                    <div className="bg-white/60 border border-slate-150 p-3 rounded-xl flex flex-col gap-0.5">
                      <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <TrendingUp size={11} className="text-blue-500" /> Steadiness Check
                      </span>
                      <p className="text-[11px] text-slate-600 leading-normal mt-1">{aiReport.stabilityReport}</p>
                    </div>
                  )}

                  {aiReport.rangeOfMotionReport && (
                    <div className="bg-white/60 border border-slate-150 p-3 rounded-xl flex flex-col gap-0.5">
                      <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Activity size={11} className="text-indigo-500" /> Stretch Depth Check
                      </span>
                      <p className="text-[11px] text-slate-600 leading-normal mt-1">{aiReport.rangeOfMotionReport}</p>
                    </div>
                  )}
                </div>

                {aiReport.fatigueAssessment && (
                  <div className="bg-white/60 border border-slate-150 p-3 rounded-xl flex flex-col gap-0.5">
                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <AlertTriangle size={11} className="text-rose-500" /> Muscle Fatigue Check
                    </span>
                    <p className="text-[11px] text-slate-600 leading-normal mt-1">{aiReport.fatigueAssessment}</p>
                  </div>
                )}

                {(aiReport.tips || aiReport.details) && (aiReport.tips || aiReport.details).length > 0 && (
                  <div className="mt-1 flex flex-col gap-1.5">
                    <span className="text-[9.5px] font-mono font-black uppercase text-indigo-800 tracking-wider">Targeted Everyday Corrections:</span>
                    {(aiReport.tips || aiReport.details).map((tip: string, index: number) => (
                      <div key={index} className="flex items-start gap-1.5 text-xs text-slate-650 leading-relaxed font-medium">
                        <span className="text-indigo-500 font-bold mt-0.5">•</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  {simplePrescription.advice}
                </p>
                <button
                  onClick={fetchAiReport}
                  className="self-start mt-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-black text-[10px] uppercase rounded-xl tracking-wider transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles size={11} /> Request Custom AI Plain-English Audit
                </button>
              </div>
            )}
          </div>

          {/* Goal achievement card */}
          <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl flex flex-col gap-1 shadow-md shadow-emerald-100">
            <span className="text-[9px] font-mono font-black tracking-widest uppercase text-emerald-100">CONGRATULATIONS</span>
            <h4 className="font-bold text-xs font-display flex items-center gap-1.5 mt-0.5">
              <Zap size={13} className="text-yellow-300 animate-pulse" /> Workout Session Completed Successfully!
            </h4>
            <p className="text-[10.5px] opacity-90 mt-0.5 leading-normal">
              {activeExerciseId === 'door-frame'
                ? `You have completed ${repCount} high quality door frame stretches, testing varied angles to release chest tightness. Rest for 2 minutes before starting another exercise.`
                : `You have completed ${repCount} repetitions of deep neck holds to lock in your posture base. Continue to stay upright during desk work!`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
