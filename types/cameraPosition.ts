/**
 * Camera position types for admin-controlled default camera positions
 */

export interface CameraAngle {
  theta: number; // Horizontal rotation angle
  phi: number;   // Vertical rotation angle
}

export interface CameraPanOffset {
  x: number;
  y: number;
  z: number;
}

export interface CameraPosition {
  simulationId: string;
  cameraAngle: CameraAngle;
  cameraDistance: number;
  panOffset: CameraPanOffset;
  updatedAt?: string;
  updatedBy?: string;
  description?: string; // Optional description for admin reference
}

export interface CameraPositionsConfig {
  positions: CameraPosition[];
  version: string;
  lastUpdated: string;
  defaultSimulationId?: string; // Default simulation to use if simulationId not found
}

