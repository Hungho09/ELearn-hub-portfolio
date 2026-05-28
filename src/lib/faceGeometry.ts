/**
 * Face Geometry Helpers for Focus Tracking.
 * 
 * Computes EAR (Eye Aspect Ratio), MAR (Mouth Aspect Ratio),
 * and Head Pose (Pitch, Yaw, Roll) directly from MediaPipe FaceMesh landmarks (468 keypoints).
 */

export interface FaceMetrics {
  ear: number;
  mar: number;
  pitch: number;
  yaw: number;
  roll: number;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Calculate Euclidean distance between two 3D points
 */
function getDistance(p1: Point3D, p2: Point3D): number {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) +
    Math.pow(p1.y - p2.y, 2) +
    Math.pow(p1.z - p2.z, 2)
  );
}

/**
 * Extract 5 sequential metrics [EAR, MAR, Pitch, Yaw, Roll] from MediaPipe face landmarks.
 * Landmarks is an array of 468/478 items with {x, y, z}.
 */
export function calculateFaceMetrics(landmarks: Point3D[]): FaceMetrics {
  if (!landmarks || landmarks.length < 468) {
    return { ear: 0.3, mar: 0.15, pitch: 0, yaw: 0, roll: 0 };
  }

  // ─── 1. EAR (Eye Aspect Ratio) ───
  // Left eye keypoints
  const l1 = landmarks[33];   // Horizontal corner left
  const l4 = landmarks[133];  // Horizontal corner right
  const l2 = landmarks[160];  // Vertical top-left
  const l6 = landmarks[144];  // Vertical bottom-left
  const l3 = landmarks[158];  // Vertical top-right
  const l5 = landmarks[153];  // Vertical bottom-right

  const leftEAR = (getDistance(l2, l6) + getDistance(l3, l5)) / (2.0 * getDistance(l1, l4));

  // Right eye keypoints
  const r1 = landmarks[362];  // Horizontal corner left
  const r4 = landmarks[263];  // Horizontal corner right
  const r2 = landmarks[385];  // Vertical top-left
  const r6 = landmarks[380];  // Vertical bottom-left
  const r3 = landmarks[387];  // Vertical top-right
  const r5 = landmarks[373];  // Vertical bottom-right

  const rightEAR = (getDistance(r2, r6) + getDistance(r3, r5)) / (2.0 * getDistance(r1, r4));

  // Average EAR
  const ear = (leftEAR + rightEAR) / 2.0;

  // ─── 2. MAR (Mouth Aspect Ratio) ───
  // Lip keypoints
  const mInnerTop = landmarks[13];     // Top lip center inner
  const mInnerBottom = landmarks[14];  // Bottom lip center inner
  const mCornerLeft = landmarks[78];   // Mouth corner left
  const mCornerRight = landmarks[308]; // Mouth corner right

  const mar = getDistance(mInnerTop, mInnerBottom) / getDistance(mCornerLeft, mCornerRight);

  // ─── 3. Head Pose (Pitch, Yaw, Roll) ───
  // We approximate these angles in degrees using face landmark ratios.

  // Nose tip
  const nose = landmarks[4];
  // Forehead top center
  const forehead = landmarks[10];
  // Chin bottom center
  const chin = landmarks[152];
  // Face outer left edge
  const leftEdge = landmarks[234];
  // Face outer right edge
  const rightEdge = landmarks[454];

  // Yaw: Horizontal turn (compares nose distance to left vs right edges)
  const dNoseLeft = getDistance(nose, leftEdge);
  const dNoseRight = getDistance(nose, rightEdge);
  // Yields approx -45 to +45 degrees
  const yaw = ((dNoseLeft - dNoseRight) / (dNoseLeft + dNoseRight)) * 75;

  // Pitch: Vertical tilt up/down (compares nose distance to forehead vs chin)
  const dNoseForehead = getDistance(nose, forehead);
  const dNoseChin = getDistance(nose, chin);
  // Yields approx -45 to +45 degrees (subtracted offset to center neutral look)
  const pitch = ((dNoseForehead - dNoseChin) / (dNoseForehead + dNoseChin)) * 75 + 10;

  // Roll: Head tilt rotation (angle of the eye plane relative to horizontal)
  const leftEyeCenter = landmarks[133];
  const rightEyeCenter = landmarks[362];
  const dx = rightEyeCenter.x - leftEyeCenter.x;
  const dy = rightEyeCenter.y - leftEyeCenter.y;
  // atan2(dy, dx) gives angle in radians, convert to degrees
  const roll = Math.atan2(dy, dx) * (180.0 / Math.PI);

  return {
    ear: Math.min(Math.max(ear, 0.0), 1.0),
    mar: Math.min(Math.max(mar, 0.0), 2.0),
    pitch: Math.min(Math.max(pitch, -90.0), 90.0),
    yaw: Math.min(Math.max(yaw, -90.0), 90.0),
    roll: Math.min(Math.max(roll, -90.0), 90.0),
  };
}
