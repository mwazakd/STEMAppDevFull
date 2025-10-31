import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import BuretteClamp from "./BuretteClamp";

interface IntegratedGlassmorphismBuretteProps {
  position?: THREE.Vector3;
  scale?: number;
  liquidLevelRef?: React.RefObject<number>;
  liquidColor?: string;
  stopcockOpen?: boolean;
  scene: THREE.Scene;
  groupRef?: React.RefObject<THREE.Group>;
  gripWidth?: number; // Add grip width control
  conicalFlaskLiquidLevel?: number; // Add conical flask liquid level for dynamic stream length
}

export default function IntegratedGlassmorphismBurette({
  position = new THREE.Vector3(0, 6.5, 0),
  scale = 1,
  liquidLevelRef,
  liquidColor = "#1976d2",
  stopcockOpen = false,
  scene,
  groupRef,
  gripWidth = 25,
  conicalFlaskLiquidLevel = 0
}: IntegratedGlassmorphismBuretteProps) {
  const liquidRef = useRef<THREE.Mesh | null>(null);
  const meniscusRef = useRef<THREE.Mesh | null>(null);
  const stopcockRef = useRef<THREE.Group | null>(null);
  const streamRef = useRef<THREE.Mesh | null>(null);
  const outletRef = useRef<THREE.Mesh | null>(null);
  const labelGroupRef = useRef<THREE.Group | null>(null);
  const buretteGroupRef = useRef<THREE.Group | null>(null);
  const clampGroupRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const stopcockOpenRef = useRef(stopcockOpen);

  // Function to calculate dynamic stream length based on conical flask liquid level
  const calculateStreamLength = (flaskLiquidLevel: number) => {
    // Conical flask dimensions and positioning
    const flaskPosition = 2.5; // Conical flask y position in world coordinates
    const flaskBottomY = flaskPosition - 2; // Flask bottom at y=0.5
    const maxLiquidHeight = 3.4; // Max liquid height in flask
    
    // Calculate current liquid height in flask
    const liquidHeight = (flaskLiquidLevel / 100) * maxLiquidHeight;
    const liquidSurfaceY = flaskBottomY + liquidHeight;
    
    // Burette outlet position (approximate)
    const burettePosition = 8.5; // Burette y position in world coordinates
    const outletOffset = -3.5; // Approximate outlet offset from burette center
    const outletY = burettePosition + outletOffset; // Approximately y=5.0
    
    // Calculate distance from outlet to liquid surface
    const distance = outletY - liquidSurfaceY;
    
    // Ensure minimum stream length and maximum reasonable length
    return Math.max(0.5, Math.min(5.0, distance));
  };

  // Function to update stream geometry dynamically
  const updateStreamGeometry = (flaskLiquidLevel: number) => {
    if (!streamRef.current || !outletRef.current) return;
    
    const newLength = calculateStreamLength(flaskLiquidLevel);
    // Use CapsuleGeometry instead of CylinderGeometry to avoid sphere artifacts
    const newGeometry = new THREE.CapsuleGeometry(0.015, newLength, 4, 8);
    
    // Dispose old geometry to prevent memory leak
    streamRef.current.geometry.dispose();
    streamRef.current.geometry = newGeometry;
    
    // Update position to center the stream - use actual outlet position
    streamRef.current.position.y = outletRef.current.position.y - (newLength / 2);
  };

  // Function to update liquid level directly
  const updateLiquidLevelDirect = (level: number, isStopcockOpen: boolean) => {
    if (!liquidRef.current || !meniscusRef.current) return;
    
    const tubeVisibleLength = 6.0;
    const maxLiquidHeight = tubeVisibleLength - 0.06;
    const pct = Math.max(0, Math.min(100, level));
    const scale = pct / 100;
    
    liquidRef.current.scale.y = scale;
    const visibleH = maxLiquidHeight * scale;
    const bottomY = -tubeVisibleLength / 2 + visibleH / 2;
    liquidRef.current.position.y = bottomY;
    meniscusRef.current.position.y = bottomY + visibleH / 2 + 0.004;
    meniscusRef.current.visible = pct > 0;
    
    // Update stream visibility based on current liquid level and stopcock state
    if (streamRef.current) {
      const shouldBeVisible = isStopcockOpen && pct > 0;
      streamRef.current.visible = shouldBeVisible;
    }
  };

  useEffect(() => {
    if (!scene) return;

    const buretteGroup = new THREE.Group();
    buretteGroup.position.copy(position);
    buretteGroup.position.y += 2; // Raise burette by 2 units above clamp position
    buretteGroup.scale.setScalar(scale);
    buretteGroupRef.current = buretteGroup;
    if (groupRef) {
      (groupRef as React.MutableRefObject<THREE.Group | null>).current = buretteGroup;
    }

    const tubeVisibleLength = 6.0;
    const outerRadius = 0.2;
    const glassThickness = 0.035;
    const innerRadius = outerRadius - glassThickness;

    // Glass tube
    const outerGeom = new THREE.CylinderGeometry(outerRadius, outerRadius, tubeVisibleLength, 64, 1, true);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.98,
      transparent: true,
      opacity: 0.12,
      roughness: 0.02,
      metalness: 0.02,
      ior: 1.52,
      thickness: 0.6,
      clearcoat: 1.0,
      side: THREE.DoubleSide
    });
    
    const outerMesh = new THREE.Mesh(outerGeom, glassMat);
    outerMesh.castShadow = true;
    buretteGroup.add(outerMesh);

    // Neck section
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, outerRadius, 0.12, 32),
      glassMat.clone()
    );
    neck.position.y = -tubeVisibleLength / 2 - 0.24;
    buretteGroup.add(neck);

    // Tapered section
    const taperLength = 0.7;
    const taper = new THREE.Mesh(
      new THREE.ConeGeometry(0.065, taperLength, 48),
      glassMat.clone()
    );
    taper.position.y = -tubeVisibleLength / 2 - 0.24 - taperLength / 2 - 0.08;
    taper.rotation.x = Math.PI;
    buretteGroup.add(taper);

    // Narrow outlet
    const outletOuter = 0.0125;
    const outlet = new THREE.Mesh(
      new THREE.CylinderGeometry(outletOuter, outletOuter, 0.14, 20),
      glassMat.clone()
    );
    outlet.position.y = taper.position.y - taperLength / 2 - 0.07;
    outletRef.current = outlet; // Store reference for stream positioning
    buretteGroup.add(outlet);

    // Inner nozzle
    const nozzleInner = new THREE.Mesh(
      new THREE.CylinderGeometry(outletOuter - 0.006, outletOuter - 0.006, 0.14 + 0.002, 12),
      new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.7 })
    );
    nozzleInner.position.copy(outlet.position);
    buretteGroup.add(nozzleInner);

    // Stopcock
    const scGroup = new THREE.Group();
    scGroup.position.y = -tubeVisibleLength / 2 - 0.26;
    stopcockRef.current = scGroup;

    const scBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.28, 32),
      new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.25, metalness: 0.8 })
    );
    scBody.rotation.z = Math.PI / 2;
    scGroup.add(scBody);

    const scHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.08, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x7f7f7f, roughness: 0.25, metalness: 0.9 })
    );
    scHandle.position.x = 0;
    scGroup.add(scHandle);

    const scGrip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.16, 16),
      new THREE.MeshStandardMaterial({ color: 0xd9534f, roughness: 0.4, metalness: 0.1 })
    );
    scGrip.rotation.z = Math.PI / 2;
    scGrip.position.x = 0.36;
    scGroup.add(scGrip);

    // Visual indicator bar
    const indicatorBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.02, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.2, metalness: 0.8 })
    );
    indicatorBar.position.x = 0.36;
    indicatorBar.position.y = 0.08;
    scGroup.add(indicatorBar);

    buretteGroup.add(scGroup);

    // Liquid
    const maxLiquidHeight = tubeVisibleLength - 0.06;
    const liquidGeom = new THREE.CylinderGeometry(innerRadius - 0.004, innerRadius - 0.004, maxLiquidHeight, 64);
    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(liquidColor),
      transparent: true,
      opacity: 0.86,
      roughness: 0.12,
      metalness: 0.02,
      transmission: 0.45,
      thickness: 0.18,
      ior: 1.33
    });
    const liquid = new THREE.Mesh(liquidGeom, liquidMat);
    liquid.castShadow = false;
    liquid.receiveShadow = false;
    liquidRef.current = liquid;
    liquid.position.y = -tubeVisibleLength / 2 + maxLiquidHeight / 2;
    buretteGroup.add(liquid);

    // Meniscus
    const menPts: THREE.Vector2[] = [];
    const menRadius = innerRadius - 0.002;
    for (let i = 0; i <= 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      const x = Math.cos(angle) * menRadius;
      const y = Math.cos(angle * 2) * 0.008;
      menPts.push(new THREE.Vector2(x, y));
    }
    const menGeo = new THREE.LatheGeometry(menPts, 32);
    const menMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(liquidColor),
      transparent: true,
      opacity: 0.9,
      roughness: 0.05,
      metalness: 0.02,
      transmission: 0.3,
      thickness: 0.1,
      ior: 1.33
    });
    const menMesh = new THREE.Mesh(menGeo, menMat);
    menMesh.rotation.x = Math.PI;
    meniscusRef.current = menMesh;
    buretteGroup.add(menMesh);

    // Stream visualization - dynamic length based on conical flask liquid level
    const initialStreamLength = calculateStreamLength(conicalFlaskLiquidLevel);
    // Use CapsuleGeometry instead of CylinderGeometry to avoid sphere artifacts
    const streamGeom = new THREE.CapsuleGeometry(0.015, initialStreamLength, 4, 8);
    const streamMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(liquidColor),
      transparent: true,
      opacity: 0.9, // Higher opacity for better visibility
      transmission: 0.1, // Lower transmission to make it more opaque
      roughness: 0.05,
      depthWrite: false, // Prevent depth writing issues
      depthTest: true,
      side: THREE.FrontSide // Use FrontSide instead of DoubleSide to avoid rendering artifacts
    });
    const streamMesh = new THREE.Mesh(streamGeom, streamMat);
    streamMesh.visible = false;
    streamMesh.renderOrder = 1000; // Render stream on top of flask
    streamMesh.castShadow = false; // Disable shadow casting to avoid artifacts
    streamMesh.receiveShadow = false; // Disable shadow receiving
    streamRef.current = streamMesh;
    // Position stream to start from outlet and extend downward
    // Stream center should be halfway between outlet and target
    streamMesh.position.y = outletRef.current.position.y - (initialStreamLength / 2);
    streamMesh.position.x = 0;
    streamMesh.position.z = 0;
    buretteGroup.add(streamMesh);

    // Grading labels
    const labels = new THREE.Group();
    labelGroupRef.current = labels;

    const majorCount = 5;
    const minorPerMajor = 5;
    const totalMinor = majorCount * minorPerMajor;

    for (let i = 0; i <= totalMinor; i++) {
      const fraction = i / totalMinor;
      const y = tubeVisibleLength / 2 - fraction * tubeVisibleLength;
      const isMajor = i % minorPerMajor === 0;
      const tickWidth = isMajor ? 0.04 : 0.02;
      const tickHeight = isMajor ? 0.012 : 0.008;

      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(tickWidth, tickHeight, 0.002),
        new THREE.MeshStandardMaterial({ color: 0xcfe6ff, emissive: 0x061423, roughness: 0.3 })
      );
      tick.position.set(outerRadius + 0.015, y, 0);
      labels.add(tick);

      if (isMajor) {
        const number = (i / minorPerMajor) * 10;
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#d8efff";
        ctx.font = "bold 30px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(number), canvas.width / 2, canvas.height / 2);

        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(0.36, 0.18, 1);
        sprite.position.set(outerRadius + 0.01, y, 0.0);
        sprite.center.set(0.0, 0.5);
        labels.add(sprite);
      }
    }

    buretteGroup.add(labels);
    scene.add(buretteGroup);

    // Start animation loop to update liquid level from ref
    const animate = () => {
      if (liquidLevelRef && liquidLevelRef.current !== null && liquidLevelRef.current !== undefined) {
        updateLiquidLevelDirect(liquidLevelRef.current, stopcockOpenRef.current);
      }
      animationIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      scene.remove(buretteGroup);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      // Stream is part of buretteGroup, so it will be removed automatically
    };
  }, [scene, position, scale, liquidLevelRef]);

  // Remove old liquid level useEffect - now handled by animation loop

  // Update stopcock ref for animation loop
  useEffect(() => {
    stopcockOpenRef.current = stopcockOpen;
  }, [stopcockOpen]);

  // Update stream geometry when conical flask liquid level changes
  useEffect(() => {
    updateStreamGeometry(conicalFlaskLiquidLevel);
  }, [conicalFlaskLiquidLevel]);

  // Update stopcock rotation
  useEffect(() => {
    if (!stopcockRef.current) return;
    stopcockRef.current.rotation.x = stopcockOpen ? Math.PI / 2 : 0;
  }, [stopcockOpen]);

  // Update liquid color
  useEffect(() => {
    const c = new THREE.Color(liquidColor);
    if (liquidRef.current && liquidRef.current.material instanceof THREE.MeshPhysicalMaterial) {
      liquidRef.current.material.color.set(c);
    }
    if (meniscusRef.current && meniscusRef.current.material instanceof THREE.MeshPhysicalMaterial) {
      meniscusRef.current.material.color.set(c);
    }
    if (streamRef.current && streamRef.current.material instanceof THREE.MeshPhysicalMaterial) {
      streamRef.current.material.color.set(c);
    }
  }, [liquidColor]);

  // Update stream visibility
  useEffect(() => {
    if (streamRef.current && liquidLevelRef) {
      const shouldBeVisible = stopcockOpen && (liquidLevelRef.current || 0) > 0;
      streamRef.current.visible = shouldBeVisible;
    }
  }, [stopcockOpen]);

  return (
    <>
      <BuretteClamp
        position={position}
        scale={scale}
        gripWidth={gripWidth}
        scene={scene}
        groupRef={clampGroupRef}
      />
    </>
  );
}
