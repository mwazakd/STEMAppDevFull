# Simulation Documentation Index

This index helps you navigate all simulation-related documentation files.

---

## 📚 Documentation Files

### 1. **SIMULATION_INTEGRATION_GUIDE.md** ⭐ START HERE
**Comprehensive guide for adding new simulations**
- Complete architecture overview
- Step-by-step integration process
- Detailed code templates
- Best practices and patterns
- Troubleshooting guide
- **Use this for:** Full understanding of the simulation system

### 2. **QUICK_START_GUIDE.md** 🚀
**5-minute quick reference**
- Fast setup instructions
- Essential steps only
- Common issues and solutions
- **Use this for:** Quick reference when you know what you're doing

### 3. **SIMULATION_TEMPLATE.tsx** 📝
**Copy-paste template for simulator component**
- Complete component structure
- All required refs and state
- TODOs marked for customization
- **Use this for:** Starting point for new simulator component

### 4. **SIMULATION_WRAPPER_TEMPLATE.tsx** 📦
**Copy-paste template for wrapper component**
- Full wrapper implementation
- Fullscreen/embedded switching
- Safe area insets
- **Use this for:** Starting point for new wrapper component

### 5. **CONSTANTS_REGISTRATION_EXAMPLE.md** 📋
**How to register simulations in constants.ts**
- Exact code examples
- Field descriptions
- Multiple subjects example
- **Use this for:** Registering your simulation in the app

---

## 🎯 Which Document Should I Read?

### "I'm new to this codebase"
1. Read `SIMULATION_INTEGRATION_GUIDE.md` (Overview section)
2. Review `TitrationSimulator.tsx` as a reference
3. Use templates when ready to code

### "I know the system, just need to add a simulation"
1. Copy `SIMULATION_TEMPLATE.tsx` and `SIMULATION_WRAPPER_TEMPLATE.tsx`
2. Follow `QUICK_START_GUIDE.md`
3. Reference `CONSTANTS_REGISTRATION_EXAMPLE.md` for registration

### "I'm stuck on a specific issue"
1. Check `SIMULATION_INTEGRATION_GUIDE.md` → Troubleshooting section
2. Compare your code with `TitrationSimulator.tsx`
3. Check the integration checklist

### "I need to understand the architecture"
1. Read `SIMULATION_INTEGRATION_GUIDE.md` → Architecture section
2. Study `TitrationSimulator.tsx` and `TitrationSimulatorWrapper.tsx`
3. Review `ProjectileMotionSimulator.tsx` for comparison

---

## 📖 Reading Order Recommendation

### For First-Time Integration:
1. `SIMULATION_INTEGRATION_GUIDE.md` (Overview & Architecture)
2. Study `TitrationSimulator.tsx` (reference implementation)
3. `SIMULATION_INTEGRATION_GUIDE.md` (Step-by-Step Process)
4. Copy templates and customize
5. `CONSTANTS_REGISTRATION_EXAMPLE.md` (registration)
6. `SIMULATION_INTEGRATION_GUIDE.md` (Best Practices & Testing)

### For Quick Integration:
1. `QUICK_START_GUIDE.md`
2. Copy templates
3. `CONSTANTS_REGISTRATION_EXAMPLE.md`
4. Reference `SIMULATION_INTEGRATION_GUIDE.md` as needed

---

## 🔍 Reference Files

### Working Examples:
- `components/simulations/TitrationSimulator.tsx` - Complete implementation
- `components/simulations/TitrationSimulatorWrapper.tsx` - Wrapper example
- `components/simulations/ProjectileMotionSimulator.tsx` - Another complete example
- `components/simulations/ProjectileMotionSimulatorWrapper.tsx` - Another wrapper

### Configuration:
- `constants.ts` - Where simulations are registered
- `types.ts` - TypeScript type definitions

---

## ✅ Integration Checklist

Use this checklist when adding a new simulation:

### Pre-Development
- [ ] Read `SIMULATION_INTEGRATION_GUIDE.md`
- [ ] Reviewed reference implementations
- [ ] Understand state persistence pattern
- [ ] Understand Three.js object management

### Development
- [ ] Copied `SIMULATION_TEMPLATE.tsx` → `YourSimulator.tsx`
- [ ] Copied `SIMULATION_WRAPPER_TEMPLATE.tsx` → `YourSimulatorWrapper.tsx`
- [ ] Implemented simulation logic
- [ ] Added UI overlays (Config, Status, Chart, Guide)
- [ ] Implemented camera controls
- [ ] Added state persistence
- [ ] Registered in `constants.ts`

### Testing
- [ ] Embedded view works
- [ ] Fullscreen view works
- [ ] View switching works
- [ ] State persists across views
- [ ] Camera controls work (drag, zoom, pan)
- [ ] Mobile responsive
- [ ] Safe area insets work
- [ ] No console errors
- [ ] No memory leaks

---

## 📝 Quick Reference

### File Naming Convention
- Core Simulator: `YourSimulator.tsx`
- Wrapper: `YourSimulatorWrapper.tsx`
- Use PascalCase for component names

### Key Patterns

**State Persistence:**
```typescript
const persistentState = { parameter: 10 };
const [parameter, setParameter] = useState(() => persistentState.parameter);
useEffect(() => { persistentState.parameter = parameter; }, [parameter]);
```

**Three.js Persistence:**
```typescript
const persistentThreeJS = { scene: null, camera: null, renderer: null, isInitialized: false };
```

**Event Handlers:**
```typescript
const eventHandlersRef = useRef({ handleMouseDown: null, ... });
```

**Canvas Movement:**
```typescript
if (!mount.contains(canvas)) {
  if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  mount.appendChild(canvas);
}
```

---

## 🆘 Getting Help

1. **Check Documentation:**
   - `SIMULATION_INTEGRATION_GUIDE.md` → Troubleshooting
   - `QUICK_START_GUIDE.md` → Common Issues

2. **Compare with Working Examples:**
   - `TitrationSimulator.tsx`
   - `ProjectileMotionSimulator.tsx`

3. **Verify Checklist:**
   - All integration checklist items completed?

4. **Check Console:**
   - Look for errors
   - Check for warnings

---

## 📚 Related Documentation

- `PROJECTILE_MOTION_UPGRADE_PLAN.md` - Upgrade plan example
- `SIMULATIONS_STRUCTURE_DESIGN.md` - Overall simulations page structure
- `IMPLEMENTATION_VERIFICATION_CHECKLIST.md` - Feature verification checklist

---
📁 Root Directory
├── 📘 SIMULATION_INTEGRATION_GUIDE.md      (Main comprehensive guide)
├── 📗 QUICK_START_GUIDE.md                 (Quick reference)
├── 📄 SIMULATION_TEMPLATE.tsx              (Simulator template)
├── 📄 SIMULATION_WRAPPER_TEMPLATE.tsx      (Wrapper template)
├── 📋 CONSTANTS_REGISTRATION_EXAMPLE.md    (Registration guide)
└── 📑 SIMULATION_DOCUMENTATION_INDEX.md    (Navigation index)

**Last Updated**: 2024  
**Version**: 1.0


