# 🧪 Advanced 3D Titration Simulator

A professional-grade, cross-platform titration simulator built with React, Three.js, and TypeScript. Features realistic 3D laboratory environment, interactive chemistry simulations, and real-time data visualization.

![Titration Simulator](https://img.shields.io/badge/React-18.2.0-blue) ![Three.js](https://img.shields.io/badge/Three.js-0.160.0-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-blue) ![Vite](https://img.shields.io/badge/Vite-5.0.8-purple)

## ✨ Features

### 🎮 **Interactive 3D Laboratory**
- **Professional laboratory environment** with realistic materials
- **Auto-rotating camera** with manual control
- **Animated equipment** (burette vibration, beaker wobble)
- **Continuous stream animation** for titrant flow
- **Interactive stirring rod** with circular motion
- **Stopcock rotation** when dispensing

### 🧪 **Advanced Chemistry Engine**
- **Real-time pH calculations** for acid-base titrations
- **Color-changing liquid indicators** based on pH
- **Volume tracking** in both beaker and burette
- **Equivalence point calculation**
- **Data collection** for titration curve analysis

### 📊 **Professional UI & Analytics**
- **Live titration curve plotting** with Recharts
- **Glassmorphism design** with backdrop blur effects
- **Real-time pH monitoring** and volume tracking
- **Tutorial overlay** with interactive guide
- **Responsive layout** for all screen sizes

### 📱 **Cross-Platform Deployment**
- **Web-first implementation** with React + Vite
- **Android deployment** with Capacitor
- **Mobile-optimized** touch controls
- **Progressive Web App** capabilities

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/advanced-3d-titration-simulator.git
cd advanced-3d-titration-simulator

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the simulator.

## 🎯 Usage

### **Basic Operation**
1. **Configure your experiment** in the left panel
2. **Click Start** to begin titration
3. **Watch the continuous stream** flow from burette
4. **Monitor pH changes** and color transitions
5. **View the titration curve** in real-time

### **Controls**
- **🖱️ Drag** to rotate camera around the scene
- **🖱️ Scroll** to zoom in/out
- **🔄 Auto-rotate** for hands-free viewing
- **▶️ Start/Pause** titration flow
- **🌀 Stir** for magnetic stirrer
- **🔄 Reset** to clear experiment data

## 🛠️ Development

### **Project Structure**
```
src/
├── components/           # React components
│   ├── SceneCanvas.tsx   # 3D scene renderer
│   ├── BuretteControls.tsx
│   ├── BeakerUI.tsx
│   └── Graph.tsx
├── lib/
│   ├── chemistry/        # Chemistry engine
│   ├── three/           # Three.js scene management
│   └── storage/           # Data persistence
├── titration-3d-sim-simple.tsx  # Advanced 3D simulator
└── App.tsx              # Main application
```

### **Key Technologies**
- **React 18** - UI framework
- **Three.js** - 3D graphics
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Capacitor** - Mobile deployment

### **Available Scripts**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run android      # Build for Android
npm run android-run  # Run on Android device
```

## 🎨 Customization

### **Visual Customization**
- Modify lab bench colors in `src/lib/three/scene.ts`
- Adjust lighting intensity and shadows
- Customize UI colors in `tailwind.config.js`
- Add new materials and textures

### **Chemistry Customization**
- Add new acid/base types in `src/lib/chemistry/engine.ts`
- Implement weak acid calculations
- Customize indicator colors
- Add buffer solutions

### **Animation Customization**
- Adjust droplet/stream speed
- Modify stirring animation
- Change camera movement
- Add particle effects

## 📱 Mobile Deployment

### **Android Setup**
```bash
# Install Capacitor
npm run setup-capacitor

# Build and deploy
npm run android
```

### **Requirements**
- Android Studio
- Android SDK
- Java Development Kit (JDK)

## 🎓 Educational Features

### **Learning Objectives**
- Understand acid-base titration principles
- Visualize pH changes during titration
- Learn about equivalence points
- Practice laboratory techniques

### **Interactive Elements**
- **Real-time feedback** on pH changes
- **Visual indicators** for chemical reactions
- **Data collection** and analysis
- **Tutorial system** for guided learning

## 📚 Documentation

- **[Setup Guide](SETUP.md)** - Detailed installation instructions
- **[Integration Guide](INTEGRATION.md)** - Advanced features
- **[Blender Guide](BLENDER_TROUBLESHOOTING.md)** - 3D model creation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Three.js** community for excellent 3D graphics library
- **React** team for the amazing UI framework
- **Tailwind CSS** for beautiful styling utilities
- **Recharts** for data visualization
- **Capacitor** for cross-platform deployment

## 📞 Support

If you have any questions or need help:

1. Check the [documentation](SETUP.md)
2. Search [existing issues](https://github.com/yourusername/advanced-3d-titration-simulator/issues)
3. Create a [new issue](https://github.com/yourusername/advanced-3d-titration-simulator/issues/new)

---

**🎓 Perfect for STEM education and chemistry learning!** 🧪✨