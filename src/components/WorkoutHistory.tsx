import { useState } from "react";
import { HistoryItem, ExerciseType } from "../types";
import { ArrowLeft, Download, Calendar, Activity, ChevronRight, ChevronDown, Trash2 } from "lucide-react";

interface WorkoutHistoryProps {
  history: HistoryItem[];
  onBack: () => void;
  onClearItem?: (id: string) => void;
}

export default function WorkoutHistory({
  history,
  onBack,
  onClearItem,
}: WorkoutHistoryProps) {
  const [filter, setFilter] = useState<"all" | ExerciseType>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter history items
  const filteredHistory = history.filter(
    (item) => filter === "all" || item.exercise === filter
  );

  // Toggle log expansion
  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Export session histories to a downloadable CSV
  const handleExportCSV = () => {
    if (filteredHistory.length === 0) return;

    const headers = [
      "ID",
      "Date",
      "Exercise",
      "Baseline CVA (°)",
      "Best CVA (°)",
      "Improvement (°)",
      "Left Elbow Angle (°)",
      "Right Elbow Angle (°)",
      "Symmetry Diff (°)",
      "Max Lean Angle (°)",
      "Hold Duration (s)",
      "AI Coach Feedback",
    ];

    const rows = filteredHistory.map((item) => {
      const isCT = item.exercise === "chin_tuck";
      return [
        item.id,
        new Date(item.date).toLocaleString(),
        item.exercise === "chin_tuck" ? "Chin Tuck" : "Door Frame Stretch",
        isCT ? item.metrics.baseline_cva || "" : "",
        isCT ? item.metrics.best_tucked_cva || "" : "",
        isCT ? item.metrics.improvement || "" : "",
        !isCT ? item.metrics.left_elbow_angle || "" : "",
        !isCT ? item.metrics.right_elbow_angle || "" : "",
        !isCT ? item.metrics.symmetry_diff || "" : "",
        !isCT ? item.metrics.max_lean_angle || "" : "",
        isCT ? item.metrics.avg_hold_seconds || "" : item.metrics.hold_seconds || "",
        `"${item.feedback.replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `posture_coach_history_${filter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate beautiful interactive pure SVG trend chart coordinates
  const renderTrendChart = () => {
    const chartData = [...filteredHistory]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10); // Display last 10 sessions

    if (chartData.length < 2) {
      return (
        <div className="h-40 bg-neutral-950 rounded-xl border border-neutral-800 flex flex-col items-center justify-center p-4 text-center">
          <Activity className="w-8 h-8 text-neutral-600 mb-2" />
          <p className="text-xs text-neutral-400">
            Log at least 2 sessions to see postural trends!
          </p>
        </div>
      );
    }

    // Determine values to plot
    // Chin tuck => improvement (Delta CVA)
    // Door Frame => Max Lean Angle
    const points: number[] = chartData.map((item) => {
      if (item.exercise === "chin_tuck") {
        return item.metrics.improvement || 0;
      } else {
        return item.metrics.max_lean_angle || 0;
      }
    });

    const maxVal = Math.max(...points, 10); // baseline ceiling at 10
    const minVal = 0;
    const valueRange = maxVal - minVal;

    // SVG parameters
    const width = 400;
    const height = 150;
    const padding = 30;

    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Map metrics coordinates to SVG layout points
    const svgPoints = chartData.map((item, idx) => {
      const x = padding + (idx / (chartData.length - 1)) * chartWidth;
      const val = item.exercise === "chin_tuck" ? item.metrics.improvement || 0 : item.metrics.max_lean_angle || 0;
      const y = height - padding - ((val - minVal) / valueRange) * chartHeight;
      return { x, y, val, date: new Date(item.date).toLocaleDateString() };
    });

    // Create polyline path
    const pathString = svgPoints.map((p) => `${p.x},${p.y}`).join(" L ");

    return (
      <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
            {filter === "chin_tuck" ? "Postural Tuck Delta Trend (°)" : filter === "door_frame_stretch" ? "Max Lean Angle Depth Trend (°)" : "Posture Progress Trend"}
          </span>
          <span className="text-[10px] text-neutral-500">Last 10 sessions</span>
        </div>
        
        <div className="relative w-full overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            {/* Horizontal guidelines */}
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <line x1={padding} y1={padding + chartHeight / 2} x2={width - padding} y2={padding + chartHeight / 2} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

            {/* Y axis text */}
            <text x={padding - 8} y={padding + 4} fill="#6b7280" fontSize="8" textAnchor="end">{maxVal}°</text>
            <text x={padding - 8} y={padding + chartHeight / 2 + 3} fill="#6b7280" fontSize="8" textAnchor="end">{Math.round(maxVal / 2)}°</text>
            <text x={padding - 8} y={height - padding + 3} fill="#6b7280" fontSize="8" textAnchor="end">0°</text>

            {/* Main Trend Line Path */}
            <path
              d={`M ${pathString}`}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_2px_8px_rgba(59,130,246,0.3)]"
            />

            {/* Data points circles */}
            {svgPoints.map((p, idx) => (
              <g key={idx} className="group">
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="5"
                  fill="#1d4ed8"
                  stroke="#60a5fa"
                  strokeWidth="2"
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="12"
                  fill="transparent"
                  className="cursor-pointer"
                />
                {/* Micro values indicator labels */}
                <text
                  x={p.x}
                  y={p.y - 10}
                  fill="#ffffff"
                  fontSize="8"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="opacity-80"
                >
                  {p.val}°
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col p-6 max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-3 bg-[#141417] hover:bg-[#1E1E22] rounded-full border border-[#27272A] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Progress History</h2>
        </div>
        {filteredHistory.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="p-3 bg-[#141417] hover:bg-[#1E1E22] rounded-xl border border-[#27272A] text-[#22C55E] flex items-center gap-2 text-xs font-black uppercase tracking-wider cursor-pointer"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-8">
        {["all", "chin_tuck", "door_frame_stretch"].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type as any)}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border border-[#27272A] ${
              filter === type
                ? "bg-[#22C55E] text-black border-[#22C55E]"
                : "bg-[#141417] text-zinc-400 hover:text-white hover:bg-[#1E1E22]"
            }`}
          >
            {type === "all" ? "All Exercises" : type === "chin_tuck" ? "Chin Tuck" : "Door Stretch"}
          </button>
        ))}
      </div>

      {/* Trend chart visual */}
      <div className="mb-8">{renderTrendChart()}</div>

      {/* Logs list section */}
      <div className="flex-grow space-y-4 overflow-y-auto">
        <h3 className="text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase mb-4">
          Workout Sessions Log ({filteredHistory.length})
        </h3>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 font-bold uppercase text-sm">
            No logged sessions found. Complete a workout!
          </div>
        ) : (
          <div className="space-y-4">
            {[...filteredHistory]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((item) => {
                const isExpanded = expandedId === item.id;
                const isCT = item.exercise === "chin_tuck";
                const itemDate = new Date(item.date);

                return (
                  <div
                    key={item.id}
                    className="bg-[#141417] rounded-2xl border border-[#27272A] overflow-hidden"
                  >
                    {/* Log Row Header */}
                    <div
                      onClick={() => toggleExpand(item.id)}
                      className="p-5 flex items-center justify-between cursor-pointer hover:bg-[#1E1E22] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            isCT ? "bg-[#22C55E]" : "bg-white"
                          }`}
                        />
                        <div>
                          <span className="block text-base font-black italic uppercase text-white">
                            {isCT ? "Chin Tuck Test" : "Door Frame Stretch"}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-bold tracking-widest flex items-center gap-1 uppercase mt-1">
                            <Calendar className="w-3 h-3" />
                            {itemDate.toLocaleDateString()} at {itemDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-black font-mono text-[#22C55E] italic">
                          {isCT ? `+${item.metrics.improvement}°` : `${item.metrics.max_lean_angle}° lean`}
                        </span>
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-zinc-500" /> : <ChevronRight className="w-5 h-5 text-zinc-500" />}
                      </div>
                    </div>

                    {/* Log Row Details */}
                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-[#27272A] bg-[#1E1E22]/50 space-y-4 pt-4">
                        {/* Numerical Metrics Details Grid */}
                        <div className="grid grid-cols-2 gap-3 text-center">
                          {isCT ? (
                            <>
                              <div className="bg-[#0A0A0B] p-3 rounded-xl border border-[#27272A]">
                                <span className="block text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Baseline CVA</span>
                                <span className="font-mono text-lg font-black italic text-white">{item.metrics.baseline_cva}°</span>
                              </div>
                              <div className="bg-[#0A0A0B] p-3 rounded-xl border border-[#27272A]">
                                <span className="block text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Best Tucked</span>
                                <span className="font-mono text-lg font-black italic text-[#22C55E]">{item.metrics.best_tucked_cva}°</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="bg-[#0A0A0B] p-3 rounded-xl border border-[#27272A]">
                                <span className="block text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Left / Right Elbow</span>
                                <span className="font-mono text-lg font-black italic text-white">{item.metrics.left_elbow_angle}° / {item.metrics.right_elbow_angle}°</span>
                              </div>
                              <div className="bg-[#0A0A0B] p-3 rounded-xl border border-[#27272A]">
                                <span className="block text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Asymmetry Diff</span>
                                <span className="font-mono text-lg font-black italic text-yellow-500">{item.metrics.symmetry_diff}° diff</span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* AI Coach Text */}
                        <div className="bg-[#0A0A0B] p-4 rounded-xl border border-[#27272A] text-zinc-300 font-medium">
                          <span className="block text-[10px] text-[#22C55E] font-black uppercase tracking-widest mb-2">AI Coach Verdict</span>
                          "{item.feedback}"
                        </div>

                        {/* Optional Single deletion trigger */}
                        {onClearItem && (
                          <div className="flex justify-end pt-2">
                            <button
                              onClick={() => onClearItem(item.id)}
                              className="text-red-500 hover:text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 px-3 py-2 hover:bg-red-500/10 rounded-xl cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-4 h-4" /> Delete Entry
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
