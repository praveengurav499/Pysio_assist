import { AppSettings } from "../types";
import { ArrowLeft, Save, RotateCcw, Volume2, Camera, Type, Settings, Sliders } from "lucide-react";

interface WorkoutSettingsProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  onBack: () => void;
}

export default function WorkoutSettings({
  settings,
  setSettings,
  onBack,
}: WorkoutSettingsProps) {
  const resetToDefaults = () => {
    setSettings({
      voiceEnabled: true,
      cameraFacing: "user",
      textSize: "normal",
      chinTuckReps: 3,
      chinTuckHoldSec: 5,
      doorStretchHoldSec: 15,
      doorStretchLeanMin: 5,
      doorStretchLeanMax: 15,
    });
  };

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
        <h2 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3">
          <Settings className="w-6 h-6 text-[#22C55E]" /> App Settings
        </h2>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6 flex-grow">
        {/* Section 1: Device Configuration */}
        <div className="bg-[#141417] p-5 rounded-2xl border border-[#27272A] space-y-5">
          <h3 className="text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase flex items-center gap-2">
            <Sliders className="w-4 h-4 text-zinc-400" /> Device & Audio
          </h3>

          {/* Voice toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-sm font-black uppercase text-white">Voice Coaching</span>
              <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">Enable spoken cues & corrections</span>
            </div>
            <button
              onClick={() => setSettings({ ...settings, voiceEnabled: !settings.voiceEnabled })}
              className={`w-14 h-7 rounded-full p-1 transition-all ${
                settings.voiceEnabled ? "bg-[#22C55E]" : "bg-[#1E1E22]"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-all ${
                  settings.voiceEnabled ? "translate-x-7" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <hr className="border-[#27272A]" />

          {/* Camera Selection */}
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-sm font-black uppercase text-white">Camera Source</span>
              <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">Toggle front or rear lens</span>
            </div>
            <select
              value={settings.cameraFacing}
              onChange={(e) => setSettings({ ...settings, cameraFacing: e.target.value as any })}
              className="bg-[#1E1E22] border border-[#27272A] px-4 py-2 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-[#22C55E] uppercase tracking-wider"
            >
              <option value="user">Front (User)</option>
              <option value="environment">Rear (Env)</option>
            </select>
          </div>

          <hr className="border-[#27272A]" />

          {/* Text Size Selection */}
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-sm font-black uppercase text-white">System Text Size</span>
              <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">Toggle display font scaling</span>
            </div>
            <select
              value={settings.textSize}
              onChange={(e) => setSettings({ ...settings, textSize: e.target.value as any })}
              className="bg-[#1E1E22] border border-[#27272A] px-4 py-2 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-[#22C55E] uppercase tracking-wider"
            >
              <option value="normal">Normal</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>

        {/* Section 2: Exercise Configurations */}
        <div className="bg-[#141417] p-5 rounded-2xl border border-[#27272A] space-y-5">
          <h3 className="text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase">
            Exercise Settings
          </h3>

          {/* Chin Tuck variables */}
          <div className="space-y-4">
            <span className="block text-xs font-black text-white italic uppercase tracking-wider">
              Chin Tuck
            </span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-zinc-500 font-black tracking-widest uppercase mb-2">Reps Count</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.chinTuckReps}
                  onChange={(e) => setSettings({ ...settings, chinTuckReps: parseInt(e.target.value) || 3 })}
                  className="w-full bg-[#1E1E22] border border-[#27272A] rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 font-black tracking-widest uppercase mb-2">Hold Seconds</label>
                <input
                  type="number"
                  min="3"
                  max="15"
                  value={settings.chinTuckHoldSec}
                  onChange={(e) => setSettings({ ...settings, chinTuckHoldSec: parseInt(e.target.value) || 5 })}
                  className="w-full bg-[#1E1E22] border border-[#27272A] rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>
            </div>
          </div>

          <hr className="border-[#27272A]" />

          {/* Door Frame variables */}
          <div className="space-y-4">
            <span className="block text-xs font-black text-[#22C55E] italic uppercase tracking-wider">
              Door Frame Stretch
            </span>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-[10px] text-zinc-500 font-black tracking-widest uppercase mb-2">Hold Sec</label>
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={settings.doorStretchHoldSec}
                  onChange={(e) => setSettings({ ...settings, doorStretchHoldSec: parseInt(e.target.value) || 15 })}
                  className="w-full bg-[#1E1E22] border border-[#27272A] rounded-xl px-3 py-3 text-sm font-bold text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 font-black tracking-widest uppercase mb-2">Lean Min (°)</label>
                <input
                  type="number"
                  min="3"
                  max="10"
                  value={settings.doorStretchLeanMin}
                  onChange={(e) => setSettings({ ...settings, doorStretchLeanMin: parseInt(e.target.value) || 5 })}
                  className="w-full bg-[#1E1E22] border border-[#27272A] rounded-xl px-3 py-3 text-sm font-bold text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 font-black tracking-widest uppercase mb-2">Lean Max (°)</label>
                <input
                  type="number"
                  min="10"
                  max="25"
                  value={settings.doorStretchLeanMax}
                  onChange={(e) => setSettings({ ...settings, doorStretchLeanMax: parseInt(e.target.value) || 15 })}
                  className="w-full bg-[#1E1E22] border border-[#27272A] rounded-xl px-3 py-3 text-sm font-bold text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Defaults trigger and Back */}
      <div className="space-y-3 mt-8">
        <button
          onClick={resetToDefaults}
          className="w-full py-4 bg-[#141417] hover:bg-[#1E1E22] text-zinc-400 hover:text-white rounded-2xl font-black italic uppercase tracking-tighter text-sm flex items-center justify-center gap-2 border border-[#27272A] cursor-pointer transition-all"
        >
          <RotateCcw className="w-4 h-4" /> Reset Defaults
        </button>
        <button
          onClick={onBack}
          className="w-full py-5 bg-[#22C55E] hover:bg-[#1E1E22] text-black hover:text-[#22C55E] hover:border hover:border-[#22C55E] rounded-2xl font-black italic uppercase tracking-tighter text-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Save className="w-6 h-6" /> Save & Return Home
        </button>
      </div>
    </div>
  );
}
