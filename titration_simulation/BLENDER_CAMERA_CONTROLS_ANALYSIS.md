# Blender-Style Camera Controls - Feasibility Analysis

## Current Implementation

**What you have now:**
- **Left Mouse Drag**: Orbit/Rotate camera around a fixed look-at point (0, 2, 0)
- **Mouse Wheel**: Zoom in/out by changing camera distance (5-40 units)
- **Touch Drag**: Single finger rotation on mobile
- **Pinch**: Two-finger pinch to zoom on mobile

**Camera System:**
- Uses spherical coordinates (theta, phi) for rotation
- Camera orbits around fixed point (0, 2, 0)
- Distance-based zoom (changing radius from look-at point)

## Blender Camera Controls Explained

**Blender's standard controls:**
1. **Left Mouse Button (LMB) + Drag**: Orbit/Rotate (same as you have)
2. **Middle Mouse Button (MMB) + Drag**: Pan - translates the view perpendicular to camera direction
3. **Mouse Wheel**: Zoom - moves camera forward/backward in view direction
4. **Right Mouse Button (RMB)**: Alternative rotation (not commonly used in web)

**Key Difference:**
- Blender pans by translating the look-at point (target) in the camera's up/right directions
- Zoom moves camera along the view direction vector (not just changing distance)

## Implementation Feasibility

### ✅ **FULLY FEASIBLE** - You can implement this!

### 1. Panning (Middle Mouse Button)

**What it does:**
- Translates the view horizontally/vertically without changing rotation
- Moves the look-at point based on camera's right/up vectors

**Implementation approach:**
```typescript
// Add pan offset to look-at point
const panOffsetRef = useRef({ x: 0, y: 0, z: 0 });

// In handleMouseMove, detect middle mouse button
if (e.button === 1 || e.buttons === 4) { // Middle mouse
  // Calculate pan direction based on camera's right/up vectors
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  camera.getWorldDirection(right).cross(camera.up).normalize();
  up.copy(camera.up).normalize();
  
  // Pan based on mouse delta
  panOffsetRef.current.x += deltaX * panSpeed * right.x;
  panOffsetRef.current.y -= deltaY * panSpeed * up.y;
  // ... update lookAt target
}
```

**Complexity:** Medium - Requires calculating camera-relative vectors

### 2. Zoom in Camera Direction

**What it does:**
- Current: Zoom changes distance from look-at point (circular zoom)
- Blender-style: Zoom moves camera along view direction (linear zoom)

**Current zoom:**
```typescript
cameraDistanceRef.current += delta; // Changes radius
camera.position = calculatePosition(theta, phi, distance);
```

**Blender-style zoom:**
```typescript
// Get camera forward direction
const forward = new THREE.Vector3();
camera.getWorldDirection(forward);

// Move camera along forward vector
camera.position.addScaledVector(forward, delta * zoomSpeed);
// Also update look-at point to maintain relative position
```

**Complexity:** Medium - Requires updating both camera position and look-at point

### 3. Combined System

**Challenges:**
- Need to handle multiple mouse buttons (left, middle, wheel)
- Pan changes look-at point, which affects orbit behavior
- Need to maintain smooth transitions between modes

**Benefits:**
- More intuitive for users familiar with Blender
- Better precision for examining specific parts of the scene
- Professional-grade camera controls

## Recommended Implementation Strategy

### Option A: Enhanced Custom Controls (Recommended)
- Keep your current orbit system
- Add middle mouse panning
- Enhance zoom to move along view direction
- **Pros:** Full control, matches your current architecture
- **Cons:** More code to maintain

### Option B: Use Three.js OrbitControls
- Replace custom controls with `OrbitControls` from `three/examples/jsm/controls/OrbitControls.js`
- Has built-in pan, zoom, rotate
- **Pros:** Battle-tested, well-documented, handles edge cases
- **Cons:** Less customization, may conflict with auto-rotate

### Option C: Hybrid Approach
- Use OrbitControls for pan/zoom
- Keep custom orbit with auto-rotate feature
- Combine both systems
- **Pros:** Best of both worlds
- **Cons:** Most complex to implement

## Implementation Complexity Assessment

| Feature | Complexity | Effort | Impact |
|---------|-----------|--------|--------|
| Middle Mouse Pan | Medium | 2-3 hours | High |
| Directional Zoom | Medium | 1-2 hours | Medium |
| Full Blender-style | High | 4-6 hours | High |

## Recommendation

**✅ Implement Blender-style controls** - It's feasible and will significantly improve UX!

**Suggested approach:**
1. Start with middle mouse panning (highest impact)
2. Then enhance zoom to move along view direction
3. Keep existing orbit/rotate as-is (it works well)

**Code changes needed:**
- Add `panOffsetRef` for tracking pan displacement
- Detect middle mouse button (`e.button === 1`)
- Calculate camera-relative pan vectors
- Update look-at point with pan offset
- Modify zoom to use forward vector instead of just distance

**Mobile considerations:**
- On mobile, pan could be triggered by two-finger drag (while zoom is pinch)
- Or add a UI button to toggle between rotate/pan modes

## Conclusion

**Feasibility: ✅ YES**
- Technically straightforward
- Matches Three.js capabilities
- Will significantly improve user experience
- Worth the implementation effort

**Next Steps:**
1. I can implement middle mouse panning first
2. Then enhance zoom to move along camera direction
3. Test and refine based on user feedback

Would you like me to proceed with implementing Blender-style camera controls?

