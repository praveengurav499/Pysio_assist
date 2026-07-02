import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, AlertCircle, Award, Check } from 'lucide-react';

interface TrainingAssistantProps {
  isAligned: boolean;
  onSessionComplete: (completedReps: number) => void;
}

export default function TrainingAssistant({ isAligned, onSessionComplete }: TrainingAssistantProps) {
  const [targetReps, setTargetReps] = useState<number>(5);
  const [holdDuration, setHoldDuration] = useState<number>(5); // 5 seconds hold
  const [currentRep, setCurrentRep] = useState<number>(0);
  const [phase, setPhase] = useState<'idle' | 'get-ready' | 'hold' | 'rest' | 'complete'>('idle');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(holdDuration);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play synthetic audio beep
  const playSynthesizedBeep = (type: 'start' | 'success' | 'complete' | 'alert') => {
    if (!isAudioEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'start') {
        // High crisp chime sliding upwards
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.15); // A5
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'success') {
        // Double success chime
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(987.77, now + 0.1); // B5
        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'complete') {
        // Triplet celebratory fanfare
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.4); // C6
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'alert') {
        // Buzz sound alert
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      console.warn("Web audio unavailable", e);
    }
  };

  // Handle countdown sequences
  useEffect(() => {
    if (phase === 'get-ready') {
      setSecondsRemaining(3);
      playSynthesizedBeep('start');
    } else if (phase === 'hold') {
      setSecondsRemaining(holdDuration);
      playSynthesizedBeep('start');
    } else if (phase === 'rest') {
      setSecondsRemaining(3); // 3 sec rest
    } else if (phase === 'complete') {
      playSynthesizedBeep('complete');
      onSessionComplete(currentRep);
    }
  }, [phase]);

  // Main tick timer loop
  useEffect(() => {
    if (phase === 'idle' || phase === 'complete') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Advance State Phase
          if (phase === 'get-ready') {
            setPhase('hold');
          } else if (phase === 'hold') {
            // Check if they maintained alignment at the end of the tuck
            if (isAligned) {
              const nextRepNum = currentRep + 1;
              setCurrentRep(nextRepNum);
              playSynthesizedBeep('success');
              if (nextRepNum >= targetReps) {
                setPhase('complete');
              } else {
                setPhase('rest');
              }
            } else {
              // Failed to hold alignment! Give warning chime and ask to retry
              playSynthesizedBeep('alert');
              setPhase('rest');
            }
          } else if (phase === 'rest') {
            setPhase('hold');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, isAligned, currentRep, targetReps, holdDuration]);

  // Handle alignment disruptions during hold
  useEffect(() => {
    // If user is doing the hold and drops out of alignment, flash warning or make sound
    if (phase === 'hold' && !isAligned) {
      // In a real device setup, this provides live corrective nudges
    }
  }, [isAligned, phase]);

  const handleStartSession = () => {
    setCurrentRep(0);
    setPhase('get-ready');
  };

  const handleResetSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('idle');
    setCurrentRep(0);
    setSecondsRemaining(holdDuration);
  };

  const exerciseProgressPercentage = 
    phase === 'hold' 
      ? ((holdDuration - secondsRemaining) / holdDuration) * 100 
      : phase === 'rest' || phase === 'get-ready'
      ? ((3 - secondsRemaining) / 3) * 100
      : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-inner relative overflow-hidden flex flex-col justify-between">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display font-medium text-sm text-slate-200 uppercase tracking-wide">
          Coach Training Session
        </h3>
        <button
          onClick={() => setIsAudioEnabled(!isAudioEnabled)}
          className={`p-1.5 rounded-lg border transition-colors ${
            isAudioEnabled 
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60' 
              : 'bg-slate-800 text-slate-500 border-slate-700/60'
          }`}
          title={isAudioEnabled ? "Mute Coach Sounds" : "Unmute Coach Sounds"}
        >
          {isAudioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>
      </div>

      {phase === 'idle' && (
        <div className="flex-1 flex flex-col justify-center space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed text-center">
            Set your posture goals and begin an interactive paced Chin Tuck set. Ensure alignment is green to scores reps!
          </p>

          <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800/80">
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Target Reps</label>
              <select
                value={targetReps}
                onChange={(e) => setTargetReps(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg text-xs p-1.5 focus:border-indigo-500 outline-none"
              >
                <option value={3}>3 Reps</option>
                <option value={5}>5 Reps</option>
                <option value={10}>10 Reps</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Hold Duration</label>
              <select
                value={holdDuration}
                onChange={(e) => {
                  setHoldDuration(Number(e.target.value));
                  setSecondsRemaining(Number(e.target.value));
                }}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg text-xs p-1.5 focus:border-indigo-500 outline-none"
              >
                <option value={3}>3 sec</option>
                <option value={5}>5 sec</option>
                <option value={7}>7 sec</option>
                <option value={10}>10 sec</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleStartSession}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold rounded-xl text-xs tracking-wider transition-all shadow-md shadow-emerald-950/40"
          >
            START TRAINING SET
          </button>
        </div>
      )}

      {phase !== 'idle' && phase !== 'complete' && (
        <div className="flex-1 flex flex-col justify-between space-y-4">
          {/* Circular Countdown Progress */}
          <div className="flex items-center justify-center relative py-2">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                className="stroke-slate-800 fill-none"
                strokeWidth="6"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                className={`fill-none transition-all duration-1000 ${
                  phase === 'hold' 
                    ? isAligned ? 'stroke-emerald-500' : 'stroke-amber-500'
                    : 'stroke-indigo-400'
                }`}
                strokeWidth="6"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * exerciseProgressPercentage) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-display font-bold text-slate-100">
                {secondsRemaining}s
              </span>
              <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">
                {phase}
              </span>
            </div>
          </div>

          {/* Core instruction text */}
          <div className="text-center bg-slate-950/80 border border-slate-850 p-2.5 rounded-xl">
            {phase === 'get-ready' && (
              <p className="text-xs font-semibold text-indigo-400 animate-pulse">Get ready to tuck your chin!</p>
            )}
            {phase === 'hold' && (
              <div>
                <p className={`text-xs font-semibold ${isAligned ? 'text-emerald-400' : 'text-amber-400 animate-bounce'}`}>
                  {isAligned ? 'GOOD ALIGNMENT! HOLD IT!' : 'ADJUST SHADOW: TUCK MORE'}
                </p>
                {!isAligned && (
                  <span className="text-[9px] font-mono text-amber-500 flex items-center justify-center gap-1 mt-0.5">
                    <AlertCircle size={10} /> Align metrics to earn rep credit
                  </span>
                )}
              </div>
            )}
            {phase === 'rest' && (
              <p className="text-xs font-semibold text-slate-400">Relax your neck... Deep breath</p>
            )}
          </div>

          {/* Rep Counter Banner */}
          <div className="flex justify-between items-center text-xs font-mono px-1">
            <span className="text-slate-500">REPS CREDITED:</span>
            <span className="text-emerald-400 font-bold">{currentRep} / {targetReps}</span>
          </div>

          {/* Action buttons */}
          <button
            onClick={handleResetSession}
            className="w-full py-1.5 border border-slate-700 hover:bg-slate-800 text-slate-400 rounded-xl text-[10px] font-mono tracking-wider transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={12} /> CANCEL SESSION
          </button>
        </div>
      )}

      {phase === 'complete' && (
        <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4">
          <div className="w-12 h-12 bg-emerald-950/60 border border-emerald-500 rounded-full flex items-center justify-center text-emerald-400 animate-bounce">
            <Award size={24} />
          </div>
          <div>
            <h4 className="text-sm font-display font-medium text-emerald-400 uppercase">Set Perfected!</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
              You successfully held standard spinal alignment for {currentRep} tucks!
            </p>
          </div>
          <button
            onClick={handleResetSession}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-755 border border-slate-700 text-slate-200 font-mono text-[10px] rounded-lg tracking-wider transition-colors"
          >
            FINISH & RESET
          </button>
        </div>
      )}
    </div>
  );
}
