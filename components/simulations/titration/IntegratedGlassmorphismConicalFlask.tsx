import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface IntegratedGlassmorphismConicalFlaskProps {
  position?: THREE.Vector3;
  scale?: number;
  liquidLevel?: number;
  liquidColor?: string;
  scene: THREE.Scene;
  groupRef?: React.RefObject<THREE.Group>;
  stopcockOpen?: boolean; // Add prop to control when stream is active
}

export default function IntegratedGlassmorphismConicalFlask({
  position = new THREE.Vector3(0, 0, 0),
  scale = 1,
  liquidLevel = 0,
  liquidColor = "#4488ff",
  scene,
  groupRef,
  stopcockOpen = false
}: IntegratedGlassmorphismConicalFlaskProps) {
  const flaskRef = useRef<THREE.Group | null>(null);
  const liquidRef = useRef<THREE.Mesh | null>(null);
  const bubblesRef = useRef<THREE.Mesh[]>([]);
  const particlesRef = useRef<{small: THREE.Points, medium: THREE.Points, large: THREE.Points} | null>(null);
  const animationIdRef = useRef<number | null>(null);

  // Function to update liquid level directly
  const updateLiquidLevelDirect = (level: number) => {
    if (!liquidRef.current) return;
    
    const clampedLevel = Math.max(0, Math.min(100, level));
    const scale = clampedLevel / 100;
    
    // Flask dimensions: bottom radius = 1.8, top radius = 0.4, height = 3.5
    const maxLiquidHeight = 3.4; // Max height liquid can reach in cone
    const currentHeight = scale * maxLiquidHeight;
    
    // Calculate top and bottom radius for liquid at this height
    const flaskBottomRadius = 1.75; // Slightly smaller than flask to sit inside
    const flaskTopRadius = 0.38;
    const flaskHeight = 3.5;
    
    // For a cone, radius changes linearly with height
    // At height h from bottom: radius = bottomRadius - (bottomRadius - topRadius) * (h / totalHeight)
    const liquidTopRadius = flaskBottomRadius - (flaskBottomRadius - flaskTopRadius) * (currentHeight / flaskHeight);
    
    // Update liquid geometry to be a cone from bottom to current height
    const newGeometry = new THREE.CylinderGeometry(
      liquidTopRadius, 
      flaskBottomRadius, 
      currentHeight, 
      64
    );
    
    // Dispose old geometry to prevent memory leak
    liquidRef.current.geometry.dispose();
    liquidRef.current.geometry = newGeometry;
    
    // Position liquid so its bottom is at y=-2 (flask bottom)
    liquidRef.current.position.y = -2 + (currentHeight / 2);
  };

  useEffect(() => {
    if (!scene) return;

    // Check if flask group already exists in scene (from previous mount)
    let flaskGroup: THREE.Group;
    const existingGroup = scene.children.find((child) => 
      child instanceof THREE.Group && child.userData?.type === 'flask'
    ) as THREE.Group | undefined;
    
    if (existingGroup) {
      // Reuse existing group
      flaskGroup = existingGroup;
      flaskGroup.position.copy(position);
      flaskGroup.scale.setScalar(scale);
    } else {
      // Create new group
      flaskGroup = new THREE.Group();
      flaskGroup.userData.type = 'flask'; // Mark for identification
      flaskGroup.position.copy(position);
      flaskGroup.scale.setScalar(scale);
    }
    
    flaskRef.current = flaskGroup;
    if (groupRef) {
      (groupRef as React.MutableRefObject<THREE.Group | null>).current = flaskGroup;
    }
    
    // Only create meshes if this is a new group
    if (!existingGroup) {

    // Glass material - ultra-realistic with consistent properties
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.12, // Slightly more transparent to help stream visibility
      roughness: 0.02,
      metalness: 0.1,
      transmission: 0.98,
      thickness: 0.8,
      envMapIntensity: 1.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      ior: 1.52,
      reflectivity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false, // Prevent depth writing issues with stream
      depthTest: true
    });
    
    // Conical body (main part)
    const coneGeometry = new THREE.CylinderGeometry(0.4, 1.8, 3.5, 64, 1, true);
    const cone = new THREE.Mesh(coneGeometry, glassMaterial);
    cone.position.y = -0.25;
    cone.castShadow = true;
    cone.receiveShadow = true;
    cone.renderOrder = 0; // Ensure proper render order
    flaskGroup.add(cone);
    
    // Flat bottom
    const bottomGeometry = new THREE.CircleGeometry(1.8, 64);
    const bottom = new THREE.Mesh(bottomGeometry, glassMaterial.clone());
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = -2;
    bottom.castShadow = true;
    bottom.receiveShadow = true;
    flaskGroup.add(bottom);
    
    // Cylindrical neck (narrow top part)
    const neckGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 64, 1, true);
    const neck = new THREE.Mesh(neckGeometry, glassMaterial.clone());
    neck.position.y = 2.1;
    neck.castShadow = true;
    neck.receiveShadow = true;
    neck.renderOrder = 0; // Ensure proper render order
    flaskGroup.add(neck);
    
    // Top rim with thickness - using same material as main flask
    const rimGeometry = new THREE.TorusGeometry(0.4, 0.06, 16, 64);
    const rim = new THREE.Mesh(rimGeometry, glassMaterial.clone());
    rim.position.y = 2.7;
    rim.rotation.x = Math.PI / 2;
    flaskGroup.add(rim);
    
    // Measurement markings on conical body
    for (let i = 0; i < 4; i++) {
      const y = -1.5 + i * 0.7;
      const radius = 1.8 - (i * 0.35); // Gets smaller as we go up the cone
      const markGeometry = new THREE.TorusGeometry(radius, 0.008, 8, 32);
      const markMaterial = new THREE.MeshBasicMaterial({
        color: 0x88aaff,
        transparent: true,
        opacity: 0.5
      });
      const mark = new THREE.Mesh(markGeometry, markMaterial);
      mark.position.y = y;
      mark.rotation.x = Math.PI / 2;
      flaskGroup.add(mark);
    }
    
    // Liquid with realistic appearance (conical shape matching flask interior)
    const liquidGeometry = new THREE.CylinderGeometry(0.38, 1.75, 0.1, 64);
    const liquidMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(liquidColor),
      transparent: true,
      opacity: 0.85,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.3,
      thickness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      ior: 1.33,
      reflectivity: 0.5,
      side: THREE.DoubleSide
    });
      const liquid = new THREE.Mesh(liquidGeometry, liquidMaterial);
      liquid.position.y = -1.95; // Start at bottom
      liquid.userData.type = 'liquid'; // Mark for identification
      liquidRef.current = liquid;
      flaskGroup.add(liquid);
    
    // Add some bubbles for realism (restore)
    const bubbleGeometry = new THREE.SphereGeometry(0.04, 16, 16);
    const bubbleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      transmission: 0.95,
      roughness: 0,
      metalness: 0,
      ior: 1.33
    });
    
    const bubbles: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
      const angle = (i / 8) * Math.PI * 2;
      const radius = 0.2 + Math.random() * 0.6;
      bubble.position.x = Math.cos(angle) * radius;
      bubble.position.z = Math.sin(angle) * radius;
      bubble.position.y = -1.8 + Math.random() * 0.4;
      bubble.scale.setScalar(0.5 + Math.random() * 1.2);
        bubble.visible = stopcockOpen; // Set initial visibility based on stream state
        flaskGroup.add(bubble);
        bubbles.push(bubble);
      }
      // Store bubbles as a group for easier finding (wrap in a group)
      const bubbleGroup = new THREE.Group();
      bubbleGroup.userData.type = 'bubbles';
      bubbles.forEach(b => {
        flaskGroup.remove(b); // Remove from flaskGroup first
        bubbleGroup.add(b); // Add to bubbleGroup
      });
      flaskGroup.add(bubbleGroup);
      bubblesRef.current = bubbles;
      
      // Add glowing particles in liquid with different sizes
    const smallParticleCount = 15; // Regular particles
    const mediumParticleCount = Math.floor(Math.random() * 2) + 1; // 1 or 2 particles 40% bigger
    const largeParticleCount = Math.floor(Math.random() * 2) + 3; // 3 or 4 particles 100% bigger
    
    // Create small particles (regular size)
    const smallParticlesGeometry = new THREE.BufferGeometry();
    const smallParticlePositions = new Float32Array(smallParticleCount * 3);
    
    for (let i = 0; i < smallParticleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.9;
      smallParticlePositions[i * 3] = Math.cos(angle) * radius;
      smallParticlePositions[i * 3 + 1] = -1.8 + Math.random() * 1.0;
      smallParticlePositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    
    smallParticlesGeometry.setAttribute('position', new THREE.BufferAttribute(smallParticlePositions, 3));
    
    const smallParticlesMaterial = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.025, // Base size
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    
      const smallParticles = new THREE.Points(smallParticlesGeometry, smallParticlesMaterial);
      smallParticles.visible = stopcockOpen;
      smallParticles.userData.type = 'small-particles';
      flaskGroup.add(smallParticles);
    
    // Create medium particles (40% bigger)
    const mediumParticlesGeometry = new THREE.BufferGeometry();
    const mediumParticlePositions = new Float32Array(mediumParticleCount * 3);
    
    for (let i = 0; i < mediumParticleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.9;
      mediumParticlePositions[i * 3] = Math.cos(angle) * radius;
      mediumParticlePositions[i * 3 + 1] = -1.8 + Math.random() * 1.0;
      mediumParticlePositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    
    mediumParticlesGeometry.setAttribute('position', new THREE.BufferAttribute(mediumParticlePositions, 3));
    
    const mediumParticlesMaterial = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.035, // 40% bigger (0.025 * 1.4)
      transparent: true,
      opacity: 0.8, // Slightly more opaque
      blending: THREE.AdditiveBlending
    });
    
      const mediumParticles = new THREE.Points(mediumParticlesGeometry, mediumParticlesMaterial);
      mediumParticles.visible = stopcockOpen;
      mediumParticles.userData.type = 'medium-particles';
      flaskGroup.add(mediumParticles);
    
    // Create large particles (100% bigger)
    const largeParticlesGeometry = new THREE.BufferGeometry();
    const largeParticlePositions = new Float32Array(largeParticleCount * 3);
    
    for (let i = 0; i < largeParticleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.9;
      largeParticlePositions[i * 3] = Math.cos(angle) * radius;
      largeParticlePositions[i * 3 + 1] = -1.8 + Math.random() * 1.0;
      largeParticlePositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    
    largeParticlesGeometry.setAttribute('position', new THREE.BufferAttribute(largeParticlePositions, 3));
    
    const largeParticlesMaterial = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.05, // 100% bigger (0.025 * 2.0)
      transparent: true,
      opacity: 0.9, // More opaque
      blending: THREE.AdditiveBlending
    });
    
      const largeParticles = new THREE.Points(largeParticlesGeometry, largeParticlesMaterial);
      largeParticles.visible = stopcockOpen;
      largeParticles.userData.type = 'large-particles';
      flaskGroup.add(largeParticles);
      
      // Store references for animation
      particlesRef.current = { 
        small: smallParticles, 
        medium: mediumParticles, 
        large: largeParticles 
      };
      
      // Also store as a group for easier finding
      const particleGroup = new THREE.Group();
      particleGroup.userData.type = 'particles';
      particleGroup.add(smallParticles);
      particleGroup.add(mediumParticles);
      particleGroup.add(largeParticles);
      flaskGroup.add(particleGroup);
    }
    
    // Add to scene if not already there
    if (!scene.children.includes(flaskGroup)) {
      scene.add(flaskGroup);
    }
    
    // Find existing refs if reusing group
    if (existingGroup) {
      existingGroup.traverse((obj) => {
        if (obj.userData?.type === 'liquid') liquidRef.current = obj as THREE.Mesh;
        if (obj.userData?.type === 'bubbles') {
          const bubbleGroup = obj as THREE.Group;
          bubblesRef.current = bubbleGroup.children.filter(c => c instanceof THREE.Mesh) as THREE.Mesh[];
        }
        if (obj.userData?.type === 'particles') {
          const particleGroup = obj as THREE.Group;
          particlesRef.current = {
            small: particleGroup.children.find(c => c.userData?.type === 'small-particles') as THREE.Points,
            medium: particleGroup.children.find(c => c.userData?.type === 'medium-particles') as THREE.Points,
            large: particleGroup.children.find(c => c.userData?.type === 'large-particles') as THREE.Points,
          };
        }
      });
      // Immediately update liquid color when restoring refs (in case color changed while component was unmounted)
      if (liquidRef.current && liquidRef.current.material instanceof THREE.MeshPhysicalMaterial) {
        const color = new THREE.Color(liquidColor);
        liquidRef.current.material.color.copy(color);
        liquidRef.current.material.needsUpdate = true;
      }
    }

    // Start animation loop to update liquid level from props
    const animate = () => {
    updateLiquidLevelDirect(liquidLevel);

      // Update bubble positions based on liquid level (only when stream is active)
      if (bubblesRef.current && stopcockOpen) {
        // Clamp liquid level to prevent bubbles from rising beyond flask capacity
        const clampedLiquidLevel = Math.max(0, Math.min(100, liquidLevel));
        const liquidScale = clampedLiquidLevel / 100;
        const maxRise = 3.4; // Same as maxLiquidHeight
        
        bubblesRef.current.forEach((bubble, index) => {
          // Calculate each bubble's rise based on liquid level
          const baseY = -2.3 + (index / 8) * 0.4; // Distribute bubbles evenly
          const riseAmount = liquidScale * maxRise;
          bubble.position.y = baseY + riseAmount;
          
          // Calculate dynamic radius based on liquid level to keep bubbles within conical flask
          const flaskBottomRadius = 1.75;
          const flaskTopRadius = 0.38;
          const flaskHeight = 3.5;
          
          // Calculate current liquid radius at this height
          const currentLiquidHeight = liquidScale * maxRise;
          const currentRadius = flaskBottomRadius - (flaskBottomRadius - flaskTopRadius) * (currentLiquidHeight / flaskHeight);
          
          // Recalculate X/Z positions to stay within liquid bounds
          const angle = (index / 8) * Math.PI * 2;
          const maxRadius = Math.max(0.1, currentRadius * 0.8); // 80% of liquid radius, minimum 0.1
          const radius = 0.1 + Math.random() * (maxRadius - 0.1);
          
          bubble.position.x = Math.cos(angle) * radius;
          bubble.position.z = Math.sin(angle) * radius;
        });
      }
      
      // Update particle positions based on liquid level (only when stream is active)
      if (particlesRef.current && stopcockOpen) {
        // Clamp liquid level to prevent particles from rising beyond flask capacity
        const clampedLiquidLevel = Math.max(0, Math.min(100, liquidLevel));
        const liquidScale = clampedLiquidLevel / 100;
        const maxRise = 3.4; // Same as maxLiquidHeight
        
        // Update small particles
        const smallPositions = particlesRef.current.small.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < smallPositions.length / 3; i++) {
          const index = i * 3;
          const baseY = -2.0 + (i / (smallPositions.length / 3)) * 0.5;
          const riseAmount = liquidScale * maxRise;
          smallPositions[index + 1] = baseY + riseAmount;
          
          const streamCenterX = 0;
          const streamCenterZ = 0;
          const clusterRadius = 0.3;
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * clusterRadius;
          const randomOffset = (Math.random() - 0.5) * 0.2;
          
          smallPositions[index] = streamCenterX + Math.cos(angle) * distance + randomOffset;
          smallPositions[index + 2] = streamCenterZ + Math.sin(angle) * distance + randomOffset;
        }
        particlesRef.current.small.geometry.attributes.position.needsUpdate = true;
        
        // Update medium particles
        const mediumPositions = particlesRef.current.medium.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < mediumPositions.length / 3; i++) {
          const index = i * 3;
          const baseY = -2.0 + (i / (mediumPositions.length / 3)) * 0.5;
          const riseAmount = liquidScale * maxRise;
          mediumPositions[index + 1] = baseY + riseAmount;
          
          const streamCenterX = 0;
          const streamCenterZ = 0;
          const clusterRadius = 0.3;
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * clusterRadius;
          const randomOffset = (Math.random() - 0.5) * 0.2;
          
          mediumPositions[index] = streamCenterX + Math.cos(angle) * distance + randomOffset;
          mediumPositions[index + 2] = streamCenterZ + Math.sin(angle) * distance + randomOffset;
        }
        particlesRef.current.medium.geometry.attributes.position.needsUpdate = true;
        
        // Update large particles
        const largePositions = particlesRef.current.large.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < largePositions.length / 3; i++) {
          const index = i * 3;
          const baseY = -2.0 + (i / (largePositions.length / 3)) * 0.5;
          const riseAmount = liquidScale * maxRise;
          largePositions[index + 1] = baseY + riseAmount;
          
          const streamCenterX = 0;
          const streamCenterZ = 0;
          const clusterRadius = 0.3;
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * clusterRadius;
          const randomOffset = (Math.random() - 0.5) * 0.2;
          
          largePositions[index] = streamCenterX + Math.cos(angle) * distance + randomOffset;
          largePositions[index + 2] = streamCenterZ + Math.sin(angle) * distance + randomOffset;
        }
        particlesRef.current.large.geometry.attributes.position.needsUpdate = true;
      }
      
      animationIdRef.current = requestAnimationFrame(animate);
    };
    animate();
    
    return () => {
      // Never remove groups on cleanup - they persist across view switches
      // Only cleanup animation frame, groups stay in scene
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      // Groups remain in scene for reuse on remount
    };
  }, [scene, position, scale, liquidLevel, liquidColor]);

  // Control bubble and particle visibility based on stream state
  useEffect(() => {
    if (bubblesRef.current) {
      bubblesRef.current.forEach(bubble => {
        bubble.visible = stopcockOpen; // Bubbles only visible when stream is active
      });
    }
    if (particlesRef.current) {
      particlesRef.current.small.visible = stopcockOpen; // Small particles only visible when stream is active
      particlesRef.current.medium.visible = stopcockOpen; // Medium particles only visible when stream is active
      particlesRef.current.large.visible = stopcockOpen; // Large particles only visible when stream is active
    }
  }, [stopcockOpen]);

  // Update liquid color when liquidColor prop changes (critical for indicator color changes during titration)
  useEffect(() => {
    if (liquidRef.current && liquidRef.current.material instanceof THREE.MeshPhysicalMaterial) {
      const color = new THREE.Color(liquidColor);
      liquidRef.current.material.color.copy(color);
      // Mark material as needing update
      liquidRef.current.material.needsUpdate = true;
    }
  }, [liquidColor]);

  return null;
}
