# Projectile Motion Simulator Upgrade Plan

## Overview
This document outlines the plan to upgrade the Projectile Motion Simulator to match the design and functionality of the Titration Simulator, including fullscreen view, config/chart icons, status bar, and multiple charts with navigation.

---

## 1. Current State Analysis

### 1.1 Projectile Motion Simulator (Current)
- **Location**: `components/simulations/ProjectileMotionSimulator.tsx`
- **Features**:
  - Basic 3D visualization with Three.js
  - Sidebar controls (velocity, angle, play/pause, reset)
  - Auto-rotate camera
  - Trail visualization
  - Real-time values display (height, distance, time)
  - Predicted values (max height, range, flight time)
- **Limitations**:
  - No fullscreen mode
  - No config button/panel
  - No chart functionality
  - No status bar overlay
  - Controls only in sidebar (not accessible in fullscreen)
  - No mobile-optimized UI

### 1.2 Titration Simulator (Reference Design)
- **Location**: 
  - Wrapper: `components/simulations/TitrationSimulatorWrapper.tsx`
  - Simulator: `components/simulations/TitrationSimulator.tsx`
- **Features**:
  - Fullscreen/embedded view toggle
  - Config button (⚙️) with configuration panel
  - Chart button (📊) with chart sidebar/overlay
  - Status bar overlay (pH, Volume, Status)
  - Info/Guide button
  - Mobile-responsive UI
  - Chart with resize handle
  - Persistent state across view changes

---

## 2. Design Requirements

### 2.1 UI Components to Add

#### 2.1.1 Fullscreen Toggle
- **Icon**: Maximize2 / Minimize2 (from lucide-react)
- **Position**: Top-right corner
- **Behavior**: 
  - Embedded view: Shows Maximize2 icon
  - Fullscreen view: Shows Minimize2 icon
  - ESC key to exit fullscreen

#### 2.1.2 Config Button
- **Icon**: ⚙️ or Settings icon
- **Position**: Top-left corner (mobile) / Overlay button
- **Behavior**:
  - Opens configuration panel
  - Contains: Velocity, Angle, Auto-rotate, Show Trail toggles
  - Similar to titration's config panel

#### 2.1.3 Chart Button
- **Icon**: 📊 or BarChart icon
- **Position**: Near config button
- **Behavior**:
  - PC/Tablet: Opens chart sidebar on right side
  - Mobile: Opens chart overlay (fullscreen)
  - Contains multiple charts with navigation arrows

#### 2.1.4 Status Bar
- **Position**: Top-left corner (below config button on mobile)
- **Content**:
  - **Height**: Current vertical position (m)
  - **Distance**: Current horizontal distance (m)
  - **Time**: Elapsed time (s)
  - **Status**: Running/Stopped

#### 2.1.5 Info/Guide Button
- **Icon**: Info icon
- **Position**: Top-right (next to fullscreen button)
- **Behavior**: Opens tutorial/guide overlay

---

## 3. Chart Implementation Plan

### 3.1 Chart Types

#### 3.1.1 Vertical Velocity vs Time
- **Data**: `v_y(t) = v₀ sin(θ) - gt`
- **X-axis**: Time (s)
- **Y-axis**: Vertical Velocity (m/s)
- **Color**: Red or Cyan
- **Description**: Shows how vertical velocity changes over time

#### 3.1.2 Horizontal Velocity vs Time
- **Data**: `v_x(t) = v₀ cos(θ)` (constant)
- **X-axis**: Time (s)
- **Y-axis**: Horizontal Velocity (m/s)
- **Color**: Blue or Green
- **Description**: Shows constant horizontal velocity

#### 3.1.3 Displacement vs Time
- **Data**: 
  - Horizontal: `x(t) = v₀ cos(θ) t`
  - Vertical: `y(t) = v₀ sin(θ) t - 0.5gt²`
- **X-axis**: Time (s)
- **Y-axis**: Displacement (m)
- **Color**: Purple or Orange
- **Description**: Shows trajectory displacement over time

### 3.2 Chart Navigation

#### 3.2.1 Navigation Arrows
- **Left Arrow** (←): Previous chart
- **Right Arrow** (→): Next chart
- **Position**: Above or below chart
- **Visual**: Circular buttons with arrow icons
- **Behavior**: 
  - Cycle through charts: Vertical Velocity → Horizontal Velocity → Displacement → Vertical Velocity
  - Show chart name/title
  - Show chart index (e.g., "Chart 1 of 3")

#### 3.2.2 Chart Display
- **Library**: Recharts (already used in titration)
- **Component**: ResponsiveContainer with LineChart
- **Features**:
  - Real-time data updates
  - Smooth animations
  - Grid and axes labels
  - Tooltip on hover

---

## 4. Implementation Structure

### 4.1 File Structure

```
components/simulations/
├── ProjectileMotionSimulator.tsx          # Main simulator (updated)
├── ProjectileMotionSimulatorWrapper.tsx    # NEW - Wrapper for fullscreen
└── projectile/                            # NEW - Sub-components (if needed)
    ├── ProjectileMotionChart.tsx           # Chart component with navigation
    └── ProjectileMotionConfig.tsx          # Config panel component
```

### 4.2 Component Architecture

```
ProjectileMotionSimulatorWrapper
├── State Management
│   ├── isFullScreen (boolean)
│   ├── isChartOpen (boolean)
│   └── isMobile (boolean)
├── Fullscreen Container
│   └── ProjectileMotionSimulator (isEmbedded=false)
└── Embedded Container
    └── ProjectileMotionSimulator (isEmbedded=true)

ProjectileMotionSimulator
├── Three.js Scene Setup
├── Simulation Logic
├── UI Overlays
│   ├── Config Button & Panel
│   ├── Chart Button & Sidebar/Overlay
│   ├── Status Bar
│   ├── Info/Guide Button
│   └── Fullscreen Controls
└── Data Collection for Charts
    ├── Vertical Velocity Data
    ├── Horizontal Velocity Data
    └── Displacement Data
```

---

## 5. Detailed Implementation Steps

### 5.1 Phase 1: Create Wrapper Component

#### Step 1.1: Create `ProjectileMotionSimulatorWrapper.tsx`
- **Purpose**: Handle fullscreen/embedded view switching
- **Features**:
  - Fullscreen toggle button
  - ESC key handler
  - Mobile detection
  - Conditional rendering of fullscreen vs embedded containers
  - Pass `isEmbedded` prop to simulator

#### Step 1.2: Update `SimulationsView.tsx`
- **Change**: Use `ProjectileMotionSimulatorWrapper` instead of `ProjectileMotionSimulator` directly
- **Pattern**: Match how titration simulation is used

### 5.2 Phase 2: Refactor Main Simulator

#### Step 2.1: Add Props Interface
```typescript
interface ProjectileMotionSimulatorProps {
  isEmbedded?: boolean;
  onChartOpenChange?: (isOpen: boolean) => void;
}
```

#### Step 2.2: Add State Management
- `showConfig`: Boolean for config panel visibility
- `showChart`: Boolean for chart visibility
- `showChartSidebar`: Boolean for chart sidebar (PC/tablet)
- `chartWidth`: Number for chart sidebar width (PC/tablet)
- `isResizing`: Boolean for chart resize state
- `showTutorial`: Boolean for guide/tutorial visibility
- `isMobile`: Boolean for mobile detection

#### Step 2.3: Add Data Collection
- **Vertical Velocity Data**: `{time: number, velocity: number}[]`
- **Horizontal Velocity Data**: `{time: number, velocity: number}[]`
- **Displacement Data**: `{time: number, x: number, y: number}[]`
- **Update Logic**: Collect data during simulation run

#### Step 2.4: Move Controls to Overlays
- Remove sidebar from main layout
- Add config button overlay
- Add status bar overlay
- Add chart button overlay
- Add info/guide button overlay

### 5.3 Phase 3: Implement Charts

#### Step 3.1: Create Chart Component
- **Component**: `ProjectileMotionChart.tsx` (or inline in simulator)
- **Features**:
  - Chart navigation (left/right arrows)
  - Current chart index state
  - Chart titles and descriptions
  - Recharts LineChart components

#### Step 3.2: Chart Data Calculations
```typescript
// Vertical Velocity
v_y = velocity * Math.sin(angleRad) - g * t

// Horizontal Velocity (constant)
v_x = velocity * Math.cos(angleRad)

// Displacement
x = velocity * Math.cos(angleRad) * t
y = velocity * Math.sin(angleRad) * t - 0.5 * g * t * t
```

#### Step 3.3: Chart Display Modes
- **PC/Tablet**: Sidebar on right (resizable)
- **Mobile**: Fullscreen overlay
- **Navigation**: Arrows to switch between charts

### 5.4 Phase 4: UI Components

#### Step 4.1: Config Panel
- **Layout**: Similar to titration config
- **Controls**:
  - Velocity slider
  - Angle slider
  - Auto-rotate toggle
  - Show Trail toggle
- **Position**: Overlay panel (mobile) or sidebar (PC)

#### Step 4.2: Status Bar
- **Layout**: Compact overlay
- **Metrics**:
  - Height (m)
  - Distance (m)
  - Time (s)
  - Status (Running/Stopped)
- **Position**: Top-left corner

#### Step 4.3: Chart Sidebar/Overlay
- **PC/Tablet**: 
  - Resizable sidebar on right
  - Resize handle
  - Width: 200-600px
- **Mobile**:
  - Fullscreen overlay
  - Close button
  - Navigation arrows

#### Step 4.4: Info/Guide Button
- **Position**: Top-right (next to fullscreen)
- **Content**: Tutorial/guide overlay
- **Features**: Explanation of controls and physics

---

## 6. Data Flow

### 6.1 Simulation Data Collection

```typescript
// During simulation run
const dataPoint = {
  time: currentTime,
  verticalVelocity: velocity * Math.sin(angleRad) - g * currentTime,
  horizontalVelocity: velocity * Math.cos(angleRad),
  displacementX: (velocity * Math.cos(angleRad)) * currentTime,
  displacementY: (velocity * Math.sin(angleRad)) * currentTime - 0.5 * g * currentTime * currentTime
};

// Store in state arrays
verticalVelocityData.push({ time: dataPoint.time, velocity: dataPoint.verticalVelocity });
horizontalVelocityData.push({ time: dataPoint.time, velocity: dataPoint.horizontalVelocity });
displacementData.push({ time: dataPoint.time, x: dataPoint.displacementX, y: dataPoint.displacementY });
```

### 6.2 Chart Updates
- **Real-time**: Update charts as simulation runs
- **Reset**: Clear data arrays when simulation resets
- **Format**: Convert to Recharts data format

---

## 7. State Persistence (Optional)

### 7.1 Module-Level State
- Similar to titration simulator
- Store Three.js objects
- Store simulation state
- Persist across view changes (embedded ↔ fullscreen)

### 7.2 Chart Data Persistence
- Store chart data in module-level state
- Persist across view changes
- Clear on reset

---

## 8. Styling and Responsive Design

### 8.1 Color Scheme
- **Primary**: Cyan/Teal (matching projectile color)
- **Charts**: 
  - Vertical Velocity: Red/Cyan
  - Horizontal Velocity: Blue/Green
  - Displacement: Purple/Orange
- **Background**: Dark (gray-900/black)

### 8.2 Responsive Breakpoints
- **Mobile**: < 1024px
- **Tablet**: 1024px - 1280px
- **Desktop**: > 1280px

### 8.3 Mobile Optimizations
- Overlay controls instead of sidebar
- Fullscreen chart overlay
- Touch-friendly buttons
- Larger hit areas

---

## 9. Testing Checklist

### 9.1 Functionality
- [ ] Fullscreen toggle works
- [ ] ESC key exits fullscreen
- [ ] Config panel opens/closes
- [ ] Chart button works on PC/tablet and mobile
- [ ] Chart navigation arrows work
- [ ] All three charts display correctly
- [ ] Status bar updates in real-time
- [ ] Simulation runs correctly in both views
- [ ] Reset clears chart data
- [ ] Controls work in fullscreen mode

### 9.2 Responsive Design
- [ ] Mobile view displays correctly
- [ ] Tablet view displays correctly
- [ ] Desktop view displays correctly
- [ ] Chart sidebar resizes on PC/tablet
- [ ] Chart overlay works on mobile
- [ ] Buttons are accessible on all screen sizes

### 9.3 Data Accuracy
- [ ] Vertical velocity calculations are correct
- [ ] Horizontal velocity is constant
- [ ] Displacement calculations match trajectory
- [ ] Chart data updates in real-time
- [ ] Chart data matches simulation values

---

## 10. Implementation Order

### Priority 1: Core Structure
1. Create `ProjectileMotionSimulatorWrapper.tsx`
2. Refactor `ProjectileMotionSimulator.tsx` to accept props
3. Add fullscreen toggle functionality
4. Test basic fullscreen/embedded switching

### Priority 2: UI Components
5. Add config button and panel
6. Add status bar overlay
7. Add info/guide button
8. Update controls layout for overlays

### Priority 3: Charts
9. Implement data collection during simulation
10. Create chart component with navigation
11. Add chart button and sidebar/overlay
12. Implement all three chart types
13. Add chart navigation arrows

### Priority 4: Polish
14. Add state persistence (if needed)
15. Optimize responsive design
16. Add animations and transitions
17. Final testing and bug fixes

---

## 11. Code Examples

### 11.1 Wrapper Component Structure
```typescript
const ProjectileMotionSimulatorWrapper: React.FC = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // ... resize handler, ESC key handler ...

  return (
    <>
      {isFullScreen && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Fullscreen UI */}
          <ProjectileMotionSimulator 
            isEmbedded={false} 
            onChartOpenChange={setIsChartOpen}
          />
        </div>
      )}
      {!isFullScreen && (
        <div>
          {/* Embedded UI */}
          <ProjectileMotionSimulator 
            isEmbedded={true} 
            onChartOpenChange={setIsChartOpen}
          />
        </div>
      )}
    </>
  );
};
```

### 11.2 Chart Navigation
```typescript
const [currentChartIndex, setCurrentChartIndex] = useState(0);
const charts = [
  { name: 'Vertical Velocity', data: verticalVelocityData, color: '#ef4444' },
  { name: 'Horizontal Velocity', data: horizontalVelocityData, color: '#3b82f6' },
  { name: 'Displacement', data: displacementData, color: '#a855f7' }
];

const nextChart = () => {
  setCurrentChartIndex((prev) => (prev + 1) % charts.length);
};

const prevChart = () => {
  setCurrentChartIndex((prev) => (prev - 1 + charts.length) % charts.length);
};
```

### 11.3 Status Bar
```typescript
<div className="bg-black bg-opacity-70 backdrop-blur-sm text-white px-3 py-3 rounded-lg">
  <div className="space-y-2">
    <div className="text-center">
      <p className="text-xs text-cyan-300">Height</p>
      <p className="text-sm font-bold">{currentHeight.toFixed(2)} m</p>
    </div>
    <div className="text-center">
      <p className="text-xs text-purple-300">Distance</p>
      <p className="text-sm font-bold">{currentDistance.toFixed(2)} m</p>
    </div>
    <div className="text-center">
      <p className="text-xs text-green-300">Time</p>
      <p className="text-sm font-bold">{timeElapsed.toFixed(2)} s</p>
    </div>
    <div className="text-center">
      <p className="text-xs text-yellow-300">Status</p>
      <p className="text-xs font-bold">{isRunning ? 'Running' : 'Stopped'}</p>
    </div>
  </div>
</div>
```

---

## 12. Dependencies

### 12.1 Existing Dependencies
- `react`
- `three`
- `lucide-react` (for icons)
- `recharts` (for charts)

### 12.2 No New Dependencies Required
All required libraries are already in the project.

---

## 13. Estimated Implementation Time

- **Phase 1 (Wrapper)**: 1-2 hours
- **Phase 2 (Refactor)**: 2-3 hours
- **Phase 3 (Charts)**: 3-4 hours
- **Phase 4 (UI Components)**: 2-3 hours
- **Phase 5 (Testing & Polish)**: 2-3 hours

**Total**: ~10-15 hours

---

## 14. Success Criteria

1. ✅ Projectile motion simulator matches titration simulator design
2. ✅ Fullscreen mode works seamlessly
3. ✅ Config panel allows parameter adjustment
4. ✅ Status bar shows real-time metrics
5. ✅ Three charts display correctly with navigation
6. ✅ Charts update in real-time during simulation
7. ✅ Mobile and desktop views are fully functional
8. ✅ Code is maintainable and follows existing patterns

---

## 15. Notes

- Follow the same patterns as `TitrationSimulator` for consistency
- Ensure state persistence if needed (for view switching)
- Test thoroughly on mobile, tablet, and desktop
- Keep code modular and reusable
- Add proper TypeScript types
- Include accessibility features (ARIA labels, keyboard navigation)

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Author**: AI Assistant




