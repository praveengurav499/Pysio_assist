import React from 'react';
import { motion } from 'motion/react';
import { HeadPosition, ShoulderAlignment } from '../types';

interface PostureAvatarProps {
  neckAngle: number;
  idealAngle: number;
  headPosition: HeadPosition;
  shoulderAlignment: ShoulderAlignment;
}

export default function PostureAvatar({
  neckAngle,
  idealAngle,
  headPosition,
  shoulderAlignment,
}: PostureAvatarProps) {
  // Convert neck angle to coordinates
  // Lower neck angle (e.g. 20deg) means forward head slouch. High (e.g. 55deg) means more upright.
  // Coordinates are relative to a 300x300 viewBox
  const shoulderX = 150;
  const shoulderY = 220;
  
  // Shoulder tilt based on alignment
  const leftShoulderY = shoulderAlignment === 'uneven' ? shoulderY - 12 : shoulderY;
  const rightShoulderY = shoulderAlignment === 'uneven' ? shoulderY + 8 : shoulderY;

  // Let's determine head horizontal displacement
  let headOffsetIndex = 0; // Aligned
  if (headPosition === 'forward') headOffsetIndex = 40;
  if (headPosition === 'backward') headOffsetIndex = -25;

  // Convert neck angle to radians
  const angleRad = (neckAngle * Math.PI) / 180;
  // Neck length
  const neckLength = 85;
  // Compute base neck tip position (before head offset)
  const baseTipX = shoulderX - neckLength * Math.cos(angleRad);
  const baseTipY = shoulderY - neckLength * Math.sin(angleRad);

  // Apply head position offset (forward head posture shifts head horizontally)
  const headX = baseTipX + headOffsetIndex;
  const headY = baseTipY;

  // Ideal target neck tip position (assumes ideal angle, aligned head)
  const idealAngleRad = (idealAngle * Math.PI) / 180;
  const idealTipX = shoulderX - neckLength * Math.cos(idealAngleRad);
  const idealTipY = shoulderY - neckLength * Math.sin(idealAngleRad);

  // Alignment assessment
  const isAligned = headPosition === 'aligned' && Math.abs(neckAngle - idealAngle) <= 8 && shoulderAlignment === 'good';

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-square bg-slate-900 border border-slate-800 rounded-3xl p-6 overflow-hidden flex flex-col justify-between shadow-inner">
      {/* Background Grid Lines to make it feel scientific */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-20 pointer-events-none" />

      {/* Title Tag */}
      <div className="flex justify-between items-center z-10">
        <span className="text-[10px] font-mono tracking-wider text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
          BIOMECHANICAL LIVE SIDE-PROFILE
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isAligned ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-ping'}`} />
          <span className="text-[10px] font-mono text-slate-400 uppercase">
            {isAligned ? 'Optimized' : 'Correction Needed'}
          </span>
        </div>
      </div>

      {/* SVG Canvas for profile illustration */}
      <div className="flex-1 flex items-center justify-center relative my-2">
        <svg viewBox="50 50 200 220" className="w-full h-full max-h-[220px]">
          {/* DEFINITIONS FOR GRADIENTS */}
          <defs>
            <radialGradient id="headGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={isAligned ? '#10b981' : '#f59e0b'} stopOpacity="0.25" />
              <stop offset="100%" stopColor={isAligned ? '#10b981' : '#f59e0b'} stopOpacity="0" />
            </radialGradient>
            <linearGradient id="neonGreenLine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="neonOrangeLine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>

          {/* IDEAL ALIGNMENT PLUMBLINE - plumbline from shoulder joint (vertical) */}
          <line
            x1={shoulderX}
            y1={70}
            x2={shoulderX}
            y2={250}
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="opacity-45"
          />
          
          {/* Ideal position marker for ear */}
          <circle
            cx={idealTipX}
            cy={idealTipY}
            r="6"
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="2 2"
            className="opacity-40"
          />
          <text
            x={idealTipX - 10}
            y={idealTipY - 12}
            className="text-[8px] fill-emerald-400 font-mono opacity-60"
          >
            Ideal Tuck Axis
          </text>

          {/* TORSO / SPINE ROOT BASE */}
          <path
            d={`M ${leftShoulderY} 240 Q ${shoulderX + 10} 250 ${rightShoulderY} 240`}
            stroke="#334155"
            strokeWidth="4"
            fill="none"
          />

          {/* VERTICAL ANGLE INDICATOR ARC */}
          <path
            d={`M ${shoulderX} ${shoulderY} A 60 60 0 0 0 ${shoulderX - 42.4} ${shoulderY - 42.4}`}
            fill="none"
            stroke="#1e293b"
            strokeWidth="6"
          />
          <path
            d={`M ${shoulderX} ${shoulderY} A 50 50 0 0 0 ${shoulderX - 50 * Math.cos(angleRad)} ${shoulderY - 50 * Math.sin(angleRad)}`}
            fill="none"
            stroke={isAligned ? '#10b981' : '#f59e0b'}
            strokeWidth="2.5"
          />

          {/* LOWER BODY UPPER TIER (BACK & CHEST SHADOWS) */}
          {/* Back line */}
          <path
            d={`M ${shoulderX} ${shoulderY} Q ${shoulderX + 35} ${shoulderY + 30} ${shoulderX + 40} 250`}
            stroke="#1e293b"
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
            className="opacity-40"
          />
          {/* Chest line */}
          <path
            d={`M ${shoulderX - 35} ${shoulderY + 15} Q ${shoulderX - 30} ${shoulderY + 35} ${shoulderX - 25} 250`}
            stroke="#1e293b"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
            className="opacity-45"
          />

          {/* VERTEBRAE & NECK CONNECT PROFILE (DYNAMIC) */}
          <motion.line
            x1={shoulderX}
            y1={shoulderY}
            x2={headX}
            y2={headY}
            stroke={isAligned ? "url(#neonGreenLine)" : "url(#neonOrangeLine)"}
            strokeWidth="8"
            strokeLinecap="round"
            animate={{ x2: headX, y2: headY }}
            transition={{ type: "spring", stiffness: 80, damping: 15 }}
          />

          {/* CERVICAL VERTEBRAE DASHES */}
          <motion.line
            x1={shoulderX}
            y1={shoulderY}
            x2={headX}
            y2={headY}
            stroke="#0f172a"
            strokeWidth="2"
            strokeDasharray="3 4"
            animate={{ x2: headX, y2: headY }}
            transition={{ type: "spring", stiffness: 80, damping: 15 }}
          />

          {/* HEAD NODE / SKULL VECTOR (DYAMIC ROTATION & TRANSLATION) */}
          <motion.g
            animate={{ x: headX, y: headY }}
            transition={{ type: "spring", stiffness: 80, damping: 15 }}
          >
            {/* GLOW ENVELOPE */}
            <circle cx="0" cy="-18" r="34" fill="url(#headGlow)" className="pointer-events-none" />

            {/* Skull Base Outline */}
            <circle cx="0" cy="-18" r="25" fill="#1e293b" stroke={isAligned ? '#10b981' : '#f59e0b'} strokeWidth="2.5" />
            
            {/* Jaw line Profile */}
            <path
              d="M -15 -10 Q -24 -8 -22 -18 Q -10 -25 -2 -25"
              stroke={isAligned ? '#10b981' : '#f59e0b'}
              strokeWidth="2"
              fill="none"
            />

            {/* Nose Profile Accent */}
            <path
              d="M -25 -20 L -29 -22 L -25 -25"
              stroke={isAligned ? '#10b981' : '#f59e0b'}
              strokeWidth="2"
              fill="none"
              strokeLinejoin="round"
            />

            {/* Ear Ring (Crucial Biomechanical Landmark for Alignment checks) */}
            <circle
              cx="-2"
              cy="-16"
              r="5"
              fill={isAligned ? '#065f46' : '#92400e'}
              stroke={isAligned ? '#34d399' : '#fbbf24'}
              strokeWidth="1.5"
            />
            {/* Small center pin of ear */}
            <circle cx="-2" cy="-16" r="1.5" fill="#f8fafc" />

            {/* Level vision beam line */}
            <line
              x1="-29"
              y1="-30"
              x2="-65"
              y2="-30"
              stroke={isAligned ? '#10b981' : '#f59e0b'}
              strokeWidth="1"
              strokeDasharray="2 2"
              className="opacity-60"
            />
            <text x="-62" y="-34" className="text-[7px] fill-slate-400 font-mono">
              Horizon Focus
            </text>
          </motion.g>

          {/* DYNAMIC FEEDBACK VECTOR ARROW - If chin is protruding forward */}
          {headPosition === 'forward' && (
            <path
              d={`M ${headX - 15} ${headY - 45} L ${headX - 45} ${headY - 45}`}
              stroke="#fbbf24"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="animate-pulse"
              fill="none"
            />
          )}
          {headPosition === 'forward' && (
            <polygon
              points={`${headX - 45},${headY - 48} ${headX - 52},${headY - 45} ${headX - 45},${headY - 42}`}
              fill="#fbbf24"
            />
          )}
          {headPosition === 'forward' && (
            <text x={headX - 60} y={headY - 55} className="text-[8px] fill-amber-300 font-display font-bold animate-pulse">
              RETRACT CHIN
            </text>
          )}

          {/* Shoulder representation dot */}
          <circle cx={shoulderX} cy={shoulderY} r="7" fill="#475569" stroke="#f8fafc" strokeWidth="1.5" />
          
          {/* Level indicators on torso */}
          <line
            x1={shoulderX - 25}
            y1={shoulderY}
            x2={shoulderX + 25}
            y2={shoulderY}
            stroke={shoulderAlignment === 'good' ? '#10b981' : '#ef4444'}
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Numerical Indicators */}
      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800">
        <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/60">
          <span className="block text-[9px] font-mono text-slate-500 uppercase">NECK RETRACTION</span>
          <span className="text-sm font-display font-semibold text-slate-200">{neckAngle}°</span>
          <span className="text-[8px] font-mono text-slate-500 block">Ideal: {idealAngle}°</span>
        </div>
        <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/60">
          <span className="block text-[9px] font-mono text-slate-500 uppercase">HEAD SAGITTAL</span>
          <span className={`text-sm font-display font-semibold uppercase ${
            headPosition === 'aligned' ? 'text-emerald-400' : 'text-amber-400'
          }`}>{headPosition}</span>
          <span className="text-[8px] font-mono text-slate-500 block">
            {headPosition === 'forward' ? 'Spine Overload' : headPosition === 'backward' ? 'Too tense' : 'Neutral Axis'}
          </span>
        </div>
      </div>
    </div>
  );
}
