import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Award, 
  Calendar, 
  Target, 
  Flame, 
  RotateCcw, 
  CheckCircle2, 
  Activity, 
  AlertTriangle, 
  Clock, 
  Sliders, 
  Save, 
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SessionLog, PostureGoals } from '../types';

// Helper to format duration
const formatDuration = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
};

// Default goals
const DEFAULT_GOALS: PostureGoals = {
  dailyRepsGoal: 10,
  weeklySessionsGoal: 5,
  targetAlignmentGoal: 85
};

// Prepopulate dummy dataset if first time loading to represent actual tracking
const generateMockHistory = (): SessionLog[] => {
  const h: SessionLog[] = [];
  const now = new Date();
  
  const mockParams = [
    { offset: 6, reps: 8, target: 10, align: 73, stab: 84, violations: 3 },
    { offset: 5, reps: 10, target: 10, align: 78, stab: 86, violations: 1 },
    { offset: 4, reps: 7, target: 10, align: 82, stab: 89, violations: 2 },
    { offset: 3, reps: 10, target: 10, align: 85, stab: 91, violations: 0 },
    { offset: 2, reps: 15, target: 15, align: 88, stab: 93, violations: 0 },
    { offset: 1, reps: 12, target: 15, align: 90, stab: 92, violations: 1 },
  ];

  mockParams.forEach(p => {
    const d = new Date(now);
    d.setDate(now.getDate() - p.offset);
    const dateStr = d.toISOString().split('T')[0];
    h.push({
      id: `mock-${p.offset}`,
      timestamp: d.toISOString(),
      dateString: dateStr,
      duration: p.reps * 18 + Math.floor(Math.random() * 20),
      repCount: p.reps,
      targetReps: p.target,
      avgAlignment: p.align,
      avgStability: p.stab,
      bendingViolations: p.violations
    });
  });

  return h;
};

export default function PostureProgress() {
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [goals, setGoals] = useState<PostureGoals>(DEFAULT_GOALS);
  const [activeMetric, setActiveMetric] = useState<'alignment' | 'reps' | 'stability'>('alignment');
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Form Fields for Goals
  const [formReps, setFormReps] = useState<number>(10);
  const [formWeekly, setFormWeekly] = useState<number>(5);
  const [formAlign, setFormAlign] = useState<number>(85);
  const [showGoalSuccess, setShowGoalSuccess] = useState<boolean>(false);

  // Read logs & goals on mount
  useEffect(() => {
    const storedLogs = localStorage.getItem('chin_tuck_session_logs');
    if (storedLogs) {
      try {
        setSessionLogs(JSON.parse(storedLogs));
      } catch (e) {
        console.error("Error reading logs from storage:", e);
      }
    } else {
      const mockData = generateMockHistory();
      localStorage.setItem('chin_tuck_session_logs', JSON.stringify(mockData));
      setSessionLogs(mockData);
    }

    const storedGoals = localStorage.getItem('chin_tuck_posture_goals');
    if (storedGoals) {
      try {
        const parsed = JSON.parse(storedGoals);
        setGoals(parsed);
        setFormReps(parsed.dailyRepsGoal);
        setFormWeekly(parsed.weeklySessionsGoal);
        setFormAlign(parsed.targetAlignmentGoal);
      } catch (e) {
        console.error("Error reading goals from storage:", e);
      }
    } else {
      localStorage.setItem('chin_tuck_posture_goals', JSON.stringify(DEFAULT_GOALS));
    }
  }, []);

  // Sync back state
  const handleSaveGoals = (e: React.FormEvent) => {
    e.preventDefault();
    const nextGoals: PostureGoals = {
      dailyRepsGoal: formReps,
      weeklySessionsGoal: formWeekly,
      targetAlignmentGoal: formAlign
    };
    setGoals(nextGoals);
    localStorage.setItem('chin_tuck_posture_goals', JSON.stringify(nextGoals));
    setIsEditingGoal(false);
    setShowGoalSuccess(true);
    setTimeout(() => {
      setShowGoalSuccess(false);
    }, 4000);
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to revert to baseline training metrics? This will recreate the demonstration logs.")) {
      const mockData = generateMockHistory();
      localStorage.setItem('chin_tuck_session_logs', JSON.stringify(mockData));
      setSessionLogs(mockData);
    }
  };

  // Compile calculations
  const totalRepsFinished = sessionLogs.reduce((acc, curr) => acc + curr.repCount, 0);
  const averageAlignment = sessionLogs.length > 0 
    ? Math.round(sessionLogs.reduce((acc, curr) => acc + curr.avgAlignment, 0) / sessionLogs.length) 
    : 0;
  
  // Weekly Session Attendance
  const getWeeklySessionsCount = () => {
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    return sessionLogs.filter(log => new Date(log.timestamp) >= oneWeekAgo).length;
  };
  const weeklySessionsDone = getWeeklySessionsCount();

  // Custom Chart Coordinates Calculation
  const sortedLogsForChart = [...sessionLogs]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-7); // Last 7 records

  const svgWidth = 650;
  const svgHeight = 260;
  const paddingLeft = 45;
  const paddingRight = 25;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartInnerWidth = svgWidth - paddingLeft - paddingRight;
  const chartInnerHeight = svgHeight - paddingTop - paddingBottom;

  // Retrieve current Y value & range per metric selection
  const getYValue = (log: SessionLog): number => {
    if (activeMetric === 'alignment') return log.avgAlignment;
    if (activeMetric === 'reps') return log.repCount;
    return log.avgStability;
  };

  const getMetricRangeMax = (): number => {
    if (activeMetric === 'alignment') return 100;
    if (activeMetric === 'reps') {
      const maxRep = Math.max(...sortedLogsForChart.map(l => l.repCount), 5);
      return Math.ceil(maxRep / 5) * 5;
    }
    return 100; // Stability percentage is out of 100
  };

  const rangeMax = getMetricRangeMax();

  // Map log list to screen coordinates
  const points = sortedLogsForChart.map((log, i) => {
    const x = paddingLeft + (i / Math.max(1, sortedLogsForChart.length - 1)) * chartInnerWidth;
    const yVal = getYValue(log);
    const y = paddingTop + chartInnerHeight - (yVal / rangeMax) * chartInnerHeight;
    return { x, y, log, val: yVal };
  });

  // Calculate Bezier path data
  const generateBezierPathStr = () => {
    if (points.length === 0) return '';
    let pathStr = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (2 * (p1.x - p0.x)) / 3;
      const cpY2 = p1.y;
      pathStr += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return pathStr;
  };

  const linePath = generateBezierPathStr();
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartInnerHeight} L ${points[0].x} ${paddingTop + chartInnerHeight} Z`
    : '';

  // Clinical messages on stats
  const getCinicalAssessmentMsg = () => {
    if (averageAlignment >= goals.targetAlignmentGoal) {
      return {
        title: "Retraction Profile: Outstanding",
        text: "Your cervical alignment average is surpassing your clinical baseline target! This stimulates ideal deep cervical flexor activation, counterbalancing muscular micro-strain.",
        style: "text-emerald-800 bg-emerald-50 border-emerald-100"
      };
    } else if (averageAlignment >= 75) {
      return {
        title: "Retraction Profile: Steady Progress",
        text: "You are maintaining high control. However, your sagittal glide averages slightly below target. Increase baseline focus and perform the pre-session chin tilts daily to elevate flexibility.",
        style: "text-blue-800 bg-blue-50 border-blue-100"
      };
    } else {
      return {
        title: "Retraction Profile: Setup Needed",
        text: "Neck retraction is beneath active corrective depth. Make sure you're pulling your head straight backward horizontally, keeping eyes parallel with the ground rather than bowing.",
        style: "text-amber-805 bg-amber-50 border-amber-100"
      };
    }
  };

  const clinicalMsg = getCinicalAssessmentMsg();

  return (
    <div className="bg-white border border-blue-100 rounded-3xl p-6 shadow-sm flex flex-col gap-6 select-none">
      
      {/* HEADER ROW */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="text-blue-600 w-5 h-5" />
            <h2 className="text-lg font-extrabold font-display text-slate-800">
              Clinical Progress & Posture Goals
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Analyze historical trajectories and set therapeutic biomechanical targets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditingGoal(!isEditingGoal)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
              isEditingGoal 
                ? 'bg-slate-100 text-slate-800 border-slate-200' 
                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
            }`}
          >
            <Sliders size={13} />
            {isEditingGoal ? "CANCEL" : "SET GOALS"}
          </button>
          
          <button
            onClick={handleClearHistory}
            className="px-3 py-1.5 border border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer"
            title="Re-seed demo logs"
          >
            <RotateCcw size={13} /> Demo Reset
          </button>
        </div>
      </div>

      {/* ACTION BANNER FOR GOAL UPDATE SUCCESS */}
      <AnimatePresence>
        {showGoalSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 bg-emerald-500 text-slate-950 font-bold text-xs rounded-2xl flex items-center gap-2 shadow-sm border border-emerald-400"
          >
            <CheckCircle2 size={16} />
            <span>Success: Personal clinical posture goals updated securely.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GOAL CONFIGURATION PANEL FORM */}
      <AnimatePresence>
        {isEditingGoal && (
          <motion.form 
            onSubmit={handleSaveGoals}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-slate-50 p-5 rounded-2xl border border-blue-100 flex flex-col gap-4"
          >
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-500 uppercase flex items-center gap-1">
              <Target size={14} className="text-blue-600" /> Modify Objective Metrics
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Goal 1: Reps */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                <label className="block text-[10px] font-mono tracking-wide font-extrabold text-slate-400 uppercase">
                  Daily Repetitions Goal
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={formReps}
                    onChange={(e) => setFormReps(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-100 px-2.5 py-1 text-sm font-bold rounded-lg text-slate-800 outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0">REPS</span>
                </div>
                <span className="text-[9px] text-slate-400 leading-tight">Minimum therapeutic active triggers.</span>
              </div>

              {/* Goal 2: Weekly Attendance */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                <label className="block text-[10px] font-mono tracking-wide font-extrabold text-slate-400 uppercase">
                  Weekly Training Chapters
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={formWeekly}
                    onChange={(e) => setFormWeekly(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-100 px-2.5 py-1 text-sm font-bold rounded-lg text-slate-800 outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0">DAYS</span>
                </div>
                <span className="text-[9px] text-slate-400 leading-tight">Recommended days per week.</span>
              </div>

              {/* Goal 3: Minimal alignment accuracy */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                <label className="block text-[10px] font-mono tracking-wide font-extrabold text-slate-400 uppercase">
                  Target Alignment Score
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="50"
                    max="98"
                    value={formAlign}
                    onChange={(e) => setFormAlign(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-100 px-2.5 py-1 text-sm font-bold rounded-lg text-slate-800 outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0">%</span>
                </div>
                <span className="text-[9px] text-slate-400 leading-tight">Minimum accurate sagittal retraction.</span>
              </div>

            </div>

            <div className="flex justify-end mt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm shadow-blue-200 cursor-pointer"
              >
                <Save size={13} /> Lock & Save Requirements
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* CORE STATS SUMMARY BENTO GRID */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Box 1: Total Completed Sessions */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              TOTAL SESSIONS
            </span>
            <Calendar className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-display text-slate-800">{sessionLogs.length}</span>
            <span className="text-slate-450 font-semibold text-xs ml-1">sessions</span>
          </div>
          <span className="text-[9px] text-slate-400 font-medium block mt-1">
            Total cervical rehabilitation routines
          </span>
        </div>

        {/* Box 2: Weekly Goal Progress */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              WEEKLY COMPLIANCE
            </span>
            <CheckCircle2 className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-display text-slate-800">{weeklySessionsDone} <span className="text-sm font-normal text-slate-400">/ {goals.weeklySessionsGoal}</span></span>
          </div>
          <div className="w-full bg-slate-200 h-1 rounded-full mt-1.5 overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, Math.round((weeklySessionsDone / goals.weeklySessionsGoal) * 100))}%` }}
            />
          </div>
          <span className="text-[9px] text-slate-450 font-medium mt-1 block">
            {weeklySessionsDone >= goals.weeklySessionsGoal ? "✓ Target chapters completed!" : "Keep up with your therapist's target"}
          </span>
        </div>

        {/* Box 3: Total Completed Reps */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              TOTAL DEEP RETRACTIONS
            </span>
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-display text-slate-800">{totalRepsFinished}</span>
            <span className="text-slate-400 font-semibold text-xs ml-1">reps</span>
          </div>
          <span className="text-[9px] text-slate-400 font-medium block mt-1">
            Cumulative longus colli contractions
          </span>
        </div>

        {/* Box 4: Average Alignment Accuracy */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              AVG ALIGNMENT INDEX
            </span>
            <Award className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-display text-emerald-600">{averageAlignment}%</span>
            <span className="text-[11px] font-mono text-slate-450 ml-1.5">
              (Target: {goals.targetAlignmentGoal}%)
            </span>
          </div>
          <span className="text-[9px] text-slate-400 font-medium block mt-1.5">
            Average accuracy across cumulative sessions
          </span>
        </div>

      </section>

      {/* CLINCAL ANALYSIS HIGHLIGHT NOTE */}
      <div className={`p-4 rounded-2xl border ${clinicalMsg.style} flex items-start gap-3.5`}>
        <Info className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold font-display">{clinicalMsg.title}</h4>
          <p className="text-[11px] leading-relaxed mt-0.5">{clinicalMsg.text}</p>
        </div>
      </div>

      {/* INTERACTIVE TRACKING CHART CARD */}
      <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200">
        
        {/* Chart Header Options */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-4 mb-4">
          <span className="text-xs font-bold font-mono tracking-wider text-slate-600 uppercase">
            Trajectory Plot (Last 7 Practiced Sessions)
          </span>
          
          <div className="bg-slate-200/60 p-1 rounded-xl flex gap-1">
            <button
              onClick={() => { setActiveMetric('alignment'); setHoveredIndex(null); }}
              className={`px-3 py-1 text-[10px] font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                activeMetric === 'alignment' 
                  ? 'bg-white text-blue-700 shadow-2xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ALIGNMENT (%)
            </button>
            <button
              onClick={() => { setActiveMetric('reps'); setHoveredIndex(null); }}
              className={`px-3 py-1 text-[10px] font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                activeMetric === 'reps' 
                  ? 'bg-white text-blue-700 shadow-2xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              COMPLETED REPS
            </button>
            <button
              onClick={() => { setActiveMetric('stability'); setHoveredIndex(null); }}
              className={`px-3 py-1 text-[10px] font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                activeMetric === 'stability' 
                  ? 'bg-white text-blue-700 shadow-2xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              STABILITY (%)
            </button>
          </div>
        </div>

        {/* THE RESPONSIVE HOVERABLE SVG GRAPH */}
        <div className="relative aspect-[5/2] sm:aspect-[7/3] w-full bg-white rounded-xl border border-slate-200/60 p-4 shadow-inner overflow-hidden select-none">
          
          {points.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
              <Calendar size={28} className="animate-pulse" />
              <p className="text-xs font-semibold mt-1">No session records available yet</p>
            </div>
          ) : (
            <>
              <svg 
                viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                className="w-full h-full text-slate-350 font-mono"
              >
                <defs>
                  {/* Glowing line shadow gradients */}
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Vertical Y Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
                  const y = paddingTop + ratio * chartInnerHeight;
                  const currentLabelVal = Math.round(rangeMax * (1 - ratio));
                  return (
                    <g key={i} className="opacity-40">
                      <line 
                        x1={paddingLeft} 
                        y1={y} 
                        x2={svgWidth - paddingRight} 
                        y2={y} 
                        stroke="#e2e8f0" 
                        strokeWidth="1" 
                        strokeDasharray="4 4"
                      />
                      <text 
                        x={paddingLeft - 10} 
                        y={y + 4} 
                        textAnchor="end" 
                        className="text-[9px] font-bold fill-slate-400"
                      >
                        {currentLabelVal}{activeMetric === 'alignment' ? '%' : ''}
                      </text>
                    </g>
                  );
                })}

                {/* Goal Metric Target Guideline */}
                {activeMetric === 'alignment' && (
                  <g>
                    <line
                      x1={paddingLeft}
                      y1={paddingTop + chartInnerHeight - (goals.targetAlignmentGoal / 100) * chartInnerHeight}
                      x2={svgWidth - paddingRight}
                      y2={paddingTop + chartInnerHeight - (goals.targetAlignmentGoal / 100) * chartInnerHeight}
                      stroke="#10b981"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                      className="opacity-70 animate-pulse"
                    />
                    <text
                      x={svgWidth - paddingRight - 10}
                      y={paddingTop + chartInnerHeight - (goals.targetAlignmentGoal / 100) * chartInnerHeight - 5}
                      textAnchor="end"
                      className="text-[8px] font-mono font-black fill-emerald-600 tracking-wider"
                    >
                      GOAL BASE: {goals.targetAlignmentGoal}%
                    </text>
                  </g>
                )}

                {/* Bezier Gradient Area Fill */}
                <path d={areaPath} fill="url(#areaGrad)" />

                {/* Bezier Interpolated Curve Line */}
                <path 
                  d={linePath} 
                  fill="none" 
                  stroke="#2563eb" 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />

                {/* X Axis Reference Dates */}
                {points.map((pt, i) => {
                  // Shortened dates as "Jun 06"
                  const dObj = new Date(pt.log.timestamp);
                  const labels = dObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
                  return (
                    <text 
                      key={i} 
                      x={pt.x} 
                      y={paddingTop + chartInnerHeight + 18} 
                      textAnchor="middle" 
                      className="text-[9px] font-bold fill-slate-400"
                    >
                      {labels}
                    </text>
                  );
                })}

                {/* Active Graph Interactive Circle Markers */}
                {points.map((pt, i) => (
                  <g key={i}>
                    <circle 
                      cx={pt.x} 
                      cy={pt.y} 
                      r={hoveredIndex === i ? 7 : 5} 
                      fill={hoveredIndex === i ? '#2563eb' : '#ffffff'} 
                      stroke="#2563eb" 
                      strokeWidth={hoveredIndex === i ? 3 : 2} 
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                    {/* Clear transparent hover interceptor */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={15}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  </g>
                ))}

              </svg>

              {/* OVERLAID DYNAMIC STATEFUL TOOLTIP CONTROL */}
              <AnimatePresence>
                {hoveredIndex !== null && points[hoveredIndex] && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute z-20 bg-slate-900 text-white rounded-xl p-3 border border-slate-950/80 pointer-events-none shadow-xl max-w-xs text-left"
                    style={{
                      left: `${(points[hoveredIndex].x / svgWidth) * 100}%`,
                      top: `${(points[hoveredIndex].y / svgHeight) * 100 - 35}%`,
                      transform: 'translate(-50%, -100%)'
                    }}
                  >
                    <div className="text-[9px] font-mono text-slate-400">
                      {new Date(points[hoveredIndex].log.timestamp).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', month: 'short', day: '2-digit' })}
                    </div>
                    
                    <div className="flex flex-col gap-1.5 mt-1.5">
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-[10px] font-mono text-slate-300 uppercase">Alignment Accuracy:</span>
                        <span className="text-xs font-mono font-bold text-sky-400">{points[hoveredIndex].log.avgAlignment}%</span>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-[10px] font-mono text-slate-300 uppercase">Stability Steadiness:</span>
                        <span className="text-xs font-mono font-bold text-indigo-400">{points[hoveredIndex].log.avgStability}%</span>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-[10px] font-mono text-slate-300 uppercase">Completed Reps:</span>
                        <span className="text-xs font-mono font-bold text-yellow-300">{points[hoveredIndex].log.repCount} / {points[hoveredIndex].log.targetReps}</span>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-[10px] font-mono text-slate-300 uppercase">Bending Faults:</span>
                        <span className={`text-xs font-mono font-bold ${points[hoveredIndex].log.bendingViolations > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {points[hoveredIndex].log.bendingViolations} times
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

        </div>
      </div>

      {/* DETAILED HISTORICAL LOG DATABASE LISTING */}
      <div className="flex flex-col gap-3">
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest pl-1 header-offset">
          Cervical Training Chronological Sessions
        </span>

        <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
          {sessionLogs.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl text-xs text-slate-400 font-medium">
              Practicing your first posture routine will automatically persist reports here.
            </div>
          ) : (
            [...sessionLogs]
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .map((log) => {
                const practiceDate = new Date(log.timestamp);
                const isGoalMet = log.repCount >= log.targetReps;
                
                return (
                  <div 
                    key={log.id}
                    className="p-4 rounded-2xl border transition-all hover:border-blue-150 border-slate-100 bg-white flex flex-col sm:flex-row gap-4 justify-between"
                  >
                    {/* Timestamp and Goals Met Flag */}
                    <div className="flex items-start gap-3.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isGoalMet 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : 'bg-slate-50 text-slate-500 border-slate-100'
                      }`}>
                        <CheckCircle2 size={18} className="stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs font-extrabold text-slate-800 leading-none">
                            {formatDuration(log.duration)} Active Training Session
                          </h4>
                          <span className={`text-[8px] font-mono tracking-wider font-extrabold px-1.5 py-0.5 rounded uppercase ${
                            isGoalMet 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {isGoalMet ? 'Goal Achieved' : 'Partial Set'}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-slate-400 mt-1.5">
                          Executed: {practiceDate.toLocaleString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    {/* Numeric analytics highlights */}
                    <div className="grid grid-cols-4 gap-2 sm:flex sm:items-center sm:gap-4 text-center sm:text-right shrink-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100 w-full sm:w-auto">
                      
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-mono text-slate-400">ALIGNMENT</span>
                        <span className="text-xs font-black font-display text-blue-600">{log.avgAlignment}%</span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-mono text-slate-400">STABILITY</span>
                        <span className="text-xs font-black font-display text-indigo-600">{log.avgStability}%</span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-mono text-slate-400">FAULTS</span>
                        <span className={`text-xs font-black font-display ${log.bendingViolations > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {log.bendingViolations} <span className="text-[9px] font-mono font-medium">tics</span>
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-mono text-slate-400">REPS</span>
                        <span className="text-xs font-black font-display text-slate-700">{log.repCount} / {log.targetReps}</span>
                      </div>

                    </div>

                  </div>
                );
              })
          )}
        </div>
      </div>

    </div>
  );
}
