/**
 * Admin UI Component for Camera Position Management
 * Only visible to users with admin privileges
 */

import React, { useState } from 'react';
import { Save, Camera, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { saveCameraPosition } from '../../services/cameraPositionService';
import type { CameraPosition } from '../../types/cameraPosition';
import * as THREE from 'three';

interface CameraPositionAdminProps {
  simulationId: string;
  cameraAngle: { theta: number; phi: number };
  cameraDistance: number;
  panOffset: THREE.Vector3;
  onSave?: (position: CameraPosition) => void;
  onClose?: () => void;
}

export default function CameraPositionAdmin({
  simulationId,
  cameraAngle,
  cameraDistance,
  panOffset,
  onSave,
  onClose
}: CameraPositionAdminProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const position: Omit<CameraPosition, 'simulationId' | 'updatedAt' | 'updatedBy'> = {
        cameraAngle: {
          theta: cameraAngle.theta,
          phi: cameraAngle.phi
        },
        cameraDistance: cameraDistance,
        panOffset: {
          x: panOffset.x,
          y: panOffset.y,
          z: panOffset.z
        },
        description: `Default camera position for ${simulationId} - saved by admin`
      };

      const success = await saveCameraPosition(simulationId, position);

      if (success) {
        setSaveStatus('success');
        setShowConfirm(false);
        
        // Call onSave callback if provided
        if (onSave) {
          const savedPosition: CameraPosition = {
            simulationId,
            ...position,
            updatedAt: new Date().toISOString(),
            updatedBy: 'admin'
          };
          onSave(savedPosition);
        }

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      } else {
        setSaveStatus('error');
        setShowConfirm(false);
        
        // Clear error message after 5 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 5000);
      }
    } catch (error) {
      console.error('Error saving camera position:', error);
      setSaveStatus('error');
      setShowConfirm(false);
      
      setTimeout(() => {
        setSaveStatus('idle');
      }, 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClick = () => {
    // Check if position already exists (from localStorage)
    const existingPosition = localStorage.getItem(`camera_position_${simulationId}`);
    if (existingPosition) {
      setShowConfirm(true);
    } else {
      handleSave();
    }
  };

  return (
    <div className="absolute top-4 right-4 z-50">
      <div className="bg-black bg-opacity-80 backdrop-blur-sm rounded-lg shadow-xl border border-cyan-500 border-opacity-30 p-3 min-w-[220px] max-w-[240px]">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-cyan-500 border-opacity-20">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-300">Admin: Camera Position</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Current Position Info */}
        <div className="mb-3 space-y-1 text-xs text-gray-300">
          <div className="flex justify-between">
            <span className="text-gray-400">Distance:</span>
            <span className="text-white">{cameraDistance.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Angle (θ, φ):</span>
            <span className="text-white">
              {cameraAngle.theta.toFixed(2)}, {cameraAngle.phi.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Pan Offset:</span>
            <span className="text-white">
              ({panOffset.x.toFixed(2)}, {panOffset.y.toFixed(2)}, {panOffset.z.toFixed(2)})
            </span>
          </div>
        </div>

        {/* Confirmation Dialog */}
        {showConfirm && (
          <div className="mb-3 p-2 bg-yellow-900 bg-opacity-30 border border-yellow-500 border-opacity-30 rounded text-xs">
            <div className="flex items-start gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-yellow-200 font-semibold mb-1">Position Already Exists</p>
                <p className="text-yellow-300">This will overwrite the existing default position.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs font-semibold transition disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Overwrite'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isSaving}
                className="flex-1 px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-semibold transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Save Button */}
        {!showConfirm && (
          <button
            onClick={handleSaveClick}
            disabled={isSaving || saveStatus === 'success'}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveStatus === 'success' ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Camera Position</span>
              </>
            )}
          </button>
        )}

        {/* Status Messages */}
        {saveStatus === 'success' && !showConfirm && (
          <div className="mt-2 p-2 bg-green-900 bg-opacity-30 border border-green-500 border-opacity-30 rounded text-xs text-green-200 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>Camera position saved successfully! All users will see this default position.</span>
          </div>
        )}

        {saveStatus === 'error' && !showConfirm && (
          <div className="mt-2 p-2 bg-red-900 bg-opacity-30 border border-red-500 border-opacity-30 rounded text-xs text-red-200 flex items-center gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <span>Failed to save camera position. Please try again.</span>
          </div>
        )}

        {/* Info Note */}
        <div className="mt-3 pt-2 border-t border-cyan-500 border-opacity-20">
          <p className="text-xs text-gray-400 italic">
            Position saved to localStorage. For production, update config file or use API.
          </p>
        </div>
      </div>
    </div>
  );
}

