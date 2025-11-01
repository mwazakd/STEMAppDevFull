import { useState, useEffect, useRef, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, Pause, RotateCcw, Info, Beaker } from 'lucide-react';
import * as THREE from 'three';
import IntegratedGlassmorphismBurette from './titration/IntegratedGlassmorphismBurette';
import IntegratedGlassmorphismConicalFlask from './titration/IntegratedGlassmorphismConicalFlask';

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
}

export default function TitrationSimulator({ isEmbedded = false }: TitrationSimulatorProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  
  const [solutionType, setSolutionType] = useState('acid');
  const [solutionConc, setSolutionConc] = useState(0.1);
  const [solutionVol, setSolutionVol] = useState(25);
  const [titrantType, setTitrantType] = useState('base');
  const [titrantConc, setTitrantConc] = useState(0.1);
  const [titrantAdded, setTitrantAdded] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [data, setData] = useState<{volume: number, pH: number}[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [buretteStopcockOpen, setBuretteStopcockOpen] = useState(false);
  const [buretteGripWidth, setBuretteGripWidth] = useState(25); // Default to burette diameter grip
  
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
  const conicalFlaskRef = useRef<THREE.Group | null>(null);
  
  // Panning refs - dynamic orbit center
  const panOffsetRef = useRef(new THREE.Vector3(0, 2, 0)); // Initial look-at point (0, 2, 0)
  const isPanningRef = useRef(false);
  const isMiddleMouseRef = useRef(false);
  
  // Touch handling refs
  const touchDownRef = useRef(false);
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const initialDistanceRef = useRef(0);
  const initialCameraDistanceRef = useRef(18);
  const touchPanModeRef = useRef(false); // Track if two-finger pan (vs pinch zoom)
  const initialTouchCenterRef = useRef({ x: 0, y: 0 });
  
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
    
    // Reset scene ready state when component mounts/remounts
    setSceneReady(false);
    
    // Check initial dimensions first
    let retryCount = 0;
    const maxRetries = 30; // Max 3 seconds of retrying
    
    const checkAndInit = () => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      
      // Don't initialize if container has zero size
      if (width === 0 || height === 0) {
        // Retry after a short delay if still zero (with max retries)
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(checkAndInit, 100);
        }
        return;
      }
      
      // Only initialize once per mount
      if (rendererRef.current) return;
      
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a2e);
      sceneRef.current = scene;
      
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(8, 4, 8);
      camera.lookAt(0, 2, 0);
      cameraRef.current = camera;
      
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if (mountRef.current) {
        mountRef.current.appendChild(renderer.domElement);
      }
      rendererRef.current = renderer;
    
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
      
      // Wait for next frame to ensure scene is fully initialized before setting ready
      requestAnimationFrame(() => {
        setSceneReady(true);
      });
    
      const animate = () => {
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
        animationIdRef.current = requestAnimationFrame(animate);
      };
      animate();
      
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
    
      // Prevent context menu on middle mouse button
      renderer.domElement.addEventListener('contextmenu', (e) => {
        if (isMiddleMouseRef.current) {
          e.preventDefault();
        }
      });
      
      renderer.domElement.addEventListener('mousedown', handleMouseDown);
      renderer.domElement.addEventListener('mousemove', handleMouseMove);
      renderer.domElement.addEventListener('mouseup', handleMouseUp);
      renderer.domElement.addEventListener('wheel', handleWheel);
      
      // Add touch event listeners
      renderer.domElement.addEventListener('touchstart', handleTouchStart, { passive: false });
      renderer.domElement.addEventListener('touchmove', handleTouchMove, { passive: false });
      renderer.domElement.addEventListener('touchend', handleTouchEnd, { passive: false });
      
      const handleResize = () => {
        if (mountRef.current && cameraRef.current && rendererRef.current) {
          const rect = mountRef.current.getBoundingClientRect();
          const w = rect.width;
          const h = rect.height;
          if (w > 0 && h > 0) {
            cameraRef.current.aspect = w / h;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(w, h);
          }
        }
      };
      window.addEventListener('resize', handleResize);
      
      // Also observe container for size changes
      const resizeObserver = new ResizeObserver((entries) => {
        handleResize();
      });
      if (mountRef.current) {
        resizeObserver.observe(mountRef.current);
      }
      
      // Return cleanup for this initialization
      return () => {
        window.removeEventListener('resize', handleResize);
        if (rendererRef.current && rendererRef.current.domElement) {
          rendererRef.current.domElement.removeEventListener('mousedown', handleMouseDown);
          rendererRef.current.domElement.removeEventListener('mousemove', handleMouseMove);
          rendererRef.current.domElement.removeEventListener('mouseup', handleMouseUp);
          rendererRef.current.domElement.removeEventListener('wheel', handleWheel);
          rendererRef.current.domElement.removeEventListener('touchstart', handleTouchStart);
          rendererRef.current.domElement.removeEventListener('touchmove', handleTouchMove);
          rendererRef.current.domElement.removeEventListener('touchend', handleTouchEnd);
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
    
    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId);
      
      // Call cleanup function if it exists
      if (cleanupFn) {
        cleanupFn();
        cleanupFn = null;
      }
      
      // Additional cleanup to ensure everything is cleared
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      
      if (rendererRef.current) {
        if (mountRef.current && rendererRef.current.domElement && mountRef.current.contains(rendererRef.current.domElement)) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      
      if (sceneRef.current) {
        // Clear scene children properly
        while(sceneRef.current.children.length > 0) {
          const child = sceneRef.current.children[0];
          sceneRef.current.remove(child);
          // Dispose geometries and materials if they exist
          if ((child as any).traverse) {
            (child as any).traverse((obj: any) => {
              if (obj.geometry) obj.geometry.dispose();
              if (obj.material) {
                if (Array.isArray(obj.material)) {
                  obj.material.forEach((mat: any) => mat.dispose());
                } else {
                  obj.material.dispose();
                }
              }
            });
          }
        }
        sceneRef.current = null;
      }
      
      cameraRef.current = null;
      setSceneReady(false);
    };
  }, []);
  
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
        if (!lastPoint || Math.abs(lastPoint.volume - titrantAdded) > 0.1) {
          return [...prev, { 
            volume: parseFloat(titrantAdded.toFixed(2)), 
            pH: parseFloat(currentPH.toFixed(2)) 
          }];
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
    // Reset burette liquid level ref to start at 0 mark (full)
    buretteLiquidLevelRef.current = 100;
  };

  // Render guide button in wrapper (embedded mode) or fullscreen container
  useEffect(() => {
    // For embedded mode
    if (isEmbedded) {
      const guideContainer = document.getElementById('embedded-guide-button-container');
      if (guideContainer) {
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
  }, [isEmbedded, showTutorial]);

  // Render embedded controls in wrapper when embedded
  useEffect(() => {
    if (!isEmbedded) return;
    
    const container = document.getElementById('embedded-controls-container');
    if (!container) return;
    
    // Create React portal content
    const renderButtons = () => {
      container.innerHTML = '';
      
      const startBtn = document.createElement('button');
      startBtn.className = `flex items-center justify-center px-6 py-3 rounded-full font-semibold transition shadow-xl text-white ${isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`;
      startBtn.setAttribute('aria-label', isRunning ? 'Pause' : 'Start');
      startBtn.innerHTML = isRunning 
        ? '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>'
        : '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
      startBtn.addEventListener('click', toggleDispensing);
      
      const resetBtn = document.createElement('button');
      resetBtn.className = 'px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-full font-semibold transition shadow-xl';
      resetBtn.setAttribute('aria-label', 'Reset');
      resetBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>';
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
    <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden flex flex-col">
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
      <div className={`${isEmbedded ? 'hide-in-embedded' : 'hidden lg:block'} bg-black bg-opacity-40 backdrop-blur-md border-b border-cyan-500 border-opacity-30 shadow-lg p-4`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Beaker className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-white">3D Titration Simulator</h1>
          </div>
          <button
            onClick={() => setShowTutorial(!showTutorial)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition shadow-lg"
          >
            <Info className="w-4 h-4" />
            {showTutorial ? 'Hide' : 'Show'} Guide
          </button>
        </div>
      </div>
      
      {showTutorial && (
        <div className={`${isEmbedded ? 'hide-in-embedded' : 'hidden lg:block'} bg-yellow-900 bg-opacity-95 backdrop-blur-sm border-b border-yellow-600 p-4 shadow-lg`}>
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
      
      <div className="flex-1 flex overflow-hidden">
        {/* Configuration Sidebar - Hidden on mobile, visible on desktop */}
        <div className={`${isEmbedded ? 'hide-in-embedded' : 'hidden lg:block lg:w-72'} bg-black bg-opacity-50 backdrop-blur-md p-6 overflow-y-auto border-r border-cyan-500 border-opacity-30 shadow-xl ${showConfig && !isEmbedded ? 'block' : ''}`}>
          <h2 className="text-xl font-bold text-cyan-300 mb-4">Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-cyan-200 mb-2">
                Analyte (in beaker)
              </label>
              <select
                value={solutionType}
                onChange={(e) => setSolutionType(e.target.value)}
                className="w-full p-2 bg-gray-900 text-white border border-cyan-500 border-opacity-50 rounded-lg focus:border-cyan-400 focus:outline-none"
                disabled={isRunning || titrantAdded > 0}
              >
                <option value="acid">Acid (HCl)</option>
                <option value="base">Base (NaOH)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-cyan-200 mb-2">
                Concentration: {solutionConc.toFixed(2)} M
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
                className="w-full p-2 bg-gray-900 text-white border border-cyan-500 border-opacity-50 rounded-lg focus:border-cyan-400 focus:outline-none"
                disabled={isRunning || titrantAdded > 0}
              >
                <option value="acid">Acid (HCl)</option>
                <option value="base">Base (NaOH)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-cyan-200 mb-2">
                Concentration: {titrantConc.toFixed(2)} M
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
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition shadow-lg ${
                isRunning
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {isRunning ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={reset}
              className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition shadow-lg"
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
          
          {data.length > 5 && (
            <div className="mt-4 p-3 bg-green-900 bg-opacity-60 rounded-lg border border-green-500 shadow-inner">
              <p className="text-sm text-green-200">
                <strong>Analysis:</strong> {
                  Math.abs(parseFloat(equivalencePoint) - titrantAdded) < 2
                    ? 'Near equivalence point!'
                    : titrantAdded < parseFloat(equivalencePoint)
                    ? 'Before equivalence point'
                    : 'Past equivalence point'
                }
              </p>
            </div>
          )}
        </div>
        
        {/* Main 3D View Area */}
        <div className="flex-1 relative">
          <div ref={mountRef} className="w-full h-full" />
          
          {/* Mobile App Name - Above Stack */}
          <div className={`${isEmbedded ? 'force-mobile-ui' : 'lg:hidden'} absolute top-4 left-4 z-10`}>
            <div className="bg-black bg-opacity-70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm shadow-lg flex items-center gap-2">
              <Beaker className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-xs">3D Titration Simulator</span>
            </div>
          </div>

          {/* Mobile Controls Overlay - Single Stack */}
          <div className={`${isEmbedded ? 'force-mobile-ui' : 'lg:hidden'} absolute top-16 left-4 z-10`}>
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
              
              {/* Chart Button */}
              <button
                onClick={() => setShowChart(!showChart)}
                className="bg-black bg-opacity-70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm shadow-lg"
              >
                📊 Chart
              </button>
            </div>
          </div>
          
          {/* Mobile Guide Button - Only shown when not embedded */}
          {!isEmbedded && (
            <div className="lg:hidden absolute top-4 right-4 z-20">
              <button
                onClick={() => setShowTutorial(!showTutorial)}
                className="bg-black bg-opacity-80 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm shadow-lg flex items-center gap-2"
              >
                <Info className="w-4 h-4" />
                <span>{showTutorial ? 'Hide' : 'Show'} Guide</span>
              </button>
            </div>
          )}

          {/* Tutorial Overlay - Within canvas container in embedded mode */}
          {showTutorial && (
            <div className={`${isEmbedded ? 'absolute inset-0' : 'lg:hidden fixed inset-0'} z-50 bg-black bg-opacity-75 backdrop-blur-sm`}>
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
          
          {/* Mobile Floating Start Button - Overlay on Canvas */}
          {isEmbedded ? (
            <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center">
              <div className="flex gap-2">
                <button
                  onClick={toggleDispensing}
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold transition shadow-xl ${
                    isRunning
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  <span>{isRunning ? 'Pause' : 'Start'}</span>
                </button>
                <button
                  onClick={reset}
                  className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-full font-semibold transition shadow-xl"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-10 pb-safe" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
              <div className="flex gap-2 justify-center pb-2">
                <button
                  onClick={toggleDispensing}
                  className={`flex items-center justify-center gap-2 px-6 py-4 rounded-full font-semibold transition shadow-xl ${
                    isRunning
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  <span className="text-lg">{isRunning ? 'Pause' : 'Start'}</span>
                </button>
                <button
                  onClick={reset}
                  className="px-4 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-full font-semibold transition shadow-xl"
                >
                  <RotateCcw className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}
          
          {/* Desktop Controls */}
          <div className={`${isEmbedded ? 'hide-in-embedded' : 'hidden lg:block'} absolute top-4 left-4 bg-black bg-opacity-70 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm shadow-lg`}>
            <p className="font-semibold">🖱️ Drag to rotate • 🖱️ Scroll to zoom</p>
          </div>
          
          <div className={`${isEmbedded ? 'hide-in-embedded' : 'hidden lg:block'} absolute top-4 right-4 flex flex-row gap-2`}>
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`px-4 py-2 rounded-lg font-semibold transition shadow-lg ${
                autoRotate
                  ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {autoRotate ? '🔄 Auto-Rotate ON' : '⏸️ Auto-Rotate OFF'}
            </button>
            <div className="bg-black bg-opacity-70 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm shadow-lg">
              <label className="block text-xs font-medium text-cyan-200 mb-1">
                Clamp Grip: {buretteGripWidth}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={buretteGripWidth}
                onChange={(e) => setBuretteGripWidth(parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>
          {!sceneReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="text-white text-xl">Loading 3D Scene...</div>
            </div>
          )}
        </div>
        
        {/* pH Chart Sidebar - Hidden on mobile, visible on desktop */}
        <div className={`${isEmbedded ? 'hide-in-embedded' : 'hidden lg:block lg:w-96'} bg-black bg-opacity-50 backdrop-blur-md p-6 overflow-y-auto border-l border-cyan-500 border-opacity-30 shadow-xl ${showChart && !isEmbedded ? 'block' : ''}`}>
          <h2 className="text-xl font-bold text-cyan-300 mb-4">Titration Curve</h2>
          
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis
                  dataKey="volume"
                  label={{ value: 'Volume (mL)', position: 'insideBottom', offset: -5, fill: '#fff' }}
                  stroke="#fff"
                  tick={{ fill: '#fff' }}
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
      </div>
      
      {/* Mobile Configuration Overlay */}
      {showConfig && (
        <div className={`${isEmbedded ? 'force-mobile-ui absolute' : 'lg:hidden fixed'} inset-0 z-50 bg-black bg-opacity-75 backdrop-blur-sm`}>
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
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition shadow-lg ${
                  isRunning
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {isRunning ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={reset}
                className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition shadow-lg"
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
      
      {/* Mobile Chart Overlay */}
      {showChart && (
        <div className={`${isEmbedded ? 'force-mobile-ui absolute' : 'lg:hidden fixed'} inset-0 z-50 bg-black bg-opacity-75 backdrop-blur-sm overflow-hidden`}>
          <div className="h-full bg-black bg-opacity-90 backdrop-blur-md overflow-y-auto overflow-x-hidden">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-cyan-300">Titration Curve</h2>
                <button
                  onClick={() => setShowChart(false)}
                  className="text-white text-2xl hover:text-cyan-400"
                >
                  ×
                </button>
              </div>
              
              {data.length > 0 ? (
                <div className="w-full" style={{ height: '300px', minHeight: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis
                        dataKey="volume"
                        label={{ value: 'Volume (mL)', position: 'insideBottom', offset: -5, fill: '#fff' }}
                        stroke="#fff"
                        tick={{ fill: '#fff' }}
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