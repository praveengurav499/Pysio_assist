import { useState, useEffect } from "react";
import { ExerciseType } from "../types";
import { Sparkles, RefreshCw, CheckCircle, RotateCcw, Award, ShieldAlert } from "lucide-react";

interface WorkoutResultsProps {
  exercise: ExerciseType;
  metrics: any;
  onDone: (feedbackText: string) => void;
  onRetry: () => void;
}

export default function WorkoutResults({
  exercise,
  metrics,
  onDone,
  onRetry,
}: WorkoutResultsProps) {
  const [aiFeedback, setAiFeedback] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const isChinTuck = exercise === "chin_tuck";

  // Tips to rotate while loading Gemini API
  const [tipIndex, setTipIndex] = useState(0);
  const loadingTips = [
    "Analyzing your alignment symmetry...",
    "Consulting physiological reference thresholds...",
    "Formulating biomechanical corrections...",
    "Generating actionable postural advice...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % loadingTips.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch coach feedback on mount
  useEffect(() => {
    let active = true;

    async function fetchFeedback() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/coach", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(metrics),
        });

        if (!response.ok) {
          throw new Error("Failed to receive feedback from server");
        }

        const data = await response.json();
        
        if (active) {
          setAiFeedback(data.feedback || "Unable to formulate AI coaching. Great job practicing!");
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Feedback fetch failed:", err);
        if (active) {
          setError("We couldn't connect to our AI coach right now, but your numerical performance is recorded below!");
          setLoading(false);
        }
      }
    }

    fetchFeedback();

    return () => {
      active = false;
    };
  }, [metrics]);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col p-6 max-w-lg mx-auto w-full">
      {/* Header card */}
      <div className="text-center my-8">
        <div className="inline-flex p-4 bg-[#22C55E] rounded-full text-black mb-4 animate-bounce">
          <Award className="w-8 h-8" />
        </div>
        <h2 className="text-4xl font-black italic uppercase tracking-tighter">Session Complete!</h2>
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-2">
          {isChinTuck ? "Chin Tuck Posture Test" : "Door Frame Stretch Posture Test"}
        </p>
      </div>

      {/* Metrics Performance Cards */}
      <div className="space-y-4 mb-8">
        <h3 className="text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase mb-4">Performance Metrics</h3>
        
        {isChinTuck ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#141417] p-5 rounded-2xl border border-[#27272A]">
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-2">Baseline CVA</span>
              <span className="text-3xl font-mono font-black italic text-white">
                {metrics.baseline_cva}°
              </span>
            </div>
            <div className="bg-[#141417] p-5 rounded-2xl border border-[#27272A]">
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-2">Best Tucked CVA</span>
              <span className="text-3xl font-mono font-black italic text-[#22C55E]">
                {metrics.best_tucked_cva}°
              </span>
            </div>
            <div className="bg-[#141417] p-5 rounded-2xl border border-[#27272A] col-span-2 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block">Postural Improvement</span>
                <span className="text-xs font-bold text-zinc-400 italic mt-1 block">Delta Tuck Angle</span>
              </div>
              <span className="text-4xl font-mono font-black italic text-[#22C55E]">
                +{metrics.improvement}°
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#141417] p-5 rounded-2xl border border-[#27272A]">
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-2">Left Elbow Flex</span>
              <span className="text-3xl font-mono font-black italic text-white">
                {metrics.left_elbow_angle}°
              </span>
            </div>
            <div className="bg-[#141417] p-5 rounded-2xl border border-[#27272A]">
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-2">Right Elbow Flex</span>
              <span className="text-3xl font-mono font-black italic text-white">
                {metrics.right_elbow_angle}°
              </span>
            </div>
            <div className="bg-[#141417] p-5 rounded-2xl border border-[#27272A] col-span-2 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block">Arm Symmetry Deviation</span>
                <span className="text-xs font-bold text-zinc-400 italic mt-1 block">
                  {metrics.symmetry_diff < 10 ? "Symmetrical" : "Moderate Asymmetry"}
                </span>
              </div>
              <span className={`text-4xl font-mono font-black italic ${metrics.symmetry_diff < 10 ? "text-[#22C55E]" : "text-yellow-500"}`}>
                {metrics.symmetry_diff}° diff
              </span>
            </div>
            <div className="bg-[#141417] p-5 rounded-2xl border border-[#27272A] col-span-2 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block">Maximum Lean Depth</span>
                <span className="text-xs font-bold text-zinc-400 italic mt-1 block">Torso lean angle</span>
              </div>
              <span className="text-4xl font-mono font-black italic text-[#22C55E]">
                {metrics.max_lean_angle}°
              </span>
            </div>
          </div>
        )}
      </div>

      {/* AI Coaching Insight Card */}
      <div className="bg-[#1E1E22] border border-[#27272A] p-6 rounded-2xl mb-8 flex-grow flex flex-col justify-center relative min-h-[160px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <RefreshCw className="w-8 h-8 text-[#22C55E] animate-spin mb-4" />
            <span className="text-[10px] text-[#22C55E] font-black uppercase tracking-[0.2em] mb-2">
              AI Coach Thinking
            </span>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest transition-all duration-300">
              {loadingTips[tipIndex]}
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <AlertFeedback text={error} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#22C55E]">
              <Sparkles className="w-5 h-5 fill-current" />
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">AI Coach Report Card</h4>
            </div>
            <p className="text-lg font-medium text-white leading-relaxed italic">
              "{aiFeedback}"
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="space-y-3 mt-auto">
        <button
          onClick={() => onDone(aiFeedback || "Completed posture-coach test.")}
          disabled={loading}
          className="w-full py-5 bg-[#22C55E] hover:bg-[#1E1E22] text-black hover:text-[#22C55E] hover:border hover:border-[#22C55E] disabled:opacity-50 disabled:pointer-events-none rounded-2xl font-black italic uppercase tracking-tighter text-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <CheckCircle className="w-6 h-6" /> Save & Done
        </button>
        <button
          onClick={onRetry}
          className="w-full py-4 bg-[#141417] hover:bg-[#1E1E22] text-zinc-400 hover:text-white rounded-2xl font-black italic uppercase tracking-tighter text-lg flex items-center justify-center gap-2 border border-[#27272A] cursor-pointer transition-all"
        >
          <RotateCcw className="w-5 h-5" /> Try Again
        </button>
      </div>
    </div>
  );
}

function AlertFeedback({ text }: { text: string }) {
  return (
    <div className="p-4 bg-[#141417] rounded-xl border border-[#27272A] flex items-start gap-3 text-left">
      <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 leading-relaxed">{text}</span>
    </div>
  );
}
