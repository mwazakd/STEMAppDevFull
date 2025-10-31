import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface BuretteClampProps {
  position?: THREE.Vector3;
  scale?: number;
  gripWidth?: number; // 0-100 percentage
  scene: THREE.Scene;
  groupRef?: React.RefObject<THREE.Group>;
}

export default function BuretteClamp({
  position = new THREE.Vector3(0, 6.5, 0),
  scale = 1,
  gripWidth = 25,
  scene,
  groupRef
}: BuretteClampProps) {
  const leftArmRef = useRef<THREE.Group | null>(null);
  const rightArmRef = useRef<THREE.Group | null>(null);
  const clampGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!scene) return;

    const clampGroup = new THREE.Group();
    clampGroup.position.copy(position);
    clampGroup.scale.setScalar(scale);
    clampGroupRef.current = clampGroup;
    if (groupRef) {
      (groupRef as React.MutableRefObject<THREE.Group | null>).current = clampGroup;
    }

    // Materials
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.3,
      metalness: 0.9
    });

    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.95,
      metalness: 0.05
    });

    // Mounting bracket (clamps onto the vertical rod)
    const bracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1.2, 0.4),
      metalMat
    );
    bracket.position.set(0, 0, -1.8);
    bracket.castShadow = true;
    clampGroup.add(bracket);

    // Clamp collar that attaches to the vertical rod
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.08, 16, 32),
      metalMat
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0, -2);
    collar.castShadow = true;
    clampGroup.add(collar);

    // Clamp screw for the collar
    const clampScrew = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.4, 16),
      new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 })
    );
    clampScrew.rotation.z = Math.PI / 2;
    clampScrew.position.set(0.25, 0, -2);
    clampGroup.add(clampScrew);

    // LEFT ARM - Horizontal bar extending from back
    const leftArm = new THREE.Group();
    leftArmRef.current = leftArm;

    // Main horizontal arm (along Z axis)
    const leftBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.25, 3.5),
      metalMat
    );
    leftBar.castShadow = true;
    leftArm.add(leftBar);

    // Rubber pad on inner face (right side)
    const leftPad = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.15, 2.0),
      rubberMat
    );
    leftPad.position.x = 0.2;
    leftArm.add(leftPad);

    // Grooves for grip (along Z axis)
    for (let i = 0; i < 6; i++) {
      const groove = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.16, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1.0 })
      );
      groove.position.set(0.2, 0, -0.8 + i * 0.3);
      leftArm.add(groove);
    }

    // Set initial arm positions based on current gripWidth
    const maxWidth = 0.85;
    const width = (gripWidth / 100) * maxWidth;
    leftArm.position.set(-0.3 - width, 0, 0);
    clampGroup.add(leftArm);

    // RIGHT ARM - Mirror of left (horizontal, along Z axis)
    const rightArm = new THREE.Group();
    rightArmRef.current = rightArm;

    const rightBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.25, 3.5),
      metalMat
    );
    rightBar.castShadow = true;
    rightArm.add(rightBar);

    const rightPad = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.15, 2.0),
      rubberMat
    );
    rightPad.position.x = -0.2;
    rightArm.add(rightPad);

    for (let i = 0; i < 6; i++) {
      const groove = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.16, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1.0 })
      );
      groove.position.set(-0.2, 0, -0.8 + i * 0.3);
      rightArm.add(groove);
    }

    rightArm.position.set(0.3 + width, 0, 0);
    clampGroup.add(rightArm);

    // Horizontal support beam connecting arms (connects to bracket)
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.15, 0.3),
      metalMat
    );
    beam.position.set(0, 0, -1.5);
    beam.castShadow = true;
    clampGroup.add(beam);

    scene.add(clampGroup);

    return () => {
      scene.remove(clampGroup);
    };
  }, [scene, position, scale]);

  // Update arm positions based on grip width (horizontal movement along X axis)
  useEffect(() => {
    const maxWidth = 0.85; // Maximum distance from center
    const width = (gripWidth / 100) * maxWidth;
    if (leftArmRef.current) {
      leftArmRef.current.position.x = -0.3 - width;
    }
    if (rightArmRef.current) {
      rightArmRef.current.position.x = 0.3 + width;
    }
  }, [gripWidth]);

  return null; // This component only manages 3D objects
}

