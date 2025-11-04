# Phase 1 Testing Guide - Projectile Motion Simulator

## Quick Start

### 1. Start the Development Server

```bash
npm run dev
```

The server will start on **http://localhost:3000**

### 2. Navigate to Projectile Motion Simulation

**Option A: Via Sidebar**
1. Open the app in your browser
2. Click the **Sidebar menu** (hamburger icon)
3. Navigate to **Physics** → **Newtonian Mechanics**
4. Click the **Play button** next to "Projectile Motion"

**Option B: Direct URL**
Navigate to:
```
http://localhost:3000/STEMAppDevFull/?view=simulations&simulationId=nm-2
```

---

## What to Test

### ✅ Test 1: Fullscreen Toggle Button

**Location**: Top-right corner of the simulation (embedded view)

**Steps**:
1. Find the **Maximize2 icon** (⛶) button in the top-right corner
2. Click it
3. **Expected**: Simulation should go fullscreen (black background, full viewport)

**Test**:
- [ ] Button appears in embedded view
- [ ] Clicking opens fullscreen
- [ ] Fullscreen view shows the simulation correctly
- [ ] Canvas fills entire screen

---

### ✅ Test 2: Exit Fullscreen

**Steps**:
1. After entering fullscreen, find the **Minimize2 icon** (⊟) button in top-right
2. Click it
3. **Expected**: Returns to embedded view

**Alternative**:
- Press **ESC key**
- **Expected**: Should also exit fullscreen

**Test**:
- [ ] Minimize button appears in fullscreen
- [ ] Clicking exits fullscreen
- [ ] ESC key exits fullscreen
- [ ] Returns to embedded view correctly

---

### ✅ Test 3: Embedded View

**Steps**:
1. In embedded view (not fullscreen)
2. Check the simulation container

**Expected**:
- [ ] Simulation fills the container
- [ ] Canvas is visible and rendering
- [ ] Sidebar controls visible (Velocity, Angle, Launch button, etc.)
- [ ] Height is fixed at 475px on mobile (screens ≤576px)

---

### ✅ Test 4: Sidebar Controls (Fullscreen Mode)

**Steps**:
1. Enter fullscreen mode
2. Check right side of screen

**Expected**:
- [ ] Sidebar controls are visible on the right
- [ ] All controls work (Velocity slider, Angle slider, Launch button, etc.)
- [ ] Can interact with all controls
- [ ] Simulation responds to control changes

**Test**:
- [ ] Adjust velocity slider - projectile behavior changes
- [ ] Adjust angle slider - target position updates
- [ ] Click Launch button - simulation runs
- [ ] Click Reset button - simulation resets

---

### ✅ Test 5: Canvas Rendering

**Steps**:
1. In both embedded and fullscreen views
2. Check the 3D scene

**Expected**:
- [ ] Ground plane is visible
- [ ] Grid is visible
- [ ] Platform is visible
- [ ] Projectile sphere is visible
- [ ] Target cylinder is visible
- [ ] Scene renders smoothly
- [ ] Auto-rotate works (if enabled)

**Test**:
- [ ] Scene is visible in embedded mode
- [ ] Scene is visible in fullscreen mode
- [ ] No blank/black screen
- [ ] No rendering errors in console

---

### ✅ Test 6: Responsive Design

**Desktop/Tablet Testing**:
- [ ] Fullscreen toggle button visible
- [ ] Sidebar controls visible in fullscreen
- [ ] Canvas fills available space

**Mobile Testing** (resize browser to < 576px width):
- [ ] Embedded view has fixed height of 475px
- [ ] Fullscreen button still accessible
- [ ] Canvas renders correctly at 475px height
- [ ] Controls are accessible

---

### ✅ Test 7: View Switching

**Steps**:
1. Start simulation in embedded view
2. Adjust velocity to 30 m/s
3. Enter fullscreen
4. **Expected**: Velocity should still be 30 m/s
5. Launch simulation
6. Exit fullscreen while running
7. **Expected**: Simulation should continue running

**Test**:
- [ ] State persists when switching views
- [ ] Simulation continues running when switching
- [ ] Canvas doesn't reinitialize
- [ ] No flickering or reloading

---

### ✅ Test 8: Console Errors

**Steps**:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate to simulation and test fullscreen toggle

**Expected**:
- [ ] No errors in console
- [ ] No warnings about missing props
- [ ] No Three.js errors
- [ ] No React warnings

---

## Common Issues & Solutions

### Issue: Fullscreen button not visible
**Solution**: Check if you're in embedded view. The button is only visible when not in fullscreen.

### Issue: Simulation doesn't render
**Solution**: 
- Check browser console for errors
- Ensure Three.js is loading
- Try refreshing the page

### Issue: Controls not working in fullscreen
**Solution**: 
- Check if sidebar is visible on the right side
- Try clicking directly on controls
- Check browser console for errors

### Issue: ESC key doesn't exit fullscreen
**Solution**:
- Ensure fullscreen is active (button should show Minimize icon)
- Try clicking the minimize button instead
- Check if another element is capturing ESC key

---

## Success Criteria

✅ **Phase 1 is successful if**:
1. Fullscreen toggle button works (both directions)
2. ESC key exits fullscreen
3. Simulation renders correctly in both views
4. Controls are accessible in fullscreen
5. View switching is smooth (no re-initialization)
6. No console errors
7. Responsive design works on mobile

---

## Next Steps After Testing

If all tests pass:
- ✅ Proceed to **Phase 2**: Add config button, status bar, and info button
- ✅ Move controls to overlays instead of sidebar

If issues are found:
- Document the issues
- Fix bugs before proceeding
- Re-test affected functionality

---

## Testing Checklist

Print this checklist and tick items as you test:

```
□ Fullscreen button appears in embedded view
□ Fullscreen button opens fullscreen
□ Minimize button appears in fullscreen
□ Minimize button exits fullscreen
□ ESC key exits fullscreen
□ Simulation renders in embedded view
□ Simulation renders in fullscreen view
□ Sidebar controls visible in fullscreen
□ All controls work (velocity, angle, launch, reset)
□ Auto-rotate works
□ Trail visualization works
□ View switching preserves state
□ Mobile responsive (475px height on small screens)
□ No console errors
□ No visual glitches
```

---

**Happy Testing! 🚀**

