/**
 * Service for managing camera positions
 * Supports both static config file and future API integration
 */

import type { CameraPosition, CameraPositionsConfig } from '../types/cameraPosition';

// Cache for loaded config to avoid repeated fetches
let cachedConfig: CameraPositionsConfig | null = null;
let configLoadPromise: Promise<CameraPositionsConfig | null> | null = null;

/**
 * Load camera positions config from static file or API
 * Uses caching to avoid repeated loads
 */
export async function loadCameraPositionsConfig(): Promise<CameraPositionsConfig | null> {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  // Return existing promise if load is in progress
  if (configLoadPromise) {
    return configLoadPromise;
  }

  // Start loading config
  configLoadPromise = (async () => {
    try {
      // Try to load from static config file
      // Use relative path that works with both dev and production (GitHub Pages)
      const basePath = import.meta.env.BASE_URL || '/';
      const configPath = `${basePath}config/cameraPositions.json`;
      const response = await fetch(configPath);
      
      if (!response.ok) {
        console.warn('Camera positions config not found, using defaults');
        return null;
      }

      const config: CameraPositionsConfig = await response.json();
      
      // Validate config structure
      if (!config.positions || !Array.isArray(config.positions)) {
        console.warn('Invalid camera positions config structure, using defaults');
        return null;
      }

      // Cache the config
      cachedConfig = config;
      return config;
    } catch (error) {
      console.error('Error loading camera positions config:', error);
      return null;
    } finally {
      // Clear the promise so we can retry if needed
      configLoadPromise = null;
    }
  })();

  return configLoadPromise;
}

/**
 * Get default camera position for a specific simulation
 * @param simulationId - ID of the simulation (e.g., 'simple-pendulum')
 * @returns CameraPosition or null if not found
 */
export async function getDefaultCameraPosition(
  simulationId: string
): Promise<CameraPosition | null> {
  try {
    const config = await loadCameraPositionsConfig();
    
    if (!config) {
      return null;
    }

    // Find position for this simulation
    const position = config.positions.find(
      pos => pos.simulationId === simulationId
    );

    return position || null;
  } catch (error) {
    console.error('Error getting default camera position:', error);
    return null;
  }
}

/**
 * Check if user has admin privileges
 * Currently supports:
 * - Environment variable check
 * - Query parameter check (for development)
 * - localStorage flag (for development)
 * 
 * Future: Integrate with proper authentication system
 */
export function isAdmin(): boolean {
  // Check environment variable (set at build time)
  if (import.meta.env.VITE_ADMIN_MODE === 'true') {
    return true;
  }

  // Check query parameter (for development/testing)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('admin') === 'true') {
    return true;
  }

  // Check localStorage (for development/testing)
  // Note: This is not secure and should only be used for development
  if (typeof window !== 'undefined') {
    const adminFlag = localStorage.getItem('admin_mode');
    if (adminFlag === 'true') {
      return true;
    }
  }

  return false;
}

/**
 * Save camera position (admin only)
 * Currently saves to localStorage as fallback
 * Future: Save to API when backend is available
 * 
 * @param simulationId - ID of the simulation
 * @param position - Camera position to save
 */
export async function saveCameraPosition(
  simulationId: string,
  position: Omit<CameraPosition, 'simulationId' | 'updatedAt' | 'updatedBy'>
): Promise<boolean> {
  if (!isAdmin()) {
    console.warn('Only admins can save camera positions');
    return false;
  }

  try {
    // TODO: When backend is available, save to API here
    // const response = await fetch('/api/camera-positions', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ simulationId, ...position })
    // });
    // return response.ok;

    // For now, save to localStorage as temporary storage
    // This allows admins to test the feature
    const savedPosition: CameraPosition = {
      simulationId,
      ...position,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin', // TODO: Get from auth system
    };

    const key = `camera_position_${simulationId}`;
    localStorage.setItem(key, JSON.stringify(savedPosition));

    // Clear cache to force reload
    cachedConfig = null;

    console.log('Camera position saved to localStorage:', savedPosition);
    return true;
  } catch (error) {
    console.error('Error saving camera position:', error);
    return false;
  }
}

/**
 * Get saved camera position from localStorage (admin override)
 * This takes precedence over config file
 */
export function getSavedCameraPosition(simulationId: string): CameraPosition | null {
  try {
    const key = `camera_position_${simulationId}`;
    const saved = localStorage.getItem(key);
    
    if (!saved) {
      return null;
    }

    return JSON.parse(saved) as CameraPosition;
  } catch (error) {
    console.error('Error reading saved camera position:', error);
    return null;
  }
}

/**
 * Clear cached config (useful for testing or after updates)
 */
export function clearCameraPositionsCache(): void {
  cachedConfig = null;
  configLoadPromise = null;
}

