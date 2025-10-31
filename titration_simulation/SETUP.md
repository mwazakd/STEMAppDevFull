# Titration Simulator - Complete Setup Guide

This guide will walk you through setting up the complete titration simulator application.

## Prerequisites

- **Node.js 18+** and npm
- **Blender 3.x or 4.x** (for 3D model generation)
- **Android Studio** (for Android builds)
- **Git** (for version control)

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
cd titration-app
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### 3. Generate 3D Models (Optional)

If you want custom 3D models instead of fallback primitives:

1. **Open Blender 3.x or 4.x**
2. **Go to Scripting workspace**
3. **Open `generate_beaker_burette_fixed.py`**
4. **Run the script** (Play button)
5. **Export the "Titration_Export" collection as GLB**
6. **Save as `src/assets/beaker_burette.glb`**

### 4. Optimize Models (Optional)

```bash
npm run optimize-models
```

## Complete Setup

### Step 1: Project Structure

The project is already set up with the following structure:

```
titration-app/
├── src/
│   ├── components/          # React UI components
│   ├── lib/
│   │   ├── chemistry/       # Chemistry calculations
│   │   ├── three/          # 3D scene management
│   │   └── storage/        # Data persistence
│   └── assets/             # 3D models and resources
├── public/                 # Static assets
├── scripts/                # Build and setup scripts
└── generate_beaker_burette_fixed.py  # Blender model generator
```

### Step 2: Development Environment

1. **Install all dependencies:**
```bash
npm install
```

2. **Start development server:**
```bash
npm run dev
```

3. **Open browser to `http://localhost:3000`**

### Step 3: 3D Model Generation

#### Option A: Use Blender Script (Recommended)

1. **Open Blender 3.x or 4.x**
2. **Go to Scripting workspace**
3. **Open `generate_beaker_burette_fixed.py`**
4. **Run the script** (Play button)
5. **Select "Titration_Export" collection**
6. **File → Export → glTF 2.0 (.glb)**
7. **Save as `src/assets/beaker_burette.glb`**

#### Option B: Use Fallback Models

The app will automatically use Three.js primitives if no GLB model is found.

### Step 4: Model Optimization

```bash
# Install optimization tools
npm install -g @gltf-transform/cli

# Optimize the model
npm run optimize-models
```

### Step 5: Android Setup

#### Prerequisites for Android

1. **Install Android Studio**
2. **Install Android SDK**
3. **Set up Android emulator or connect device**

#### Setup Capacitor

```bash
# Initialize Capacitor
npm run setup-capacitor

# Or manually:
npx cap init titration-app com.example.titration
npx cap add android
```

#### Build for Android

```bash
# Build and open in Android Studio
npm run android

# Or build and run directly
npm run android-run
```

### Step 6: Testing

#### Web Testing

1. **Start dev server:** `npm run dev`
2. **Open browser:** `http://localhost:3000`
3. **Test features:**
   - Click "Start Titration"
   - Click screen to add droplets
   - Watch pH changes and color transitions
   - View real-time graph
   - Save experiment

#### Mobile Testing

1. **Build for mobile:** `npm run build`
2. **Test on device:** `npm run android-run`
3. **Test touch controls and responsiveness**

## Troubleshooting

### Common Issues

#### 1. 3D Models Not Loading

**Problem:** Black screen or missing 3D objects

**Solutions:**
- Check browser console for errors
- Ensure GLB file is in `src/assets/`
- Verify model has correct node names
- Use fallback primitives if needed

#### 2. Blender Script Errors

**Problem:** Script fails in Blender 4.x

**Solutions:**
- Use the fixed version: `generate_beaker_burette_fixed.py`
- Ensure Blender 3.x or 4.x
- Check Python API compatibility
- Run script step by step

#### 3. Performance Issues

**Problem:** Slow rendering or lag

**Solutions:**
- Reduce droplet spawn rate
- Lower Three.js quality settings
- Use optimized GLB models
- Disable shadows on mobile

#### 4. Capacitor Build Errors

**Problem:** Android build fails

**Solutions:**
- Update Capacitor: `npm install @capacitor/cli@latest`
- Clean project: `npx cap clean android`
- Check Android SDK installation
- Verify Java version compatibility

### Browser Compatibility

- **Chrome/Edge:** Full support
- **Firefox:** Full support  
- **Safari:** Full support (iOS 14+)
- **Mobile Browsers:** Optimized for touch

### Performance Optimization

#### For Desktop
- Use high-quality models
- Enable all visual effects
- Full resolution rendering

#### For Mobile
- Use optimized models
- Reduce particle effects
- Lower shadow quality
- Touch-optimized controls

## Advanced Configuration

### Custom Chemistry Reactions

Edit `src/lib/chemistry/engine.ts` to add new reactions:

```typescript
// Add new species
export type Species = 'HCl' | 'NaOH' | 'Acetic' | 'NH3' | 'YourSpecies'

// Add new calculations
computePH(): number {
  // Your custom pH calculations
}
```

### Custom 3D Models

1. **Create models in Blender**
2. **Export as GLB with correct naming**
3. **Place in `src/assets/`**
4. **Update scene loader in `src/lib/three/scene.ts`**

### Custom UI Themes

Edit `src/index.css` for custom styling:

```css
/* Custom color scheme */
:root {
  --primary-color: #your-color;
  --secondary-color: #your-color;
}
```

## Deployment

### Web Deployment

1. **Build production version:**
```bash
npm run build
```

2. **Deploy `dist/` folder to your hosting service**

### Android Deployment

1. **Build APK:**
```bash
npm run android
```

2. **Sign and publish through Google Play Console**

### iOS Deployment (Future)

Capacitor supports iOS - add iOS platform when needed:

```bash
npx cap add ios
npx cap open ios
```

## Educational Use

### Classroom Setup

1. **Install on classroom computers**
2. **Provide tutorial to students**
3. **Use for pre-lab preparation**
4. **Export data for analysis**

### Assessment

1. **Students save experiments**
2. **Export CSV data**
3. **Analyze titration curves**
4. **Grade based on accuracy**

## Support

### Getting Help

1. **Check this guide first**
2. **Review browser console for errors**
3. **Test with fallback models**
4. **Contact support if needed**

### Contributing

1. **Fork the repository**
2. **Create feature branch**
3. **Make your changes**
4. **Submit pull request**

## Next Steps

### Immediate
- [ ] Test the application
- [ ] Generate 3D models
- [ ] Optimize for your use case

### Future Enhancements
- [ ] Add more chemistry reactions
- [ ] Create teacher dashboard
- [ ] Add multi-language support
- [ ] Implement advanced analytics

---

**🎓 Ready to start your titration simulation!**

For questions or support, check the main README.md or create an issue.
