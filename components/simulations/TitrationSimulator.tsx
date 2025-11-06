import { useState, useEffect, useRef, useMemo, createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, Pause, RotateCcw, Info, Beaker, Camera } from 'lucide-react';
import * as THREE from 'three';
import IntegratedGlassmorphismBurette from './titration/IntegratedGlassmorphismBurette';
import IntegratedGlassmorphismConicalFlask from './titration/IntegratedGlassmorphismConicalFlask';
import { 
  getDefaultCameraPosition, 
  getSavedCameraPosition,
  isAdmin,
  clearCameraPositionsCache
} from '../../services/cameraPositionService';
import type { CameraPosition } from '../../types/cameraPosition';
import CameraPositionAdmin from '../admin/CameraPositionAdmin';

// Module-level storage for Three.js objects - persists across component unmounts/remounts
const persistentThreeJS = {
  scene: null as THREE.Scene | null,
  camera: null as THREE.PerspectiveCamera | null,
  renderer: null as THREE.WebGLRenderer | null,
  isInitialized: false,
  buretteGroup: null as THREE.Group | null,
  flaskGroup: null as THREE.Group | null,
};

// Module-level storage for React state - persists across component unmounts/remounts
const persistentState = {
  solutionType: 'acid' as 'acid' | 'base',
  solutionConc: 0.1,
  solutionVol: 25,
  titrantType: 'base' as 'acid' | 'base',
  titrantConc: 0.1,
  titrantAdded: 0,
  isRunning: false,
  buretteStopcockOpen: false,
  data: [] as {volume: number, pH: number}[],
  showTutorial: false,
  showConfig: false,
  showChart: false,
  showChartSidebar: true,
  chartWidth: 384,
  isResizing: false,
  isInitialized: false,
  showAdminCamera: false,
};

const calculatePH = (concentration: number, volume: number, type: string, titrantConc: number, titrantVol: number, titrantType: string) => {
  const totalVol = volume + titrantVol;
  if (totalVol === 0) return type === 'acid' ? 1 : 13;
  
  const initialMoles = concentration * volume / 1000;
  const titrantMoles = titrantConc * titrantVol / 1000;
  
  let excessMoles = 0;
  let resultType = type;
  
  if (type === 'acid' && titrantType === 'base') {
    excessMoles = initialMoles - titrantMoles;
    if (excessMoles < 0) {
      resultType = 'base';
      excessMoles = Math.abs(excessMoles);
    }
  } else if (type === 'base' && titrantType === 'acid') {
    excessMoles = initialMoles - titrantMoles;
    if (excessMoles < 0) {
      resultType = 'acid';
      excessMoles = Math.abs(excessMoles);
    }
  }
  
  const excessConc = (excessMoles / totalVol) * 1000;
  
  if (excessConc < 1e-7) return 7.0;
  
  if (resultType === 'acid') {
    return Math.max(0, -Math.log10(excessConc));
  } else {
    return Math.min(14, 14 + Math.log10(excessConc));
  }
};

const getIndicatorColor = (pH: number) => {
  if (pH < 8.2) {
    return new THREE.Color(0.8, 0.8, 0.9);
  } else if (pH > 10) {
    return new THREE.Color(1.0, 0.1, 0.6);
  } else {
    const t = (pH - 8.2) / 1.8;
    return new THREE.Color(0.8 + (0.2 * t), 0.8 - (0.7 * t), 0.9 - (0.3 * t));
  }
};

interface TitrationSimulatorProps {
  isEmbedded?: boolean;
  onChartOpenChange?: (isOpen: boolean) => void;
}

export default function TitrationSimulator({ isEmbedded = false, onChartOpenChange }: TitrationSimulatorProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  
  // Initialize state from persistent storage or defaults
  const [solutionType, setSolutionType] = useState(() => persistentState.solutionType);
  const [solutionConc, setSolutionConc] = useState(() => persistentState.solutionConc);
  const [solutionVol, setSolutionVol] = useState(() => persistentState.solutionVol);
  const [titrantType, setTitrantType] = useState(() => persistentState.titrantType);
  const [titrantConc, setTitrantConc] = useState(() => persistentState.titrantConc);
  const [titrantAdded, setTitrantAdded] = useState(() => persistentState.titrantAdded);
  const [isRunning, setIsRunning] = useState(() => persistentState.isRunning);
  const [data, setData] = useState<{volume: number, pH: number}[]>(() => [...persistentState.data]);
  const [showTutorial, setShowTutorial] = useState(() => persistentState.showTutorial);
  const [showConfig, setShowConfig] = useState(() => persistentState.showConfig);
  const [showChart, setShowChart] = useState(() => persistentState.showChart);
  const [showChartSidebar, setShowChartSidebar] = useState(() => persistentState.showChartSidebar);
  const [chartWidth, setChartWidth] = useState(() => persistentState.chartWidth);
  const [isResizing, setIsResizing] = useState(() => persistentState.isResizing);
  const [showAdminCamera, setShowAdminCamera] = useState(() => persistentState.showAdminCamera);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const chartResizeRef = useRef<HTMLDivElement>(null);
  const [sceneReady, setSceneReady] = useState(() => persistentThreeJS.isInitialized);
  
  // Load default camera position from config (admin-controlled)
  const [defaultCameraPosition, setDefaultCameraPosition] = useState<CameraPosition | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  
  // Sync state changes to persistent storage
  useEffect(() => {
    persistentState.solutionType = solutionType;
  }, [solutionType]);
  useEffect(() => {
    persistentState.solutionConc = solutionConc;
  }, [solutionConc]);
  useEffect(() => {
    persistentState.solutionVol = solutionVol;
  }, [solutionVol]);
  useEffect(() => {
    persistentState.titrantType = titrantType;
  }, [titrantType]);
  useEffect(() => {
    persistentState.titrantConc = titrantConc;
  }, [titrantConc]);
  useEffect(() => {
    persistentState.titrantAdded = titrantAdded;
  }, [titrantAdded]);
  useEffect(() => {
    persistentState.isRunning = isRunning;
  }, [isRunning]);
  useEffect(() => {
    persistentState.data = [...data];
  }, [data]);
  useEffect(() => {
    persistentState.showTutorial = showTutorial;
  }, [showTutorial]);
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
  const [autoRotate, setAutoRotate] = useState(true);
  const [buretteStopcockOpen, setBuretteStopcockOpen] = useState(() => persistentState.buretteStopcockOpen);
  const [buretteGripWidth, setBuretteGripWidth] = useState(25); // Default to burette diameter grip
  
  // Sync buretteStopcockOpen to persistent state
  useEffect(() => {
    persistentState.buretteStopcockOpen = buretteStopcockOpen;
  }, [buretteStopcockOpen]);
  
  // Ref to track liquid level without causing React re-renders
  const buretteLiquidLevelRef = useRef(100);
  
  const lastUpdateRef = useRef(Date.now());
  const mouseDownRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({ theta: 0, phi: Math.PI / 4 });
  const cameraDistanceRef = useRef(18); // Increased initial distance for larger world
  const autoRotateRef = useRef(0);
  const userHasRotatedRef = useRef(false);
  const glassmorphismBuretteRef = useRef<THREE.Group | null>(null);
  
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
      const savedPosition = getSavedCameraPosition('titration');
      if (savedPosition) {
        setDefaultCameraPosition(savedPosition);
        return;
      }
      
      // Load from config file
      const position = await getDefaultCameraPosition('titration');
      if (position) {
        setDefaultCameraPosition(position);
      }
    };
    
    loadDefaultPosition();
  }, []);
  
  const conicalFlaskRef = useRef<THREE.Group | null>(null);
  
  // Panning refs - dynamic orbit center (panOffsetRef already defined above)
  const isPanningRef = useRef(false);
  const isMiddleMouseRef = useRef(false);
  
  // Touch handling refs
  const touchDownRef = useRef(false);
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const initialDistanceRef = useRef(0);
  const initialCameraDistanceRef = useRef(18);
  const touchPanModeRef = useRef(false); // Track if two-finger pan (vs pinch zoom)
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
  
  // Chart resize handler for PC/tablet - using ref to avoid re-renders during resize
  const chartWidthRef = useRef(chartWidth);
  const rafRef = useRef<number | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    chartWidthRef.current = chartWidth;
  }, [chartWidth]);
  
  useEffect(() => {
    if (isResizing && chartResizeRef.current) {
      const container = chartResizeRef.current.closest('.flex') as HTMLElement;
      if (!container) return;
      
      const handleMouseMove = (e: MouseEvent) => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        
        rafRef.current = requestAnimationFrame(() => {
          if (!chartResizeRef.current || !container) return;
          
          const containerRect = container.getBoundingClientRect();
          const mouseX = e.clientX;
          const containerRight = containerRect.right;
          const newWidth = containerRight - mouseX;
          
          // Constrain between 200px and 600px, and ensure it doesn't go off screen
          const minWidth = 200;
          const maxWidth = 600;
          const containerWidth = containerRect.width;
          const maxAllowedWidth = Math.min(maxWidth, containerWidth - 100); // Leave 100px for canvas minimum
          
          const constrainedWidth = Math.max(minWidth, Math.min(maxAllowedWidth, newWidth));
          
          // Only update if width actually changed (prevents unnecessary re-renders)
          if (Math.abs(chartWidthRef.current - constrainedWidth) > 1) {
            chartWidthRef.current = constrainedWidth;
            // Directly update DOM to avoid React re-render
            const chartSidebar = container.querySelector('[data-chart-sidebar]') as HTMLElement;
            const resizeHandle = chartResizeRef.current;
            if (chartSidebar) {
              chartSidebar.style.width = `${constrainedWidth}px`;
            }
            if (resizeHandle) {
              resizeHandle.style.right = `${constrainedWidth}px`;
            }
          }
        });
      };

      const handleMouseUp = () => {
        // Update state once when done resizing
        setChartWidth(chartWidthRef.current);
        setIsResizing(false);
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };

      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }
  }, [isResizing]);
  
  const currentPH = useMemo(() => {
    return calculatePH(solutionConc, solutionVol, solutionType, titrantConc, titrantAdded, titrantType);
  }, [solutionConc, solutionVol, solutionType, titrantConc, titrantAdded, titrantType]);
  
  const indicatorColor = useMemo(() => getIndicatorColor(currentPH), [currentPH]);
  
  const equivalencePoint = useMemo(() => {
    const eqVol = (solutionConc * solutionVol) / titrantConc;
    return eqVol.toFixed(2);
  }, [solutionConc, solutionVol, titrantConc]);
  
  useEffect(() => {
    if (!mountRef.current) return;
    
    // Check initial dimensions first
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
                if (autoRotate && !mouseDownRef.current && !userHasRotatedRef.current && !isPanningRef.current) {
                  autoRotateRef.current += 0.002;
                  cameraAngleRef.current.theta = autoRotateRef.current;
                }
                
                // Get current look-at point (dynamic orbit center)
                const lookAtPoint = panOffsetRef.current;
                
                // Update camera position based on current angles and distance around dynamic look-at point
                const radius = cameraDistanceRef.current;
                cameraRef.current.position.x = lookAtPoint.x + radius * Math.sin(cameraAngleRef.current.phi) * Math.cos(cameraAngleRef.current.theta);
                cameraRef.current.position.y = lookAtPoint.y + radius * Math.cos(cameraAngleRef.current.phi);
                cameraRef.current.position.z = lookAtPoint.z + radius * Math.sin(cameraAngleRef.current.phi) * Math.sin(cameraAngleRef.current.theta);
                cameraRef.current.lookAt(lookAtPoint);
                
                if (glassmorphismBuretteRef.current) {
                  (glassmorphismBuretteRef.current as THREE.Group).position.y = 10.5;
                }
                
                rendererRef.current.render(sceneRef.current, cameraRef.current);
              }
            }
            animationIdRef.current = requestAnimationFrame(animate);
          };
          animate();
        }
        
        // Scene is already ready
        setSceneReady(true);
        return;
      }
      
      // First time initialization - create new Three.js objects
      if (persistentThreeJS.isInitialized) return;
      
      // Reset scene ready state only on first initialization
      setSceneReady(false);
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;
      persistentThreeJS.scene = scene;
    
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(8, 4, 8);
    camera.lookAt(0, 2, 0);
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
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(10, 15, 10);
    mainLight.castShadow = true;
    scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    fillLight.position.set(-10, 5, -10);
    scene.add(fillLight);
    
    const benchGeometry = new THREE.BoxGeometry(20, 0.4, 12);
    const benchMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x6b4423,
      roughness: 0.8,
      metalness: 0.1
    });
    const bench = new THREE.Mesh(benchGeometry, benchMaterial);
    bench.position.y = -0.2;
    bench.receiveShadow = true;
    scene.add(bench);
    
    // Conical flask will be added by the IntegratedGlassmorphismConicalFlask component
    
    const standGroup = new THREE.Group();
    
      const basePlateGeometry = new THREE.CylinderGeometry(3.5, 3.5, 0.3, 32);
    const metalMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x444444,
      roughness: 0.4,
      metalness: 0.9
    });
    const basePlate = new THREE.Mesh(basePlateGeometry, metalMaterial);
    basePlate.position.y = 0.15;
    basePlate.castShadow = true;
    standGroup.add(basePlate);
    
      const rodGeometry = new THREE.CylinderGeometry(0.1, 0.1, 10, 16);
    const verticalRod = new THREE.Mesh(rodGeometry, metalMaterial);
      verticalRod.position.set(2, 5.1, 0);
    verticalRod.castShadow = true;
    standGroup.add(verticalRod);
    
      standGroup.rotation.y = Math.PI / 2;
      standGroup.scale.set(1.2, 1.2, 1.2);
    
    scene.add(standGroup);
    
      const gridHelper = new THREE.GridHelper(40, 40, 0x444444, 0x222222);
    gridHelper.position.y = -0.4;
    scene.add(gridHelper);
    
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
        if (autoRotate && !mouseDownRef.current && !userHasRotatedRef.current && !isPanningRef.current) {
          autoRotateRef.current += 0.002;
          cameraAngleRef.current.theta = autoRotateRef.current;
        }
        
        // Get current look-at point (dynamic orbit center)
        const lookAtPoint = panOffsetRef.current;
        
        // Update camera position based on current angles and distance around dynamic look-at point
        const radius = cameraDistanceRef.current;
        cameraRef.current.position.x = lookAtPoint.x + radius * Math.sin(cameraAngleRef.current.phi) * Math.cos(cameraAngleRef.current.theta);
        cameraRef.current.position.y = lookAtPoint.y + radius * Math.cos(cameraAngleRef.current.phi);
        cameraRef.current.position.z = lookAtPoint.z + radius * Math.sin(cameraAngleRef.current.phi) * Math.sin(cameraAngleRef.current.theta);
        cameraRef.current.lookAt(lookAtPoint);
        
        if (glassmorphismBuretteRef.current) {
              (glassmorphismBuretteRef.current as THREE.Group).position.y = 10.5;
        }
        
        rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
      }
      animationIdRef.current = requestAnimationFrame(animate);
    };
      
      // Start animation loop only if not already running
      if (!animationIdRef.current) {
    animate();
      }
    
    const handleMouseDown = (e: MouseEvent) => {
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
    };
    
    const handleMouseMove = (e: MouseEvent) => {
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
        
        // Update pan offset (look-at point) - REVERSED directions
        panOffsetRef.current.add(right.multiplyScalar(-deltaX * panSpeed)); // REVERSED
        panOffsetRef.current.add(up.multiplyScalar(deltaY * panSpeed)); // REVERSED
        
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      } else if (mouseDownRef.current && cameraRef.current && !isMiddleMouseRef.current) {
        // Orbit mode - rotate around look-at point (REVERSED AGAIN)
        const deltaX = e.clientX - lastMouseRef.current.x;
        const deltaY = e.clientY - lastMouseRef.current.y;
        
        cameraAngleRef.current.theta += deltaX * 0.005; // REVERSED AGAIN
        cameraAngleRef.current.phi -= deltaY * 0.005; // REVERSED AGAIN
        cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2, cameraAngleRef.current.phi));
        
        // Mark that user has manually rotated
        userHasRotatedRef.current = true;
        
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      }
    };
    
    const handleMouseUp = () => {
      if (isMiddleMouseRef.current) {
        isPanningRef.current = false;
        isMiddleMouseRef.current = false;
      } else {
        mouseDownRef.current = false;
      }
    };
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (cameraRef.current) {
        const delta = e.deltaY * 0.01;
        
        // Blender-style zoom: change distance along view direction (REVERSED)
        const zoomSpeed = 0.5;
        const newDistance = cameraDistanceRef.current + (delta * zoomSpeed); // REVERSED
        cameraDistanceRef.current = Math.max(5, Math.min(40, newDistance));
      }
    };
    
    // Touch event handlers for mobile
    const handleTouchStart = (e: TouchEvent) => {
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
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      
      if (e.touches.length === 1 && touchDownRef.current && cameraRef.current) {
        // Single touch - rotation (REVERSED AGAIN)
        const touch = e.touches[0];
        const deltaX = touch.clientX - lastTouchRef.current.x;
        const deltaY = touch.clientY - lastTouchRef.current.y;
        
        cameraAngleRef.current.theta += deltaX * 0.005; // REVERSED AGAIN
        cameraAngleRef.current.phi -= deltaY * 0.005; // REVERSED AGAIN
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
        // If distance changes significantly more than center movement, it's zoom
        // If center moves significantly more than distance changes, it's pan
        const isZoom = distanceChangePercent > 0.15 && distanceChangePercent > (centerMove / initialDistanceRef.current);
        
        if (isZoom) {
          // Pinch to zoom
          touchPanModeRef.current = false;
          const scale = distance / initialDistanceRef.current;
          
          // Calculate new distance based on scale change (REVERSED)
          // Scale > 1 means fingers moved apart (zoom in), scale < 1 means fingers moved together (zoom out)
          const zoomSpeed = 0.5;
          const distanceChange = (1 - scale) * initialCameraDistanceRef.current * zoomSpeed;
          const newDistance = initialCameraDistanceRef.current + distanceChange; // REVERSED
          cameraDistanceRef.current = Math.max(5, Math.min(40, newDistance));
          
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
          
          // Update pan offset (look-at point) - REVERSED directions
          panOffsetRef.current.add(right.multiplyScalar(-deltaX * panSpeed)); // REVERSED
          panOffsetRef.current.add(up.multiplyScalar(deltaY * panSpeed)); // REVERSED
          
          // Update initial center for next frame
          initialTouchCenterRef.current = currentCenter;
        }
      }
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      touchDownRef.current = false;
      touchPanModeRef.current = false;
      isPanningRef.current = false;
    };
    
    // Store handlers in refs for reuse when canvas moves
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
    
    // Prevent context menu on middle mouse button
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
          
          // For screens ≤576px: fix height at 500px (value at 576px width), keep width responsive
          if (isEmbedded && window.innerWidth <= 576) {
            h = 500; // Fixed height for mobile small view
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
        if (rendererRef.current && rendererRef.current.domElement && eventHandlersRef.current.handleMouseDown) {
          // Use stored handlers for removal
          rendererRef.current.domElement.removeEventListener('mousedown', eventHandlersRef.current.handleMouseDown);
          rendererRef.current.domElement.removeEventListener('mousemove', eventHandlersRef.current.handleMouseMove!);
          rendererRef.current.domElement.removeEventListener('mouseup', eventHandlersRef.current.handleMouseUp!);
          rendererRef.current.domElement.removeEventListener('wheel', eventHandlersRef.current.handleWheel!);
          rendererRef.current.domElement.removeEventListener('touchstart', eventHandlersRef.current.handleTouchStart!);
          rendererRef.current.domElement.removeEventListener('touchmove', eventHandlersRef.current.handleTouchMove!);
          rendererRef.current.domElement.removeEventListener('touchend', eventHandlersRef.current.handleTouchEnd!);
          if (eventHandlersRef.current.handleContextMenu) {
            rendererRef.current.domElement.removeEventListener('contextmenu', eventHandlersRef.current.handleContextMenu);
          }
        }
        resizeObserver.disconnect();
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
        if (mountRef.current && rendererRef.current && rendererRef.current.domElement && mountRef.current.contains(rendererRef.current.domElement)) {
          mountRef.current.removeChild(rendererRef.current.domElement);
      }
        if (rendererRef.current) {
          rendererRef.current.dispose();
        }
      };
    };
    
    // Store cleanup function
    let cleanupFn: (() => void) | null = null;
    
    // Start initialization check with a small delay to ensure container is rendered
    const timeoutId = setTimeout(() => {
      cleanupFn = checkAndInit() || null;
    }, 50);
    
    // Cleanup - only cleanup event listeners, preserve Three.js objects
    // Three.js objects are stored in module-level persistentThreeJS and will be reused
    return () => {
      clearTimeout(timeoutId);
      
      // Call cleanup function to remove event listeners
      if (cleanupFn) {
        cleanupFn();
        cleanupFn = null;
      }
      
      // NOTE: We intentionally do NOT dispose Three.js objects here
      // They are stored in persistentThreeJS and will be reused on next mount
      // Only dispose on true unmount (when user navigates away from simulation)
    };
  }, []);
  
  // Separate cleanup for true unmount (component permanently removed - e.g., navigating away)
  // This only runs when component is completely removed from the app
  useEffect(() => {
    return () => {
      // Check if this is truly the last instance (navigation away from simulation)
      // This is a simplified check - in a real app, you might use a router or context
      // For now, we'll dispose when the component unmounts AND persistentThreeJS exists
      // Note: This is a fallback - ideally Three.js objects should persist for the app lifetime
      
      // Actually, let's NOT auto-dispose here. Keep objects for app lifetime.
      // User can refresh page if they want fresh start.
      // Disposal will happen on page refresh/navigation naturally.
    };
  }, []);
  
  // Handle isEmbedded prop changes - move canvas and update size without reinitializing
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
          
          // Update pan offset (look-at point) - REVERSED directions
          panOffsetRef.current.add(right.multiplyScalar(-deltaX * panSpeed)); // REVERSED
          panOffsetRef.current.add(up.multiplyScalar(deltaY * panSpeed)); // REVERSED
          
          lastMouseRef.current = { x: e.clientX, y: e.clientY };
        } else if (mouseDownRef.current && cameraRef.current && !isMiddleMouseRef.current) {
          // Orbit mode - rotate around look-at point (REVERSED AGAIN)
          const deltaX = e.clientX - lastMouseRef.current.x;
          const deltaY = e.clientY - lastMouseRef.current.y;
          
          cameraAngleRef.current.theta += deltaX * 0.005; // REVERSED AGAIN
          cameraAngleRef.current.phi -= deltaY * 0.005; // REVERSED AGAIN
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
          
          // Blender-style zoom: change distance along view direction (REVERSED)
          const zoomSpeed = 0.5;
          const newDistance = cameraDistanceRef.current + (delta * zoomSpeed); // REVERSED
          cameraDistanceRef.current = Math.max(5, Math.min(40, newDistance));
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
          // Single touch - rotation (REVERSED AGAIN)
          const touch = e.touches[0];
          const deltaX = touch.clientX - lastTouchRef.current.x;
          const deltaY = touch.clientY - lastTouchRef.current.y;
          
          cameraAngleRef.current.theta += deltaX * 0.005; // REVERSED AGAIN
          cameraAngleRef.current.phi -= deltaY * 0.005; // REVERSED AGAIN
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
          // If distance changes significantly more than center movement, it's zoom
          // If center moves significantly more than distance changes, it's pan
          const isZoom = distanceChangePercent > 0.15 && distanceChangePercent > (centerMove / initialDistanceRef.current);
          
          if (isZoom) {
            // Pinch to zoom
            touchPanModeRef.current = false;
            const scale = distance / initialDistanceRef.current;
            
            // Calculate new distance based on scale change (REVERSED)
            // Scale > 1 means fingers moved apart (zoom in), scale < 1 means fingers moved together (zoom out)
            const zoomSpeed = 0.5;
            const distanceChange = (1 - scale) * initialCameraDistanceRef.current * zoomSpeed;
            const newDistance = initialCameraDistanceRef.current + distanceChange; // REVERSED
            cameraDistanceRef.current = Math.max(5, Math.min(40, newDistance));
            
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
            
            // Update pan offset (look-at point) - REVERSED directions
            panOffsetRef.current.add(right.multiplyScalar(-deltaX * panSpeed)); // REVERSED
            panOffsetRef.current.add(up.multiplyScalar(deltaY * panSpeed)); // REVERSED
            
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
  
  useEffect(() => {
    // Conical flask liquid level will be handled by the IntegratedGlassmorphismConicalFlask component
    // No need for separate liquid level management here
  }, [indicatorColor, solutionVol, titrantAdded, sceneReady]);

  // Remove separate useEffect for burette liquid level updates - now handled directly in titration interval
  
  // Reset manual rotation flag when auto-rotate is turned on
  useEffect(() => {
    if (autoRotate) {
      userHasRotatedRef.current = false;
    }
  }, [autoRotate]);
  
  
  
  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        const now = Date.now();
        const delta = (now - lastUpdateRef.current) / 1000;
        lastUpdateRef.current = now;
        
        const flowRate = 1.2; // Increased flow rate as requested
        const increment = flowRate * delta;
        
        setTitrantAdded(prev => {
          const newVol = Math.min(prev + increment, 50); // Burette holds max 50mL
          if (newVol >= 50) { // Burette empty when 50mL added
            setIsRunning(false);
            setBuretteStopcockOpen(false); // Close stopcock when burette is empty
          }
          
          // Update burette liquid level ref directly for smooth animation
          // Since markings go from 0 (top) to 50 (bottom), and liquid starts at 0 mark (full)
          // As we add titrant, liquid level drops to show volume added
          // If we've added 25mL, liquid should be at 25mL mark (50% down from top)
          // So liquid level should be 100% - (volumeAdded/50) * 100%
          const volumeAdded = newVol; // This represents mL added
          const liquidLevelPercentage = 100 - (volumeAdded / 50) * 100; // Start at 100%, subtract based on volume added
          buretteLiquidLevelRef.current = Math.max(0, liquidLevelPercentage);
          
          return newVol;
        });
      }, 100); // Increased interval for smoother updates
      
      return () => clearInterval(interval);
    }
  }, [isRunning]);
  
  // Droplet useEffect removed - using proper stream from burette instead
  
  useEffect(() => {
    if (titrantAdded > 0) {
      setData(prev => {
        const lastPoint = prev[prev.length - 1];
        const currentVolume = parseFloat(titrantAdded.toFixed(2));
        const currentPHValue = parseFloat(currentPH.toFixed(2));
        
        // Add new point if volume changed significantly (reduced threshold for smoother updates)
        if (!lastPoint || Math.abs(lastPoint.volume - titrantAdded) > 0.02) {
          return [...prev, { 
            volume: currentVolume, 
            pH: currentPHValue 
          }];
        }
        // Update last point's pH value in real-time if pH changed significantly
        else if (lastPoint && Math.abs(lastPoint.pH - currentPH) > 0.01) {
          const updatedData = [...prev];
          updatedData[updatedData.length - 1] = {
            volume: currentVolume,
            pH: currentPHValue
          };
          return updatedData;
        }
        return prev;
      });
    }
  }, [titrantAdded, currentPH]);
  
  const toggleDispensing = () => {
    if (!isRunning) {
      lastUpdateRef.current = Date.now();
      setBuretteStopcockOpen(true); // Open stopcock when starting
    } else {
      setBuretteStopcockOpen(false); // Close stopcock when stopping
    }
    setIsRunning(!isRunning);
  };
  
  const reset = () => {
    setIsRunning(false);
    setBuretteStopcockOpen(false); // Close stopcock on reset
    setTitrantAdded(0);
    setData([]);
    // Reset persistent state as well
    persistentState.isRunning = false;
    persistentState.buretteStopcockOpen = false;
    persistentState.titrantAdded = 0;
    persistentState.data = [];
    // Reset burette liquid level ref to start at 0 mark (full)
    buretteLiquidLevelRef.current = 100;
  };

  // Render guide button in wrapper (embedded mode) or fullscreen container
  useEffect(() => {
    // For embedded mode
    if (isEmbedded) {
      const guideContainer = document.getElementById('embedded-guide-button-container');
      if (guideContainer) {
        // Hide guide button on mobile when chart is open
        if (isMobile && showChart) {
          guideContainer.style.display = 'none';
          guideContainer.innerHTML = '';
          return;
        }
        guideContainer.style.display = '';
        guideContainer.innerHTML = '';
        
        const guideBtn = document.createElement('button');
        guideBtn.className = 'text-white px-3 py-2 rounded-lg text-sm shadow-lg flex items-center justify-center hover:opacity-80 transition';
        guideBtn.setAttribute('aria-label', showTutorial ? 'Hide Guide' : 'Show Guide');
        guideBtn.innerHTML = `
          <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
        `;
        guideBtn.addEventListener('click', () => setShowTutorial(!showTutorial));
        
        guideContainer.appendChild(guideBtn);
        
        return () => {
          guideBtn.removeEventListener('click', () => setShowTutorial(!showTutorial));
          if (guideContainer) guideContainer.innerHTML = '';
        };
      }
    } else {
      // For fullscreen mode
      const fullscreenContainer = document.getElementById('fullscreen-guide-button-container');
      if (fullscreenContainer) {
        // Hide guide button on mobile when chart is open
        if (isMobile && showChart) {
          fullscreenContainer.style.display = 'none';
          fullscreenContainer.innerHTML = '';
          return;
        }
        fullscreenContainer.style.display = '';
        fullscreenContainer.innerHTML = '';
        
        const guideBtn = document.createElement('button');
        guideBtn.className = 'text-white px-3 py-2 rounded-lg text-sm shadow-lg flex items-center justify-center hover:opacity-80 transition';
        guideBtn.setAttribute('aria-label', showTutorial ? 'Hide Guide' : 'Show Guide');
        guideBtn.innerHTML = `
          <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
        `;
        guideBtn.addEventListener('click', () => setShowTutorial(!showTutorial));
        
        fullscreenContainer.appendChild(guideBtn);
        
        return () => {
          guideBtn.removeEventListener('click', () => setShowTutorial(!showTutorial));
          if (fullscreenContainer) fullscreenContainer.innerHTML = '';
        };
      }
    }
  }, [isEmbedded, showTutorial, isMobile, showChart]);

  // Render embedded controls in wrapper when embedded
  useEffect(() => {
    if (!isEmbedded) return;
    
    const container = document.getElementById('embedded-controls-container');
    if (!container) return;
    
    // Create React portal content
    const renderButtons = () => {
      container.innerHTML = '';
      
      const startBtn = document.createElement('button');
      // Icon-only button matching mobile/tablet style - using lucide-react icons
      startBtn.className = `flex items-center justify-center w-14 h-14 rounded-full font-semibold transition shadow-xl text-white ${isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`;
      startBtn.setAttribute('aria-label', isRunning ? 'Pause' : 'Start');
      // Use lucide-react Play/Pause icons (same as full view)
      const iconElement = isRunning 
        ? createElement(Pause, { className: 'w-6 h-6', strokeWidth: 2 })
        : createElement(Play, { className: 'w-6 h-6', strokeWidth: 2 });
      startBtn.innerHTML = renderToString(iconElement);
      startBtn.addEventListener('click', toggleDispensing);
      
      const resetBtn = document.createElement('button');
      // Icon-only button matching mobile/tablet style - using lucide-react icon
      resetBtn.className = 'w-14 h-14 bg-gray-600 hover:bg-gray-700 text-white rounded-full font-semibold transition shadow-xl flex items-center justify-center';
      resetBtn.setAttribute('aria-label', 'Reset');
      // Use lucide-react RotateCcw icon (same as full view)
      const resetIcon = createElement(RotateCcw, { className: 'w-5 h-5', strokeWidth: 2 });
      resetBtn.innerHTML = renderToString(resetIcon);
      resetBtn.addEventListener('click', reset);
      
      container.appendChild(startBtn);
      container.appendChild(resetBtn);
      
      return () => {
        startBtn.removeEventListener('click', toggleDispensing);
        resetBtn.removeEventListener('click', reset);
      };
    };
    
    const cleanup = renderButtons();
    
    return () => {
      if (cleanup) cleanup();
      if (container) container.innerHTML = '';
    };
  }, [isEmbedded, isRunning]);
  
  // Memoize position vectors to prevent unnecessary re-renders
  const burettePosition = useMemo(() => new THREE.Vector3(0, 8.5, 0), []);
  const flaskPosition = useMemo(() => new THREE.Vector3(0, 2.5, 0), []);
  
  return (
    <div 
      className="w-full h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden flex flex-col"
      data-titration-simulator="true"
    >
      {/* Glassmorphism Burette Component */}
      {sceneReady && sceneRef.current && (
        <IntegratedGlassmorphismBurette
          position={burettePosition}
          scale={1.2} // Increased scale for larger world
          liquidLevelRef={buretteLiquidLevelRef}
          liquidColor="#4488ff"
          stopcockOpen={buretteStopcockOpen}
          conicalFlaskLiquidLevel={((5 + titrantAdded) / 50) * 100} // Pass conical flask liquid level
          scene={sceneRef.current}
          groupRef={glassmorphismBuretteRef}
          gripWidth={buretteGripWidth}
        />
      )}
      {/* Glassmorphism Conical Flask Component */}
      {sceneReady && sceneRef.current && (
        <IntegratedGlassmorphismConicalFlask
          position={flaskPosition}
          scale={1.2} // Increased scale for larger world
          liquidLevel={((5 + titrantAdded) / 50) * 100}
          liquidColor={`#${indicatorColor.getHexString()}`}
          scene={sceneRef.current}
          groupRef={conicalFlaskRef}
          stopcockOpen={buretteStopcockOpen} // Pass stopcock state to control stream
        />
      )}
      {/* Hide desktop header in full view - use mobile UI instead */}
      <div className={`hidden`}></div>
      
      {showTutorial && (
        <div className={`${isEmbedded ? 'hide-in-embedded' : 'hidden'} bg-yellow-900 bg-opacity-95 backdrop-blur-sm border-b border-yellow-600 p-4 shadow-lg`}>
          <div className="max-w-7xl mx-auto">
            <h3 className="font-bold text-yellow-100 mb-2 text-lg">Quick Guide:</h3>
            <div className="grid grid-cols-2 gap-4 text-yellow-200 text-sm">
              <ul className="space-y-1">
                <li>• Drag on 3D view to rotate camera</li>
                <li>• Scroll/pinch to zoom in/out</li>
                <li>• Start button begins titration</li>
                <li>• Auto-rotate shows all angles</li>
              </ul>
              <ul className="space-y-1">
                <li>• Watch stopcock rotate when dispensing</li>
                <li>• Monitor color change as pH shifts</li>
                <li>• Equipment vibrates realistically</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main 3D View Area - Full width, chart overlays on top */}
        <div className="flex-1 relative w-full">
          <div ref={mountRef} className="w-full h-full" />
          
          {/* Mobile App Name - Above Stack - Always show in full view */}
          <div className={`${isEmbedded ? 'force-mobile-ui' : 'force-mobile-ui'} absolute top-4 left-4 z-10`}>
            <div className="bg-black bg-opacity-70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm shadow-lg flex items-center gap-2">
              <Beaker className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-xs">3D Titration Simulator</span>
            </div>
          </div>

          {/* Mobile Controls Overlay - Single Stack - Always show in full view */}
          <div className={`${isEmbedded ? 'force-mobile-ui' : 'force-mobile-ui'} absolute top-16 left-4 z-10`}>
            <div className="flex flex-col gap-2">
              {/* Config Button */}
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="bg-black bg-opacity-70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm shadow-lg"
              >
                ⚙️ Config
              </button>
              
              {/* Status Bar */}
              <div className="bg-black bg-opacity-70 backdrop-blur-sm text-white px-3 py-3 rounded-lg shadow-lg">
                <div className="space-y-2">
                  <div className="text-center">
                    <p className="text-xs text-cyan-300">pH</p>
                    <p className="text-sm font-bold text-cyan-100">{currentPH.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-purple-300">Volume</p>
                    <p className="text-sm font-bold text-purple-100">{titrantAdded.toFixed(1)} mL</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-green-300">Status</p>
                    <p className="text-xs font-bold text-green-100">{isRunning ? 'Running' : 'Stopped'}</p>
                  </div>
                </div>
              </div>
              
              {/* Chart Button - In embedded mode always opens overlay, in full view PC/Tablet toggles sidebar */}
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
                className="bg-black bg-opacity-70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm shadow-lg"
              >
                📊 Chart
              </button>
            </div>
          </div>
          
          {/* Mobile Guide Button - Handled by wrapper component's icon button */}

          {/* Tutorial Overlay - Always within canvas container */}
          {showTutorial && (
            <div className={`absolute inset-0 z-50 bg-black bg-opacity-75 backdrop-blur-sm`}>
              <div className={`${isEmbedded ? 'h-full' : 'h-full'} bg-black bg-opacity-90 backdrop-blur-md p-4 sm:p-6 overflow-y-auto`}>
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
                      <li>• Pinch to zoom in/out</li>
                      <li>• Auto-rotate shows all angles</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-yellow-100 mb-2">Titration:</h3>
                    <ul className="space-y-1">
                      <li>• Start button begins titration</li>
                      <li>• Watch stopcock rotate when dispensing</li>
                      <li>• Monitor color change as pH shifts</li>
                      <li>• Equipment vibrates realistically</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-yellow-100 mb-2">Controls:</h3>
                    <ul className="space-y-1">
                      <li>• Config: Adjust solution settings</li>
                      <li>• Chart: View titration curve</li>
                      <li>• Status: Monitor pH and volume</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          
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
              simulationId="titration"
              cameraAngle={cameraStateForAdmin.cameraAngle}
              cameraDistance={cameraStateForAdmin.cameraDistance}
              panOffset={cameraStateForAdmin.panOffset}
              onSave={(position) => {
                // Update default position state when saved
                setDefaultCameraPosition(position);
                // Clear cache to force reload
                clearCameraPositionsCache();
                // Reload default position
                const savedPosition = getSavedCameraPosition('titration');
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
          
          {/* Floating Start Button - Overlay on Canvas - Only show in full view (not embedded) */}
          {!isEmbedded && (
            <div 
              className="absolute left-0 right-0 z-[200] flex justify-center"
              style={{ 
                bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)'
              }}
            >
              <div className="flex gap-2">
              <button
                onClick={toggleDispensing}
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
          
          {!sceneReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="text-white text-xl">Loading 3D Scene...</div>
          </div>
          )}
          
          {/* Show Chart Button - Only visible when chart sidebar is hidden on PC/tablet */}
          {!showChartSidebar && !isEmbedded && !isMobile && (
            <button
              onClick={() => setShowChartSidebar(true)}
              className="absolute bottom-4 right-4 z-20 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 transition"
              aria-label="Show Chart"
            >
              <span className="text-lg">📊</span>
              <span>Show Chart</span>
            </button>
          )}
            </div>
        
        {/* pH Chart Sidebar - Visible on PC/tablet when toggled, hidden in embedded and mobile */}
        {/* Make it an overlay to prevent layout reflow and canvas re-rendering */}
        {showChartSidebar && !isEmbedded && !isMobile && (
          <>
            {/* Resize handle - positioned absolutely */}
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
            {/* Chart sidebar - positioned absolutely as overlay */}
            <div 
              data-chart-sidebar
              className="absolute top-0 bottom-0 right-0 bg-black bg-opacity-50 backdrop-blur-md p-6 overflow-y-auto border-l border-cyan-500 border-opacity-30 shadow-xl z-20"
              style={{ 
                width: `${chartWidth}px`,
                minWidth: '200px',
                maxWidth: '600px'
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-cyan-300">Titration Curve</h2>
                <button
                  onClick={() => setShowChartSidebar(false)}
                  className="text-white hover:text-cyan-400 transition text-xl"
                  aria-label="Hide Chart"
                >
                  ×
                </button>
        </div>
          
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height={400} key={`chart-${data.length}`}>
              <LineChart data={data} key={`linechart-${data.length}`}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis
                  dataKey="volume"
                  label={{ value: 'Volume (mL)', position: 'insideBottom', offset: -5, fill: '#fff' }}
                  stroke="#fff"
                  tick={{ fill: '#fff' }}
                  domain={['auto', 'auto']}
                />
                <YAxis
                  domain={[0, 14]}
                  label={{ value: 'pH', angle: -90, position: 'insideLeft', fill: '#fff' }}
                  stroke="#fff"
                  tick={{ fill: '#fff' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line
                  type="monotone"
                  dataKey="pH"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  dot={false}
                  isAnimationActive={!isRunning}
                  animationDuration={isRunning ? 0 : 300}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-96 flex items-center justify-center text-gray-400 border border-gray-600 rounded-lg">
              Start the titration to see the curve
            </div>
          )}
          
          <div className="mt-6 space-y-3">
            <div className="bg-gray-800 bg-opacity-60 p-3 rounded-lg border border-gray-600">
              <h3 className="text-sm font-semibold text-cyan-300 mb-2">Key Points:</h3>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>• Steep curve = equivalence point region</li>
                <li>• Color change occurs near pH 8-10</li>
                <li>• Buffer region shows gradual pH change</li>
              </ul>
            </div>
            
            {data.length > 0 && (
              <div className="bg-gray-800 bg-opacity-60 p-3 rounded-lg border border-gray-600">
                <h3 className="text-sm font-semibold text-purple-300 mb-2">Current Data:</h3>
                <p className="text-xs text-gray-300">Points collected: {data.length}</p>
                <p className="text-xs text-gray-300">pH range: {Math.min(...data.map(d => d.pH)).toFixed(1)} - {Math.max(...data.map(d => d.pH)).toFixed(1)}</p>
              </div>
            )}
          </div>
        </div>
          </>
        )}
      </div>
      
      {/* Mobile Configuration Overlay - Always use mobile overlay style */}
      {showConfig && (
        <div className={`${isEmbedded ? 'force-mobile-ui absolute' : 'force-mobile-ui absolute'} inset-0 z-50 bg-black bg-opacity-75 backdrop-blur-sm`}>
          <div className="h-full bg-black bg-opacity-90 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-cyan-300">Configuration</h2>
              <button
                onClick={() => setShowConfig(false)}
                className="text-white text-2xl hover:text-cyan-400"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cyan-200 mb-2">
                  Analyte (in flask)
                </label>
                <select
                  value={solutionType}
                  onChange={(e) => setSolutionType(e.target.value)}
                  className="w-full p-3 bg-gray-900 text-white border border-cyan-500 border-opacity-50 rounded-lg focus:border-cyan-400 focus:outline-none"
                  disabled={isRunning || titrantAdded > 0}
                >
                  <option value="acid">Acid (HCl)</option>
                  <option value="base">Base (NaOH)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-cyan-200 mb-2">
                  Concentration: {solutionConc} M
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="1"
                  step="0.01"
                  value={solutionConc}
                  onChange={(e) => setSolutionConc(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                  disabled={isRunning || titrantAdded > 0}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-cyan-200 mb-2">
                  Volume: {solutionVol} mL
                </label>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="5"
                  value={solutionVol}
                  onChange={(e) => setSolutionVol(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                  disabled={isRunning || titrantAdded > 0}
                />
              </div>
              
              <hr className="border-gray-700 my-4" />
              
              <div>
                <label className="block text-sm font-medium text-cyan-200 mb-2">
                  Titrant (in burette)
                </label>
                <select
                  value={titrantType}
                  onChange={(e) => setTitrantType(e.target.value)}
                  className="w-full p-3 bg-gray-900 text-white border border-cyan-500 border-opacity-50 rounded-lg focus:border-cyan-400 focus:outline-none"
                  disabled={isRunning || titrantAdded > 0}
                >
                  <option value="acid">Acid (HCl)</option>
                  <option value="base">Base (NaOH)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-cyan-200 mb-2">
                  Concentration: {titrantConc} M
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="1"
                  step="0.01"
                  value={titrantConc}
                  onChange={(e) => setTitrantConc(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                  disabled={isRunning || titrantAdded > 0}
                />
              </div>
              
              <div className="bg-indigo-900 bg-opacity-60 p-3 rounded-lg border border-indigo-500 shadow-inner">
                <p className="text-sm text-cyan-200">
                  <strong>Equivalence Point:</strong> {equivalencePoint} mL
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={toggleDispensing}
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
            
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="bg-cyan-900 bg-opacity-60 p-3 rounded-lg border border-cyan-500 shadow-inner">
                <p className="text-xs text-cyan-300 mb-1">pH</p>
                <p className="text-2xl font-bold text-cyan-100">{currentPH.toFixed(2)}</p>
              </div>
              <div className="bg-purple-900 bg-opacity-60 p-3 rounded-lg border border-purple-500 shadow-inner">
                <p className="text-xs text-purple-300 mb-1">Volume Added</p>
                <p className="text-2xl font-bold text-purple-100">{titrantAdded.toFixed(1)} mL</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Chart Overlay - Shows on mobile or in embedded mode (small view) - High z-index to overlay all buttons */}
      {showChart && (isMobile || isEmbedded) && (
        <div 
          data-mobile-chart-overlay
          className={`${isEmbedded ? 'force-mobile-ui absolute' : 'fixed'} inset-0 z-[500] bg-black bg-opacity-75 backdrop-blur-sm overflow-hidden`}
        >
          <div className="h-full bg-black bg-opacity-90 backdrop-blur-md overflow-y-auto overflow-x-hidden">
            <div className="p-4 sm:p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-cyan-300">Titration Curve</h2>
              <button
                  onClick={() => {
                    setShowChart(false);
                    onChartOpenChange?.(false);
                  }}
                className="text-white text-2xl hover:text-cyan-400"
              >
                ×
              </button>
            </div>
            
            {data.length > 0 ? (
                <div className="w-full" style={{ height: '300px', minHeight: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%" key={`chart-mobile-${data.length}`}>
                <LineChart data={data} key={`linechart-mobile-${data.length}`}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis
                    dataKey="volume"
                    label={{ value: 'Volume (mL)', position: 'insideBottom', offset: -5, fill: '#fff' }}
                    stroke="#fff"
                    tick={{ fill: '#fff' }}
                    domain={['auto', 'auto']}
                  />
                  <YAxis
                    domain={[0, 14]}
                    label={{ value: 'pH', angle: -90, position: 'insideLeft', fill: '#fff' }}
                    stroke="#fff"
                    tick={{ fill: '#fff' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pH"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    dot={false}
                    isAnimationActive={!isRunning}
                    animationDuration={isRunning ? 0 : 300}
                    animationEasing="ease-out"
                  />
                </LineChart>
              </ResponsiveContainer>
                </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400 border border-gray-600 rounded-lg">
                Start the titration to see the curve
              </div>
            )}
            
            <div className="mt-6 space-y-3">
              <div className="bg-gray-800 bg-opacity-60 p-3 rounded-lg border border-gray-600">
                <h3 className="text-sm font-semibold text-cyan-300 mb-2">Key Points:</h3>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• Steep curve = equivalence point region</li>
                  <li>• Color change occurs near pH 8-10</li>
                  <li>• Buffer region shows gradual pH change</li>
                </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}