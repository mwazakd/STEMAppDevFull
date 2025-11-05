# Quick Start Guide: Adding a New Simulation

This is a quick reference guide for adding a new simulation. For detailed documentation, see `SIMULATION_INTEGRATION_GUIDE.md`.

## 5-Minute Setup

### Step 1: Copy Templates

```bash
# Copy simulator template
cp SIMULATION_TEMPLATE.tsx components/simulations/YourSimulator.tsx

# Copy wrapper template
cp SIMULATION_WRAPPER_TEMPLATE.tsx components/simulations/YourSimulatorWrapper.tsx
```

### Step 2: Find & Replace

In both files, replace:
- `YourSimulator` → `YourActualSimulatorName`
- `YourDataPoint` → `YourActualDataType`
- `embedded-your-wrapper` → `embedded-your-actual-wrapper`

### Step 3: Register in Constants

Add to `constants.ts`:

```typescript
import YourSimulatorWrapper from './components/simulations/YourSimulatorWrapper';

// In MOCK_SUBJECTS, under appropriate subject:
{
  id: 'your-sim-id',
  title: 'Your Simulation',
  content: {
    type: 'simulation',
    level: ['Grade 11', 'A-Level'],
    description: 'Description of your simulation.',
    component: YourSimulatorWrapper,
  }
}
```

### Step 4: Implement Core Logic

1. **Define State**: Add your simulation parameters to `persistentState`
2. **Initialize Scene**: Copy scene setup from `TitrationSimulator.tsx` (lines 322-893)
3. **Add Event Handlers**: Copy camera controls from `TitrationSimulator.tsx` (lines 538-770)
4. **Implement Simulation Loop**: Add your physics/calculation logic
5. **Add UI Overlays**: Copy UI components from `TitrationSimulator.tsx`

### Step 5: Test

- [ ] Embedded view works
- [ ] Fullscreen toggle works
- [ ] Camera controls work
- [ ] State persists across views
- [ ] Mobile responsive

## Key Things to Remember

1. **Always use module-level state** for persistence:
   ```typescript
   const persistentState = { parameter: 10 };
   ```

2. **Store Three.js objects** in module-level storage:
   ```typescript
   const persistentThreeJS = { scene: null, camera: null, renderer: null };
   ```

3. **Store event handlers in refs**:
   ```typescript
   const eventHandlersRef = useRef({ handleMouseDown: null, ... });
   ```

4. **Move canvas, don't recreate** when switching views

5. **Use safe area insets** for mobile buttons

## Reference Files

- **Full Guide**: `SIMULATION_INTEGRATION_GUIDE.md`
- **Working Example**: `components/simulations/TitrationSimulator.tsx`
- **Template**: `SIMULATION_TEMPLATE.tsx`
- **Wrapper Template**: `SIMULATION_WRAPPER_TEMPLATE.tsx`

## Common Issues

| Issue | Solution |
|-------|----------|
| White screen | Check container dimensions, verify scene initialization |
| Controls don't work | Ensure event handlers are stored in refs and reattached |
| State not persisting | Use module-level `persistentState`, not just React state |
| Buttons not visible on mobile | Increase z-index, add safe area insets |

## Need Help?

1. Check `SIMULATION_INTEGRATION_GUIDE.md` for detailed instructions
2. Review `TitrationSimulator.tsx` as a reference implementation
3. Use the integration checklist in the guide


