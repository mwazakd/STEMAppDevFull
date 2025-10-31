# Instructions for Copying the Titration App

## Files and Folders to COPY:

### 1. Source Code (Essential)
- ✅ `src/` - **ENTIRE folder** (all your React components and code)
- ✅ `public/` - **ENTIRE folder** (static assets)

### 2. Configuration Files (Essential)
- ✅ `package.json` - Dependencies and scripts
- ✅ `package-lock.json` - Locked dependency versions
- ✅ `vite.config.ts` - Vite configuration
- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `tsconfig.node.json` - Node TypeScript configuration
- ✅ `tailwind.config.js` - Tailwind CSS configuration
- ✅ `postcss.config.js` - PostCSS configuration
- ✅ `index.html` - Main HTML file
- ✅ `capacitor.config.ts` - Capacitor configuration (if using mobile)

### 3. Documentation (Optional but recommended)
- ✅ `README.md`
- ✅ `SETUP.md`
- ✅ `INTEGRATION.md`
- ✅ `BLENDER_TROUBLESHOOTING.md`
- ✅ `BLENDER_CAMERA_CONTROLS_ANALYSIS.md`

### 4. Scripts (Optional but recommended)
- ✅ `scripts/` - **ENTIRE folder** (build and setup scripts)

## Files and Folders to EXCLUDE (DO NOT COPY):

### 1. Build Output
- ❌ `dist/` - This will be regenerated when you build

### 2. Dependencies
- ❌ `node_modules/` - This will be reinstalled

### 3. Git (if you want a fresh git history)
- ❌ `.git/` - Optional: exclude if you want a fresh repository

## Quick Copy Commands:

### Option 1: Copy Everything Except node_modules and dist

**Windows (Command Prompt):**
```bash
xcopy /E /I /EXCLUDE:exclude.txt source_folder destination_folder
```

**Windows (PowerShell):**
```powershell
# Create exclude list
@("node_modules", "dist", ".git") | Out-File exclude.txt

# Copy with exclusions
robocopy source_folder destination_folder /E /XD node_modules dist .git
```

**Mac/Linux:**
```bash
rsync -av --exclude='node_modules' --exclude='dist' --exclude='.git' source_folder/ destination_folder/
```

### Option 2: Manual Copy (Recommended)

1. Create a new folder for your copy
2. Copy these folders:
   - `src/`
   - `public/`
   - `scripts/` (if exists)
3. Copy these files:
   - `package.json`
   - `package-lock.json`
   - `vite.config.ts`
   - `tsconfig.json`
   - `tsconfig.node.json`
   - `tailwind.config.js`
   - `postcss.config.js`
   - `index.html`
   - `capacitor.config.ts` (if exists)
   - `README.md` and other `.md` files (optional)

## After Copying - Setup Steps:

1. **Navigate to the new folder:**
   ```bash
   cd new_folder_name
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Verify everything works:**
   - Open the app in browser
   - Test all features
   - Check console for errors

## Minimum Required Files (Core Only):

If you want just the essentials:

```
new_folder/
├── src/
├── public/
├── package.json
├── package-lock.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.js
├── postcss.config.js
└── index.html
```

## Notes:

- **node_modules** should NEVER be copied - always reinstall with `npm install`
- **dist** folder is generated - don't copy it
- If you have custom assets in `src/assets/`, make sure those are copied
- Environment variables (`.env` files) should be copied if you use them
- Git history (`.git`) is optional - copy it only if you want to preserve version history

