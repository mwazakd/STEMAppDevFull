# Files to Copy for Google AI Studio

## ✅ Essential Files to Copy

### 1. Source Code (MUST COPY)
```
components/
├── Chatbot.tsx
├── CommunityFeed.tsx
├── CommunityPost.tsx
├── Dashboard.tsx
├── Footer.tsx
├── Header.tsx
├── HomePage.tsx
├── Icons.tsx
├── Sidebar.tsx
├── SimulationsListPage.tsx
├── SimulationsView.tsx
└── simulations/
    ├── ProjectileMotionSimulator.tsx
    ├── TitrationSimulator.tsx
    ├── TitrationSimulatorWrapper.tsx
    └── titration/
        ├── BuretteClamp.tsx
        ├── IntegratedGlassmorphismBurette.tsx
        ├── IntegratedGlassmorphismConicalFlask.tsx
        └── components/ (if exists)

services/
└── geminiService.ts

App.tsx
index.tsx
index.html
index.css
constants.ts
types.ts
```

### 2. Configuration Files (MUST COPY)
```
package.json          # Dependencies and scripts
package-lock.json     # Locked dependency versions
tsconfig.json         # TypeScript configuration
vite.config.ts        # Vite build configuration
metadata.json         # Project metadata (if used)
```

### 3. Documentation (Optional but Recommended)
```
README.md
SIMULATIONS_STRUCTURE_DESIGN.md
TITRATION_STATE_PERSISTENCE_PLAN.md
```

## ❌ Files to EXCLUDE (Do NOT Copy)

### 1. Build Output
```
dist/                 # Generated build files
dist-ssr/             # SSR build files
*.local               # Local environment files
```

### 2. Dependencies
```
node_modules/         # Will be reinstalled with npm install
```

### 3. Logs and Temporary Files
```
*.log
npm-debug.log*
yarn-debug.log*
pnpm-debug.log*
```

### 4. Editor/IDE Files
```
.vscode/
.idea/
.DS_Store
*.suo
*.sw?
```

## 📦 Quick Copy Checklist

### Minimum Required Files (Core Only):
```
✅ App.tsx
✅ index.tsx
✅ index.html
✅ index.css
✅ constants.ts
✅ types.ts
✅ package.json
✅ package-lock.json
✅ tsconfig.json
✅ vite.config.ts
✅ components/ (entire folder)
✅ services/ (entire folder)
```

### Optional Files:
```
📄 README.md
📄 *.md (documentation files)
📄 metadata.json
```

## 🚀 After Copying - Setup Steps

1. **Navigate to the new location:**
   ```bash
   cd new_location
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

## 📋 File Structure for Google AI Studio

When copying to Google AI Studio, you can:

### Option 1: Copy Entire Project Structure
```
new_project/
├── components/
├── services/
├── App.tsx
├── index.tsx
├── index.html
├── index.css
├── constants.ts
├── types.ts
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.ts
```

### Option 2: Copy Only Source Files (for AI analysis)
If you just want to share code for AI analysis, you only need:
```
✅ All .tsx files
✅ All .ts files
✅ All .css files
✅ package.json (to show dependencies)
```

## 💡 Important Notes

1. **Never copy `node_modules/`** - It's huge and will be regenerated
2. **Never copy `dist/`** - Build output is generated
3. **Always copy `package-lock.json`** - Ensures exact dependency versions
4. **Copy configuration files** - Needed for the project to work
5. **Environment variables** - If you use `.env` files, copy those too (but be careful with secrets!)

## 🎯 For Google AI Studio Specifically

If you're uploading to Google AI Studio for AI assistance:
- **Focus on source code** (.tsx, .ts, .css files)
- Include `package.json` to show dependencies
- Include `tsconfig.json` for TypeScript context
- Documentation files (.md) can help AI understand the project
- You can exclude `node_modules` and `dist` as they're not needed for analysis

## 📝 Copy Command Examples

### Windows PowerShell:
```powershell
# Copy essential files only
Copy-Item -Path "components" -Destination "new_location\components" -Recurse
Copy-Item -Path "services" -Destination "new_location\services" -Recurse
Copy-Item -Path "App.tsx","index.tsx","index.html","index.css","constants.ts","types.ts","package.json","package-lock.json","tsconfig.json","vite.config.ts" -Destination "new_location"
```

### Or use a ZIP file:
1. Select all files except `node_modules` and `dist`
2. Create a ZIP archive
3. Upload to Google AI Studio

