import { ExerciseType, AppSettings } from "../types";
import { ArrowLeft, Play, Info, ShieldAlert, Timer, RotateCcw } from "lucide-react";

interface WorkoutInstructionsProps {
  exercise: ExerciseType;
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  onBack: () => void;
  onStart: () => void;
}

export default function WorkoutInstructions({
  exercise,
  settings,
  setSettings,
  onBack,
  onStart,
}: WorkoutInstructionsProps) {
  const isChinTuck = exercise === "chin_tuck";

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col p-6 max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-3 bg-[#141417] hover:bg-[#1E1E22] rounded-full border border-[#27272A] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </button>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">
          {isChinTuck ? "Chin Tuck Tutorial" : "Door Frame Stretch Tutorial"}
        </h2>
      </div>

      {/* Visual Stance Reference Card */}
      <div className="bg-[#141417] p-5 rounded-2xl border border-[#27272A] mb-8 relative overflow-hidden flex flex-col items-center">
        <div className="absolute top-3 right-3 bg-[#22C55E]/20 text-[#22C55E] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
          {isChinTuck ? "Side Profile" : "Front Face"}
        </div>
        
        {/* Simplified Vector representation representing correct pose */}
        <div className="h-44 w-full max-w-[200px] flex items-center justify-center relative bg-[#1E1E22] rounded-xl mb-4 p-4 border border-[#27272A]">
          {isChinTuck ? (
            <svg className="w-full h-full text-zinc-500" viewBox="0 0 100 100" fill="none" stroke="currentColor">
              {/* Back Spine line */}
              <path d="M50,85 L50,55" stroke="#3F3F46" strokeWidth="3" />
              {/* Neutral Spine line */}
              <path d="M50,55 Q50,45 47,38" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              {/* Head */}
              <circle cx="45" cy="25" r="12" stroke="currentColor" strokeWidth="4" />
              {/* Ear dot */}
              <circle cx="45" cy="25" r="2.5" fill="#22C55E" />
              {/* Shoulder joint */}
              <circle cx="50" cy="55" r="4.5" fill="#22C55E" />
              {/* CVA Line */}
              <line x1="45" y1="25" x2="50" y2="55" stroke="#22C55E" strokeWidth="2" strokeDasharray="3,3" />
              {/* Arrow tucking back */}
              <path d="M35,25 L41,25" stroke="#22C55E" strokeWidth="2" markerEnd="url(#arrow)" />
            </svg>
          ) : (
            <svg className="w-full h-full text-zinc-500" viewBox="0 0 100 100" fill="none" stroke="currentColor">
              {/* Door Frame outline */}
              <path d="M20,15 L20,85 M80,15 L80,85" stroke="#3F3F46" strokeWidth="4" />
              {/* Body */}
              <circle cx="50" cy="25" r="10" stroke="currentColor" strokeWidth="3" />
              <path d="M50,35 L50,70" stroke="currentColor" strokeWidth="3" />
              {/* Arms reaching door frame */}
              <path d="M50,42 L32,42 L32,25" stroke="#22C55E" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M50,42 L68,42 L68,25" stroke="#22C55E" strokeWidth="3.5" strokeLinecap="round" />
              {/* Elbow and Shoulder joint markers */}
              <circle cx="32" cy="42" r="3" fill="#22C55E" />
              <circle cx="68" cy="42" r="3" fill="#22C55E" />
            </svg>
          )}
        </div>
        
        <p className="text-xs text-zinc-400 font-medium text-center leading-relaxed">
          {isChinTuck 
            ? "Position yourself sideways to the camera. We track the elevation angle between your shoulder joint and ear canal (Craniovertebral Angle)."
            : "Face the camera while standing in a doorway. Place both forearms on the door frame with elbows bent around 90°."
          }
        </p>
      </div>

      {/* Structured steps checklists */}
      <div className="flex-grow space-y-4 mb-8">
        <h3 className="text-[10px] font-black tracking-[0.2em] uppercase text-zinc-500 mb-2">Workout Guidelines</h3>
        {isChinTuck ? (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] flex items-center justify-center font-black italic text-sm shrink-0">1</div>
              <p className="text-sm text-zinc-300 font-medium leading-relaxed">Stand tall, look straight ahead, and let the camera lock in your lateral ear and shoulder landmarks.</p>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] flex items-center justify-center font-black italic text-sm shrink-0">2</div>
              <p className="text-sm text-zinc-300 font-medium leading-relaxed">The coach will capture your relaxed <strong className="text-[#22C55E] font-black uppercase tracking-widest text-[10px]">baseline posture</strong> first for 3 seconds.</p>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] flex items-center justify-center font-black italic text-sm shrink-0">3</div>
              <p className="text-sm text-zinc-300 font-medium leading-relaxed">Draw your head straight back (not downwards) as if making a double chin, and hold for 5s.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] flex items-center justify-center font-black italic text-sm shrink-0">1</div>
              <p className="text-sm text-zinc-300 font-medium leading-relaxed">Place both elbows at shoulder height (approx. 90° bent flexion) resting against the door frame.</p>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] flex items-center justify-center font-black italic text-sm shrink-0">2</div>
              <p className="text-sm text-zinc-300 font-medium leading-relaxed">Lean your entire torso forward gently, keeping hands placed securely on the frame.</p>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] flex items-center justify-center font-black italic text-sm shrink-0">3</div>
              <p className="text-sm text-zinc-300 font-medium leading-relaxed">Keep the forward stretch engaged within target limits (5°-15°) for 15s to get feedback.</p>
            </div>
          </div>
        )}
      </div>

      {/* On-the-fly adjustable workout variables parameters */}
      <div className="bg-[#141417] border border-[#27272A] p-5 rounded-2xl mb-8">
        <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] mb-4 flex items-center gap-2">
          <Timer className="w-4 h-4 text-zinc-400" /> Session Targets
        </h4>
        {isChinTuck ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2">Tuck Hold (sec)</label>
              <input
                type="number"
                min="3"
                max="15"
                value={settings.chinTuckHoldSec}
                onChange={(e) => setSettings({ ...settings, chinTuckHoldSec: parseInt(e.target.value) || 5 })}
                className="w-full bg-[#1E1E22] border border-[#27272A] rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-[#22C55E]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2">Reps Count</label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.chinTuckReps}
                onChange={(e) => setSettings({ ...settings, chinTuckReps: parseInt(e.target.value) || 3 })}
                className="w-full bg-[#1E1E22] border border-[#27272A] rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-[#22C55E]"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2">Stretch Duration (sec)</label>
            <input
              type="number"
              min="5"
              max="30"
              value={settings.doorStretchHoldSec}
              onChange={(e) => setSettings({ ...settings, doorStretchHoldSec: parseInt(e.target.value) || 15 })}
              className="w-full bg-[#1E1E22] border border-[#27272A] rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-[#22C55E]"
            />
          </div>
        )}
      </div>

      {/* Medical Safety Disclaimer Alert card */}
      <div className="bg-[#141417] border border-[#27272A] p-4 rounded-xl mb-8 flex gap-3 items-start">
        <ShieldAlert className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-zinc-500 font-bold uppercase leading-relaxed tracking-wider">
          *Notice: Posture Coach is an educational movement helper. It does NOT replace professional physical therapy advice. Please stop immediately if you experience pain, numbness, neck stiffness, or dizziness.
        </p>
      </div>

      {/* Start Session Trigger */}
      <button
        onClick={onStart}
        className="w-full py-5 bg-[#22C55E] hover:bg-[#1E1E22] text-black hover:text-[#22C55E] hover:border hover:border-[#22C55E] rounded-2xl font-black italic uppercase tracking-tighter text-xl flex items-center justify-center gap-2 transition-all cursor-pointer mt-auto"
      >
        <Play className="w-6 h-6 fill-current" /> Enable Camera & Start
      </button>
    </div>
  );
}
