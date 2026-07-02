import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Timer,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Stretch {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  duration: number; // in seconds
  clinicalBenefit: string;
  visualType: 'tilt' | 'rotate' | 'glide';
}

const STRETCHES: Stretch[] = [
  {
    id: 1,
    title: 'Lateral Neck Tilts',
    subtitle: 'Relax unilateral sternocleidomastoid & upper trapezius',
    description: 'Keep your shoulders strictly level and down. Slowly lower your right ear towards your right shoulder until you feel a gentle release on the left side of your neck. Hold briefly, return to vertical baseline, and repeat on the opposite side.',
    duration: 15,
    clinicalBenefit: 'Improves sagittal posture flexibility by restoring natural coronal mobility in the cervical spine.',
    visualType: 'tilt'
  },
  {
    id: 2,
    title: 'Horizon Shoulder Rotation',
    subtitle: 'Release suboccipital and splenius segment tightness',
    description: 'Look straight ahead. Rotate your head slowly to look over your left shoulder as far as painless. Pause to release tension, guide your head back to the middle, and smoothly repeat looking over your right shoulder.',
    duration: 15,
    clinicalBenefit: 'Lubricates pivot segments (C1-C2 atlas-axis) to prepare the neck columns for strict horizontal tracking.',
    visualType: 'rotate'
  },
  {
    id: 3,
    title: 'Cervical Axial Spine Glides',
    subtitle: 'Pre-activate the deep cervical spine flexors',
    description: 'Place your finger on your chin. Without looking downwards or nodding your head, slide your chin horizontally back, away from your finger, creating a double chin. Sense the stretch up the back of your skull and neck.',
    duration: 15,
    clinicalBenefit: 'Pre-registers the exact biomechanic muscle groups needed to complete perfect chin tuck holds.',
    visualType: 'glide'
  }
];

interface PreSessionWarmupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  isMuted?: boolean;
  voicePace?: 'standard' | 'slow';
}

export default function PreSessionWarmup({ 
  isOpen, 
  onClose, 
  onComplete,
  isMuted = false,
  voicePace = 'standard'
}: PreSessionWarmupProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(STRETCHES[0].duration);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const currentStretch = STRETCHES[currentStep];

  // Sync timer when step changes
  useEffect(() => {
    setTimeLeft(currentStretch.duration);
    setIsActive(true);
  }, [currentStep]);

  // Clock countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isOpen && isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !completedSteps[currentStretch.id]) {
      // Auto-complete current step
      setCompletedSteps(prev => ({ ...prev, [currentStretch.id]: true }));
      // Voice feedback on completion
      if (!isMuted && typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("Good stretch! Proceed to the next exercise.");
        utterance.rate = voicePace === 'slow' ? 0.82 : 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, isActive, timeLeft, currentStretch.id, completedSteps, isMuted, voicePace]);

  if (!isOpen) return null;

  const handleNext = () => {
    // Mark current step complete
    setCompletedSteps(prev => ({ ...prev, [currentStretch.id]: true }));
    if (currentStep < STRETCHES.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Completed last step! Trigger camera
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleResetTimer = () => {
    setTimeLeft(currentStretch.duration);
    setIsActive(true);
  };

  const handleSkipAll = () => {
    onComplete();
  };

  // Render highly-polished vector-illustrated active stretching indicators
  const renderVisualGuide = () => {
    switch (currentStretch.visualType) {
      case 'tilt':
        return (
          <div className="relative w-full h-[180px] bg-slate-950 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-800">
            {/* Grid watermark background */}
            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />
            
            {/* Dynamic CSS Animated SVG Illustration */}
            <div className="relative flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-blue-500 relative flex items-center justify-center animate-[wave_4s_ease-in-out_infinite]">
                {/* Nose */}
                <div className="absolute w-2 h-4 bg-rose-500 rounded-full top-8" />
                {/* Eyes */}
                <div className="absolute top-5 left-3 w-2 h-2 bg-slate-400 rounded-full" />
                <div className="absolute top-5 right-3 w-2 h-2 bg-slate-400 rounded-full" />
                {/* Ears */}
                <div className="absolute top-6 -left-1.5 w-1.5 h-3 bg-emerald-500 rounded-full" />
                <div className="absolute top-6 -right-1.5 w-1.5 h-3 bg-emerald-500 rounded-full" />
              </div>
              
              {/* Shoulders */}
              <div className="w-32 h-4 bg-slate-800 rounded-lg mt-2 relative border border-slate-700">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-sky-500/20" />
              </div>

              {/* Curved Arrows for Tilt Guide */}
              <svg className="absolute -top-4 w-40 h-28 pointer-events-none select-none text-blue-400/90" fill="none" viewBox="0 0 160 100">
                <path d="M 30,30 Q 80,-5 130,30" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 4" />
                <path d="M 35,40 Q 80,15 125,40" stroke="currentColor" strokeWidth="1.5" />
                <polygon points="30,30 25,20 38,25" fill="currentColor" />
                <polygon points="130,30 135,20 122,25" fill="currentColor" />
              </svg>
            </div>
            
            <div className="absolute bottom-2.5 right-3 px-2 py-0.5 rounded bg-blue-950/80 border border-blue-900/60 text-[9px] font-mono font-bold text-sky-400 text-center">
              ↔ CORONAL MOBILITY
            </div>
          </div>
        );
      case 'rotate':
        return (
          <div className="relative w-full h-[180px] bg-slate-950 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-800">
            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />
            
            {/* Rotation Visual Indicator */}
            <div className="relative flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-indigo-400 relative flex items-center justify-center animate-[spin_8s_ease-in-out_infinite]">
                {/* Nose rotating horizontally */}
                <div className="absolute w-2 h-4 bg-rose-500 rounded-full left-1" />
                {/* Left Ear facing back */}
                <div className="absolute top-2.5 -right-1 w-2 h-3 bg-emerald-500 rounded-full" />
              </div>
              <div className="w-28 h-4 bg-slate-800 rounded-lg mt-3 border border-slate-700" />

              {/* Angle rotation markers */}
              <svg className="absolute -top-3 w-40 h-24 text-indigo-400/80" fill="none" viewBox="0 0 160 100">
                <path d="M 10,50 A 70,70 0 0,1 150,50" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
                <polygon points="10,50 18,42 16,56" fill="currentColor" />
                <polygon points="150,50 142,42 144,56" fill="currentColor" />
              </svg>
            </div>

            <div className="absolute bottom-2.5 right-3 px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-900/60 text-[9px] font-mono font-bold text-indigo-400 text-center">
              ⟲ TRANSVERSE AXIS
            </div>
          </div>
        );
      case 'glide':
        return (
          <div className="relative w-full h-[180px] bg-slate-950 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-800">
            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />
            
            {/* Glide visual showing profile retraction movement */}
            <div className="relative flex items-center gap-4">
              <div className="flex flex-col items-center relative">
                {/* Profile spine node */}
                <div className="w-1.5 h-16 bg-slate-800 rounded-full absolute bottom-0 left-6 border-r border-sky-500" />
                
                {/* Profile Head */}
                <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-emerald-400 relative flex items-center animate-[bounce_3s_infinite] mr-6">
                  {/* Profile Nose facing left */}
                  <div className="absolute w-4 h-2 bg-rose-500 rounded-full -left-2.5 top-5" />
                  {/* Ear in profile view */}
                  <div className="absolute top-5 right-4 w-3.5 h-3.5 bg-emerald-500 rounded-full" />
                </div>
              </div>

              {/* Horizontal arrows indicating retraction glide */}
              <div className="absolute right-0 flex flex-col items-center text-emerald-400 animate-pulse">
                <span className="text-[9px] font-mono text-emerald-300 font-bold mb-1">AXIAL GLIDE</span>
                <div className="flex items-center gap-1">
                  <ArrowLeft size={16} className="text-emerald-400 h-4 w-4" />
                  <span className="h-0.5 w-10 bg-emerald-400" />
                </div>
              </div>
            </div>

            <div className="absolute bottom-2.5 right-3 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-900/60 text-[9px] font-mono font-bold text-emerald-400 text-center">
              ⇦ SAGITTAL PROFILE RETRACTION
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto" role="dialog" aria-modal="true">
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity duration-300 pointer-events-auto"
        onClick={onClose}
      />

      {/* Frame centering */}
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25 }}
          className="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all w-full max-w-2xl border border-blue-50/80 flex flex-col pointer-events-auto"
        >
          {/* Accent header glow */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600" />

          {/* Modal Header bar */}
          <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 px-2.5 rounded-full bg-blue-50 text-blue-600 font-mono text-[9px] font-extrabold tracking-widest uppercase">
                  Biomechanical Prep
                </span>
                <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded uppercase">
                  <Sparkles size={11} className="animate-pulse" /> Highly Recommended
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight mt-1">Pre-Session Cervical Warmup</h2>
              <p className="text-xs text-slate-500 mt-1">Spend 45 seconds warming up muscle fibers to prevent stiffness or kinetic stress feedback.</p>
            </div>
            
            <button 
              onClick={handleSkipAll}
              className="text-xs font-mono font-bold text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              [ SKIP ALL ]
            </button>
          </div>

          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* Visual Column */}
            <div className="flex flex-col gap-4">
              {renderVisualGuide()}
              
              {/* Interactive Timer Dashboard */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50 flex flex-col gap-3">
                <div className="flex justify-between items-center select-none">
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Timer size={13} className="text-blue-500" /> Active Stretch Timer
                  </span>
                  
                  {timeLeft === 0 ? (
                    <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                      <CheckCircle2 size={11} className="stroke-[3]" /> Stretched
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                      HOLD & BREATHE
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4">
                  {/* Giant clock digits */}
                  <div className="text-3xl font-black font-mono tracking-tight text-slate-800 flex items-baseline gap-1">
                    <span>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase font-sans">sec</span>
                  </div>

                  {/* Play, Pause, Reset Controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsActive(!isActive)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400 shadow-xs'
                      }`}
                      title={isActive ? "Pause Stretch Timer" : "Start Stretch Timer"}
                    >
                      {isActive ? <Pause size={14} className="stroke-[2.5]" /> : <Play size={14} className="stroke-[2.5]" />}
                    </button>
                    
                    <button
                      onClick={handleResetTimer}
                      className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                      title="Reset Step Timer"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>

                {/* Micro progression bar inside step bar */}
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                  <div 
                    className="bg-blue-600 h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${(timeLeft / currentStretch.duration) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Instruction Description Column */}
            <div className="flex flex-col h-full justify-between gap-5">
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-blue-600 text-white font-mono font-black text-xs flex items-center justify-center">
                    {currentStretch.id}
                  </span>
                  <h3 className="text-md font-bold text-slate-800 tracking-tight">{currentStretch.title}</h3>
                </div>
                
                <h4 className="text-xs font-semibold text-blue-600 font-mono tracking-wide leading-tight">
                  {currentStretch.subtitle}
                </h4>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-4.5 rounded-3xl border border-slate-100 font-medium">
                  {currentStretch.description}
                </p>
              </div>

              {/* Dynamic clinical insights card */}
              <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-200/50 flex items-start gap-2.5">
                <AlertCircle size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[9px] font-mono font-bold text-emerald-700 uppercase tracking-wider block">Clinical Insight</span>
                  <p className="text-[11px] text-emerald-800 leading-normal mt-0.5">
                    {currentStretch.clinicalBenefit}
                  </p>
                </div>
              </div>

            </div>

          </div>

          {/* Modal Footer Controls */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            
            {/* Step navigation indicator dots */}
            <div className="flex items-center gap-1.5">
              {STRETCHES.map((st, idx) => (
                <button
                  key={st.id}
                  onClick={() => setCurrentStep(idx)}
                  className={`h-2.5 rounded-full transition-all cursor-pointer ${
                    idx === currentStep 
                      ? 'w-7 bg-blue-600' 
                      : completedSteps[st.id] 
                      ? 'w-2.5 bg-emerald-500' 
                      : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`Go to stretch ${st.id}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-mono font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={13} /> Back
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm shadow-blue-200 cursor-pointer"
              >
                {currentStep === STRETCHES.length - 1 ? (
                  <>
                    Complete & Start Camera <Check size={13} strokeWidth={2.5} />
                  </>
                ) : (
                  <>
                    Next Stretch <ArrowRight size={13} />
                  </>
                )}
              </button>
            </div>

          </div>

        </motion.div>
      </div>
    </div>
  );
}
