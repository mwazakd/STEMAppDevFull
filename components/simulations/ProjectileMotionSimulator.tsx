
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play, Pause, RotateCcw, Target } from '../Icons';

interface ProjectileMotionSimulatorProps {
  isEmbedded?: boolean;
  onChartOpenChange?: (isOpen: boolean) => void;
}

export default function ProjectileMotionSimulator({ 
  isEmbedded = false, 
  onChartOpenChange 
}: ProjectileMotionSimulatorProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  
  const [velocity, setVelocity] = useState(20);
  const [angle, setAngle] = useState(45);
  const [isRunning, setIsRunning] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showTrail, setShowTrail] = useState(true);
  const [currentHeight, setCurrentHeight] = useState(0);
  const [currentDistance, setCurrentDistance] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const simulationState = useRef({
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 500),
      projectile: new THREE.Mesh(),
      target: new THREE.Mesh(),
      trailLine: new THREE.Line(),
      trailPoints: [] as THREE.Vector3[],
      simulationTime: 0,
      mouseDown: false,
      lastMouse: { x: 0, y: 0 },
      cameraAngle: { theta: Math.PI / 4, phi: Math.PI / 3.5 },
      autoRotateStep: 0,
  });

  const g = 9.81;
  const angleRad = angle * Math.PI / 180;
  const timeOfFlight = (2 * velocity * Math.sin(angleRad)) / g;
  const range = (velocity * velocity * Math.sin(2 * angleRad)) / g;
  const maxHeight = (velocity ** 2 * Math.sin(angleRad) ** 2) / (2 * g);

  // Store params in a ref to prevent stale closures in animation loop
  const simParamsRef = useRef({ range, maxHeight });
  useEffect(() => {
    simParamsRef.current = { range, maxHeight };
  }, [range, maxHeight]);

  // One-time scene setup
  useEffect(() => {
    if (!mountRef.current) return;
    const { scene, camera } = simulationState.current;
    const mount = mountRef.current;

    let width = mount.clientWidth;
    let height = mount.clientHeight;
    
    // For screens ≤576px: fix height at 475px for embedded mode
    if (isEmbedded && window.innerWidth <= 576) {
      height = 475;
    }

    scene.background = new THREE.Color(0x1a202c);
    scene.fog = new THREE.Fog(0x1a202c, 50, 200);

    camera.position.set(30, 15, 30);
    camera.lookAt(range / 2, 5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

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
    
    simulationState.current.projectile = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshStandardMaterial({ color: 0x38b2ac, roughness: 0.3 }));
    simulationState.current.projectile.position.set(0, 0.5, 0);
    simulationState.current.projectile.castShadow = true;
    scene.add(simulationState.current.projectile);

    simulationState.current.target = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.1, 32), new THREE.MeshStandardMaterial({ color: 0xf6e05e, transparent: true, opacity: 0.5 }));
    simulationState.current.target.position.set(range, 0.05, 0);
    scene.add(simulationState.current.target);

    simulationState.current.trailLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x63b3ed }));
    scene.add(simulationState.current.trailLine);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      if (autoRotate && !simulationState.current.mouseDown) {
        simulationState.current.autoRotateStep += 0.002;
        const radius = 40;
        const { theta, phi } = simulationState.current.cameraAngle;
        simulationState.current.cameraAngle.theta = simulationState.current.autoRotateStep;
        const { range: currentRange, maxHeight: currentMaxHeight } = simParamsRef.current;
        const centerX = currentRange / 2;
        camera.position.x = centerX + radius * Math.sin(phi) * Math.cos(theta);
        camera.position.y = radius * Math.cos(phi);
        camera.position.z = radius * Math.sin(phi) * Math.sin(theta);
        camera.lookAt(centerX, currentMaxHeight / 2, 0);
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
        if (!mount || !rendererRef.current) return;
        let w = mount.clientWidth;
        let h = mount.clientHeight;
        
        // For screens ≤576px: fix height at 475px for embedded mode
        // Check if mount is in embedded wrapper
        const isCurrentlyEmbedded = mount.closest('.embedded-projectile-wrapper') !== null;
        if (isCurrentlyEmbedded && window.innerWidth <= 576) {
          h = 475;
        }
        
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mount);
    
    // Initial resize
    handleResize();

    return () => {
      resizeObserver.unobserve(mount);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      // Don't remove canvas if it's being reused (switching views)
      // Only dispose on true unmount
    };
  }, []);

  // Handle isEmbedded prop changes - update size without reinitializing
  useEffect(() => {
    if (!rendererRef.current || !mountRef.current) return;
    
    const canvas = rendererRef.current.domElement;
    const mount = mountRef.current;
    const rect = mount.getBoundingClientRect();
    let width = rect.width;
    let height = rect.height;
    
    // For screens ≤576px: fix height at 475px for embedded mode
    if (isEmbedded && window.innerWidth <= 576) {
      height = 475;
    }
    
    // Small delay to ensure container is rendered
    const timeoutId = setTimeout(() => {
      // Update size for current container
      if (width > 0 && height > 0) {
        rendererRef.current?.setSize(width, height);
        const { camera } = simulationState.current;
        if (camera) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        }
        
        // Force a render to ensure scene is visible
        const { scene } = simulationState.current;
        if (scene && camera && rendererRef.current) {
          rendererRef.current.render(scene, camera);
        }
      }
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [isEmbedded]);

  // Update target position when range changes
  useEffect(() => {
    simulationState.current.target.position.x = range;
  }, [range]);

  // Simulation run loop
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
      
      simulationState.current.projectile.position.set(x, Math.max(0.5, y + 0.5), 0);
      
      if (showTrail) {
        simulationState.current.trailPoints.push(new THREE.Vector3(x, Math.max(0.5, y + 0.5), 0));
        simulationState.current.trailLine.geometry.setFromPoints(simulationState.current.trailPoints);
      }
      
      setCurrentHeight(Math.max(0, y));
      setCurrentDistance(x);
      setTimeElapsed(t);
    }, 50);
    
    return () => clearInterval(interval);
  }, [isRunning, velocity, angle, timeOfFlight, showTrail, angleRad]);

  const reset = () => {
    setIsRunning(false);
    simulationState.current.simulationTime = 0;
    setCurrentHeight(0);
    setCurrentDistance(0);
    setTimeElapsed(0);
    simulationState.current.projectile.position.set(0, 0.5, 0);
    simulationState.current.trailPoints = [];
    simulationState.current.trailLine.geometry.setFromPoints([]);
  };

  return (
    <div className={`w-full h-full bg-gray-900 text-white ${isEmbedded ? 'relative' : 'flex flex-col md:flex-row'}`}>
      {/* Canvas Container */}
      <div ref={mountRef} className={`${isEmbedded ? 'w-full h-full absolute inset-0' : 'flex-1 w-full h-64 md:h-full'} relative`}>
        {!isEmbedded && (
          <div className="absolute top-2 left-2 bg-black/50 p-2 rounded-md text-xs z-10">
            Drag to rotate | Scroll to zoom
          </div>
        )}
      </div>
      
      {/* Keep sidebar for now - will be moved to overlays in Phase 2 */}
      {!isEmbedded && (
        <aside className="w-full md:w-80 bg-gray-800 p-4 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-6 h-6 text-cyan-400" />
            <h2 className="text-lg font-bold">Controls</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Velocity: {velocity} m/s</label>
              <input type="range" min="5" max="50" value={velocity} onChange={(e) => setVelocity(parseFloat(e.target.value))} className="w-full accent-cyan-400" disabled={isRunning} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Launch Angle: {angle}°</label>
              <input type="range" min="15" max="85" value={angle} onChange={(e) => setAngle(parseFloat(e.target.value))} className="w-full accent-cyan-400" disabled={isRunning} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsRunning(!isRunning)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold transition ${isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
                {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {isRunning ? 'Pause' : 'Launch'}
              </button>
              <button onClick={reset} className="p-2 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold transition"><RotateCcw className="w-5 h-5" /></button>
            </div>
            <button onClick={() => setAutoRotate(!autoRotate)} className={`w-full py-2 rounded-md font-semibold transition ${autoRotate ? 'bg-cyan-500 hover:bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
              {autoRotate ? 'Auto-Rotate ON' : 'Auto-Rotate OFF'}
            </button>
            <label className="flex items-center gap-2 text-gray-300"><input type="checkbox" checked={showTrail} onChange={(e) => setShowTrail(e.target.checked)} className="w-4 h-4 accent-cyan-500" />Show Trail</label>
            <div className="bg-gray-700/50 p-3 rounded-lg">
              <h3 className="text-sm font-semibold text-cyan-300 mb-2">Predicted Values</h3>
              <div className="text-xs space-y-1">
                <p>Max Height: {maxHeight.toFixed(2)} m</p>
                <p>Range: {range.toFixed(2)} m</p>
                <p>Flight Time: {timeOfFlight.toFixed(2)} s</p>
              </div>
            </div>
            <div className="bg-gray-700/50 p-3 rounded-lg">
              <h3 className="text-sm font-semibold text-purple-300 mb-2">Current Values</h3>
              <div className="text-xs space-y-1">
                <p>Height: {currentHeight.toFixed(2)} m</p>
                <p>Distance: {currentDistance.toFixed(2)} m</p>
                <p>Time: {timeElapsed.toFixed(2)} s</p>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
