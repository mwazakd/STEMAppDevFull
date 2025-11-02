# Titration Simulation State Persistence Plan

## 1. Problem Analysis

### Current Issue
The titration simulation **resets/reinitializes** every time the user switches between:
- **Small view (embedded)** ↔ **Fullscreen view**

This causes:
- ❌ Three.js scene to be disposed and recreated
- ❌ All simulation state to reset (titrantAdded, isRunning, data, pH values)
- ❌ "Loading 3D Scene..." appears on every view switch
- ❌ User loses their titration progress
- ❌ Poor user experience (not like YouTube video player)

### Root Cause

**In `TitrationSimulatorWrapper.tsx`:**
- Lines 52-74: Conditionally renders `<TitrationSimulator isEmbedded={false} />` when fullscreen
- Lines 78-170: Conditionally renders `<TitrationSimulator isEmbedded={true} />` when embedded
- **Different React `key` props** (`"fullscreen-container"` vs `"embedded-container"`) force React to treat them as different components
- **Result**: React **unmounts** one component and **mounts** a new one on every toggle

**In `TitrationSimulator.tsx`:**
- Lines 221-699: `useEffect(() => {...}, [])` with empty dependency array runs on mount
- Line 697: Cleanup function **disposes all Three.js objects** on unmount
- Line 225: Sets `sceneReady = false` on every mount
- Line 253: Checks `if (rendererRef.current) return;` but since component is remounted, refs are reset
- **Result**: Fresh initialization every time, losing all state

### Expected Behavior (Like YouTube)
- ✅ **Single instance** of TitrationSimulator persists
- ✅ **Canvas moves** between containers (DOM manipulation)
- ✅ **State preserved**: titrantAdded, isRunning, data, pH, camera position, etc.
- ✅ **No reinitialization**: Three.js scene continues running
- ✅ **Smooth transition**: Only resize canvas, no "loading" screen

---

## 2. Rewrite of Requirements

**Goal**: Maintain simulation state when switching between embedded and fullscreen views, similar to how YouTube maintains video state when toggling fullscreen.

**Requirements**:
1. Single React component instance of `TitrationSimulator` that persists across view changes
2. Preserve all React state: `titrantAdded`, `isRunning`, `data`, `solutionType`, `solutionConc`, etc.
3. Preserve Three.js objects: `scene`, `camera`, `renderer`, `burette`, `flask`, etc.
4. Move canvas DOM element between containers without disposal
5. Only update canvas size and container styles, not reinitialize
6. No "Loading 3D Scene..." message on view toggle
7. Maintain all event listeners and animation loop

---

## 3. Implementation Strategy

### Option A: Refactor Existing Code (Recommended)
**Better because:**
- Minimal changes to existing architecture
- Reuses current component structure
- Faster implementation
- Lower risk of breaking existing features

**Approach:**
1. Lift `TitrationSimulator` outside conditional rendering in wrapper
2. Use single instance with persistent `key`
3. Move canvas DOM element between containers on `isEmbedded` change
4. Update Three.js renderer size without disposal
5. Preserve all state across view changes

### Option B: Complete Rewrite
**Worse because:**
- High risk of introducing bugs
- Requires extensive testing
- Longer development time
- May lose existing optimizations

**Conclusion**: **Option A is better** - we should refactor, not rewrite.

---

## 4. Task List

### Phase 1: Refactor TitrationSimulatorWrapper (Single Instance)
- [ ] **Task 1.1**: Remove conditional rendering of two separate `TitrationSimulator` instances
- [ ] **Task 1.2**: Create single persistent instance of `TitrationSimulator` with stable `key`
- [ ] **Task 1.3**: Always render `TitrationSimulator` but conditionally render wrapper containers
- [ ] **Task 1.4**: Pass `isEmbedded` prop to single instance (don't unmount/remount)

### Phase 2: Update TitrationSimulator to Handle View Changes
- [ ] **Task 2.1**: Modify initialization `useEffect` to detect existing Three.js objects
- [ ] **Task 2.2**: Add logic to reuse existing `scene`, `camera`, `renderer` if they exist
- [ ] **Task 2.3**: Move canvas DOM element to new container when `isEmbedded` changes
- [ ] **Task 2.4**: Update renderer size and camera aspect when container size changes
- [ ] **Task 2.5**: Remove disposal logic from mount/unmount cycle (only dispose on true unmount)

### Phase 3: Canvas Container Management
- [ ] **Task 3.1**: Create refs for both embedded and fullscreen mount points
- [ ] **Task 3.2**: Add `useEffect` that watches `isEmbedded` prop
- [ ] **Task 3.3**: Move `renderer.domElement` between containers when `isEmbedded` changes
- [ ] **Task 3.4**: Handle resize logic to update renderer size for current container

### Phase 4: State Preservation
- [ ] **Task 4.1**: Ensure all React state (`useState`) persists (already does, verify)
- [ ] **Task 4.2**: Preserve Three.js refs (`sceneRef`, `cameraRef`, `rendererRef`) across view changes
- [ ] **Task 4.3**: Maintain animation loop continuity (don't restart `requestAnimationFrame`)
- [ ] **Task 4.4**: Preserve event listeners on canvas element

### Phase 5: Size and Layout Updates
- [ ] **Task 5.1**: Update resize handler to work with container switching
- [ ] **Task 5.2**: Ensure ResizeObserver watches correct container
- [ ] **Task 5.3**: Handle mobile fixed height (475px) for embedded mode
- [ ] **Task 5.4**: Update camera aspect ratio when container size changes

### Phase 6: Cleanup and Edge Cases
- [ ] **Task 6.1**: Only dispose Three.js objects on true component unmount (removed from tree)
- [ ] **Task 6.2**: Handle edge case: switching views during active titration
- [ ] **Task 6.3**: Handle edge case: switching views when chart overlays are open
- [ ] **Task 6.4**: Test ESC key functionality in both views
- [ ] **Task 6.5**: Remove "Loading 3D Scene..." when just switching views

### Phase 7: Testing
- [ ] **Task 7.1**: Test switching between embedded ↔ fullscreen during active titration
- [ ] **Task 7.2**: Test switching with paused titration
- [ ] **Task 7.3**: Test switching after titration completes
- [ ] **Task 7.4**: Test switching with chart overlay open
- [ ] **Task 7.5**: Test switching with tutorial overlay open
- [ ] **Task 7.6**: Verify state preservation: titrantAdded, data, pH values
- [ ] **Task 7.7**: Verify Three.js objects persist: scene, camera, renderer, meshes
- [ ] **Task 7.8**: Test on mobile (≤576px) with fixed height

---

## 5. Implementation Details

### Key Changes Required

**TitrationSimulatorWrapper.tsx:**
```typescript
// BEFORE (current):
if (isFullScreen) {
  return <TitrationSimulator isEmbedded={false} />  // Separate instance
}
return <TitrationSimulator isEmbedded={true} />    // Separate instance

// AFTER (target):
return (
  <>
    {isFullScreen && <FullscreenContainer>}
    {!isFullScreen && <EmbeddedContainer>}
    <TitrationSimulator 
      key="persistent-simulator"  // Stable key!
      isEmbedded={!isFullScreen}
      mountContainer={isFullScreen ? fullscreenMountRef : embeddedMountRef}
    />
  </>
)
```

**TitrationSimulator.tsx:**
```typescript
// Add useEffect to handle isEmbedded changes
useEffect(() => {
  if (!rendererRef.current || !mountRef.current) return;
  
  // Move canvas if needed
  const canvas = rendererRef.current.domElement;
  if (!mountRef.current.contains(canvas)) {
    // Remove from old parent
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
    // Add to new container
    mountRef.current.appendChild(canvas);
    
    // Update size for new container
    const rect = mountRef.current.getBoundingClientRect();
    rendererRef.current.setSize(rect.width, rect.height);
    if (cameraRef.current) {
      cameraRef.current.aspect = rect.width / rect.height;
      cameraRef.current.updateProjectionMatrix();
    }
  }
}, [isEmbedded]);
```

---

## 6. Success Criteria

✅ Simulation state persists when switching views  
✅ No "Loading 3D Scene..." message on view toggle  
✅ Three.js scene continues running (no disposal)  
✅ Titration progress maintained (titrantAdded, data, pH)  
✅ Camera position preserved  
✅ Smooth transition between views  
✅ Works on mobile (≤576px)  
✅ No memory leaks (proper cleanup on true unmount)  

---

## Next Steps

1. Review this plan with the team/user
2. Start with Phase 1 (refactor wrapper)
3. Progressively implement each phase
4. Test after each phase
5. Deploy when all phases complete
