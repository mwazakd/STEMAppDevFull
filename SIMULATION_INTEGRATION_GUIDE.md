# Simulation Integration Guide

This guide provides step-by-step instructions for adding and integrating new simulation pages and simulations into the STEM Africa platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Step-by-Step Integration Process](#step-by-step-integration-process)
4. [Simulation Component Template](#simulation-component-template)
5. [Wrapper Component Template](#wrapper-component-template)
6. [Integration Checklist](#integration-checklist)
7. [Best Practices](#best-practices)
8. [Common Patterns](#common-patterns)
9. [Troubleshooting](#troubleshooting)

---

## Overview

All simulations in the STEM Africa platform follow a consistent architecture:

1. **Core Simulator Component**: Contains the 3D scene, simulation logic, and UI overlays
2. **Wrapper Component**: Handles fullscreen/embedded view switching
3. **Constants Registration**: Registers the simulation in the app's data structure
4. **State Persistence**: Uses module-level state to persist across view switches

### Key Features All Simulations Must Have

- ✅ Fullscreen/embedded view toggle
- ✅ Config button and panel
- ✅ Status bar overlay
- ✅ Chart functionality (if applicable)
- ✅ Info/Guide button
- ✅ Mobile-responsive UI
- ✅ State persistence across view switches
- ✅ Camera controls (drag, zoom, pan)
- ✅ Safe area insets support for mobile

---

## Architecture

### File Structure

```
components/simulations/
├── YourSimulator.tsx              # Core simulator component
├── YourSimulatorWrapper.tsx       # Wrapper for fullscreen/embedded
└── [other simulation files]

constants.ts                       # Simulation registration
```

### Component Hierarchy

```
YourSimulatorWrapper
├── State Management
│   ├── isFullScreen (boolean)
│   ├── isChartOpen (boolean)
│   └── isMobile (boolean)
├── Fullscreen Container (Portal)
│   └── YourSimulator (isEmbedded=false)
└── Embedded Container
    └── YourSimulator (isEmbedded=true)

YourSimulator
├── Three.js Scene Setup
├── Simulation Logic
├── UI Overlays
│   ├── Config Button & Panel
│   ├── Chart Button & Sidebar/Overlay
│   ├── Status Bar
│   ├── Info/Guide Button
│   └── Fullscreen Controls
└── Data Collection for Charts
```

---

## Step-by-Step Integration Process

### Step 1: Create Core Simulator Component

Create `components/simulations/YourSimulator.tsx` following the template below.

### Step 2: Create Wrapper Component

Create `components/simulations/YourSimulatorWrapper.tsx` following the template below.

### Step 3: Register in Constants

Add your simulation to `constants.ts`:

```typescript
import YourSimulatorWrapper from './components/simulations/YourSimulatorWrapper';

// In MOCK_SUBJECTS array, under appropriate subject:
{
  id: 'your-simulation-id',
  title: 'Your Simulation Name',
  content: {
    type: 'simulation',
    level: ['Grade 11', 'A-Level'], // Adjust as needed
    description: 'Brief description of your simulation.',
    component: YourSimulatorWrapper,
  }
}
```

### Step 4: Test

1. Navigate to the simulation page
2. Test embedded view functionality
3. Test fullscreen toggle
4. Test all UI overlays (Config, Chart, Status, Guide)
5. Test camera controls (drag, zoom, pan)
6. Test mobile responsiveness
7. Test state persistence (switch views, verify state maintained)

---

## Simulation Component Template

```typescript
import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Play, Pause, RotateCcw, Info, Settings, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface YourSimulatorProps {
  isEmbedded?: boolean;
  onChartOpenChange?: (isOpen: boolean) => void;
  onTutorialOpenChange?: (isOpen: boolean) => void;
}

// Chart data types (if applicable)
interface YourDataPoint {
  time: number;
  value: number;
}

// Module-level storage for Three.js objects - persists across component unmounts/remounts
const persistentThreeJS = {
  scene: null as THREE.Scene | null,
  camera: null as THREE.PerspectiveCamera | null,
  renderer: null as THREE.WebGLRenderer | null,
  isInitialized: false,
  // Add your simulation-specific Three.js objects here
  // example: mesh: null as THREE.Mesh | null,
};

// Module-level storage for React state - persists across component unmounts/remounts
const persistentState = {
  // Add your simulation parameters here
  // example: parameter1: 10,
  // example: parameter2: 20,
  isRunning: false,
  currentValue: 0,
  timeElapsed: 0,
  showConfig: false,
  showChart: false,
  showChartSidebar: false,
  chartWidth: 384,
  isResizing: false,
  showTutorial: false,
  currentChartIndex: 0,
  // Add chart data arrays here if applicable
  // example: dataPoints: [] as YourDataPoint[],
};

export default function YourSimulator({ 
  isEmbedded = false, 
  onChartOpenChange,
  onTutorialOpenChange
}: YourSimulatorProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const [sceneReady, setSceneReady] = useState(() => persistentThreeJS.isInitialized);
  
  // Initialize state from persistent storage
  // const [parameter1, setParameter1] = useState(() => persistentState.parameter1);
  const [isRunning, setIsRunning] = useState(() => persistentState.isRunning);
  const [currentValue, setCurrentValue] = useState(() => persistentState.currentValue);
  const [timeElapsed, setTimeElapsed] = useState(() => persistentState.timeElapsed);
  
  // UI Overlay States
  const [showConfig, setShowConfig] = useState(() => persistentState.showConfig);
  const [showChart, setShowChart] = useState(() => persistentState.showChart);
  const [showChartSidebar, setShowChartSidebar] = useState(() => persistentState.showChartSidebar);
  const [chartWidth, setChartWidth] = useState(() => persistentState.chartWidth);
  const [isResizing, setIsResizing] = useState(() => persistentState.isResizing);
  const [showTutorial, setShowTutorial] = useState(() => persistentState.showTutorial);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  
  // Chart Data Collection (if applicable)
  // const [dataPoints, setDataPoints] = useState<YourDataPoint[]>(() => [...persistentState.dataPoints]);
  const [currentChartIndex, setCurrentChartIndex] = useState(() => persistentState.currentChartIndex);
  
  // Sync state changes to persistent storage
  useEffect(() => {
    persistentState.isRunning = isRunning;
  }, [isRunning]);
  
  // Add other state sync effects as needed
  
  // Camera control refs
  const mouseDownRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 3.5 });
  const cameraDistanceRef = useRef(40);
  const userHasRotatedRef = useRef(false);
  const panOffsetRef = useRef(new THREE.Vector3(0, 0, 0));
  const isPanningRef = useRef(false);
  const isMiddleMouseRef = useRef(false);
  
  // Touch handling refs
  const touchDownRef = useRef(false);
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const initialDistanceRef = useRef(0);
  const initialCameraDistanceRef = useRef(40);
  const touchPanModeRef = useRef(false);
  const initialTouchCenterRef = useRef({ x: 0, y: 0 });
  
  // Store event handlers in refs
  const eventHandlersRef = useRef<{
    handleMouseDown: ((e: MouseEvent) => void) | null;
    handleMouseMove: ((e: MouseEvent) => void) | null;
    handleMouseUp: (() => void) | null;
    handleWheel: ((e: WheelEvent) => void) | null;
    handleTouchStart: ((e: TouchEvent) => void) | null;
    handleTouchMove: ((e: TouchEvent) => void) | null;
    handleTouchEnd: ((e: TouchEvent) => void) | null;
    handleContextMenu: ((e: Event) => void) | null;
  }>({
    handleMouseDown: null,
    handleMouseMove: null,
    handleMouseUp: null,
    handleWheel: null,
    handleTouchStart: null,
    handleTouchMove: null,
    handleTouchEnd: null,
    handleContextMenu: null,
  });
  
  // Track window size for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setShowChartSidebar(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Notify parent when chart opens/closes on mobile
  useEffect(() => {
    if (isMobile) {
      onChartOpenChange?.(showChart);
    }
  }, [showChart, isMobile, onChartOpenChange]);
  
  // Notify parent when tutorial opens/closes
  useEffect(() => {
    onTutorialOpenChange?.(showTutorial);
  }, [showTutorial, onTutorialOpenChange]);
  
  // Render embedded controls in wrapper when embedded
  useEffect(() => {
    if (!isEmbedded) return;
    
    const container = document.getElementById('embedded-controls-container');
    if (!container) return;
    
    // Create and render embedded controls
    // This will be handled by the wrapper component
  }, [isEmbedded]);
  
  // One-time scene setup - only initialize if not already done
  useEffect(() => {
    if (!mountRef.current) return;
    
    let retryCount = 0;
    const maxRetries = 30; // Max 3 seconds of retrying
    
    const checkAndInit = () => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      let width = rect.width;
      let height = rect.height;
      
      // For screens ≤576px: fix height at 475px for embedded mode
      if (isEmbedded && window.innerWidth <= 576) {
        height = 475;
      }
      
      // Don't initialize if container has zero size
      if (width === 0 || height === 0) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(checkAndInit, 100);
        }
        return;
      }
      
      // If Three.js objects already exist in persistent storage, reuse them
      if (persistentThreeJS.isInitialized && persistentThreeJS.scene && persistentThreeJS.camera && persistentThreeJS.renderer) {
        // Restore refs from persistent storage
        sceneRef.current = persistentThreeJS.scene;
        cameraRef.current = persistentThreeJS.camera;
        rendererRef.current = persistentThreeJS.renderer;
        
        const canvas = persistentThreeJS.renderer.domElement;
        
        // Move canvas to current mount point if needed
        if (!mountRef.current.contains(canvas)) {
          if (canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
          }
          mountRef.current.appendChild(canvas);
        }
        
        // Update size for current container
        persistentThreeJS.renderer.setSize(width, height);
        persistentThreeJS.camera.aspect = width / height;
        persistentThreeJS.camera.updateProjectionMatrix();
        
        // Force a render
        if (persistentThreeJS.scene && persistentThreeJS.camera && persistentThreeJS.renderer) {
          persistentThreeJS.renderer.render(persistentThreeJS.scene, persistentThreeJS.camera);
        }
        
        // Restart animation loop if not already running
        if (!animationIdRef.current) {
          const animate = () => {
            if (persistentThreeJS.scene && persistentThreeJS.camera && persistentThreeJS.renderer) {
              if (sceneRef.current && cameraRef.current && rendererRef.current) {
                // Update camera position based on controls
                if (autoRotate && !mouseDownRef.current && !userHasRotatedRef.current && !isPanningRef.current) {
                  // Auto-rotate logic here
                }
                
                const lookAtPoint = panOffsetRef.current;
                const radius = cameraDistanceRef.current;
                cameraRef.current.position.x = lookAtPoint.x + radius * Math.sin(cameraAngleRef.current.phi) * Math.cos(cameraAngleRef.current.theta);
                cameraRef.current.position.y = lookAtPoint.y + radius * Math.cos(cameraAngleRef.current.phi);
                cameraRef.current.position.z = lookAtPoint.z + radius * Math.sin(cameraAngleRef.current.phi) * Math.sin(cameraAngleRef.current.theta);
                cameraRef.current.lookAt(lookAtPoint);
                
                rendererRef.current.render(sceneRef.current, cameraRef.current);
              }
            }
            animationIdRef.current = requestAnimationFrame(animate);
          };
          animate();
        }
        
        // Reattach event handlers if they exist
        // ... (see TitrationSimulator for full implementation)
        
        setSceneReady(true);
        return;
      }
      
      // First time initialization - create new Three.js objects
      if (persistentThreeJS.isInitialized) return;
      
      setSceneReady(false);
    
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a202c); // Adjust color as needed
      sceneRef.current = scene;
      persistentThreeJS.scene = scene;
    
      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 500);
      camera.position.set(30, 15, 30); // Adjust as needed
      camera.lookAt(0, 0, 0); // Adjust as needed
      cameraRef.current = camera;
      persistentThreeJS.camera = camera;
    
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if (mountRef.current) {
        mountRef.current.appendChild(renderer.domElement);
      }
      rendererRef.current = renderer;
      persistentThreeJS.renderer = renderer;
    
      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);
      
      const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
      sunLight.position.set(50, 50, 30);
      sunLight.castShadow = true;
      scene.add(sunLight);
      
      // Add your scene objects here
      // Example:
      // const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x2d3748 }));
      // ground.rotation.x = -Math.PI / 2;
      // scene.add(ground);
      
      persistentThreeJS.isInitialized = true;
      
      requestAnimationFrame(() => {
        setSceneReady(true);
      });
    
      // Animation loop - IMPORTANT: Check for user interaction
      const animate = () => {
        if (persistentThreeJS.scene && persistentThreeJS.camera && persistentThreeJS.renderer) {
          if (sceneRef.current && cameraRef.current && rendererRef.current) {
            // Check if user is actively interacting
            const isUserInteracting = mouseDownRef.current || isPanningRef.current || touchDownRef.current;
            
            if (!isUserInteracting) {
              // Auto-rotate if enabled
              if (autoRotate && !userHasRotatedRef.current) {
                // Auto-rotate logic
                // simulationState.current.autoRotateStep += 0.002;
                // cameraAngleRef.current.theta = simulationState.current.autoRotateStep;
              }
              
              // Update camera position based on current angles and distance
              const lookAtPoint = panOffsetRef.current;
              const radius = cameraDistanceRef.current;
              cameraRef.current.position.x = lookAtPoint.x + radius * Math.sin(cameraAngleRef.current.phi) * Math.cos(cameraAngleRef.current.theta);
              cameraRef.current.position.y = lookAtPoint.y + radius * Math.cos(cameraAngleRef.current.phi);
              cameraRef.current.position.z = lookAtPoint.z + radius * Math.sin(cameraAngleRef.current.phi) * Math.sin(cameraAngleRef.current.theta);
              cameraRef.current.lookAt(lookAtPoint);
            } else {
              // User is interacting - update camera from ref values (set by event handlers)
              const lookAtPoint = panOffsetRef.current;
              const radius = cameraDistanceRef.current;
              cameraRef.current.position.x = lookAtPoint.x + radius * Math.sin(cameraAngleRef.current.phi) * Math.cos(cameraAngleRef.current.theta);
              cameraRef.current.position.y = lookAtPoint.y + radius * Math.cos(cameraAngleRef.current.phi);
              cameraRef.current.position.z = lookAtPoint.z + radius * Math.sin(cameraAngleRef.current.phi) * Math.sin(cameraAngleRef.current.theta);
              cameraRef.current.lookAt(lookAtPoint);
            }
            
            // Update simulation logic here
            // if (isRunning) { ... }
            
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
        }
        animationIdRef.current = requestAnimationFrame(animate);
      };
      animate();
      
      // Event handlers for camera controls
      // IMPORTANT: Store handlers in eventHandlersRef for proper cleanup/reattachment
      // ... (see TitrationSimulator.tsx lines 538-770 for full implementation)
      // Key handlers needed:
      // - handleMouseDown (for orbit and pan detection)
      // - handleMouseMove (for orbit and pan updates)
      // - handleMouseUp (to clear interaction state)
      // - handleWheel (for zoom)
      // - handleTouchStart, handleTouchMove, handleTouchEnd (for mobile controls)
      // - handleContextMenu (to prevent right-click menu during pan)
      
      // Add resize handler and cleanup
      // ... (see TitrationSimulator.tsx lines 812-893 for full implementation)
    };
    
    // Store cleanup function
    let cleanupFn: (() => void) | null = null;
    
    const timeoutId = setTimeout(() => {
      cleanupFn = checkAndInit() || null;
    }, 50);
    
    return () => {
      clearTimeout(timeoutId);
      if (cleanupFn) {
        cleanupFn();
        cleanupFn = null;
      }
    };
  }, []);
  
  // Simulation run loop
  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(() => {
      // Update simulation state
      // Update Three.js object positions
      // Collect chart data if applicable
    }, 50); // Adjust interval as needed
    
    return () => clearInterval(interval);
  }, [isRunning, /* add dependencies */]);
  
  const toggleRunning = () => {
    setIsRunning(!isRunning);
  };
  
  const reset = () => {
    setIsRunning(false);
    // Reset simulation state
    // Clear chart data
    // Reset Three.js object positions
  };
  
  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden flex flex-col relative">
      <div className="flex-1 relative w-full">
        <div ref={mountRef} className="w-full h-full" />
        
        {/* UI Overlays - Config, Status, Chart, Guide buttons */}
        {/* See TitrationSimulator.tsx for full UI implementation */}
        
        {/* Loading State */}
        {!sceneReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="text-white text-xl">Loading 3D Scene...</div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Wrapper Component Template

```typescript
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import YourSimulator from './YourSimulator';
import { Maximize2, Minimize2 } from 'lucide-react';

interface YourSimulatorWrapperProps {
  // Props can be added here if needed in the future
}

const YourSimulatorWrapper: React.FC<YourSimulatorWrapperProps> = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  
  // Track window size to detect mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const handleChartOpenChange = (isOpen: boolean) => {
    setIsChartOpen(isOpen);
  };
  
  const handleTutorialOpenChange = (isOpen: boolean) => {
    setIsTutorialOpen(isOpen);
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // ESC key to exit full screen
  useEffect(() => {
    if (!isFullScreen) return;

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.keyCode === 27) {
        event.preventDefault();
        event.stopPropagation();
        setIsFullScreen(false);
      }
    };

    window.addEventListener('keydown', handleEscKey, true);
    return () => {
      window.removeEventListener('keydown', handleEscKey, true);
    };
  }, [isFullScreen]);

  return (
    <>
      {/* Fullscreen Container - Rendered via Portal to document.body */}
      {isFullScreen && createPortal(
        <div 
          className="fixed z-[300] bg-black overflow-hidden"
          style={{ 
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)'
          }}
        >
          {/* Top Right Buttons Container - Exit Full Screen - Hide when chart or tutorial is open */}
          <div 
            className={`absolute z-[100] flex flex-row gap-2 items-center transition-opacity`}
            style={{ 
              top: `max(1rem, calc(env(safe-area-inset-top, 0px) + 1rem))`,
              right: `max(1rem, calc(env(safe-area-inset-right, 0px) + 1rem))`,
              display: (isMobile && isChartOpen) || isTutorialOpen ? 'none' : 'flex' 
            }}
          >
            <button
              onClick={toggleFullScreen}
              className="text-white px-4 py-2 rounded-lg font-semibold transition shadow-lg flex items-center justify-center hover:opacity-80"
              aria-label="Exit Full Screen"
            >
              <Minimize2 className="w-6 h-6" />
            </button>
          </div>
          <div className="w-full h-full" style={{ width: '100%', height: '100%' }}>
            <YourSimulator 
              key="persistent-your-simulator"
              isEmbedded={false} 
              onChartOpenChange={handleChartOpenChange}
              onTutorialOpenChange={handleTutorialOpenChange}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Embedded Container */}
      {!isFullScreen && (
        <div>
          {/* Top Right Buttons Container - Full Screen - Hide when chart or tutorial is open */}
          <div 
            className={`absolute top-4 right-4 z-10 flex flex-row gap-2 items-center ${(isMobile && isChartOpen) || isTutorialOpen ? 'hidden' : ''} transition-opacity`}
            style={{ display: (isMobile && isChartOpen) || isTutorialOpen ? 'none' : 'flex' }}
          >
            <button
              onClick={toggleFullScreen}
              className="text-white px-4 py-2 rounded-lg font-semibold transition shadow-lg flex items-center justify-center hover:opacity-80"
              aria-label="View Full Screen"
            >
              <Maximize2 className="w-6 h-6" />
            </button>
          </div>
          
          {/* Embedded Controls Container */}
          <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center pointer-events-none">
            <div className="flex gap-2 pointer-events-auto" id="embedded-controls-container">
              {/* Buttons will be controlled by YourSimulator component */}
            </div>
          </div>
          
          <style>{`
            .embedded-your-wrapper {
              width: 100% !important;
              height: 100% !important;
              position: absolute;
              inset: 0;
              overflow: hidden;
              min-height: 475px;
            }
            .embedded-your-wrapper > div {
              width: 100% !important;
              height: 100% !important;
              position: absolute !important;
              inset: 0 !important;
            }
            .embedded-your-wrapper .h-screen {
              height: 100% !important;
              min-height: 100% !important;
            }
            .embedded-your-wrapper div[ref] {
              width: 100% !important;
              height: 100% !important;
              min-height: 475px !important;
            }
            .embedded-your-wrapper canvas {
              width: 100% !important;
              height: 100% !important;
              display: block !important;
            }
            
            @media (max-width: 576px) {
              .embedded-your-wrapper {
                height: 475px !important;
                min-height: 475px !important;
                max-height: 475px !important;
              }
              .embedded-your-wrapper > div {
                height: 475px !important;
                min-height: 475px !important;
                max-height: 475px !important;
              }
              .embedded-your-wrapper .h-screen {
                height: 475px !important;
                min-height: 475px !important;
                max-height: 475px !important;
              }
              .embedded-your-wrapper div[ref] {
                height: 475px !important;
                min-height: 475px !important;
                max-height: 475px !important;
              }
              .embedded-your-wrapper canvas {
                height: 475px !important;
                min-height: 475px !important;
                max-height: 475px !important;
              }
            }
          `}</style>
          
          <div className="embedded-your-wrapper" style={{ width: '100%', height: '100%', minHeight: '475px' }}>
            <YourSimulator 
              key="persistent-your-simulator"
              isEmbedded={true} 
              onChartOpenChange={handleChartOpenChange}
              onTutorialOpenChange={handleTutorialOpenChange}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default YourSimulatorWrapper;
```

---

## Integration Checklist

Use this checklist when integrating a new simulation:

### Core Functionality
- [ ] Core simulator component created
- [ ] Wrapper component created
- [ ] Registered in `constants.ts`
- [ ] Three.js scene initializes correctly
- [ ] Scene renders in embedded view
- [ ] Scene renders in fullscreen view
- [ ] State persists across view switches

### UI Components
- [ ] Config button and panel implemented
- [ ] Status bar overlay implemented
- [ ] Chart button implemented (if applicable)
- [ ] Chart sidebar/overlay implemented (if applicable)
- [ ] Info/Guide button implemented
- [ ] Fullscreen toggle button works
- [ ] ESC key exits fullscreen
- [ ] Start/Reset buttons hidden when chart or tutorial is open
- [ ] Minimize/Maximize buttons hidden when tutorial is open

### Camera Controls
- [ ] Mouse drag (orbit) works
- [ ] Mouse wheel (zoom) works
- [ ] Middle mouse/Ctrl+drag (pan) works
- [ ] Touch drag (rotate) works on mobile
- [ ] Pinch to zoom works on mobile
- [ ] Two-finger pan works on mobile
- [ ] Camera controls work after simulation runs
- [ ] Animation loop checks for user interaction before updating camera

### Mobile Support
- [ ] Safe area insets implemented
- [ ] Buttons visible in fullscreen
- [ ] Chart overlay works on mobile
- [ ] Embedded view displays correctly (≤576px)
- [ ] Touch controls work properly

### Data & Charts (if applicable)
- [ ] Chart data collection implemented
- [ ] Charts display correctly
- [ ] Chart navigation works
- [ ] Chart data persists across view switches
- [ ] Chart data clears on reset
- [ ] Time axis configured with dynamic ticks on ALL charts
- [ ] Time axis tick labels visible on all charts (displacement, velocity, etc.)
- [ ] ALL charts use same XAxis configuration: `type="number"`, `validTicks`, `tickFormatter`

### Testing
- [ ] Tested on desktop browser
- [ ] Tested on tablet browser
- [ ] Tested on mobile browser
- [ ] Tested view switching (embedded ↔ fullscreen)
- [ ] Tested all UI overlays
- [ ] Tested camera controls
- [ ] Tested state persistence
- [ ] No console errors
- [ ] No memory leaks

---

## Best Practices

### 1. State Persistence

**Always use module-level state for persistence:**

```typescript
// ✅ CORRECT
const persistentState = {
  parameter1: 10,
  isRunning: false,
};

// ❌ WRONG - Don't use only React state
const [parameter1, setParameter1] = useState(10);
```

**Why?** Module-level state persists across component unmounts/remounts when switching views.

### 2. Three.js Object Management

**Store Three.js objects in module-level persistent storage:**

```typescript
// ✅ CORRECT
const persistentThreeJS = {
  scene: null as THREE.Scene | null,
  camera: null as THREE.PerspectiveCamera | null,
  renderer: null as THREE.WebGLRenderer | null,
  isInitialized: false,
};

// Initialize once, reuse across view switches
if (!persistentThreeJS.isInitialized) {
  persistentThreeJS.scene = new THREE.Scene();
  // ... initialize
  persistentThreeJS.isInitialized = true;
}
```

### 3. Event Handler Management

**Store event handlers in refs to prevent issues when canvas moves:**

```typescript
// ✅ CORRECT
const eventHandlersRef = useRef<{
  handleMouseDown: ((e: MouseEvent) => void) | null;
  // ...
}>({
  handleMouseDown: null,
  // ...
});

// Store handlers
if (!eventHandlersRef.current.handleMouseDown) {
  eventHandlersRef.current.handleMouseDown = handleMouseDown;
}

// Use stored handlers for removal
canvas.removeEventListener('mousedown', eventHandlersRef.current.handleMouseDown);
```

### 4. Canvas Movement

**When switching views, move canvas instead of recreating:**

```typescript
// ✅ CORRECT
if (!mountRef.current.contains(canvas)) {
  if (canvas.parentNode) {
    canvas.parentNode.removeChild(canvas);
  }
  mountRef.current.appendChild(canvas);
}
```

### 5. Mobile Safe Areas

**Always use safe area insets for mobile:**

```typescript
style={{ 
  paddingTop: 'env(safe-area-inset-top, 0px)',
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  paddingLeft: 'env(safe-area-inset-left, 0px)',
  paddingRight: 'env(safe-area-inset-right, 0px)'
}}
```

### 6. Loading States

**Use `sceneReady` state for loading indicator:**

```typescript
const [sceneReady, setSceneReady] = useState(() => persistentThreeJS.isInitialized);

// Show loading only when scene not ready
{!sceneReady && (
  <div>Loading 3D Scene...</div>
)}
```

### 7. Responsive Design

**Check mobile breakpoint consistently:**

```typescript
const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

// Use this for mobile-specific UI behavior
if (isMobile) {
  // Mobile behavior
} else {
  // Desktop behavior
}
```

### 8. Hide Buttons When Overlays Are Open

**Hide Start/Reset and Minimize buttons when chart or tutorial is open:**

```typescript
// In simulator component - hide Start/Reset buttons
{!isEmbedded && !showChart && !showChartSidebar && !showTutorial && (
  <div>
    {/* Start/Reset buttons */}
  </div>
)}

// In wrapper component - hide Minimize button
<div style={{ 
  display: (isMobile && isChartOpen) || isTutorialOpen ? 'none' : 'flex' 
}}>
  {/* Minimize button */}
</div>

// Notify wrapper when tutorial opens/closes
useEffect(() => {
  onTutorialOpenChange?.(showTutorial);
}, [showTutorial, onTutorialOpenChange]);
```

---

## Common Patterns

### Pattern 1: Simulation Loop with Data Collection

```typescript
useEffect(() => {
  if (!isRunning) return;
  
  const interval = setInterval(() => {
    // Update simulation time
    simulationState.current.simulationTime += 0.05;
    const t = simulationState.current.simulationTime;
    
    // Update simulation physics
    const newValue = calculateValue(t);
    
    // Update Three.js object
    if (persistentThreeJS.mesh) {
      persistentThreeJS.mesh.position.set(newValue.x, newValue.y, newValue.z);
    }
    
    // Collect chart data
    setDataPoints(prev => [...prev, { time: t, value: newValue }]);
    
    // Update UI state
    setCurrentValue(newValue);
    setTimeElapsed(t);
  }, 50);
  
  return () => clearInterval(interval);
}, [isRunning, /* dependencies */]);
```

### Pattern 2: Chart Navigation

```typescript
const charts = useMemo(() => [
  { name: 'Chart 1', data: data1, color: '#ef4444' },
  { name: 'Chart 2', data: data2, color: '#3b82f6' },
  { name: 'Chart 3', data: data3, color: '#a855f7' }
], [data1, data2, data3]);

const nextChart = () => {
  setCurrentChartIndex((prev) => (prev + 1) % charts.length);
};

const prevChart = () => {
  setCurrentChartIndex((prev) => (prev - 1 + charts.length) % charts.length);
};
```

### Pattern 3: Config Panel with Sliders

```typescript
<div className="bg-black bg-opacity-80 backdrop-blur-md p-4 rounded-lg">
  <label className="text-white text-sm mb-2 block">
    Parameter 1: {parameter1}
  </label>
  <input
    type="range"
    min={5}
    max={50}
    value={parameter1}
    onChange={(e) => setParameter1(Number(e.target.value))}
    className="w-full"
  />
</div>
```

### Pattern 4: Status Bar

```typescript
<div className="bg-black bg-opacity-70 backdrop-blur-sm text-white px-3 py-3 rounded-lg">
  <div className="space-y-2">
    <div className="text-center">
      <p className="text-xs text-cyan-300">Value</p>
      <p className="text-sm font-bold">{currentValue.toFixed(2)}</p>
    </div>
    <div className="text-center">
      <p className="text-xs text-green-300">Time</p>
      <p className="text-sm font-bold">{timeElapsed.toFixed(2)} s</p>
    </div>
    <div className="text-center">
      <p className="text-xs text-yellow-300">Status</p>
      <p className="text-xs font-bold">{isRunning ? 'Running' : 'Stopped'}</p>
    </div>
  </div>
</div>
```

### Pattern 5: Time Axis Configuration with Dynamic Ticks

**All charts (displacement, velocity, etc.) must use the same time axis configuration:**

```typescript
// Helper functions for time axis
const getTimeInterval = (maxTime: number): number => {
  if (maxTime <= 2) return 0.2;    // For 0-2s: interval = 0.2
  else if (maxTime <= 5) return 0.5;  // For 2-5s: interval = 0.5
  else if (maxTime <= 10) return 1;   // For 5-10s: interval = 1
  else if (maxTime <= 20) return 2;   // For 10-20s: interval = 2
  else if (maxTime <= 50) return 5;   // For 20-50s: interval = 5
  else return 10;                     // For 50+ s: interval = 10
};

const generateTimeTicks = (maxTime: number, interval: number): number[] => {
  if (maxTime <= 0 || interval <= 0) return [0, 1];
  const ticks: number[] = [];
  let currentTick = 0;
  while (currentTick <= maxTime + interval * 0.01) {
    const rounded = Math.round(currentTick * 1000) / 1000;
    ticks.push(rounded);
    currentTick += interval;
  }
  if (ticks.length === 0 || ticks[0] !== 0) ticks.unshift(0);
  const maxTimeRounded = Math.round(maxTime * 1000) / 1000;
  const lastTick = ticks[ticks.length - 1] || 0;
  if (lastTick < maxTimeRounded) ticks.push(maxTimeRounded);
  const uniqueTicks = [...new Set(ticks)]
    .filter(tick => tick >= 0 && tick <= maxTime + 0.01)
    .sort((a, b) => a - b);
  if (uniqueTicks.length === 0) return [0, maxTime || 1];
  if (uniqueTicks.length === 1) uniqueTicks.push(maxTime || 1);
  return uniqueTicks;
};

const getMaxTime = (data: { time: number }[]): number => {
  if (data.length === 0) return 1;
  const max = Math.max(...data.map(d => d.time));
  return max > 0 ? max : 1;
};

const formatTimeTick = (value: number, interval: number): string => {
  if (interval >= 1) {
    return Math.round(value).toString();
  } else if (interval >= 0.5) {
    return (Math.round(value * 10) / 10).toFixed(1);
  } else {
    return (Math.round(value * 100) / 100).toFixed(2);
  }
};

// Use in ALL charts (displacement, velocity, etc.)
const maxTime = getMaxTime(chartData);
const interval = getTimeInterval(maxTime);
const timeTicks = generateTimeTicks(maxTime, interval);
const validTicks = timeTicks.filter(t => t >= 0 && t <= maxTime * 1.1);

<XAxis
  dataKey="time"
  type="number"
  label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fill: '#fff' }}
  stroke="#fff"
  tick={{ fill: '#fff' }}
  domain={maxTime > 0 ? [0, maxTime * 1.05] : [0, 'dataMax']}
  ticks={validTicks.length >= 2 ? validTicks : undefined}
  tickFormatter={(value) => formatTimeTick(Number(value), interval)}
  allowDecimals={true}
/>
```

### Pattern 6: Animation Loop with User Interaction Detection

**Always check for user interaction before updating camera in animation loop:**

```typescript
const animate = () => {
  if (persistentThreeJS.scene && persistentThreeJS.camera && persistentThreeJS.renderer) {
    if (sceneRef.current && cameraRef.current && rendererRef.current) {
      // Check if user is actively interacting
      const isUserInteracting = mouseDownRef.current || isPanningRef.current || touchDownRef.current;
      
      if (!isUserInteracting) {
        // Auto-rotate if enabled
        if (autoRotate && !userHasRotatedRef.current) {
          simulationState.current.autoRotateStep += 0.002;
          cameraAngleRef.current.theta = simulationState.current.autoRotateStep;
        }
        
        // Update camera position based on current angles and distance
        const lookAtPoint = panOffsetRef.current;
        const radius = cameraDistanceRef.current;
        cameraRef.current.position.x = lookAtPoint.x + radius * Math.sin(cameraAngleRef.current.phi) * Math.cos(cameraAngleRef.current.theta);
        cameraRef.current.position.y = lookAtPoint.y + radius * Math.cos(cameraAngleRef.current.phi);
        cameraRef.current.position.z = lookAtPoint.z + radius * Math.sin(cameraAngleRef.current.phi) * Math.sin(cameraAngleRef.current.theta);
        cameraRef.current.lookAt(lookAtPoint);
      } else {
        // User is interacting - update camera from ref values (set by event handlers)
        const lookAtPoint = panOffsetRef.current;
        const radius = cameraDistanceRef.current;
        cameraRef.current.position.x = lookAtPoint.x + radius * Math.sin(cameraAngleRef.current.phi) * Math.cos(cameraAngleRef.current.theta);
        cameraRef.current.position.y = lookAtPoint.y + radius * Math.cos(cameraAngleRef.current.phi);
        cameraRef.current.position.z = lookAtPoint.z + radius * Math.sin(cameraAngleRef.current.phi) * Math.sin(cameraAngleRef.current.theta);
        cameraRef.current.lookAt(lookAtPoint);
      }
      
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }
  animationIdRef.current = requestAnimationFrame(animate);
};
```

---

## Troubleshooting

### Issue: White/blank screen

**Causes:**
- Scene not initializing
- Canvas not mounted
- Container has zero dimensions

**Solutions:**
- Check container dimensions with retry logic
- Verify `mountRef.current` exists
- Ensure `sceneReady` state updates correctly

### Issue: Controls not working

**Causes:**
- Event handlers not attached
- Canvas moved but handlers not reattached
- Event handlers not stored in refs

**Solutions:**
- Store handlers in `eventHandlersRef`
- Reattach handlers when canvas moves
- Verify handlers are attached to canvas, not window

### Issue: State not persisting

**Causes:**
- Using only React state
- Not syncing to persistent storage
- Clearing persistent state on unmount

**Solutions:**
- Use module-level `persistentState`
- Sync React state to persistent storage
- Don't clear persistent state on unmount

### Issue: Performance issues

**Causes:**
- Recreating Three.js objects
- Too many re-renders
- Animation loop not optimized

**Solutions:**
- Reuse Three.js objects
- Use refs for values that don't need re-renders
- Optimize animation loop (only update when needed)

### Issue: Camera controls not working after simulation runs

**Causes:**
- Animation loop updating camera position during user interaction
- Not checking for user interaction before updating camera
- Event handlers not properly attached

**Solutions:**
- Always check `mouseDownRef.current`, `isPanningRef.current`, and `touchDownRef.current` before updating camera
- Update camera position from refs even during interaction (so user input is reflected)
- Ensure event handlers are attached and stored in `eventHandlersRef` for proper cleanup/reattachment

### Issue: Time axis ticks not showing on velocity charts

**Causes:**
- Missing `type="number"` on XAxis
- Missing `validTicks` filtering
- Domain not properly configured

**Solutions:**
- Always use `type="number"` for time-based XAxis
- Filter ticks to ensure they're within domain: `const validTicks = timeTicks.filter(t => t >= 0 && t <= maxTime * 1.1)`
- Use consistent domain format: `domain={maxTime > 0 ? [0, maxTime * 1.05] : [0, 'dataMax']}`
- Apply same configuration to ALL charts (displacement, velocity, etc.)

### Issue: Mobile buttons not visible

**Causes:**
- z-index too low
- Safe area insets not applied
- Buttons positioned outside viewport

**Solutions:**
- Use high z-index (`z-[200]` or higher)
- Apply safe area insets
- Position buttons with `calc(env(safe-area-inset-bottom) + 20px)`

---

## Additional Resources

### Reference Implementations

- **Titration Simulator**: `components/simulations/TitrationSimulator.tsx`
- **Titration Wrapper**: `components/simulations/TitrationSimulatorWrapper.tsx`
- **Projectile Motion**: `components/simulations/ProjectileMotionSimulator.tsx`
- **Projectile Wrapper**: `components/simulations/ProjectileMotionSimulatorWrapper.tsx`

### Key Files to Study

1. `components/simulations/TitrationSimulator.tsx` - Complete implementation with all features
2. `constants.ts` - How simulations are registered
3. `components/SimulationsView.tsx` - How simulations are rendered

### Questions?

If you encounter issues not covered in this guide:

1. Check the reference implementations (TitrationSimulator, ProjectileMotionSimulator)
2. Review the troubleshooting section
3. Check console for errors
4. Verify all checklist items are completed

---

**Last Updated**: 2024  
**Version**: 1.0  
**Maintained by**: Development Team

