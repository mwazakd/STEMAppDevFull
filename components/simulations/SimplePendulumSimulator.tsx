import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { Play, Pause, RotateCcw, Target, Info, Settings, BarChart3, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  getDefaultCameraPosition, 
  getSavedCameraPosition,
  isAdmin,
  clearCameraPositionsCache
} from '../../services/cameraPositionService';
import type { CameraPosition } from '../../types/cameraPosition';
import CameraPositionAdmin from '../admin/CameraPositionAdmin';

const PIVOT_HEIGHT = 2.5; // Fixed height of the pivot point in meters

// Chart data types for Recharts
interface AngleDataPoint {
  time: number;
  angle: number;
}

interface DisplacementDataPoint {
  time: number;
  displacement: number;
}

interface VelocityDataPoint {
  time: number;
  velocity: number;
}

interface AccelerationDataPoint {
  time: number;
  acceleration: number;
}

interface PhaseSpaceVelocityPoint {
  displacement: number;
  velocity: number;
}

interface PhaseSpaceAccelerationPoint {
  displacement: number;
  acceleration: number;
}

// Legacy DataPoint type (for backward compatibility with existing simulationData)
type DataPoint = {
  time: number;
  angle: number;
  displacement: number;
  velocity: number;
  acceleration: number;
};

// Module-level storage for Three.js objects - persists across component unmounts/remounts
const persistentThreeJS = {
  scene: null as THREE.Scene | null,
  camera: null as THREE.PerspectiveCamera | null,
  renderer: null as THREE.WebGLRenderer | null,
  isInitialized: false,
  pivot: null as THREE.Mesh | null,
  bob: null as THREE.Mesh | null,
  stringLine: null as THREE.Line | null,
  ceiling: null as THREE.Mesh | null,
  simulationTime: 0,
  // Camera state persistence
  cameraAngle: { theta: 0, phi: Math.PI / 3 },
  cameraDistance: 5,
  panOffset: new THREE.Vector3(0, 1.5, 0),
};

// Module-level storage for React state - persists across component unmounts/remounts
const persistentState = {
  length: 1.0,
  initialAngle: 20,
  gravity: 9.81,
  airResistance: 0.2,
  isRunning: false,
  timeElapsed: 0,
  currentAngle: 20,
  currentVelocity: 0,
  simulationData: [] as DataPoint[], // Legacy - will be removed
  angleData: [] as AngleDataPoint[],
  displacementData: [] as DisplacementDataPoint[],
  velocityData: [] as VelocityDataPoint[],
  accelerationData: [] as AccelerationDataPoint[],
  phaseSpaceVelocityData: [] as PhaseSpaceVelocityPoint[],
  phaseSpaceAccelerationData: [] as PhaseSpaceAccelerationPoint[],
  chartView: 'time' as 'time' | 'displacement',
  showConfig: false,
  showChart: false,
  showAdminCamera: false,
  showChartSidebar: false,
  chartWidth: 384,
  isResizing: false,
  showTutorial: false,
  currentChartIndex: 0,
};

// Props interface for SimplePendulumSimulator
interface SimplePendulumSimulatorProps {
  isEmbedded?: boolean;
  onChartOpenChange?: (isOpen: boolean) => void;
  onTutorialOpenChange?: (isOpen: boolean) => void;
}

// Time axis helper functions for charts
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
  
  if (ticks.length === 0 || ticks[0] !== 0) {
    ticks.unshift(0);
  }
  
  const maxTimeRounded = Math.round(maxTime * 1000) / 1000;
  const lastTick = ticks[ticks.length - 1] || 0;
  if (lastTick < maxTimeRounded) {
    ticks.push(maxTimeRounded);
  }
  
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

export default function SimplePendulumSimulator({ 
  isEmbedded = false, 
  onChartOpenChange,
  onTutorialOpenChange
}: SimplePendulumSimulatorProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const simulationIntervalIdRef = useRef<number | null>(null);
  
  // Initialize state from persistent storage FIRST (before refs that depend on them)
  const [length, setLength] = useState(() => persistentState.length);
  const [initialAngle, setInitialAngle] = useState(() => persistentState.initialAngle);
  const [gravity, setGravity] = useState(() => persistentState.gravity);
  const [airResistance, setAirResistance] = useState(() => persistentState.airResistance);
  
  // Use refs to store current physics parameters to avoid closure issues
  // This ensures the simulation loop always uses the latest values, even when switching views
  // Initialize refs from persistentState directly to avoid accessing state before initialization
  const lengthRef = useRef(persistentState.length);
  const initialAngleRef = useRef(persistentState.initialAngle);
  const gravityRef = useRef(persistentState.gravity);
  const airResistanceRef = useRef(persistentState.airResistance);
  
  // Update refs when values change - this ensures they're always current
  useEffect(() => {
    lengthRef.current = length;
  }, [length]);
  useEffect(() => {
    initialAngleRef.current = initialAngle;
  }, [initialAngle]);
  useEffect(() => {
    gravityRef.current = gravity;
  }, [gravity]);
  useEffect(() => {
    airResistanceRef.current = airResistance;
  }, [airResistance]);
  
  // Simulation state
  const [isRunning, setIsRunning] = useState(() => persistentState.isRunning);
  const [timeElapsed, setTimeElapsed] = useState(() => persistentState.timeElapsed);
  const [currentAngle, setCurrentAngle] = useState(() => persistentState.currentAngle);
  const [currentVelocity, setCurrentVelocity] = useState(() => persistentState.currentVelocity);
  const [simulationData, setSimulationData] = useState<DataPoint[]>(() => [...persistentState.simulationData]);
  const [chartView, setChartView] = useState<'time' | 'displacement'>(() => persistentState.chartView);
  
  // Chart data state
  const [angleData, setAngleData] = useState<AngleDataPoint[]>(() => [...persistentState.angleData]);
  const [displacementData, setDisplacementData] = useState<DisplacementDataPoint[]>(() => [...persistentState.displacementData]);
  const [velocityData, setVelocityData] = useState<VelocityDataPoint[]>(() => [...persistentState.velocityData]);
  const [accelerationData, setAccelerationData] = useState<AccelerationDataPoint[]>(() => [...persistentState.accelerationData]);
  const [phaseSpaceVelocityData, setPhaseSpaceVelocityData] = useState<PhaseSpaceVelocityPoint[]>(() => [...persistentState.phaseSpaceVelocityData]);
  const [phaseSpaceAccelerationData, setPhaseSpaceAccelerationData] = useState<PhaseSpaceAccelerationPoint[]>(() => [...persistentState.phaseSpaceAccelerationData]);
  
  // UI Overlay States
  const [showConfig, setShowConfig] = useState(() => persistentState.showConfig);
  const [showChart, setShowChart] = useState(() => persistentState.showChart);
  const [showAdminCamera, setShowAdminCamera] = useState(() => persistentState.showAdminCamera);
  const [showChartSidebar, setShowChartSidebar] = useState(() => persistentState.showChartSidebar);
  const [chartWidth, setChartWidth] = useState(() => persistentState.chartWidth);
  const [isResizing, setIsResizing] = useState(() => persistentState.isResizing);
  const [showTutorial, setShowTutorial] = useState(() => persistentState.showTutorial);
  const [currentChartIndex, setCurrentChartIndex] = useState(() => persistentState.currentChartIndex);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [sceneReady, setSceneReady] = useState(() => persistentThreeJS.isInitialized);
  
  // Load default camera position from config (admin-controlled)
  const [defaultCameraPosition, setDefaultCameraPosition] = useState<CameraPosition | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  
  // Camera state for admin component (updates periodically to reflect current camera position)
  const [cameraStateForAdmin, setCameraStateForAdmin] = useState({
    cameraAngle: { ...persistentThreeJS.cameraAngle },
    cameraDistance: persistentThreeJS.cameraDistance,
    panOffset: persistentThreeJS.panOffset.clone()
  });
  
  // Update camera state for admin component periodically (only when admin is active)
  useEffect(() => {
    if (!isAdminUser || !sceneReady) return;
    
    const interval = setInterval(() => {
      setCameraStateForAdmin({
        cameraAngle: { ...cameraAngleRef.current },
        cameraDistance: cameraDistanceRef.current,
        panOffset: panOffsetRef.current.clone()
      });
    }, 100); // Update every 100ms
    
    return () => clearInterval(interval);
  }, [isAdminUser, sceneReady]);
  
  // Load default camera position and check admin status
  useEffect(() => {
    // Check admin status
    setIsAdminUser(isAdmin());
    
    // Load default camera position
    const loadDefaultPosition = async () => {
      // Check for saved position (admin override) first
      const savedPosition = getSavedCameraPosition('simple-pendulum');
      if (savedPosition) {
        setDefaultCameraPosition(savedPosition);
        return;
      }
      
      // Load from config file
      const position = await getDefaultCameraPosition('simple-pendulum');
      if (position) {
        setDefaultCameraPosition(position);
      }
    };
    
    loadDefaultPosition();
  }, []);
  
  // Camera control refs - initialize from persistent storage
  const mouseDownRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({ ...persistentThreeJS.cameraAngle });
  const cameraDistanceRef = useRef(persistentThreeJS.cameraDistance);
  const panOffsetRef = useRef(persistentThreeJS.panOffset.clone());
  const touchDownRef = useRef(false);
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const isMiddleMouseRef = useRef(false);
  const touchPanModeRef = useRef(false);
  const userHasRotatedRef = useRef(false);
  const initialDistanceRef = useRef(0);
  const initialCameraDistanceRef = useRef(5);
  const initialTouchCenterRef = useRef({ x: 0, y: 0 });
  
  // Store event handlers in refs so they persist and can be properly removed/reattached
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
  
  // Track window size to detect mobile
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
  
  // Sync state changes to persistent storage
  useEffect(() => {
    persistentState.length = length;
  }, [length]);
  
  useEffect(() => {
    persistentState.initialAngle = initialAngle;
  }, [initialAngle]);
  
  useEffect(() => {
    persistentState.gravity = gravity;
  }, [gravity]);
  
  useEffect(() => {
    persistentState.airResistance = airResistance;
  }, [airResistance]);
  
  useEffect(() => {
    persistentState.isRunning = isRunning;
  }, [isRunning]);
  
  useEffect(() => {
    persistentState.timeElapsed = timeElapsed;
  }, [timeElapsed]);
  
  useEffect(() => {
    persistentState.currentAngle = currentAngle;
  }, [currentAngle]);
  
  useEffect(() => {
    persistentState.currentVelocity = currentVelocity;
  }, [currentVelocity]);
  
  useEffect(() => {
    persistentState.simulationData = simulationData; // Legacy
  }, [simulationData]);
  
  useEffect(() => {
    persistentState.angleData = [...angleData];
  }, [angleData]);
  
  useEffect(() => {
    persistentState.displacementData = [...displacementData];
  }, [displacementData]);
  
  useEffect(() => {
    persistentState.velocityData = [...velocityData];
  }, [velocityData]);
  
  useEffect(() => {
    persistentState.accelerationData = [...accelerationData];
  }, [accelerationData]);
  
  useEffect(() => {
    persistentState.phaseSpaceVelocityData = [...phaseSpaceVelocityData];
  }, [phaseSpaceVelocityData]);
  
  useEffect(() => {
    persistentState.phaseSpaceAccelerationData = [...phaseSpaceAccelerationData];
  }, [phaseSpaceAccelerationData]);
  
  useEffect(() => {
    persistentThreeJS.simulationTime = timeElapsed;
  }, [timeElapsed]);
  
  // Sync camera refs to persistent storage (will be called from event handlers)

  // Derived physics values
  const naturalOmega = Math.sqrt(gravity / length); // Natural Angular frequency
  const isUnderdamped = naturalOmega * naturalOmega > airResistance * airResistance;
  const dampedOmega = isUnderdamped ? Math.sqrt(naturalOmega * naturalOmega - airResistance * airResistance) : 0;
  const period = isUnderdamped ? (2 * Math.PI / dampedOmega) : Infinity;
  const initialAngleRad = initialAngle * Math.PI / 180;

  // Setup the Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;
    
    const mount = mountRef.current;
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
        // Retry after a short delay if still zero (with max retries)
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(checkAndInit, 100);
        }
        return;
      }
      
      // Reuse existing scene if available
      if (persistentThreeJS.isInitialized && persistentThreeJS.scene && persistentThreeJS.camera && persistentThreeJS.renderer) {
        // Restore refs from persistent storage
        sceneRef.current = persistentThreeJS.scene;
        cameraRef.current = persistentThreeJS.camera;
        rendererRef.current = persistentThreeJS.renderer;
        
        // Check if default position should be applied (if camera hasn't been customized)
        // This ensures new users see the admin-set default position
        if (defaultCameraPosition && !userHasRotatedRef.current) {
          // Apply default camera position (admin-controlled)
          cameraAngleRef.current = { ...defaultCameraPosition.cameraAngle };
          cameraDistanceRef.current = defaultCameraPosition.cameraDistance;
          panOffsetRef.current = new THREE.Vector3(
            defaultCameraPosition.panOffset.x,
            defaultCameraPosition.panOffset.y,
            defaultCameraPosition.panOffset.z
          );
          
          // Update persistent storage with default position
          persistentThreeJS.cameraAngle = { ...cameraAngleRef.current };
          persistentThreeJS.cameraDistance = cameraDistanceRef.current;
          persistentThreeJS.panOffset = panOffsetRef.current.clone();
        } else {
          // Restore camera state from persistent storage (user's custom position)
          cameraAngleRef.current = { ...persistentThreeJS.cameraAngle };
          cameraDistanceRef.current = persistentThreeJS.cameraDistance;
          panOffsetRef.current = persistentThreeJS.panOffset.clone();
        }
        
        // Restore camera position based on current state
        const lookAtPoint = panOffsetRef.current;
        const radius = cameraDistanceRef.current;
        persistentThreeJS.camera.position.x = lookAtPoint.x + radius * Math.sin(cameraAngleRef.current.phi) * Math.cos(cameraAngleRef.current.theta);
        persistentThreeJS.camera.position.y = lookAtPoint.y + radius * Math.cos(cameraAngleRef.current.phi);
        persistentThreeJS.camera.position.z = lookAtPoint.z + radius * Math.sin(cameraAngleRef.current.phi) * Math.sin(cameraAngleRef.current.theta);
        persistentThreeJS.camera.lookAt(lookAtPoint);
        
        // Restore bob position from current state (if simulation is running or was running)
        if (persistentThreeJS.bob && persistentThreeJS.stringLine && persistentThreeJS.pivot) {
          const currentAngleRad = persistentState.currentAngle * Math.PI / 180;
          const currentLength = persistentState.length;
          const x = currentLength * Math.sin(currentAngleRad);
          const y = PIVOT_HEIGHT - currentLength * Math.cos(currentAngleRad);
          persistentThreeJS.bob.position.set(x, y, 0);
          persistentThreeJS.stringLine.geometry.setFromPoints([persistentThreeJS.pivot.position, persistentThreeJS.bob.position]);
          persistentThreeJS.stringLine.geometry.attributes.position.needsUpdate = true;
        }
        
        const canvas = persistentThreeJS.renderer.domElement;
        
        // Move canvas to current mount point if needed
        if (!mountRef.current.contains(canvas)) {
          // Remove from old parent if it exists
          if (canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
          }
          // Add to new container
          mountRef.current.appendChild(canvas);
        }
        
        // Update size for current container
        persistentThreeJS.renderer.setSize(width, height);
        persistentThreeJS.camera.aspect = width / height;
        persistentThreeJS.camera.updateProjectionMatrix();
        
        // Force a render to ensure scene is visible
        if (persistentThreeJS.scene && persistentThreeJS.camera && persistentThreeJS.renderer) {
          persistentThreeJS.renderer.render(persistentThreeJS.scene, persistentThreeJS.camera);
        }
        
        // Restart animation loop (cancel any existing one first to avoid duplicates)
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
        }
        const animate = () => {
          animationFrameIdRef.current = requestAnimationFrame(animate);
          // Use persistent objects first, then fall back to refs
          const scene = persistentThreeJS.scene || sceneRef.current;
          const camera = persistentThreeJS.camera || cameraRef.current;
          const renderer = persistentThreeJS.renderer || rendererRef.current;
          
          if (scene && camera && renderer) {
            // Check if user is actively interacting
            const isUserInteracting = mouseDownRef.current || isPanningRef.current || touchDownRef.current;
            
            if (!isUserInteracting) {
              // Update camera position based on current angles and distance
              const lookAtPoint = panOffsetRef.current;
              const radius = cameraDistanceRef.current;
              camera.position.x = lookAtPoint.x + radius * Math.sin(cameraAngleRef.current.phi) * Math.cos(cameraAngleRef.current.theta);
              camera.position.y = lookAtPoint.y + radius * Math.cos(cameraAngleRef.current.phi);
              camera.position.z = lookAtPoint.z + radius * Math.sin(cameraAngleRef.current.phi) * Math.sin(cameraAngleRef.current.theta);
              camera.lookAt(lookAtPoint);
            } else {
              // User is interacting - update camera from ref values (set by event handlers)
              const lookAtPoint = panOffsetRef.current;
              const radius = cameraDistanceRef.current;
              camera.position.x = lookAtPoint.x + radius * Math.sin(cameraAngleRef.current.phi) * Math.cos(cameraAngleRef.current.theta);
              camera.position.y = lookAtPoint.y + radius * Math.cos(cameraAngleRef.current.phi);
              camera.position.z = lookAtPoint.z + radius * Math.sin(cameraAngleRef.current.phi) * Math.sin(cameraAngleRef.current.theta);
              camera.lookAt(lookAtPoint);
            }
            
            renderer.render(scene, camera);
          }
        };
        animate();
        
        // Event handlers will be attached in the isEmbedded useEffect (which runs after this)
        requestAnimationFrame(() => {
          setSceneReady(true);
        });
        
        return;
      }
      
      // First time initialization
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a202c);
      sceneRef.current = scene;
      persistentThreeJS.scene = scene;

      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
      // Position camera to view pendulum oscillations: from side at slight angle
      // This provides optimal view of the pendulum's swing motion (left-right oscillations)
      camera.position.set(4, 1.8, 1.5);
      camera.lookAt(0, 1.5, 0); // Look at center of oscillation (pivot height - average bob position)
      cameraRef.current = camera;
      persistentThreeJS.camera = camera;
    
    // Initialize camera control refs to match initial camera position
    const initialCameraDistance = Math.sqrt(
      Math.pow(camera.position.x - panOffsetRef.current.x, 2) +
      Math.pow(camera.position.y - panOffsetRef.current.y, 2) +
      Math.pow(camera.position.z - panOffsetRef.current.z, 2)
    );
    cameraDistanceRef.current = initialCameraDistance;
    
    const dx = camera.position.x - panOffsetRef.current.x;
    const dy = camera.position.y - panOffsetRef.current.y;
    const dz = camera.position.z - panOffsetRef.current.z;
    cameraAngleRef.current.theta = Math.atan2(dx, dz);
    cameraAngleRef.current.phi = Math.acos(dy / initialCameraDistance);
    
    // Save initial camera state to persistent storage
    persistentThreeJS.cameraAngle = { ...cameraAngleRef.current };
    persistentThreeJS.cameraDistance = cameraDistanceRef.current;
    persistentThreeJS.panOffset = panOffsetRef.current.clone();

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    persistentThreeJS.renderer = renderer;
    mount.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const spotLight = new THREE.SpotLight(0xffffff, 0.8, 20, Math.PI / 6, 0.5);
    spotLight.position.set(3, 4, 3);
    spotLight.castShadow = true;
    scene.add(spotLight);
    
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: 0x4a5568 }));
    ceiling.position.y = PIVOT_HEIGHT + 0.01;
    ceiling.rotation.x = Math.PI / 2;
    scene.add(ceiling);
    persistentThreeJS.ceiling = ceiling;

    const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.02), new THREE.MeshStandardMaterial({ color: 0xa0aec0 }));
    pivot.position.set(0, PIVOT_HEIGHT, 0);
    scene.add(pivot);
    persistentThreeJS.pivot = pivot;

      const bob = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshStandardMaterial({ color: 0x38b2ac, roughness: 0.3 }));
      bob.castShadow = true;
      // Set initial bob position
      const initialAngleRad = initialAngle * Math.PI / 180;
      const x = length * Math.sin(initialAngleRad);
      const y = PIVOT_HEIGHT - length * Math.cos(initialAngleRad);
      bob.position.set(x, y, 0);
      scene.add(bob);
      persistentThreeJS.bob = bob;

    const stringMaterial = new THREE.LineBasicMaterial({ color: 0xcccccc });
    const stringGeometry = new THREE.BufferGeometry().setFromPoints([pivot.position, bob.position]);
    const stringLine = new THREE.Line(stringGeometry, stringMaterial);
    scene.add(stringLine);
    persistentThreeJS.stringLine = stringLine;
    
    persistentThreeJS.isInitialized = true;
    
    // Animation loop - check for user interaction before updating camera
    // Use persistent Three.js objects directly to ensure they work across view switches
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      // Use persistent objects first, then fall back to refs
      const scene = persistentThreeJS.scene || sceneRef.current;
      const camera = persistentThreeJS.camera || cameraRef.current;
      const renderer = persistentThreeJS.renderer || rendererRef.current;
      
      if (scene && camera && renderer) {
        // Check if user is actively interacting
        const isUserInteracting = mouseDownRef.current || isPanningRef.current || touchDownRef.current;
        
        if (!isUserInteracting) {
          // Update camera position based on current angles and distance
          const lookAtPoint = panOffsetRef.current;
          const radius = cameraDistanceRef.current;
          camera.position.x = lookAtPoint.x + radius * Math.sin(cameraAngleRef.current.phi) * Math.cos(cameraAngleRef.current.theta);
          camera.position.y = lookAtPoint.y + radius * Math.cos(cameraAngleRef.current.phi);
          camera.position.z = lookAtPoint.z + radius * Math.sin(cameraAngleRef.current.phi) * Math.sin(cameraAngleRef.current.theta);
          camera.lookAt(lookAtPoint);
        } else {
          // User is interacting - update camera from ref values (set by event handlers)
          const lookAtPoint = panOffsetRef.current;
          const radius = cameraDistanceRef.current;
          camera.position.x = lookAtPoint.x + radius * Math.sin(cameraAngleRef.current.phi) * Math.cos(cameraAngleRef.current.theta);
          camera.position.y = lookAtPoint.y + radius * Math.cos(cameraAngleRef.current.phi);
          camera.position.z = lookAtPoint.z + radius * Math.sin(cameraAngleRef.current.phi) * Math.sin(cameraAngleRef.current.theta);
          camera.lookAt(lookAtPoint);
        }
        
        renderer.render(scene, camera);
      }
    };
    animate();
    
    // Force initial render to ensure scene is visible
    if (scene && camera && renderer) {
      renderer.render(scene, camera);
    }
    
    // Event handlers for camera controls - attach immediately on initial setup
    const handleMouseDown = eventHandlersRef.current.handleMouseDown || ((e: MouseEvent) => {
      // Detect middle mouse button (button 1) or Ctrl+Left click for panning
      if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
        isPanningRef.current = true;
        isMiddleMouseRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      } else if (e.button === 0) {
        // Left mouse button - orbit
        mouseDownRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        userHasRotatedRef.current = true;
      }
    });
    
    const handleMouseMove = eventHandlersRef.current.handleMouseMove || ((e: MouseEvent) => {
      if (isPanningRef.current && cameraRef.current) {
        // Panning mode - translate look-at point
        const deltaX = e.clientX - lastMouseRef.current.x;
        const deltaY = e.clientY - lastMouseRef.current.y;
        
        // Calculate camera's right and up vectors for panning
        const forward = new THREE.Vector3();
        cameraRef.current.getWorldDirection(forward);
        const right = new THREE.Vector3();
        right.crossVectors(forward, cameraRef.current.up).normalize();
        const up = cameraRef.current.up.clone().normalize();
        
        // Pan speed based on distance from look-at point
        const panSpeed = cameraDistanceRef.current * 0.001;
        
        // Update pan offset (look-at point)
        panOffsetRef.current.add(right.multiplyScalar(-deltaX * panSpeed));
        panOffsetRef.current.add(up.multiplyScalar(deltaY * panSpeed));
        
        // Sync to persistent storage
        persistentThreeJS.panOffset = panOffsetRef.current.clone();
        
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      } else if (mouseDownRef.current && cameraRef.current && !isMiddleMouseRef.current) {
        // Orbit mode - rotate around look-at point
        const deltaX = e.clientX - lastMouseRef.current.x;
        const deltaY = e.clientY - lastMouseRef.current.y;
        
        cameraAngleRef.current.theta += deltaX * 0.005;
        cameraAngleRef.current.phi -= deltaY * 0.005;
        cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2, cameraAngleRef.current.phi));
        
        // Sync to persistent storage
        persistentThreeJS.cameraAngle = { ...cameraAngleRef.current };
        
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      }
    });
    
    const handleMouseUp = eventHandlersRef.current.handleMouseUp || (() => {
      if (isMiddleMouseRef.current) {
        isPanningRef.current = false;
        isMiddleMouseRef.current = false;
      } else {
        mouseDownRef.current = false;
      }
    });
    
    const handleWheel = eventHandlersRef.current.handleWheel || ((e: WheelEvent) => {
      e.preventDefault();
      if (cameraRef.current) {
        const delta = e.deltaY * 0.01;
        
        // Blender-style zoom: change distance along view direction
        const zoomSpeed = 0.5;
        const newDistance = cameraDistanceRef.current + (delta * zoomSpeed);
        cameraDistanceRef.current = Math.max(2, Math.min(20, newDistance));
        
        // Sync to persistent storage
        persistentThreeJS.cameraDistance = cameraDistanceRef.current;
      }
    });
    
    // Touch event handlers for mobile
    const handleTouchStart = eventHandlersRef.current.handleTouchStart || ((e: TouchEvent) => {
      e.preventDefault();
      touchDownRef.current = true;
      
      if (e.touches.length === 1) {
        // Single touch - rotation
        const touch = e.touches[0];
        lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
        touchPanModeRef.current = false;
        userHasRotatedRef.current = true;
      } else if (e.touches.length === 2) {
        // Two touches - determine if pan or zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) + 
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        initialDistanceRef.current = distance;
        initialCameraDistanceRef.current = cameraDistanceRef.current;
        
        // Calculate initial center point
        initialTouchCenterRef.current = {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2
        };
        
        // Reset pan mode - will be determined in handleTouchMove
        touchPanModeRef.current = false;
      }
    });
    
    const handleTouchMove = eventHandlersRef.current.handleTouchMove || ((e: TouchEvent) => {
      e.preventDefault();
      
      if (e.touches.length === 1 && touchDownRef.current && cameraRef.current) {
        // Single touch - rotation
        const touch = e.touches[0];
        const deltaX = touch.clientX - lastTouchRef.current.x;
        const deltaY = touch.clientY - lastTouchRef.current.y;
        
        cameraAngleRef.current.theta += deltaX * 0.005;
        cameraAngleRef.current.phi -= deltaY * 0.005;
        cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2, cameraAngleRef.current.phi));
        
        // Sync to persistent storage
        persistentThreeJS.cameraAngle = { ...cameraAngleRef.current };
        
        lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      } else if (e.touches.length === 2 && cameraRef.current) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) + 
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        
        // Calculate current center point
        const currentCenter = {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2
        };
        
        // Calculate how much distance changed (for zoom detection)
        const distanceChange = Math.abs(distance - initialDistanceRef.current);
        const distanceChangePercent = distanceChange / initialDistanceRef.current;
        
        // Calculate how much center moved (for pan detection)
        const centerMove = Math.sqrt(
          Math.pow(currentCenter.x - initialTouchCenterRef.current.x, 2) +
          Math.pow(currentCenter.y - initialTouchCenterRef.current.y, 2)
        );
        
        // Determine if this is pan or zoom based on which change is more significant
        const isZoom = distanceChangePercent > 0.15 && distanceChangePercent > (centerMove / initialDistanceRef.current);
        
        if (isZoom) {
          // Pinch to zoom
          touchPanModeRef.current = false;
          const scale = distance / initialDistanceRef.current;
          
          // Calculate new distance based on scale change
          const zoomSpeed = 0.5;
          const distanceChange = (1 - scale) * initialCameraDistanceRef.current * zoomSpeed;
          const newDistance = initialCameraDistanceRef.current + distanceChange;
          cameraDistanceRef.current = Math.max(2, Math.min(20, newDistance));
          
          // Sync to persistent storage
          persistentThreeJS.cameraDistance = cameraDistanceRef.current;
          
          // Update initial distance for next frame
          initialDistanceRef.current = distance;
          initialCameraDistanceRef.current = cameraDistanceRef.current;
        } else {
          // Two-finger pan
          touchPanModeRef.current = true;
          isPanningRef.current = true;
          
          const deltaX = currentCenter.x - initialTouchCenterRef.current.x;
          const deltaY = currentCenter.y - initialTouchCenterRef.current.y;
          
          // Calculate camera's right and up vectors for panning
          const forward = new THREE.Vector3();
          cameraRef.current.getWorldDirection(forward);
          const right = new THREE.Vector3();
          right.crossVectors(forward, cameraRef.current.up).normalize();
          const up = cameraRef.current.up.clone().normalize();
          
          // Pan speed based on distance from look-at point
          const panSpeed = cameraDistanceRef.current * 0.001;
          
          // Update pan offset (look-at point)
          panOffsetRef.current.add(right.multiplyScalar(-deltaX * panSpeed));
          panOffsetRef.current.add(up.multiplyScalar(deltaY * panSpeed));
          
          // Sync to persistent storage
          persistentThreeJS.panOffset = panOffsetRef.current.clone();
          
          // Update initial center for next frame
          initialTouchCenterRef.current = currentCenter;
        }
      }
    });
    
    const handleTouchEnd = eventHandlersRef.current.handleTouchEnd || ((e: TouchEvent) => {
      e.preventDefault();
      touchDownRef.current = false;
      touchPanModeRef.current = false;
      isPanningRef.current = false;
    });
    
    // Store handlers in refs for future reuse
    if (!eventHandlersRef.current.handleMouseDown) {
      eventHandlersRef.current.handleMouseDown = handleMouseDown;
      eventHandlersRef.current.handleMouseMove = handleMouseMove;
      eventHandlersRef.current.handleMouseUp = handleMouseUp;
      eventHandlersRef.current.handleWheel = handleWheel;
      eventHandlersRef.current.handleTouchStart = handleTouchStart;
      eventHandlersRef.current.handleTouchMove = handleTouchMove;
      eventHandlersRef.current.handleTouchEnd = handleTouchEnd;
    }
    
    const handleContextMenu = eventHandlersRef.current.handleContextMenu || ((e: Event) => {
      if (isMiddleMouseRef.current) {
        e.preventDefault();
      }
    });
    
    if (!eventHandlersRef.current.handleContextMenu) {
      eventHandlersRef.current.handleContextMenu = handleContextMenu;
    }
    
    // Attach event listeners to canvas immediately on initial setup
    if (rendererRef.current) {
      rendererRef.current.domElement.addEventListener('contextmenu', handleContextMenu);
      rendererRef.current.domElement.addEventListener('mousedown', handleMouseDown);
      rendererRef.current.domElement.addEventListener('mousemove', handleMouseMove);
      rendererRef.current.domElement.addEventListener('mouseup', handleMouseUp);
      rendererRef.current.domElement.addEventListener('wheel', handleWheel);
      
      // Add touch event listeners
      rendererRef.current.domElement.addEventListener('touchstart', handleTouchStart, { passive: false });
      rendererRef.current.domElement.addEventListener('touchmove', handleTouchMove, { passive: false });
      rendererRef.current.domElement.addEventListener('touchend', handleTouchEnd, { passive: false });
    }
    
    requestAnimationFrame(() => {
      setSceneReady(true);
    });
  };
  
  // Start initialization
  checkAndInit();
  
  return () => {
    if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    // Note: We don't dispose Three.js objects here - they persist in persistentThreeJS
  };
}, [isEmbedded]);
  
  // Set up resize observer after scene is ready
  useEffect(() => {
    if (!sceneReady || !mountRef.current || !rendererRef.current || !cameraRef.current) return;
    
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mountRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [sceneReady]);
  
  // Handle isEmbedded prop changes - move canvas and update size without reinitializing
  // This also ensures event handlers are properly attached
  useEffect(() => {
    // Use persistent renderer if available, otherwise use component ref
    const renderer = persistentThreeJS.renderer || rendererRef.current;
    if (!renderer || !mountRef.current) return;
    
    const canvas = renderer.domElement;
    const rect = mountRef.current.getBoundingClientRect();
    let width = rect.width;
    let height = rect.height;
    
    // For screens ≤576px: fix height at 475px for embedded mode
    if (isEmbedded && window.innerWidth <= 576) {
      height = 475;
    }
    
    // Small delay to ensure container is rendered
    const timeoutId = setTimeout(() => {
      // Move canvas to current mount point if needed
      if (!mountRef.current.contains(canvas)) {
        // Remove from old parent if it exists
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        // Add to new container
        mountRef.current.appendChild(canvas);
      }
      
      // Reattach event listeners after canvas move to ensure they work
      // This is critical when canvas is moved between containers
      // Use stored handlers if available, otherwise create new ones
      const handleMouseDown = eventHandlersRef.current.handleMouseDown || ((e: MouseEvent) => {
        // Detect middle mouse button (button 1) or Ctrl+Left click for panning
        if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
          isPanningRef.current = true;
          isMiddleMouseRef.current = true;
          lastMouseRef.current = { x: e.clientX, y: e.clientY };
        } else if (e.button === 0) {
          // Left mouse button - orbit
          mouseDownRef.current = true;
          lastMouseRef.current = { x: e.clientX, y: e.clientY };
          userHasRotatedRef.current = true;
        }
      });
      
      const handleMouseMove = eventHandlersRef.current.handleMouseMove || ((e: MouseEvent) => {
        if (isPanningRef.current && cameraRef.current) {
          // Panning mode - translate look-at point
          const deltaX = e.clientX - lastMouseRef.current.x;
          const deltaY = e.clientY - lastMouseRef.current.y;
          
          // Calculate camera's right and up vectors for panning
          const forward = new THREE.Vector3();
          cameraRef.current.getWorldDirection(forward);
          const right = new THREE.Vector3();
          right.crossVectors(forward, cameraRef.current.up).normalize();
          const up = cameraRef.current.up.clone().normalize();
          
          // Pan speed based on distance from look-at point
          const panSpeed = cameraDistanceRef.current * 0.001;
          
          // Update pan offset (look-at point)
          panOffsetRef.current.add(right.multiplyScalar(-deltaX * panSpeed));
          panOffsetRef.current.add(up.multiplyScalar(deltaY * panSpeed));
          
          // Sync to persistent storage
          persistentThreeJS.panOffset = panOffsetRef.current.clone();
          
          lastMouseRef.current = { x: e.clientX, y: e.clientY };
        } else if (mouseDownRef.current && cameraRef.current && !isMiddleMouseRef.current) {
          // Orbit mode - rotate around look-at point
          const deltaX = e.clientX - lastMouseRef.current.x;
          const deltaY = e.clientY - lastMouseRef.current.y;
          
          cameraAngleRef.current.theta += deltaX * 0.005;
          cameraAngleRef.current.phi -= deltaY * 0.005;
          cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2, cameraAngleRef.current.phi));
          
          // Sync to persistent storage
          persistentThreeJS.cameraAngle = { ...cameraAngleRef.current };
          
          lastMouseRef.current = { x: e.clientX, y: e.clientY };
        }
      });
      
      const handleMouseUp = eventHandlersRef.current.handleMouseUp || (() => {
        if (isMiddleMouseRef.current) {
          isPanningRef.current = false;
          isMiddleMouseRef.current = false;
        } else {
          mouseDownRef.current = false;
        }
      });
      
      const handleWheel = eventHandlersRef.current.handleWheel || ((e: WheelEvent) => {
        e.preventDefault();
        if (cameraRef.current) {
          const delta = e.deltaY * 0.01;
          
          // Blender-style zoom: change distance along view direction
          const zoomSpeed = 0.5;
          const newDistance = cameraDistanceRef.current + (delta * zoomSpeed);
          cameraDistanceRef.current = Math.max(2, Math.min(20, newDistance));
          
          // Sync to persistent storage
          persistentThreeJS.cameraDistance = cameraDistanceRef.current;
        }
      });
      
      // Touch event handlers for mobile
      const handleTouchStart = eventHandlersRef.current.handleTouchStart || ((e: TouchEvent) => {
        e.preventDefault();
        touchDownRef.current = true;
        
        if (e.touches.length === 1) {
          // Single touch - rotation
          const touch = e.touches[0];
          lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
          touchPanModeRef.current = false;
          userHasRotatedRef.current = true;
        } else if (e.touches.length === 2) {
          // Two touches - determine if pan or zoom
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          const distance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) + 
            Math.pow(touch2.clientY - touch1.clientY, 2)
          );
          initialDistanceRef.current = distance;
          initialCameraDistanceRef.current = cameraDistanceRef.current;
          
          // Calculate initial center point
          initialTouchCenterRef.current = {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
          };
          
          // Reset pan mode - will be determined in handleTouchMove
          touchPanModeRef.current = false;
        }
      });
      
      const handleTouchMove = eventHandlersRef.current.handleTouchMove || ((e: TouchEvent) => {
        e.preventDefault();
        
        if (e.touches.length === 1 && touchDownRef.current && cameraRef.current) {
          // Single touch - rotation
          const touch = e.touches[0];
          const deltaX = touch.clientX - lastTouchRef.current.x;
          const deltaY = touch.clientY - lastTouchRef.current.y;
          
          cameraAngleRef.current.theta += deltaX * 0.005;
          cameraAngleRef.current.phi -= deltaY * 0.005;
          cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2, cameraAngleRef.current.phi));
          
          // Sync to persistent storage
          persistentThreeJS.cameraAngle = { ...cameraAngleRef.current };
          
          lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
        } else if (e.touches.length === 2 && cameraRef.current) {
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          const distance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) + 
            Math.pow(touch2.clientY - touch1.clientY, 2)
          );
          
          // Calculate current center point
          const currentCenter = {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
          };
          
          // Calculate how much distance changed (for zoom detection)
          const distanceChange = Math.abs(distance - initialDistanceRef.current);
          const distanceChangePercent = distanceChange / initialDistanceRef.current;
          
          // Calculate how much center moved (for pan detection)
          const centerMove = Math.sqrt(
            Math.pow(currentCenter.x - initialTouchCenterRef.current.x, 2) +
            Math.pow(currentCenter.y - initialTouchCenterRef.current.y, 2)
          );
          
          // Determine if this is pan or zoom based on which change is more significant
          const isZoom = distanceChangePercent > 0.15 && distanceChangePercent > (centerMove / initialDistanceRef.current);
          
          if (isZoom) {
            // Pinch to zoom
            touchPanModeRef.current = false;
            const scale = distance / initialDistanceRef.current;
            
            // Calculate new distance based on scale change
            const zoomSpeed = 0.5;
            const distanceChange = (1 - scale) * initialCameraDistanceRef.current * zoomSpeed;
            const newDistance = initialCameraDistanceRef.current + distanceChange;
            cameraDistanceRef.current = Math.max(2, Math.min(20, newDistance));
            
            // Sync to persistent storage
            persistentThreeJS.cameraDistance = cameraDistanceRef.current;
            
            // Update initial distance for next frame
            initialDistanceRef.current = distance;
            initialCameraDistanceRef.current = cameraDistanceRef.current;
          } else {
            // Two-finger pan
            touchPanModeRef.current = true;
            isPanningRef.current = true;
            
            const deltaX = currentCenter.x - initialTouchCenterRef.current.x;
            const deltaY = currentCenter.y - initialTouchCenterRef.current.y;
            
            // Calculate camera's right and up vectors for panning
            const forward = new THREE.Vector3();
            cameraRef.current.getWorldDirection(forward);
            const right = new THREE.Vector3();
            right.crossVectors(forward, cameraRef.current.up).normalize();
            const up = cameraRef.current.up.clone().normalize();
            
            // Pan speed based on distance from look-at point
            const panSpeed = cameraDistanceRef.current * 0.001;
            
            // Update pan offset (look-at point)
            panOffsetRef.current.add(right.multiplyScalar(-deltaX * panSpeed));
            panOffsetRef.current.add(up.multiplyScalar(deltaY * panSpeed));
            
            // Sync to persistent storage
            persistentThreeJS.panOffset = panOffsetRef.current.clone();
            
            // Update initial center for next frame
            initialTouchCenterRef.current = currentCenter;
          }
        }
      });
      
      const handleTouchEnd = eventHandlersRef.current.handleTouchEnd || ((e: TouchEvent) => {
        e.preventDefault();
        touchDownRef.current = false;
        touchPanModeRef.current = false;
        isPanningRef.current = false;
      });
      
      // Store handlers in refs for future reuse
      if (!eventHandlersRef.current.handleMouseDown) {
        eventHandlersRef.current.handleMouseDown = handleMouseDown;
        eventHandlersRef.current.handleMouseMove = handleMouseMove;
        eventHandlersRef.current.handleMouseUp = handleMouseUp;
        eventHandlersRef.current.handleWheel = handleWheel;
        eventHandlersRef.current.handleTouchStart = handleTouchStart;
        eventHandlersRef.current.handleTouchMove = handleTouchMove;
        eventHandlersRef.current.handleTouchEnd = handleTouchEnd;
      }
      
      const handleContextMenu = eventHandlersRef.current.handleContextMenu || ((e: Event) => {
        if (isMiddleMouseRef.current) {
          e.preventDefault();
        }
      });
      
      if (!eventHandlersRef.current.handleContextMenu) {
        eventHandlersRef.current.handleContextMenu = handleContextMenu;
      }
      
      // Remove old listeners if they exist (to prevent duplicates)
      // Use stored handlers for removal to ensure we remove the correct ones
      if (eventHandlersRef.current.handleMouseDown) {
        canvas.removeEventListener('mousedown', eventHandlersRef.current.handleMouseDown);
      }
      if (eventHandlersRef.current.handleMouseMove) {
        canvas.removeEventListener('mousemove', eventHandlersRef.current.handleMouseMove);
      }
      if (eventHandlersRef.current.handleMouseUp) {
        canvas.removeEventListener('mouseup', eventHandlersRef.current.handleMouseUp);
      }
      if (eventHandlersRef.current.handleWheel) {
        canvas.removeEventListener('wheel', eventHandlersRef.current.handleWheel);
      }
      if (eventHandlersRef.current.handleTouchStart) {
        canvas.removeEventListener('touchstart', eventHandlersRef.current.handleTouchStart);
      }
      if (eventHandlersRef.current.handleTouchMove) {
        canvas.removeEventListener('touchmove', eventHandlersRef.current.handleTouchMove);
      }
      if (eventHandlersRef.current.handleTouchEnd) {
        canvas.removeEventListener('touchend', eventHandlersRef.current.handleTouchEnd);
      }
      if (eventHandlersRef.current.handleContextMenu) {
        canvas.removeEventListener('contextmenu', eventHandlersRef.current.handleContextMenu);
      }
      
      // Reattach event listeners after canvas move
      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseup', handleMouseUp);
      canvas.addEventListener('wheel', handleWheel);
      canvas.addEventListener('contextmenu', handleContextMenu);
      
      // Add touch event listeners
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
      
      // Update size for current container
      if (width > 0 && height > 0) {
        renderer.setSize(width, height);
        const camera = persistentThreeJS.camera || cameraRef.current;
        if (camera) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        }
        
        // Force a render to ensure scene is visible
        const scene = persistentThreeJS.scene || sceneRef.current;
        if (scene && camera) {
          renderer.render(scene, camera);
        }
      }
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [isEmbedded]);

  // Toggle running function - stable reference for event listeners
  const toggleRunning = useCallback(() => {
    setIsRunning(prev => !prev);
  }, []);

  // Reset function - defined before useEffect that uses it
  const reset = useCallback(() => {
    setIsRunning(false);
    persistentThreeJS.simulationTime = 0;
    setTimeElapsed(0);
    setCurrentAngle(initialAngle);
    setCurrentVelocity(0);
    
    // Clear all chart data
    setAngleData([]);
    setDisplacementData([]);
    setVelocityData([]);
    setAccelerationData([]);
    setPhaseSpaceVelocityData([]);
    setPhaseSpaceAccelerationData([]);
    setSimulationData([]); // Legacy
    
    // Clear persistent state
    persistentState.isRunning = false;
    persistentState.timeElapsed = 0;
    persistentState.currentAngle = initialAngle;
    persistentState.currentVelocity = 0;
    persistentState.angleData = [];
    persistentState.displacementData = [];
    persistentState.velocityData = [];
    persistentState.accelerationData = [];
    persistentState.phaseSpaceVelocityData = [];
    persistentState.phaseSpaceAccelerationData = [];
    persistentState.simulationData = [];
    
    // Reset pendulum position to initial state
    const { bob, pivot, stringLine } = persistentThreeJS;
    if (bob && pivot && stringLine) {
      const initialAngleRad = initialAngle * Math.PI / 180;
      const x = length * Math.sin(initialAngleRad);
      const y = PIVOT_HEIGHT - length * Math.cos(initialAngleRad);
      bob.position.set(x, y, 0);
      stringLine.geometry.setFromPoints([pivot.position, bob.position]);
      stringLine.geometry.attributes.position.needsUpdate = true;
    }
  }, [initialAngle, length]);

  // Render embedded controls in wrapper when embedded
  useEffect(() => {
    if (!isEmbedded) return;
    
    // Hide buttons when chart or tutorial is open
    if (showChart || showChartSidebar || showTutorial) {
      const container = document.getElementById('embedded-controls-container');
      if (container) container.innerHTML = '';
      return;
    }
    
    const container = document.getElementById('embedded-controls-container');
    if (!container) return;
    
    const renderButtons = () => {
      container.innerHTML = '';
      
      const startBtn = document.createElement('button');
      startBtn.className = `flex items-center justify-center w-14 h-14 rounded-full font-semibold transition shadow-xl text-white ${
        isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
      }`;
      startBtn.setAttribute('aria-label', isRunning ? 'Pause' : 'Start');
      startBtn.innerHTML = isRunning 
        ? '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
        : '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
      startBtn.addEventListener('click', toggleRunning);
      
      const resetBtn = document.createElement('button');
      resetBtn.className = 'w-14 h-14 bg-gray-600 hover:bg-gray-700 text-white rounded-full font-semibold transition shadow-xl flex items-center justify-center';
      resetBtn.setAttribute('aria-label', 'Reset');
      resetBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>';
      resetBtn.addEventListener('click', reset);
      
      container.appendChild(startBtn);
      container.appendChild(resetBtn);
      
      return () => {
        startBtn.removeEventListener('click', toggleRunning);
        resetBtn.removeEventListener('click', reset);
      };
    };
    
    const cleanup = renderButtons();
    
    return () => {
      if (cleanup) cleanup();
      if (container) container.innerHTML = '';
    };
  }, [isEmbedded, isRunning, showChart, showChartSidebar, showTutorial, toggleRunning, reset]);

  // Update pendulum position when parameters change (and not running)
  useEffect(() => {
    if (isRunning || !persistentThreeJS.bob || !persistentThreeJS.stringLine || !persistentThreeJS.pivot) return;
    
    const { bob, stringLine, pivot } = persistentThreeJS;
    
    const angleRad = initialAngle * Math.PI / 180;
    const x = length * Math.sin(angleRad);
    const y = PIVOT_HEIGHT - length * Math.cos(angleRad);
    bob.position.set(x, y, 0);

    stringLine.geometry.setFromPoints([pivot.position, bob.position]);
    stringLine.geometry.attributes.position.needsUpdate = true;
    
    setCurrentAngle(initialAngle);
    setCurrentVelocity(0);
    setTimeElapsed(0);
    persistentThreeJS.simulationTime = 0;
    
    // Clear all chart data when parameters change
    setAngleData([]);
    setDisplacementData([]);
    setVelocityData([]);
    setAccelerationData([]);
    setPhaseSpaceVelocityData([]);
    setPhaseSpaceAccelerationData([]);
    setSimulationData([]); // Legacy
    
    // Clear persistent state
    persistentState.angleData = [];
    persistentState.displacementData = [];
    persistentState.velocityData = [];
    persistentState.accelerationData = [];
    persistentState.phaseSpaceVelocityData = [];
    persistentState.phaseSpaceAccelerationData = [];
    persistentState.simulationData = [];

  }, [length, initialAngle, gravity, isRunning, airResistance]);


  // Simulation run loop with chart data collection
  useEffect(() => {
    if (!isRunning) {
        if (simulationIntervalIdRef.current) clearInterval(simulationIntervalIdRef.current);
        return;
    }

    // Only reset simulation time if it's a fresh start (time is very small or zero)
    // If switching views while running, keep the current time from persistent storage
    const isFreshStart = persistentThreeJS.simulationTime < 0.02 && !persistentState.isRunning;
    if (isFreshStart) {
      // Fresh start - reset time and clear data
      persistentThreeJS.simulationTime = 0;
      setTimeElapsed(0);
      
      // Clear chart data when starting fresh
      setAngleData([]);
      setDisplacementData([]);
      setVelocityData([]);
      setAccelerationData([]);
      setPhaseSpaceVelocityData([]);
      setPhaseSpaceAccelerationData([]);
      setSimulationData([]);
    } else {
      // Restore time from persistent storage (continuing from where we left off)
      setTimeElapsed(persistentThreeJS.simulationTime);
    }

    simulationIntervalIdRef.current = window.setInterval(() => {
      const t = persistentThreeJS.simulationTime + 0.016; // approx 60fps
      persistentThreeJS.simulationTime = t;

      // Recalculate physics values inside the loop using refs to ensure they're current
      // Use refs to avoid closure issues when switching between embedded/fullscreen
      const currentLength = lengthRef.current;
      const currentInitialAngle = initialAngleRef.current;
      const currentGravity = gravityRef.current;
      const currentAirResistance = airResistanceRef.current;
      
      const naturalOmega = Math.sqrt(currentGravity / currentLength);
      const isUnderdampedCalc = naturalOmega * naturalOmega > currentAirResistance * currentAirResistance;
      const dampedOmegaCalc = isUnderdampedCalc ? Math.sqrt(naturalOmega * naturalOmega - currentAirResistance * currentAirResistance) : 0;
      const initialAngleRadCalc = currentInitialAngle * Math.PI / 180;

      let angleRad = 0;
      let angularVelocity = 0;

      if (isUnderdampedCalc && dampedOmegaCalc > 0) {
        angleRad = initialAngleRadCalc * Math.exp(-currentAirResistance * t) * Math.cos(dampedOmegaCalc * t);
        angularVelocity = -initialAngleRadCalc * Math.exp(-currentAirResistance * t) * 
            (currentAirResistance * Math.cos(dampedOmegaCalc * t) + dampedOmegaCalc * Math.sin(dampedOmegaCalc * t));
      } else {
        setIsRunning(false);
        return;
      }
      
      const { bob, pivot, stringLine } = persistentThreeJS;
      if (!bob || !pivot || !stringLine) return;
      
      const x = currentLength * Math.sin(angleRad);
      const y = PIVOT_HEIGHT - currentLength * Math.cos(angleRad);
      
      bob.position.set(x, y, 0);
      stringLine.geometry.setFromPoints([pivot.position, bob.position]);
      stringLine.geometry.attributes.position.needsUpdate = true;

      const tangentialVelocity = angularVelocity * currentLength;
      const tangentialAcceleration = -currentGravity * Math.sin(angleRad) - currentAirResistance * tangentialVelocity;
      
      const angleDeg = angleRad * 180 / Math.PI;
      
      // Update current values
      setTimeElapsed(t);
      setCurrentAngle(angleDeg);
      setCurrentVelocity(tangentialVelocity);
      
      // Collect chart data for Recharts
      setAngleData(prev => [...prev, { time: t, angle: angleDeg }]);
      setDisplacementData(prev => [...prev, { time: t, displacement: x }]);
      setVelocityData(prev => [...prev, { time: t, velocity: tangentialVelocity }]);
      setAccelerationData(prev => [...prev, { time: t, acceleration: tangentialAcceleration }]);
      
      // Phase space data
      setPhaseSpaceVelocityData(prev => [...prev, { displacement: x, velocity: tangentialVelocity }]);
      setPhaseSpaceAccelerationData(prev => [...prev, { displacement: x, acceleration: tangentialAcceleration }]);
      
      // Legacy data point (for backward compatibility)
      const newDataPoint: DataPoint = {
        time: t,
        angle: angleDeg,
        displacement: x,
        velocity: tangentialVelocity,
        acceleration: tangentialAcceleration,
      };
      setSimulationData(prevData => [...prevData, newDataPoint]);
    }, 16);
    
    return () => {
        if (simulationIntervalIdRef.current) clearInterval(simulationIntervalIdRef.current);
    };
  }, [isRunning]);

  // Charts array for navigation
  const charts = useMemo(() => [
    { 
      name: 'Angle vs. Time', 
      data: angleData, 
      color: '#38b2ac', 
      unit: '°', 
      description: 'Shows how the pendulum angle changes over time',
      xKey: 'time',
      yKey: 'angle',
      xLabel: 'Time (s)',
      yLabel: 'Angle (°)',
      isTimeBased: true
    },
    { 
      name: 'Displacement vs. Time', 
      data: displacementData, 
      color: '#63b3ed', 
      unit: 'm', 
      description: 'Shows the horizontal displacement of the pendulum bob over time',
      xKey: 'time',
      yKey: 'displacement',
      xLabel: 'Time (s)',
      yLabel: 'Displacement (m)',
      isTimeBased: true
    },
    { 
      name: 'Velocity vs. Time', 
      data: velocityData, 
      color: '#f6e05e', 
      unit: 'm/s', 
      description: 'Shows the velocity of the pendulum bob over time',
      xKey: 'time',
      yKey: 'velocity',
      xLabel: 'Time (s)',
      yLabel: 'Velocity (m/s)',
      isTimeBased: true
    },
    { 
      name: 'Acceleration vs. Time', 
      data: accelerationData, 
      color: '#e53e3e', 
      unit: 'm/s²', 
      description: 'Shows the acceleration of the pendulum bob over time',
      xKey: 'time',
      yKey: 'acceleration',
      xLabel: 'Time (s)',
      yLabel: 'Acceleration (m/s²)',
      isTimeBased: true
    },
    { 
      name: 'Velocity vs. Displacement', 
      data: phaseSpaceVelocityData, 
      color: '#a78bfa', 
      unit: 'm/s', 
      description: 'Phase space plot showing velocity as a function of displacement',
      xKey: 'displacement',
      yKey: 'velocity',
      xLabel: 'Displacement (m)',
      yLabel: 'Velocity (m/s)',
      isTimeBased: false
    },
    { 
      name: 'Acceleration vs. Displacement', 
      data: phaseSpaceAccelerationData, 
      color: '#f472b6', 
      unit: 'm/s²', 
      description: 'Phase space plot showing acceleration as a function of displacement',
      xKey: 'displacement',
      yKey: 'acceleration',
      xLabel: 'Displacement (m)',
      yLabel: 'Acceleration (m/s²)',
      isTimeBased: false
    }
  ], [angleData, displacementData, velocityData, accelerationData, phaseSpaceVelocityData, phaseSpaceAccelerationData]);
  
  const nextChart = () => {
    setCurrentChartIndex((prev) => (prev + 1) % charts.length);
  };
  
  const prevChart = () => {
    setCurrentChartIndex((prev) => (prev - 1 + charts.length) % charts.length);
  };
  
  // Chart resize handler for PC/tablet
  const chartResizeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isResizing || !chartResizeRef.current) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.max(200, Math.min(600, newWidth));
      setChartWidth(clampedWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden flex flex-col relative">
      {/* Main 3D View Area */}
      <div className="flex-1 relative w-full">
        <div ref={mountRef} className="w-full h-full" />
        
        {/* Loading State - Only show if scene not ready */}
        {!sceneReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="text-white text-xl">Loading 3D Scene...</div>
          </div>
        )}
        
        {/* App Name - Top Left */}
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-black bg-opacity-70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm shadow-lg flex items-center gap-2">
            <Target className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-xs">Simple Pendulum Simulator</span>
          </div>
        </div>

        {/* Admin Camera Button - Top Right (Admin Only) - Just before minimize button */}
        {!isEmbedded && isAdminUser && sceneReady && (
          <div 
            className="absolute z-[100] flex flex-row gap-2 items-center"
            style={{ 
              top: `max(1rem, calc(env(safe-area-inset-top, 0px) + 1rem))`,
              right: `calc(max(1rem, calc(env(safe-area-inset-right, 0px) + 1rem)) + 60px)`
            }}
          >
            <button
              onClick={() => {
                persistentState.showAdminCamera = !showAdminCamera;
                setShowAdminCamera(!showAdminCamera);
              }}
              className="text-white px-4 py-2 rounded-lg font-semibold transition shadow-lg flex items-center justify-center hover:opacity-80 bg-black bg-opacity-70 backdrop-blur-sm"
              aria-label="Admin Camera Settings"
            >
              <Camera className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Admin Camera Position Panel - Top Right (Admin Only) */}
        {isAdminUser && sceneReady && showAdminCamera && (
          <CameraPositionAdmin
            simulationId="simple-pendulum"
            cameraAngle={cameraStateForAdmin.cameraAngle}
            cameraDistance={cameraStateForAdmin.cameraDistance}
            panOffset={cameraStateForAdmin.panOffset}
            onSave={(position) => {
              // Update default position state when saved
              setDefaultCameraPosition(position);
              // Clear cache to force reload
              clearCameraPositionsCache();
              // Reload default position
              const savedPosition = getSavedCameraPosition('simple-pendulum');
              if (savedPosition) {
                setDefaultCameraPosition(savedPosition);
              }
            }}
            onClose={() => {
              persistentState.showAdminCamera = false;
              setShowAdminCamera(false);
            }}
          />
        )}

        {/* Controls Overlay - Top Left Stack */}
        <div className="absolute top-16 left-4 z-10">
          <div className="flex flex-col gap-2">
            {/* Config Button */}
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="bg-black bg-opacity-70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm shadow-lg flex items-center gap-2 hover:bg-opacity-90 transition"
            >
              <Settings className="w-4 h-4" />
              <span>Config</span>
            </button>
            
            {/* Status Bar */}
            <div className="bg-black bg-opacity-70 backdrop-blur-sm text-white px-3 py-3 rounded-lg shadow-lg">
              <div className="space-y-2">
                <div className="text-center">
                  <p className="text-xs text-cyan-300">Angle</p>
                  <p className="text-sm font-bold text-cyan-100">{currentAngle.toFixed(2)}°</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-purple-300">Velocity</p>
                  <p className="text-sm font-bold text-purple-100">{currentVelocity.toFixed(2)} m/s</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-green-300">Time</p>
                  <p className="text-sm font-bold text-green-100">{timeElapsed.toFixed(2)} s</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-yellow-300">Status</p>
                  <p className="text-xs font-bold text-yellow-100">{isRunning ? 'Running' : 'Stopped'}</p>
                </div>
              </div>
            </div>
            
            {/* Chart Button */}
            <button
              onClick={() => {
                if (isEmbedded || isMobile) {
                  // Embedded mode or mobile: show overlay
                  const newState = !showChart;
                  setShowChart(newState);
                  onChartOpenChange?.(newState);
                } else {
                  // Full view PC/Tablet: toggle sidebar
                  setShowChartSidebar(!showChartSidebar);
                }
              }}
              className="bg-black bg-opacity-70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm shadow-lg flex items-center gap-2 hover:bg-opacity-90 transition"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Chart</span>
            </button>
            
            {/* Info/Guide Button */}
            <button
              onClick={() => setShowTutorial(!showTutorial)}
              className="bg-black bg-opacity-70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm shadow-lg flex items-center gap-2 hover:bg-opacity-90 transition"
            >
              <Info className="w-4 h-4" />
              <span>Guide</span>
            </button>
          </div>
        </div>

        {/* Config Panel Overlay */}
        {showConfig && (
          <div className="absolute inset-0 z-50 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300">
            <div className="bg-gray-800 bg-opacity-95 backdrop-blur-md p-6 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-cyan-300">Configuration</h2>
                <button
                  onClick={() => setShowConfig(false)}
                  className="text-white text-2xl hover:text-cyan-400 transition"
                  aria-label="Close Config"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Length: {length.toFixed(1)} m
                  </label>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="2.0" 
                    step="0.1" 
                    value={length} 
                    onChange={(e) => setLength(parseFloat(e.target.value))} 
                    className="w-full accent-cyan-400" 
                    disabled={isRunning} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Initial Angle: {initialAngle.toFixed(0)}°
                  </label>
                  <input 
                    type="range" 
                    min="5" 
                    max="45" 
                    value={initialAngle} 
                    onChange={(e) => setInitialAngle(parseFloat(e.target.value))} 
                    className="w-full accent-cyan-400" 
                    disabled={isRunning} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Gravity: {gravity.toFixed(2)} m/s²
                  </label>
                  <input 
                    type="range" 
                    min="1.62" 
                    max="24.79" 
                    step="0.01" 
                    value={gravity} 
                    onChange={(e) => setGravity(parseFloat(e.target.value))} 
                    className="w-full accent-cyan-400" 
                    disabled={isRunning} 
                  />
                  <div className="text-xs text-gray-400 flex justify-between mt-1">
                    <span>Moon</span>
                    <span>Earth</span>
                    <span>Jupiter</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Air Resistance: {airResistance.toFixed(2)}
                  </label>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={airResistance} 
                    onChange={(e) => setAirResistance(parseFloat(e.target.value))} 
                    className="w-full accent-cyan-400" 
                    disabled={isRunning} 
                  />
                </div>
                
                <div className="bg-gray-700/50 p-3 rounded-lg">
                  <h3 className="text-sm font-semibold text-cyan-300 mb-2">Calculated Values</h3>
                  <div className="text-xs space-y-1 text-gray-300">
                    <p>Period (T): {isFinite(period) ? `${period.toFixed(2)} s` : 'N/A'}</p>
                    <p>Frequency (f): {isFinite(period) && period > 0 ? `${(1/period).toFixed(2)} Hz` : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tutorial/Guide Overlay */}
        {showTutorial && (
          <div className="absolute inset-0 z-50 bg-black bg-opacity-75 backdrop-blur-sm transition-opacity duration-300">
            <div className="h-full bg-black bg-opacity-90 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-cyan-300">Quick Guide</h2>
                <button
                  onClick={() => setShowTutorial(false)}
                  className="text-white text-xl sm:text-2xl hover:text-cyan-400 transition"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4 text-yellow-200 text-sm">
                <div>
                  <h3 className="font-bold text-yellow-100 mb-2">3D Controls:</h3>
                  <ul className="space-y-1">
                    <li>• Drag on 3D view to rotate camera</li>
                    <li>• Scroll to zoom in/out</li>
                    <li>• Middle mouse or Ctrl+Left click to pan</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-bold text-yellow-100 mb-2">Simulation:</h3>
                  <ul className="space-y-1">
                    <li>• Start button begins the pendulum motion</li>
                    <li>• Adjust parameters in Config panel</li>
                    <li>• Monitor real-time values in Status bar</li>
                    <li>• View charts to see angle, displacement, velocity, and acceleration</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-bold text-yellow-100 mb-2">Controls:</h3>
                  <ul className="space-y-1">
                    <li>• Config: Adjust simulation parameters (length, angle, gravity, air resistance)</li>
                    <li>• Chart: View various graphs (angle, displacement, velocity, acceleration)</li>
                    <li>• Status: Monitor current angle, velocity, time, and simulation status</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chart Overlay - Mobile (Task 12) */}
        {showChart && isMobile && (
          <div className="absolute inset-0 z-50 bg-black bg-opacity-90 backdrop-blur-md transition-opacity duration-300">
            <div className="h-full flex flex-col p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-cyan-300">Charts</h2>
                <button
                  onClick={() => {
                    setShowChart(false);
                    onChartOpenChange?.(false);
                  }}
                  className="text-white text-2xl hover:text-cyan-400 transition"
                >
                  ×
                </button>
              </div>
              
              {/* Chart Navigation */}
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={prevChart}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition"
                  aria-label="Previous Chart"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white">{charts[currentChartIndex]?.name}</h3>
                  <p className="text-xs text-gray-400">Chart {currentChartIndex + 1} of {charts.length}</p>
                </div>
                <button
                  onClick={nextChart}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition"
                  aria-label="Next Chart"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              </div>
              
              {/* Chart Display - Mobile */}
              <div className="flex-1 min-h-0">
                {(() => {
                  const currentChart = charts[currentChartIndex];
                  if (!currentChart || currentChart.data.length === 0) {
                    return (
                      <div className="h-full flex items-center justify-center text-gray-400 border border-gray-600 rounded-lg">
                        Start the simulation to see the chart
                      </div>
                    );
                  }
                  
                  // For time-based charts, use dynamic tick formatting
                  if (currentChart.isTimeBased) {
                    const maxTime = getMaxTime(currentChart.data);
                    const interval = getTimeInterval(maxTime);
                    const timeTicks = generateTimeTicks(maxTime, interval);
                    const validTicks = timeTicks.filter(t => t >= 0 && t <= maxTime * 1.1);
                    
                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={currentChart.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                          <XAxis
                            dataKey={currentChart.xKey}
                            type="number"
                            label={{ value: currentChart.xLabel, position: 'insideBottom', offset: -5, fill: '#fff' }}
                            stroke="#fff"
                            tick={{ fill: '#fff' }}
                            domain={maxTime > 0 ? [0, maxTime * 1.05] : [0, 'dataMax']}
                            ticks={validTicks.length >= 2 ? validTicks : undefined}
                            tickFormatter={(value) => formatTimeTick(Number(value), interval)}
                            allowDecimals={true}
                          />
                          <YAxis
                            label={{ value: currentChart.yLabel, angle: -90, position: 'insideLeft', fill: '#fff' }}
                            stroke="#fff"
                            tick={{ fill: '#fff' }}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }}
                            labelStyle={{ color: '#fff' }}
                          />
                          <Line
                            type="monotone"
                            dataKey={currentChart.yKey}
                            stroke={currentChart.color}
                            strokeWidth={2}
                            dot={false}
                            name={currentChart.name}
                            isAnimationActive={!isRunning}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    );
                  } else {
                    // Phase space charts
                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={currentChart.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                          <XAxis
                            dataKey={currentChart.xKey}
                            type="number"
                            label={{ value: currentChart.xLabel, position: 'insideBottom', offset: -5, fill: '#fff' }}
                            stroke="#fff"
                            tick={{ fill: '#fff' }}
                          />
                          <YAxis
                            label={{ value: currentChart.yLabel, angle: -90, position: 'insideLeft', fill: '#fff' }}
                            stroke="#fff"
                            tick={{ fill: '#fff' }}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }}
                            labelStyle={{ color: '#fff' }}
                          />
                          <Line
                            type="monotone"
                            dataKey={currentChart.yKey}
                            stroke={currentChart.color}
                            strokeWidth={2}
                            dot={false}
                            name={currentChart.name}
                            isAnimationActive={!isRunning}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    );
                  }
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Chart Sidebar - PC/Tablet (Task 12) */}
        {showChartSidebar && !isMobile && (
          <>
            {/* Resize Handle */}
            <div
              ref={chartResizeRef}
              onMouseDown={() => setIsResizing(true)}
              className="absolute top-0 bottom-0 z-30 cursor-ew-resize bg-cyan-500 bg-opacity-30 hover:bg-opacity-50 transition"
              style={{ right: `${chartWidth}px`, width: '4px' }}
            />
            <div
              className="absolute top-0 bottom-0 right-0 bg-black bg-opacity-50 backdrop-blur-md p-6 overflow-y-auto border-l border-cyan-500 border-opacity-30 shadow-xl z-20 transition-all duration-300"
              style={{
                width: `${chartWidth}px`,
                minWidth: '200px',
                maxWidth: '600px'
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-cyan-300">Charts</h2>
                <button
                  onClick={() => {
                    setShowChartSidebar(false);
                  }}
                  className="text-white text-2xl hover:text-cyan-400 transition"
                >
                  ×
                </button>
              </div>
              
              {/* Chart Navigation */}
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={prevChart}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition"
                  aria-label="Previous Chart"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <div className="text-center">
                  <h3 className="text-base font-semibold text-white">{charts[currentChartIndex]?.name}</h3>
                  <p className="text-xs text-gray-400">Chart {currentChartIndex + 1} of {charts.length}</p>
                </div>
                <button
                  onClick={nextChart}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition"
                  aria-label="Next Chart"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              </div>
              
              {/* Chart Description */}
              <p className="text-xs text-gray-300 mb-4">{charts[currentChartIndex]?.description}</p>
              
              {/* Chart Display - PC/Tablet */}
              <div className="h-64">
                {(() => {
                  const currentChart = charts[currentChartIndex];
                  if (!currentChart || currentChart.data.length === 0) {
                    return (
                      <div className="h-full flex items-center justify-center text-gray-400 border border-gray-600 rounded-lg">
                        Start the simulation to see the chart
                      </div>
                    );
                  }
                  
                  // For time-based charts, use dynamic tick formatting
                  if (currentChart.isTimeBased) {
                    const maxTime = getMaxTime(currentChart.data);
                    const interval = getTimeInterval(maxTime);
                    const timeTicks = generateTimeTicks(maxTime, interval);
                    const validTicks = timeTicks.filter(t => t >= 0 && t <= maxTime * 1.1);
                    
                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={currentChart.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                          <XAxis
                            dataKey={currentChart.xKey}
                            type="number"
                            label={{ value: currentChart.xLabel, position: 'insideBottom', offset: -5, fill: '#fff' }}
                            stroke="#fff"
                            tick={{ fill: '#fff' }}
                            domain={maxTime > 0 ? [0, maxTime * 1.05] : [0, 'dataMax']}
                            ticks={validTicks.length >= 2 ? validTicks : undefined}
                            tickFormatter={(value) => formatTimeTick(Number(value), interval)}
                            allowDecimals={true}
                          />
                          <YAxis
                            label={{ value: currentChart.yLabel, angle: -90, position: 'insideLeft', fill: '#fff' }}
                            stroke="#fff"
                            tick={{ fill: '#fff' }}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }}
                            labelStyle={{ color: '#fff' }}
                          />
                          <Line
                            type="monotone"
                            dataKey={currentChart.yKey}
                            stroke={currentChart.color}
                            strokeWidth={2}
                            dot={false}
                            name={currentChart.name}
                            isAnimationActive={!isRunning}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    );
                  } else {
                    // Phase space charts
                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={currentChart.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                          <XAxis
                            dataKey={currentChart.xKey}
                            type="number"
                            label={{ value: currentChart.xLabel, position: 'insideBottom', offset: -5, fill: '#fff' }}
                            stroke="#fff"
                            tick={{ fill: '#fff' }}
                          />
                          <YAxis
                            label={{ value: currentChart.yLabel, angle: -90, position: 'insideLeft', fill: '#fff' }}
                            stroke="#fff"
                            tick={{ fill: '#fff' }}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }}
                            labelStyle={{ color: '#fff' }}
                          />
                          <Line
                            type="monotone"
                            dataKey={currentChart.yKey}
                            stroke={currentChart.color}
                            strokeWidth={2}
                            dot={false}
                            name={currentChart.name}
                            isAnimationActive={!isRunning}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    );
                  }
                })()}
              </div>
            </div>
          </>
        )}

        {/* Floating Start/Stop and Reset Buttons - Bottom Center (Fullscreen only) */}
        {!isEmbedded && !showChart && !showChartSidebar && !showTutorial && (
          <div 
            className="absolute left-0 right-0 z-[200] flex justify-center"
            style={{ 
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)'
            }}
          >
            <div className="flex gap-2">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`flex items-center justify-center w-14 h-14 rounded-full font-semibold transition shadow-xl ${
                  isRunning
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
                aria-label={isRunning ? 'Pause' : 'Start'}
              >
                {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              <button
                onClick={reset}
                className="w-14 h-14 bg-gray-600 hover:bg-gray-700 text-white rounded-full font-semibold transition shadow-xl flex items-center justify-center"
                aria-label="Reset"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

