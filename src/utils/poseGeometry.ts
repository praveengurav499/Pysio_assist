import { Point2D } from "../types";

export interface ChinTuckMetrics {
  activeSide: "left" | "right";
  ear: Point2D;
  shoulder: Point2D;
  cva: number;
  state: "Good" | "Adjust" | "Incorrect";
  color: string; // "green" | "yellow" | "red"
  confidence: number;
}

export interface DoorFrameMetrics {
  leftElbow: number;
  rightElbow: number;
  leftElbowState: "Good" | "Adjust" | "Incorrect";
  rightElbowState: "Good" | "Adjust" | "Incorrect";
  symmetryDiff: number;
  symmetryState: "Good" | "Adjust" | "Incorrect";
  symmetryColor: string;
  leftElbowColor: string;
  rightElbowColor: string;
  leanAngle: number;
  leanState: "Good" | "Adjust" | "Incorrect" | "Not Stretching";
  leanColor: string;
  confidence: number;
}

// Convert radians to degrees
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

// Calculate angle between three points (vertex is p2)
export function calculateJointAngle(p1: Point2D, p2: Point2D, p3: Point2D): number {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
  
  const dotProduct = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  const cosTheta = Math.max(-1, Math.min(1, dotProduct / (mag1 * mag2)));
  return radToDeg(Math.acos(cosTheta));
}

// Calculate CVA for Chin Tuck
export function calculateCVA(ear: Point2D, shoulder: Point2D): number {
  const dy = Math.abs(ear.y - shoulder.y);
  const dx = Math.abs(ear.x - shoulder.x);
  if (dx === 0) return 90; // vertical
  return radToDeg(Math.atan2(dy, dx));
}

// Evaluate Chin Tuck metrics from raw landmarks (MediaPipe index 0-32)
export function evaluateChinTuck(landmarks: any[]): ChinTuckMetrics | null {
  if (!landmarks || landmarks.length < 13) return null;

  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  // Determine active side based on higher visibility
  const leftVis = (leftEar.visibility ?? 0) + (leftShoulder.visibility ?? 0);
  const rightVis = (rightEar.visibility ?? 0) + (rightShoulder.visibility ?? 0);
  
  const activeSide = leftVis >= rightVis ? "left" : "right";
  const ear = activeSide === "left" ? leftEar : rightEar;
  const shoulder = activeSide === "left" ? leftShoulder : rightShoulder;

  const confidence = Math.min(ear.visibility ?? 0, shoulder.visibility ?? 0);

  // Calculate CVA
  const cva = calculateCVA(ear, shoulder);

  // Threshold check
  let state: "Good" | "Adjust" | "Incorrect" = "Incorrect";
  let color = "red";

  if (cva > 50) {
    state = "Good";
    color = "green";
  } else if (cva >= 45) {
    state = "Adjust";
    color = "yellow";
  } else {
    state = "Incorrect";
    color = "red";
  }

  return {
    activeSide,
    ear: { x: ear.x, y: ear.y, visibility: ear.visibility },
    shoulder: { x: shoulder.x, y: shoulder.y, visibility: shoulder.visibility },
    cva: Math.round(cva),
    state,
    color,
    confidence,
  };
}

// Evaluate Door Frame Stretch metrics
export function evaluateDoorFrame(
  landmarks: any[],
  leanMin = 5,
  leanMax = 15
): DoorFrameMetrics | null {
  if (!landmarks || landmarks.length < 25) return null;

  // Key joints
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  // Confidence check: check visibility of key landmarks
  const confidence = Math.min(
    leftShoulder.visibility ?? 0,
    rightShoulder.visibility ?? 0,
    leftElbow.visibility ?? 0,
    rightElbow.visibility ?? 0,
    leftWrist.visibility ?? 0,
    rightWrist.visibility ?? 0,
    leftHip.visibility ?? 0,
    rightHip.visibility ?? 0
  );

  // 1. Elbow angles (shoulder - elbow - wrist)
  const leftElbowAngle = calculateJointAngle(leftShoulder, leftElbow, leftWrist);
  const rightElbowAngle = calculateJointAngle(rightShoulder, rightElbow, rightWrist);

  // Elbow status
  const getElbowState = (angle: number) => {
    if (angle >= 80 && angle <= 100) return { state: "Good" as const, color: "green" };
    if ((angle >= 65 && angle < 80) || (angle > 100 && angle <= 115)) {
      return { state: "Adjust" as const, color: "yellow" };
    }
    return { state: "Incorrect" as const, color: "red" };
  };

  const leftState = getElbowState(leftElbowAngle);
  const rightState = getElbowState(rightElbowAngle);

  // 2. Symmetry Difference
  const symmetryDiff = Math.abs(leftElbowAngle - rightElbowAngle);
  let symmetryState: "Good" | "Adjust" | "Incorrect" = "Incorrect";
  let symmetryColor = "red";

  if (symmetryDiff < 10) {
    symmetryState = "Good";
    symmetryColor = "green";
  } else if (symmetryDiff <= 20) {
    symmetryState = "Adjust";
    symmetryColor = "yellow";
  } else {
    symmetryState = "Incorrect";
    symmetryColor = "red";
  }

  // 3. Torso Lean (angle of shoulder-hip line relative to vertical)
  // Average hip and shoulder for a stable body center calculation
  const avgShoulder = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
  };
  const avgHip = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
  };

  const dx = avgHip.x - avgShoulder.x;
  const dy = avgHip.y - avgShoulder.y;
  const leanAngle = dy !== 0 ? radToDeg(Math.abs(Math.atan2(dx, dy))) : 0;

  let leanState: "Good" | "Adjust" | "Incorrect" | "Not Stretching" = "Incorrect";
  let leanColor = "red";

  if (leanAngle >= leanMin && leanAngle <= leanMax) {
    leanState = "Good";
    leanColor = "green";
  } else if (leanAngle < leanMin) {
    leanState = "Not Stretching";
    leanColor = "yellow";
  } else {
    leanState = "Incorrect";
    leanColor = "red";
  }

  return {
    leftElbow: Math.round(leftElbowAngle),
    rightElbow: Math.round(rightElbowAngle),
    leftElbowState: leftState.state,
    rightElbowState: rightState.state,
    symmetryDiff: Math.round(symmetryDiff),
    symmetryState,
    symmetryColor,
    leftElbowColor: leftState.color,
    rightElbowColor: rightState.color,
    leanAngle: Math.round(leanAngle),
    leanState,
    leanColor,
    confidence,
  };
}
