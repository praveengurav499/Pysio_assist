import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Activity, 
  Send, 
  Loader2, 
  HelpCircle, 
  TrendingUp, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  Compass, 
  Play, 
  LineChart,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AIPostureAssistantProps {
  neckAngle: number;
  currentStage: 'neutral' | 'correct' | 'bending' | 'forward';
  activeExerciseId: string;
  alignmentScore: number;
  movementHistory: Array<{ time: string; angle: number; alignment: number; stability: number; stage: string }>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PostureAnalysis {
  status: 'correct' | 'incorrect';
  message: string;
  details: string[];
  animation_hint: string;
  confidence_level: string;
}

interface AIMovementReport {
  smoothnessScore: number;
  stabilityReport: string;
  rangeOfMotionReport: string;
  fatigueAssessment: string;
  verdict: string;
  tips: string[];
}

const PRESET_QUESTIONS = [
  "What is 'Tex-Neck' and how do chin tucks fix it?",
  "How do deep cervical flexors protect my spine?",
  "Give me an ergonomic checklist for desk work."
];

export default function AIPostureAssistant({
  neckAngle,
  currentStage,
  activeExerciseId,
  alignmentScore,
  movementHistory = []
}: AIPostureAssistantProps) {
  // Tabs for Assistant Panel
  const [assistantTab, setAssistantTab] = useState<'analysis' | 'chat' | 'movement'>('analysis');

  // Analysis States
  const [analysis, setAnalysis] = useState<PostureAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Chat States
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I am your AI Physiotherapy Assistant. Feel free to ask me any questions about posture correction, cervical spine alignment, shoulder range-of-motion, or ergonomics. I can also perform a deep diagnostic audit of your live neck movement trajectory!",
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatSending, setIsChatSending] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Movement Analyzer States
  const [movementReport, setMovementReport] = useState<AIMovementReport | null>(null);
  const [isAnalyzingMovement, setIsAnalyzingMovement] = useState<boolean>(false);
  const [movementAnalysisError, setMovementAnalysisError] = useState<string | null>(null);

  // Motion Capture Recording flow
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingCountdown, setRecordingCountdown] = useState<number>(0);
  const [recordedData, setRecordedData] = useState<Array<{ time: string; angle: number; alignment: number; stability: number; stage: string }>>([]);

  // Trigger real-time posture audit using `/api/analyze-posture`
  const handleAnalyzePosture = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const postureStatus = currentStage === 'correct' ? 'correct' : 'incorrect';
      const headPosition = currentStage === 'correct' ? 'aligned' : currentStage === 'forward' ? 'forward' : 'backward';
      const shoulderAlignment = alignmentScore >= 80 ? 'good' : 'uneven';

      const response = await fetch('/api/analyze-posture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          neckAngle,
          idealAngle: 50,
          headPosition,
          shoulderAlignment,
          postureStatus
        })
      });

      if (!response.ok) {
        throw new Error("Analysis failed. Server responded with error status.");
      }

      const data = await response.json();
      setAnalysis({
        status: data.status || 'incorrect',
        message: data.message || 'Audit complete.',
        details: data.details || ['Keep drawing chin horizontally.'],
        animation_hint: data.animation_hint || 'Visual feedback line active',
        confidence_level: data.confidence_level || 'high'
      });
    } catch (err: any) {
      console.error(err);
      setAnalysisError("Could not run Gemini Posture Analysis. Please ensure dev server is active.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Trigger movement trajectory audit using `/api/analyze-movement-sequence`
  const handleAnalyzeMovementSequence = async (dataToAnalyze: Array<{ time: string; angle: number; alignment: number; stability: number; stage: string }>) => {
    if (!dataToAnalyze || dataToAnalyze.length === 0) {
      setMovementAnalysisError("No motion logs detected yet. Please practice for a few seconds first or run a 10s capture!");
      return;
    }
    
    setIsAnalyzingMovement(true);
    setMovementAnalysisError(null);
    setMovementReport(null);
    try {
      const response = await fetch('/api/analyze-movement-sequence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          movementHistory: dataToAnalyze,
          activeExerciseId
        })
      });

      if (!response.ok) {
        throw new Error("Kinematic analysis failed.");
      }

      const reportData = await response.json();
      setMovementReport(reportData);
    } catch (err) {
      console.error(err);
      setMovementAnalysisError("Could not compile AI Kinematic Report. Please check dev server connection.");
    } finally {
      setIsAnalyzingMovement(false);
    }
  };

  // Motion capture recorder controller
  const startMotionCapture = () => {
    setRecordedData([]);
    setRecordingCountdown(10);
    setIsRecording(true);
    setMovementReport(null);
    setMovementAnalysisError(null);
  };

  // Capture loop
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRecording && recordingCountdown > 0) {
      timer = setInterval(() => {
        const snapStability = currentStage === 'correct' ? 95 : currentStage === 'neutral' ? 88 : 65;
        const snapshot = {
          time: `${10 - recordingCountdown + 1}s`,
          angle: neckAngle,
          alignment: alignmentScore,
          stability: Math.round(snapStability + (Math.random() * 4 - 2)),
          stage: currentStage
        };

        setRecordedData(prev => [...prev, snapshot]);
        
        setRecordingCountdown(prev => {
          if (prev <= 1) {
            setIsRecording(false);
            // Submit complete sequence for analysis
            handleAnalyzeMovementSequence([...recordedData, snapshot]);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording, recordingCountdown, neckAngle, alignmentScore, currentStage]);

  // Auto trigger analysis on initial mount or when exercise switches
  useEffect(() => {
    handleAnalyzePosture();
  }, [activeExerciseId]);

  // Scroll to bottom of chats
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatSending]);

  // Submit custom physical therapy question to `/api/chat-posture`
  const handleSendChatMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatSending(true);

    try {
      const history = messages.slice(1).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.content
      }));

      const response = await fetch('/api/chat-posture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: textToSend,
          activeExerciseId,
          history
        })
      });

      if (!response.ok) {
        throw new Error("Chat request failed.");
      }

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || "I have received your query but could not formulate a reply.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: "Sorry, I am having trouble reaching the Gemini Server. Please check that your network is connected and your server process is active.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsChatSending(false);
    }
  };

  return (
    <div className="bg-white border border-blue-100 rounded-3xl overflow-hidden shadow-xs flex flex-col gap-0" id="ai-assistant-wrapper">
      {/* Header Banner */}
      <div className="p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
            <Sparkles className="text-yellow-300 animate-pulse stroke-[2.5]" size={18} />
          </div>
          <div>
            <h3 className="font-display font-black text-sm tracking-tight">Gemini AI Posture Clinician</h3>
            <p className="text-[10px] text-blue-100/90 font-mono">INTELLIGENT REHAB ADVICE & CONVERSATION</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-white/10 p-1 rounded-xl border border-white/15 self-stretch sm:self-auto gap-1">
          <button
            onClick={() => setAssistantTab('analysis')}
            className={`px-2.5 py-1 text-[9.5px] font-mono font-bold uppercase rounded-lg transition-all cursor-pointer ${
              assistantTab === 'analysis' ? 'bg-white text-indigo-700 shadow-xs' : 'text-white/80 hover:text-white'
            }`}
          >
            Anatomy Audit
          </button>
          <button
            onClick={() => setAssistantTab('chat')}
            className={`px-2.5 py-1 text-[9.5px] font-mono font-bold uppercase rounded-lg transition-all cursor-pointer ${
              assistantTab === 'chat' ? 'bg-white text-indigo-700 shadow-xs' : 'text-white/80 hover:text-white'
            }`}
          >
            Ask AI
          </button>
          <button
            onClick={() => setAssistantTab('movement')}
            className={`px-2.5 py-1 text-[9.5px] font-mono font-bold uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              assistantTab === 'movement' ? 'bg-white text-indigo-700 shadow-xs' : 'text-white/80 hover:text-white'
            }`}
          >
            <Activity size={10} /> Movement
          </button>
        </div>
      </div>

      {/* Main Tab Switch Content */}
      <div className="p-5 min-h-[350px] flex flex-col bg-slate-50/20">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: ANATOMY AUDIT */}
          {assistantTab === 'analysis' && (
            <motion.div
              key="analysis-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4 flex-1 justify-between"
            >
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                  <span className="text-[10.5px] font-bold text-slate-500 font-mono uppercase flex items-center gap-1.5">
                    <Activity size={12} className="text-blue-500 animate-pulse" /> Live Telemetry
                  </span>
                  <div className="flex items-center gap-1 font-mono text-[10.5px] font-bold">
                    <span className="text-slate-400">Angle:</span>
                    <span className="text-blue-600">{neckAngle}°</span>
                  </div>
                </div>

                {isAnalyzing ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-indigo-600" size={28} />
                    <p className="text-xs font-bold text-slate-500 font-mono uppercase tracking-wide">
                      Consulting Gemini Physiotherapist...
                    </p>
                  </div>
                ) : analysisError ? (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col gap-2.5">
                    <p className="text-xs text-rose-700 font-medium leading-relaxed">{analysisError}</p>
                    <button 
                      onClick={handleAnalyzePosture}
                      className="self-start text-[10.5px] text-blue-600 hover:text-blue-700 font-mono font-extrabold underline cursor-pointer"
                    >
                      Retry consultation query
                    </button>
                  </div>
                ) : analysis ? (
                  <div className="flex flex-col gap-3.5">
                    <div className="flex justify-between items-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase border ${
                        analysis.status === 'correct' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {analysis.status === 'correct' ? 'Optimal Plumbline' : 'Postural Error Detected'}
                      </span>
                      <span className="text-[9.5px] font-mono text-slate-400 font-bold uppercase">
                        Confidence: {analysis.confidence_level}
                      </span>
                    </div>

                    <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-4">
                      <p className="text-xs font-sans text-indigo-950 font-semibold leading-relaxed">
                        "{analysis.message}"
                      </p>
                    </div>

                    {analysis.details && analysis.details.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-wider">Corrective Biomechanical Measures:</span>
                        <div className="flex flex-col gap-1.5">
                          {analysis.details.map((detail, index) => (
                            <div key={index} className="flex items-start gap-2 text-xs text-slate-600 leading-normal font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                              <span>{detail}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.animation_hint && (
                      <div className="mt-1 pt-3 border-t border-slate-100 flex items-center gap-2 text-[10.5px] text-indigo-650 font-mono font-extrabold bg-blue-50/30 p-2.5 rounded-xl">
                        <span className="p-0.5 px-1.5 rounded bg-amber-100 text-amber-800 text-[8px] tracking-wide font-black uppercase">Coaching Guideline</span>
                        <span>{analysis.animation_hint}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
                    <HelpCircle size={32} className="text-slate-300" />
                    <p className="text-xs text-slate-500 font-medium">No initial audit available. Practice the postures to analyze.</p>
                  </div>
                )}
              </div>

              <button
                onClick={handleAnalyzePosture}
                disabled={isAnalyzing}
                className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-mono font-black text-xs uppercase rounded-xl tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles size={13} className="animate-pulse" /> Re-Evaluate Live Plumbline
              </button>
            </motion.div>
          )}

          {/* TAB 2: CHAT CONVERSATION */}
          {assistantTab === 'chat' && (
            <motion.div
              key="chat-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3 flex-1 justify-between h-[360px]"
            >
              {/* Messages viewport */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 scroll-smooth max-h-[220px]">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-[85%] ${m.role === 'user' ? 'self-end' : 'self-start'}`}
                  >
                    <span className="text-[8.5px] font-mono font-bold text-slate-400 mb-0.5 px-1">
                      {m.role === 'user' ? 'You' : 'AI Clinician'}
                    </span>
                    <div className={`p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-3xs ${
                      m.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isChatSending && (
                  <div className="flex flex-col max-w-[85%] self-start">
                    <span className="text-[8.5px] font-mono font-bold text-slate-400 mb-0.5 px-1">AI Clinician</span>
                    <div className="p-3 rounded-2xl text-xs bg-white border border-slate-100 rounded-tl-none flex items-center gap-1.5 shadow-2xs text-slate-400">
                      <Loader2 className="animate-spin text-indigo-500" size={13} />
                      Thinking...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Shell */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-1 bg-white shadow-3xs">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendChatMessage(chatInput);
                    }}
                    disabled={isChatSending}
                    placeholder="Ask about neck pain, posture goals..."
                    className="flex-1 px-3 py-2 text-xs font-sans text-slate-700 bg-transparent focus:outline-none placeholder-slate-400"
                  />
                  <button
                    onClick={() => handleSendChatMessage(chatInput)}
                    disabled={isChatSending || !chatInput.trim()}
                    className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    <Send size={12} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: DYNAMIC MOVEMENT ANALYZER */}
          {assistantTab === 'movement' && (
            <motion.div
              key="movement-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4 flex-1 justify-between"
            >
              <div className="flex flex-col gap-3.5">
                <div className="p-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="text-indigo-600 animate-spin-slow shrink-0" size={16} />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wide">Kinematic Profiler</span>
                      <span className="text-[9px] text-slate-400 font-mono">Continuous posture trajectory</span>
                    </div>
                  </div>
                  <div className="text-[10px] bg-indigo-200/50 text-indigo-800 font-mono font-bold px-2 py-0.5 rounded uppercase">
                    {movementHistory.length} frames logged
                  </div>
                </div>

                {isRecording ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 bg-slate-900 text-white rounded-2xl border border-slate-950 p-5 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:10px_10px]" />
                    <div className="w-14 h-14 rounded-full bg-rose-600/20 border-2 border-rose-500 flex items-center justify-center animate-ping absolute" />
                    <div className="w-12 h-12 rounded-full bg-rose-600 border border-rose-500 flex items-center justify-center z-10 font-mono font-black text-lg">
                      {recordingCountdown}s
                    </div>
                    <p className="text-xs font-bold font-mono tracking-widest uppercase text-rose-400 z-10 animate-pulse mt-1">
                      RECORDING TRAJECTORY...
                    </p>
                    <p className="text-[10px] text-slate-400 text-center max-w-[200px] leading-normal z-10">
                      Slowly retract and extend your neck through its full range of motion.
                    </p>
                  </div>
                ) : isAnalyzingMovement ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                    <p className="text-xs font-bold text-slate-600 font-mono uppercase tracking-widest animate-pulse">
                      Generating Kinematic Report...
                    </p>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Analyzing joint vector curves & hold stability indices
                    </p>
                  </div>
                ) : movementAnalysisError ? (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col gap-2">
                    <p className="text-xs text-rose-700 font-medium leading-relaxed">{movementAnalysisError}</p>
                    <p className="text-[10px] text-slate-400">Make sure your camera is running and capturing coordinates!</p>
                  </div>
                ) : movementReport ? (
                  <div className="flex flex-col gap-3 max-h-[260px] overflow-y-auto pr-1">
                    {/* Radial score gauge */}
                    <div className="flex items-center gap-4 bg-slate-900 text-white p-4 rounded-2xl border border-slate-950">
                      <div className="w-14 h-14 shrink-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 flex flex-col items-center justify-center font-mono font-black text-sm text-emerald-400 animate-pulse-slow">
                        {movementReport.smoothnessScore}%
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">smooth</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-mono text-indigo-400 font-black uppercase tracking-widest">Kinematic Rating</span>
                        <h4 className="text-xs font-bold text-white leading-tight mt-0.5">{movementReport.verdict}</h4>
                      </div>
                    </div>

                    {/* Breakdown grids */}
                    <div className="flex flex-col gap-2.5">
                      {/* Stability holds */}
                      <div className="p-3 bg-white border border-slate-150 rounded-xl flex flex-col gap-1">
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <TrendingUp size={11} className="text-blue-500" /> Hold Steadiness
                        </span>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          {movementReport.stabilityReport}
                        </p>
                      </div>

                      {/* Neck Vectors ROM */}
                      <div className="p-3 bg-white border border-slate-150 rounded-xl flex flex-col gap-1">
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Compass size={11} className="text-indigo-500" /> Angular Range of Motion
                        </span>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          {movementReport.rangeOfMotionReport}
                        </p>
                      </div>

                      {/* Fatigue assessment */}
                      <div className="p-3 bg-white border border-slate-150 rounded-xl flex flex-col gap-1">
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <AlertTriangle size={11} className="text-rose-500" /> Fatigue & Degradation
                        </span>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          {movementReport.fatigueAssessment}
                        </p>
                      </div>

                      {/* Clinician Action Tips */}
                      <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex flex-col gap-1.5">
                        <span className="text-[9px] font-mono font-black text-indigo-800 uppercase tracking-widest flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-indigo-600 animate-pulse" /> TARGETED POSTURE CORRECTIONS
                        </span>
                        <div className="flex flex-col gap-1">
                          {movementReport.tips.map((tip, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-600 leading-tight font-medium">
                              <span className="text-indigo-500 font-bold">•</span>
                              <span>{tip}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setMovementReport(null)}
                      className="text-center text-[10px] text-blue-600 hover:text-blue-700 font-mono font-extrabold underline mt-1"
                    >
                      Perform another kinematic sweep
                    </button>
                  </div>
                ) : (
                  <div className="py-6 flex flex-col gap-3 text-center items-center justify-center">
                    <LineChart size={32} className="text-slate-300 animate-pulse-slow" />
                    <p className="text-xs text-slate-500 font-medium max-w-[220px] leading-relaxed">
                      Analyze the posture movement trajectory over the active session or capture a live 10s motion sequence.
                    </p>

                    <div className="flex flex-col gap-2 w-full mt-2">
                      <button
                        onClick={startMotionCapture}
                        className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-mono font-black text-[10px] uppercase rounded-xl tracking-wider transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Play size={11} className="fill-current" /> Start 10s Motion Capture
                      </button>

                      <button
                        onClick={() => handleAnalyzeMovementSequence(movementHistory)}
                        disabled={movementHistory.length === 0}
                        className="w-full py-2.5 bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 font-mono font-bold text-[10px] uppercase rounded-xl tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Activity size={11} className="text-blue-500" /> Analyze Recent Activity ({movementHistory.length})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
