
import React, { useEffect, useRef, useState, useMemo } from 'react';
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

interface ProjectileMotionSimulatorProps {
  isEmbedded?: boolean;
  onChartOpenChange?: (isOpen: boolean) => void;
  onTutorialOpenChange?: (isOpen: boolean) => void;
}

// Chart data types
interface VelocityDataPoint {
  time: number;
  velocity: number;
}

interface DisplacementDataPoint {
  time: number;
  x: number;
  y: number;
}

// Module-level storage for Three.js objects - persists across component unmounts/remounts
const persistentThreeJS = {
  scene: null as THREE.Scene | null,
  camera: null as THREE.PerspectiveCamera | null,
  renderer: null as THREE.WebGLRenderer | null,
  isInitialized: false,
  projectile: null as THREE.Mesh | null,
  target: null as THREE.Mesh | null,
  trailLine: null as THREE.Line | null,
      trailPoints: [] as THREE.Vector3[],
      simulationTime: 0,
      cameraAngle: { theta: Math.PI / 4, phi: Math.PI / 3.5 },
      autoRotateStep: 0,
};

// Module-level storage for React state - persists across component unmounts/remounts
const persistentState = {
  velocity: 20,
  angle: 45,
  isRunning: false,
  autoRotate: true,
  showTrail: true,
  currentHeight: 0,
  currentDistance: 0,
  timeElapsed: 0,
  showConfig: false,
  showChart: false,
  showChartSidebar: false,
  chartWidth: 384,
  isResizing: false,
  showTutorial: false,
  showAdminCamera: false,
  currentChartIndex: 0,
  verticalVelocityData: [] as VelocityDataPoint[],
  horizontalVelocityData: [] as VelocityDataPoint[],
  displacementData: [] as DisplacementDataPoint[],
};

export default function ProjectileMotionSimulator({ 
  isEmbedded = false, 
  onChartOpenChange,
  onTutorialOpenChange
}: ProjectileMotionSimulatorProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const [sceneReady, setSceneReady] = useState(() => persistentThreeJS.isInitialized);
  
  // Initialize state from persistent storage
  const [velocity, setVelocity] = useState(() => persistentState.velocity);
  const [angle, setAngle] = useState(() => persistentState.angle);
  const [isRunning, setIsRunning] = useState(() => persistentState.isRunning);
  const [autoRotate, setAutoRotate] = useState(() => persistentState.autoRotate);
  const [showTrail, setShowTrail] = useState(() => persistentState.showTrail);
  
  // Current values
  const [currentHeight, setCurrentHeight] = useState(() => persistentState.currentHeight);
  const [currentDistance, setCurrentDistance] = useState(() => persistentState.currentDistance);
  const [timeElapsed, setTimeElapsed] = useState(() => persistentState.timeElapsed);
  
  // UI Overlay States (Phase 2)
  const [showConfig, setShowConfig] = useState(() => persistentState.showConfig);
  const [showChart, setShowChart] = useState(() => persistentState.showChart);
  const [showChartSidebar, setShowChartSidebar] = useState(() => persistentState.showChartSidebar);
  const [chartWidth, setChartWidth] = useState(() => persistentState.chartWidth);
  const [isResizing, setIsResizing] = useState(() => persistentState.isResizing);
  const [showTutorial, setShowTutorial] = useState(() => persistentState.showTutorial);
  const [showAdminCamera, setShowAdminCamera] = useState(() => persistentState.showAdminCamera);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  
  // Load default camera position from config (admin-controlled)
  const [defaultCameraPosition, setDefaultCameraPosition] = useState<CameraPosition | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  
  // Chart Data Collection (Phase 2)
  const [verticalVelocityData, setVerticalVelocityData] = useState<VelocityDataPoint[]>(() => [...persistentState.verticalVelocityData]);
  const [horizontalVelocityData, setHorizontalVelocityData] = useState<VelocityDataPoint[]>(() => [...persistentState.horizontalVelocityData]);
  const [displacementData, setDisplacementData] = useState<DisplacementDataPoint[]>(() => [...persistentState.displacementData]);
  
  // Chart Navigation (Phase 3)
  const [currentChartIndex, setCurrentChartIndex] = useState(() => persistentState.currentChartIndex);
  
  // Sync state changes to persistent storage
  useEffect(() => {
    persistentState.velocity = velocity;
  }, [velocity]);
  useEffect(() => {
    persistentState.angle = angle;
  }, [angle]);
  useEffect(() => {
    persistentState.isRunning = isRunning;
  }, [isRunning]);
  useEffect(() => {
    persistentState.autoRotate = autoRotate;
  }, [autoRotate]);
  useEffect(() => {
    persistentState.showTrail = showTrail;
  }, [showTrail]);
  useEffect(() => {
    persistentState.currentHeight = currentHeight;
  }, [currentHeight]);
  useEffect(() => {
    persistentState.currentDistance = currentDistance;
  }, [currentDistance]);
  useEffect(() => {
    persistentState.timeElapsed = timeElapsed;
  }, [timeElapsed]);
  useEffect(() => {
    persistentState.showConfig = showConfig;
  }, [showConfig]);
  useEffect(() => {
    persistentState.showChart = showChart;
  }, [showChart]);
  useEffect(() => {
    persistentState.showChartSidebar = showChartSidebar;
  }, [showChartSidebar]);
  useEffect(() => {
    persistentState.chartWidth = chartWidth;
  }, [chartWidth]);
  useEffect(() => {
    persistentState.isResizing = isResizing;
  }, [isResizing]);
  useEffect(() => {
    persistentState.showTutorial = showTutorial;
  }, [showTutorial]);
  useEffect(() => {
    persistentState.currentChartIndex = currentChartIndex;
  }, [currentChartIndex]);
  useEffect(() => {
    persistentState.verticalVelocityData = [...verticalVelocityData];
  }, [verticalVelocityData]);
  useEffect(() => {
    persistentState.horizontalVelocityData = [...horizontalVelocityData];
  }, [horizontalVelocityData]);
  useEffect(() => {
    persistentState.displacementData = [...displacementData];
  }, [displacementData]);
  // Calculate appropriate time interval based on max time
  const getTimeInterval = (maxTime: number): number => {
    if (maxTime <= 2) {
      return 0.2;  // For 0-2s: interval = 0.2
    } else if (maxTime <= 5) {
      return 0.5;  // For 2-5s: interval = 0.5
    } else if (maxTime <= 10) {
      return 1;    // For 5-10s: interval = 1
    } else if (maxTime <= 20) {
      return 2;    // For 10-20s: interval = 2
    } else if (maxTime <= 50) {
      return 5;    // For 20-50s: interval = 5
    } else {
      return 10;   // For 50+ s: interval = 10
    }
  };
  
  // Generate tick positions at multiples of the interval
  const generateTimeTicks = (maxTime: number, interval: number): number[] => {
    if (maxTime <= 0 || interval <= 0) return [0, 1];
    
    const ticks: number[] = [];
    // Start from 0 and add ticks at each interval
    let currentTick = 0;
    while (currentTick <= maxTime + interval * 0.01) { // Small buffer to include maxTime
      const rounded = Math.round(currentTick * 1000) / 1000; // Round to 3 decimal places
      ticks.push(rounded);
      currentTick += interval;
    }
    
    // Always include 0 and maxTime
    if (ticks.length === 0 || ticks[0] !== 0) {
      ticks.unshift(0);
    }
    
    const maxTimeRounded = Math.round(maxTime * 1000) / 1000;
    const lastTick = ticks[ticks.length - 1] || 0;
    if (lastTick < maxTimeRounded) {
      ticks.push(maxTimeRounded);
    }
    
    // Remove duplicates and ensure within domain [0, maxTime]
    const uniqueTicks = [...new Set(ticks)]
      .filter(tick => tick >= 0 && tick <= maxTime + 0.01)
      .sort((a, b) => a - b);
    
    // Ensure we have at least 2 ticks
    if (uniqueTicks.length === 0) return [0, maxTime || 1];
    if (uniqueTicks.length === 1) uniqueTicks.push(maxTime || 1);
    
    return uniqueTicks;
  };
  
  // Get max time from chart data
  const getMaxTime = (data: { time: number }[]): number => {
    if (data.length === 0) return 1; // Default to 1 if no data to ensure domain is valid
    const max = Math.max(...data.map(d => d.time));
    return max > 0 ? max : 1; // Ensure at least 1 to avoid zero domain
  };
  
  // Format tick label based on interval
  const formatTimeTick = (value: number, interval: number): string => {
    // Determine decimal places based on interval
    if (interval >= 1) {
      return Math.round(value).toString();
    } else if (interval >= 0.5) {
      return (Math.round(value * 10) / 10).toFixed(1);
    } else {
      return (Math.round(value * 100) / 100).toFixed(2);
    }
  };
  
  const charts = useMemo(() => [
    { name: 'Vertical Velocity', data: verticalVelocityData, color: '#ef4444', unit: 'm/s', description: 'Shows how vertical velocity changes over time' },
    { name: 'Horizontal Velocity', data: horizontalVelocityData, color: '#3b82f6', unit: 'm/s', description: 'Shows constant horizontal velocity' },
    { name: 'Displacement', data: displacementData, color: '#a855f7', unit: 'm', description: 'Shows trajectory displacement over time' }
  ], [verticalVelocityData, horizontalVelocityData, displacementData]);
  
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

  // Simulation state refs (for mouse/camera control)
  const simulationState = useRef({
      projectile: persistentThreeJS.projectile || null,
      target: persistentThreeJS.target || null,
      trailLine: persistentThreeJS.trailLine || null,
      trailPoints: [...persistentThreeJS.trailPoints],
      simulationTime: persistentThreeJS.simulationTime,
      autoRotateStep: persistentThreeJS.autoRotateStep,
  });
  
  // Camera control refs
  const mouseDownRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({ ...persistentThreeJS.cameraAngle });
  const cameraDistanceRef = useRef(40); // Initial camera distance
  const userHasRotatedRef = useRef(false);
  
  // Panning refs - dynamic orbit center (initialize with default values, will be updated via useEffect)
  const panOffsetRef = useRef(new THREE.Vector3(0, 0, 0)); // Initial look-at point - will be updated
  const isPanningRef = useRef(false);
  const isMiddleMouseRef = useRef(false);
  
  // Camera state for admin component (updates periodically to reflect current camera position)
  const [cameraStateForAdmin, setCameraStateForAdmin] = useState({
    cameraAngle: { ...cameraAngleRef.current },
    cameraDistance: cameraDistanceRef.current,
    panOffset: panOffsetRef.current.clone()
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
      const savedPosition = getSavedCameraPosition('projectile-motion');
      if (savedPosition) {
        setDefaultCameraPosition(savedPosition);
        return;
      }
      
      // Load from config file
      const position = await getDefaultCameraPosition('projectile-motion');
      if (position) {
        setDefaultCameraPosition(position);
      }
    };
    
    loadDefaultPosition();
  }, []);
  
  // Touch handling refs
  const touchDownRef = useRef(false);
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const initialDistanceRef = useRef(0);
  const initialCameraDistanceRef = useRef(40);
  const touchPanModeRef = useRef(false);
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

  const g = 9.81;
  const angleRad = useMemo(() => angle * Math.PI / 180, [angle]);
  const timeOfFlight = useMemo(() => (2 * velocity * Math.sin(angleRad)) / g, [velocity, angleRad]);
  const range = useMemo(() => (velocity * velocity * Math.sin(2 * angleRad)) / g, [velocity, angleRad]);
  const maxHeight = useMemo(() => (velocity ** 2 * Math.sin(angleRad) ** 2) / (2 * g), [velocity, angleRad]);
  
  // Sync simulation time and camera angle to persistent storage
  useEffect(() => {
    const interval = setInterval(() => {
      persistentThreeJS.simulationTime = simulationState.current.simulationTime;
      persistentThreeJS.cameraAngle = { ...cameraAngleRef.current };
      persistentThreeJS.autoRotateStep = simulationState.current.autoRotateStep;
      persistentThreeJS.trailPoints = [...simulationState.current.trailPoints];
    }, 100);
    return () => clearInterval(interval);
  }, []);
  
  // Update panOffset when range/maxHeight changes
  useEffect(() => {
    panOffsetRef.current.set(range / 2, maxHeight / 2, 0);
  }, [range, maxHeight]);
  
  // Track window size for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // On mobile, hide sidebar; on desktop, show it if it was visible before
      if (mobile) {
        setShowChartSidebar(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
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
      startBtn.addEventListener('click', () => setIsRunning(!isRunning));
      
      const resetBtn = document.createElement('button');
      resetBtn.className = 'w-14 h-14 bg-gray-600 hover:bg-gray-700 text-white rounded-full font-semibold transition shadow-xl flex items-center justify-center';
      resetBtn.setAttribute('aria-label', 'Reset');
      resetBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>';
      resetBtn.addEventListener('click', reset);
      
      container.appendChild(startBtn);
      container.appendChild(resetBtn);
      
      return () => {
        startBtn.removeEventListener('click', () => setIsRunning(!isRunning));
        resetBtn.removeEventListener('click', reset);
      };
    };
    
    const cleanup = renderButtons();
    
    return () => {
      if (cleanup) cleanup();
      if (container) container.innerHTML = '';
    };
  }, [isEmbedded, isRunning]);

  // Store params in a ref to prevent stale closures in animation loop
  const simParamsRef = useRef({ range, maxHeight });
  useEffect(() => {
    simParamsRef.current = { range, maxHeight };
  }, [range, maxHeight]);

  // One-time scene setup - only initialize if not already done
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
      
      // For screens ≤576px: fix height at 475px (value at 576px width), keep width responsive
      if (isEmbedded && window.innerWidth <= 576) {
        height = 475; // Fixed height for mobile small view
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
      
      // If Three.js objects already exist in persistent storage, reuse them
      if (persistentThreeJS.isInitialized && persistentThreeJS.scene && persistentThreeJS.camera && persistentThreeJS.renderer) {
        // Restore refs from persistent storage
        sceneRef.current = persistentThreeJS.scene;
        cameraRef.current = persistentThreeJS.camera;
        rendererRef.current = persistentThreeJS.renderer;
        
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
        
        // Restart animation loop if not already running
        if (!animationIdRef.current) {
          const animate = () => {
            // Use persistent Three.js objects - they persist across unmounts
            if (persistentThreeJS.scene && persistentThreeJS.camera && persistentThreeJS.renderer) {
              // Access component refs for state (will be recreated on remount but that's OK)
              if (sceneRef.current && cameraRef.current && rendererRef.current) {
                // Only update camera if not actively being controlled by user
                const isUserInteracting = mouseDownRef.current || isPanningRef.current || touchDownRef.current;
                
                if (!isUserInteracting) {
                  // Auto-rotate if enabled
                  if (autoRotate && !userHasRotatedRef.current) {
                    simulationState.current.autoRotateStep += 0.002;
                    cameraAngleRef.current.theta = simulationState.current.autoRotateStep;
                  }
                  
                  // Get current look-at point (dynamic orbit center)
                  const lookAtPoint = panOffsetRef.current;
                  
                  // Update camera position based on current angles and distance around dynamic look-at point
                  const radius = cameraDistanceRef.current;
                  cameraRef.current.position.x = lookAtPoint.x + radius * Math.sin(cameraAngleRef.current.phi) * Math.cos(cameraAngleRef.current.theta);
                  cameraRef.current.position.y = lookAtPoint.y + radius * Math.cos(cameraAngleRef.current.phi);
                  cameraRef.current.position.z = lookAtPoint.z + radius * Math.sin(cameraAngleRef.current.phi) * Math.sin(cameraAngleRef.current.theta);
                  cameraRef.current.lookAt(lookAtPoint);
                } else {
                  // User is interacting - update camera position from current ref values (set by event handlers)
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
          animate();
        }
        
        // Event handlers will be attached in the isEmbedded useEffect
        // Scene is already ready
        setSceneReady(true);
        return;
      }
      
      // First time initialization - create new Three.js objects
      if (persistentThreeJS.isInitialized) return;
      
      // Reset scene ready state only on first initialization
      setSceneReady(false);
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a202c);
    scene.fog = new THREE.Fog(0x1a202c, 50, 200);
    sceneRef.current = scene;
      persistentThreeJS.scene = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 500);
    camera.position.set(30, 15, 30);
    camera.lookAt(range / 2, 5, 0);
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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(50, 50, 30);
    sunLight.castShadow = true;
    scene.add(sunLight);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x2d3748 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    const grid = new THREE.GridHelper(200, 100, 0x4a5568, 0x4a5568);
    grid.material.opacity = 0.5;
    grid.material.transparent = true;
    scene.add(grid);

    const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 0.5, 32), new THREE.MeshStandardMaterial({ color: 0x718096 }));
    platform.position.set(0, 0.25, 0);
    platform.castShadow = true;
    scene.add(platform);
    
    const projectile = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshStandardMaterial({ color: 0x38b2ac, roughness: 0.3 }));
    projectile.position.set(0, 0.5, 0);
    projectile.castShadow = true;
    scene.add(projectile);
    simulationState.current.projectile = projectile;
    persistentThreeJS.projectile = projectile;

    const target = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.1, 32), new THREE.MeshStandardMaterial({ color: 0xf6e05e, transparent: true, opacity: 0.5 }));
    target.position.set(range, 0.05, 0);
    scene.add(target);
    simulationState.current.target = target;
    persistentThreeJS.target = target;

    const trailLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x63b3ed }));
    scene.add(trailLine);
    simulationState.current.trailLine = trailLine;
    persistentThreeJS.trailLine = trailLine;
    
      // Mark as initialized in persistent storage
      persistentThreeJS.isInitialized = true;
      
      // Wait for next frame to ensure scene is fully initialized before setting ready
      requestAnimationFrame(() => {
    setSceneReady(true);
      });
    
      // Animation loop - stored separately to persist across mounts
    const animate = () => {
        // Use persistent Three.js objects - they persist across unmounts
        if (persistentThreeJS.scene && persistentThreeJS.camera && persistentThreeJS.renderer) {
          // Access component refs for state (will be recreated on remount but that's OK)
          if (sceneRef.current && cameraRef.current && rendererRef.current) {
            // Only update camera if not actively being controlled by user
            const isUserInteracting = mouseDownRef.current || isPanningRef.current || touchDownRef.current;
            
            if (!isUserInteracting) {
              // Auto-rotate if enabled
              if (autoRotate && !userHasRotatedRef.current) {
        simulationState.current.autoRotateStep += 0.002;
                cameraAngleRef.current.theta = simulationState.current.autoRotateStep;
              }
              
              // Get current look-at point (dynamic orbit center)
              const lookAtPoint = panOffsetRef.current;
              
              // Update camera position based on current angles and distance around dynamic look-at point
              const radius = cameraDistanceRef.current;
              cameraRef.current.position.x = lookAtPoint.x + radius * Math.sin(cameraAngleRef.current.phi) * Math.cos(cameraAngleRef.current.theta);
              cameraRef.current.position.y = lookAtPoint.y + radius * Math.cos(cameraAngleRef.current.phi);
              cameraRef.current.position.z = lookAtPoint.z + radius * Math.sin(cameraAngleRef.current.phi) * Math.sin(cameraAngleRef.current.theta);
              cameraRef.current.lookAt(lookAtPoint);
            } else {
              // User is interacting - update camera position from current ref values (set by event handlers)
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
    animate();

      // Event handlers for camera controls - attach immediately on initial setup
      // This matches TitrationSimulator's pattern and ensures controls work on first load
      const handleMouseDown = eventHandlersRef.current.handleMouseDown || ((e: MouseEvent) => {
        // Detect middle mouse button (button 1) or Ctrl+Left click for panning
        if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
          isPanningRef.current = true;
          isMiddleMouseRef.current = true;
          lastMouseRef.current = { x: e.clientX, y: e.clientY };
          setAutoRotate(false);
        } else if (e.button === 0) {
          // Left mouse button - orbit
          mouseDownRef.current = true;
          lastMouseRef.current = { x: e.clientX, y: e.clientY };
          setAutoRotate(false);
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
          
          lastMouseRef.current = { x: e.clientX, y: e.clientY };
        } else if (mouseDownRef.current && cameraRef.current && !isMiddleMouseRef.current) {
          // Orbit mode - rotate around look-at point
          const deltaX = e.clientX - lastMouseRef.current.x;
          const deltaY = e.clientY - lastMouseRef.current.y;
          
          cameraAngleRef.current.theta += deltaX * 0.005;
          cameraAngleRef.current.phi -= deltaY * 0.005;
          cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2, cameraAngleRef.current.phi));
          
          // Mark that user has manually rotated
          userHasRotatedRef.current = true;
          
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
          cameraDistanceRef.current = Math.max(5, Math.min(100, newDistance));
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
          setAutoRotate(false);
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
          
          // Mark that user has manually rotated
          userHasRotatedRef.current = true;
          
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
            cameraDistanceRef.current = Math.max(5, Math.min(100, newDistance));
            
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
      // This ensures controls work on first load, matching TitrationSimulator
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

    const handleResize = () => {
        if (mountRef.current && cameraRef.current && rendererRef.current) {
          const rect = mountRef.current.getBoundingClientRect();
          let w = rect.width;
          let h = rect.height;
          
          // For screens ≤576px: fix height at 475px (value at 576px width), keep width responsive
          if (isEmbedded && window.innerWidth <= 576) {
            h = 475; // Fixed height for mobile small view
          }
          
          if (w > 0 && h > 0) {
            cameraRef.current.aspect = w / h;
            cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
          }
        }
      };
      window.addEventListener('resize', handleResize);
      
      // Also observe container for size changes
      let resizeTimeout: NodeJS.Timeout | null = null;
      const resizeObserver = new ResizeObserver((entries) => {
        // Debounce resize to prevent re-renders during sidebar animations
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
        }
        resizeTimeout = setTimeout(() => {
          handleResize();
        }, 150); // Wait for sidebar animation to complete (300ms duration)
      });
      if (mountRef.current) {
        resizeObserver.observe(mountRef.current);
      }
      
      // Return cleanup for this initialization
    return () => {
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
        }
        resizeObserver.disconnect();
        window.removeEventListener('resize', handleResize);
        // Event listeners are cleaned up in the isEmbedded useEffect
        // NOTE: We intentionally do NOT dispose Three.js objects here
        // They are stored in persistentThreeJS and will be reused on next mount
      };
    };
    
    // Store cleanup function
    let cleanupFn: (() => void) | null = null;
    
    // Start initialization check with a small delay to ensure container is rendered
    const timeoutId = setTimeout(() => {
      cleanupFn = checkAndInit() || null;
    }, 50);
    
    // Cleanup - only cleanup event listeners, preserve Three.js objects
    return () => {
      clearTimeout(timeoutId);
      
      // Call cleanup function to remove event listeners
      if (cleanupFn) {
        cleanupFn();
        cleanupFn = null;
      }
      
      // NOTE: We intentionally do NOT dispose Three.js objects here
      // They are stored in persistentThreeJS and will be reused on next mount
    };
  }, []);

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
          setAutoRotate(false);
        } else if (e.button === 0) {
          // Left mouse button - orbit
          mouseDownRef.current = true;
          lastMouseRef.current = { x: e.clientX, y: e.clientY };
          setAutoRotate(false);
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
          
          lastMouseRef.current = { x: e.clientX, y: e.clientY };
        } else if (mouseDownRef.current && cameraRef.current && !isMiddleMouseRef.current) {
          // Orbit mode - rotate around look-at point
          const deltaX = e.clientX - lastMouseRef.current.x;
          const deltaY = e.clientY - lastMouseRef.current.y;
          
          cameraAngleRef.current.theta += deltaX * 0.005;
          cameraAngleRef.current.phi -= deltaY * 0.005;
          cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2, cameraAngleRef.current.phi));
          
          // Mark that user has manually rotated
          userHasRotatedRef.current = true;
          
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
          cameraDistanceRef.current = Math.max(5, Math.min(100, newDistance));
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
          setAutoRotate(false);
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
          
          // Mark that user has manually rotated
          userHasRotatedRef.current = true;
          
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
            cameraDistanceRef.current = Math.max(5, Math.min(100, newDistance));
            
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

  // Update target position when range changes
  useEffect(() => {
    if (persistentThreeJS.target) {
      persistentThreeJS.target.position.x = range;
    }
  }, [range]);

  // Simulation run loop with data collection
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      simulationState.current.simulationTime += 0.05;
      const t = simulationState.current.simulationTime;
      
      if (t >= timeOfFlight) {
        setIsRunning(false);
        return;
      }
      
      const x = (velocity * Math.cos(angleRad)) * t;
      const y = (velocity * Math.sin(angleRad)) * t - 0.5 * g * t * t;
      
      if (persistentThreeJS.projectile) {
        persistentThreeJS.projectile.position.set(x, Math.max(0.5, y + 0.5), 0);
      }
      
      if (showTrail && persistentThreeJS.trailLine) {
        simulationState.current.trailPoints.push(new THREE.Vector3(x, Math.max(0.5, y + 0.5), 0));
        persistentThreeJS.trailLine.geometry.setFromPoints(simulationState.current.trailPoints);
      }
      
      // Update current values
      setCurrentHeight(Math.max(0, y));
      setCurrentDistance(x);
      setTimeElapsed(t);
      
      // Collect chart data (Phase 2)
      const v_y = velocity * Math.sin(angleRad) - g * t; // Vertical velocity
      const v_x = velocity * Math.cos(angleRad); // Horizontal velocity (constant)
      
      setVerticalVelocityData(prev => [...prev, { time: t, velocity: v_y }]);
      setHorizontalVelocityData(prev => [...prev, { time: t, velocity: v_x }]);
      setDisplacementData(prev => [...prev, { time: t, x, y }]);
    }, 50);
    
    return () => clearInterval(interval);
  }, [isRunning, velocity, angle, timeOfFlight, showTrail, angleRad]);

  const reset = () => {
    setIsRunning(false);
    simulationState.current.simulationTime = 0;
    setCurrentHeight(0);
    setCurrentDistance(0);
    setTimeElapsed(0);
    if (persistentThreeJS.projectile) {
      persistentThreeJS.projectile.position.set(0, 0.5, 0);
    }
    simulationState.current.trailPoints = [];
    if (persistentThreeJS.trailLine) {
      persistentThreeJS.trailLine.geometry.setFromPoints([]);
    }
    
    // Clear chart data on reset (Phase 2)
    setVerticalVelocityData([]);
    setHorizontalVelocityData([]);
    setDisplacementData([]);
    
    // Clear persistent state
    persistentState.isRunning = false;
    persistentState.currentHeight = 0;
    persistentState.currentDistance = 0;
    persistentState.timeElapsed = 0;
    persistentState.verticalVelocityData = [];
    persistentState.horizontalVelocityData = [];
    persistentState.displacementData = [];
    persistentThreeJS.simulationTime = 0;
    persistentThreeJS.trailPoints = [];
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden flex flex-col relative">
      {/* Main 3D View Area */}
      <div className="flex-1 relative w-full">
        <div ref={mountRef} className="w-full h-full" />
        
        {/* App Name - Top Left */}
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-black bg-opacity-70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm shadow-lg flex items-center gap-2">
            <Target className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-xs">3D Projectile Motion Simulator</span>
        </div>
          </div>

        {/* Controls Overlay - Top Left Stack (Mobile Style) */}
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
                  <p className="text-xs text-cyan-300">Height</p>
                  <p className="text-sm font-bold text-cyan-100">{currentHeight.toFixed(2)} m</p>
            </div>
                <div className="text-center">
                  <p className="text-xs text-purple-300">Distance</p>
                  <p className="text-sm font-bold text-purple-100">{currentDistance.toFixed(2)} m</p>
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
            simulationId="projectile-motion"
            cameraAngle={cameraStateForAdmin.cameraAngle}
            cameraDistance={cameraStateForAdmin.cameraDistance}
            panOffset={cameraStateForAdmin.panOffset}
            onSave={(position) => {
              // Update default position state when saved
              setDefaultCameraPosition(position);
              // Clear cache to force reload
              clearCameraPositionsCache();
              // Reload default position
              const savedPosition = getSavedCameraPosition('projectile-motion');
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

        {/* Render embedded controls - handled by useEffect below */}

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
                    Velocity: {velocity} m/s
                  </label>
                  <input 
                    type="range" 
                    min="5" 
                    max="50" 
                    value={velocity} 
                    onChange={(e) => setVelocity(parseFloat(e.target.value))} 
                    className="w-full accent-cyan-400" 
                    disabled={isRunning} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Launch Angle: {angle}°
                  </label>
                  <input 
                    type="range" 
                    min="15" 
                    max="85" 
                    value={angle} 
                    onChange={(e) => setAngle(parseFloat(e.target.value))} 
                    className="w-full accent-cyan-400" 
                    disabled={isRunning} 
                  />
                </div>
                
                <button 
                  onClick={() => setAutoRotate(!autoRotate)} 
                  className={`w-full py-2 rounded-md font-semibold transition ${
                    autoRotate ? 'bg-cyan-500 hover:bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
              {autoRotate ? 'Auto-Rotate ON' : 'Auto-Rotate OFF'}
            </button>
                
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={showTrail} 
                    onChange={(e) => setShowTrail(e.target.checked)} 
                    className="w-4 h-4 accent-cyan-500" 
                  />
                  Show Trail
                </label>
                
            <div className="bg-gray-700/50 p-3 rounded-lg">
              <h3 className="text-sm font-semibold text-cyan-300 mb-2">Predicted Values</h3>
                  <div className="text-xs space-y-1 text-gray-300">
                <p>Max Height: {maxHeight.toFixed(2)} m</p>
                <p>Range: {range.toFixed(2)} m</p>
                <p>Flight Time: {timeOfFlight.toFixed(2)} s</p>
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
                    <li>• Auto-rotate shows trajectory from all angles</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-bold text-yellow-100 mb-2">Simulation:</h3>
                  <ul className="space-y-1">
                    <li>• Launch button starts the projectile motion</li>
                    <li>• Adjust velocity and angle in Config</li>
                    <li>• Watch the trail to visualize the path</li>
                    <li>• Monitor real-time values in Status bar</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-bold text-yellow-100 mb-2">Controls:</h3>
                  <ul className="space-y-1">
                    <li>• Config: Adjust simulation parameters</li>
                    <li>• Chart: View velocity and displacement graphs</li>
                    <li>• Status: Monitor current values</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chart Overlay - Mobile (Phase 3) */}
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
                  <h3 className="text-lg font-semibold text-white">{charts[currentChartIndex].name}</h3>
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
              
              {/* Chart Display */}
              <div className="flex-1 min-h-0">
                {(() => {
                  const currentChart = charts[currentChartIndex];
                  if (currentChart.name === 'Displacement') {
                    // Displacement chart - show both X and Y
                    const chartData = displacementData.map(d => ({ time: d.time, x: d.x, y: d.y }));
                    const maxTime = getMaxTime(chartData);
                    const interval = getTimeInterval(maxTime);
                    const timeTicks = generateTimeTicks(maxTime, interval);
                    
                    // Debug: ensure ticks are valid
                    const validTicks = timeTicks.filter(t => t >= 0 && t <= maxTime * 1.1);
                    
                    return chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
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
                          <YAxis
                            label={{ value: 'Displacement (m)', angle: -90, position: 'insideLeft', fill: '#fff' }}
                            stroke="#fff"
                            tick={{ fill: '#fff' }}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }}
                            labelStyle={{ color: '#fff' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="x"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                            name="Horizontal (m)"
                            isAnimationActive={!isRunning}
                          />
                          <Line
                            type="monotone"
                            dataKey="y"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={false}
                            name="Vertical (m)"
                            isAnimationActive={!isRunning}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 border border-gray-600 rounded-lg">
                        Start the simulation to see the chart
                      </div>
                    );
                  } else {
                    // Velocity charts
                    const maxTime = getMaxTime(currentChart.data);
                    const interval = getTimeInterval(maxTime);
                    const timeTicks = generateTimeTicks(maxTime, interval);
                    
                    // Debug: ensure ticks are valid
                    const validTicks = timeTicks.filter(t => t >= 0 && t <= maxTime * 1.1);
                    
                    return currentChart.data.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={currentChart.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
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
                          <YAxis
                            label={{ value: `Velocity (${currentChart.unit})`, angle: -90, position: 'insideLeft', fill: '#fff' }}
                            stroke="#fff"
                            tick={{ fill: '#fff' }}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }}
                            labelStyle={{ color: '#fff' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="velocity"
                            stroke={currentChart.color}
                            strokeWidth={3}
                            dot={false}
                            isAnimationActive={!isRunning}
                            animationDuration={isRunning ? 0 : 300}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 border border-gray-600 rounded-lg">
                        Start the simulation to see the chart
                      </div>
                    );
                  }
                })()}
              </div>
              
              {/* Chart Description */}
              <div className="mt-4 bg-gray-800 bg-opacity-60 p-3 rounded-lg border border-gray-600">
                <p className="text-xs text-gray-300">{charts[currentChartIndex].description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Chart Sidebar - PC/Tablet (Phase 3) */}
        {showChartSidebar && !isMobile && (
          <>
            {/* Resize handle */}
            <div
              ref={chartResizeRef}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
              }}
              className="absolute right-0 top-0 bottom-0 w-1 bg-cyan-500 bg-opacity-30 hover:bg-opacity-60 cursor-col-resize transition-colors z-30"
              style={{ 
                right: `${chartWidth}px`,
                minWidth: '4px'
              }}
            >
              <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-8 cursor-col-resize" />
            </div>
            
            {/* Chart sidebar */}
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
                  onClick={() => setShowChartSidebar(false)}
                  className="text-white text-xl hover:text-cyan-400 transition"
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
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <div className="text-center">
                  <h3 className="text-base font-semibold text-white">{charts[currentChartIndex].name}</h3>
                  <p className="text-xs text-gray-400">Chart {currentChartIndex + 1} of {charts.length}</p>
                </div>
                <button
                  onClick={nextChart}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition"
                  aria-label="Next Chart"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </div>
              
              {/* Chart Display */}
              <div className="h-64 mb-4">
                {(() => {
                  const currentChart = charts[currentChartIndex];
                  if (currentChart.name === 'Displacement') {
                    // Displacement chart - show both X and Y
                    const chartData = displacementData.map(d => ({ time: d.time, x: d.x, y: d.y }));
                    const maxTime = getMaxTime(chartData);
                    const interval = getTimeInterval(maxTime);
                    const timeTicks = generateTimeTicks(maxTime, interval);
                    return chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                          <XAxis
                            dataKey="time"
                            label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fill: '#fff' }}
                            stroke="#fff"
                            tick={{ fill: '#fff', fontSize: 12 }}
                            ticks={timeTicks}
                            tickFormatter={(value) => formatTimeTick(value, interval)}
                          />
                          <YAxis
                            label={{ value: 'Displacement (m)', angle: -90, position: 'insideLeft', fill: '#fff' }}
                            stroke="#fff"
                            tick={{ fill: '#fff', fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }}
                            labelStyle={{ color: '#fff' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="x"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                            name="Horizontal (m)"
                            isAnimationActive={!isRunning}
                          />
                          <Line
                            type="monotone"
                            dataKey="y"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={false}
                            name="Vertical (m)"
                            isAnimationActive={!isRunning}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 border border-gray-600 rounded-lg text-sm">
                        Start the simulation to see the chart
                      </div>
                    );
                  } else {
                    // Velocity charts
                    const maxTime = getMaxTime(currentChart.data);
                    const interval = getTimeInterval(maxTime);
                    const timeTicks = generateTimeTicks(maxTime, interval);
                    
                    // Debug: ensure ticks are valid
                    const validTicks = timeTicks.filter(t => t >= 0 && t <= maxTime * 1.1);
                    
                    return currentChart.data.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={currentChart.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                          <XAxis
                            dataKey="time"
                            type="number"
                            label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fill: '#fff' }}
                            stroke="#fff"
                            tick={{ fill: '#fff', fontSize: 12 }}
                            domain={maxTime > 0 ? [0, maxTime * 1.05] : [0, 'dataMax']}
                            ticks={validTicks.length >= 2 ? validTicks : undefined}
                            tickFormatter={(value) => formatTimeTick(Number(value), interval)}
                            allowDecimals={true}
                          />
                          <YAxis
                            label={{ value: `Velocity (${currentChart.unit})`, angle: -90, position: 'insideLeft', fill: '#fff' }}
                            stroke="#fff"
                            tick={{ fill: '#fff', fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }}
                            labelStyle={{ color: '#fff' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="velocity"
                            stroke={currentChart.color}
                            strokeWidth={3}
                            dot={false}
                            isAnimationActive={!isRunning}
                            animationDuration={isRunning ? 0 : 300}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 border border-gray-600 rounded-lg text-sm">
                        Start the simulation to see the chart
                      </div>
                    );
                  }
                })()}
              </div>
              
              {/* Chart Description */}
              <div className="bg-gray-800 bg-opacity-60 p-3 rounded-lg border border-gray-600">
                <p className="text-xs text-gray-300">{charts[currentChartIndex].description}</p>
              </div>
            </div>
          </>
        )}

        {/* Loading State - Only show if scene not ready */}
        {!sceneReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="text-white text-xl">Loading 3D Scene...</div>
          </div>
        )}
      </div>
    </div>
  );
}
