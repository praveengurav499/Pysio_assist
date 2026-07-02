export type HeadPosition = 'forward' | 'backward' | 'aligned';
export type ShoulderAlignment = 'good' | 'uneven';
export type PostureStatus = 'correct' | 'incorrect';

export interface PostureData {
  neckAngle: number;
  idealAngle: number;
  headPosition: HeadPosition;
  shoulderAlignment: ShoulderAlignment;
  postureStatus: PostureStatus;
}

export interface PostureAnalysis {
  status: 'correct' | 'incorrect';
  message: string;
  details: string[];
  animation_hint: string;
  confidence_level: 'low' | 'medium' | 'high';
}

export interface PresetPosture {
  name: string;
  description: string;
  data: PostureData;
}

export interface FeedbackLog {
  timestamp: string;
  input: PostureData;
  output: PostureAnalysis;
}

export interface SessionLog {
  id: string;
  timestamp: string; // ISO datetime
  dateString: string; // YYYY-MM-DD
  duration: number; // seconds
  repCount: number;
  targetReps: number;
  avgAlignment: number;
  avgStability: number;
  bendingViolations: number;
}

export interface PostureGoals {
  dailyRepsGoal: number;
  weeklySessionsGoal: number;
  targetAlignmentGoal: number;
}

export interface Point2D {
  x: number;
  y: number;
  visibility?: number;
}

export type ExerciseType = 'chin-tuck' | 'door-frame' | 'cross-body' | 'upper-trap' | 'hand-behind' | 'chin_tuck' | 'door_frame';

export interface AppSettings {
  sensitivity?: number;
  showSkeleton?: boolean;
  showMetrics?: boolean;
  voiceEnabled?: boolean;
  cameraFacing?: 'user' | 'environment';
  textSize?: 'small' | 'medium' | 'large' | 'normal';
  chinTuckReps?: number;
  chinTuckHoldSec?: number;
  doorStretchHoldSec?: number;
  doorStretchLeanMin?: number;
  doorStretchLeanMax?: number;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  exerciseId: string;
  duration: number;
  reps: number;
  targetReps: number;
  alignment: number;
  stability: number;
  violations: number;
  date?: string;
  exercise?: string;
  feedback?: any;
  metrics?: Record<string, any>;
}

