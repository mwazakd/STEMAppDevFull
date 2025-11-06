# Admin Mode - Quick Start Guide

## 🚀 Fastest Way to Enable Admin Mode

### Option 1: URL Method (30 seconds)
1. Go to your simulation URL
2. Add `?admin=true` at the end
3. Press Enter
4. **Done!** Admin UI should appear

**Example:**
```
Before: http://localhost:3000/simulations/simple-pendulum
After:  http://localhost:3000/simulations/simple-pendulum?admin=true
```

---

### Option 2: Browser Console (1 minute)
1. Open simulation page
2. Press `F12` (Developer Tools)
3. Click **Console** tab
4. Type this and press Enter:
   ```javascript
   localStorage.setItem('admin_mode', 'true')
   ```
5. Refresh page (`F5`)
6. **Done!** Admin UI should appear

---

### Option 3: Environment File (2 minutes)
1. Create file `.env.local` in project root
2. Add this line:
   ```
   VITE_ADMIN_MODE=true
   ```
3. Restart dev server:
   ```bash
   npm run dev
   ```
4. **Done!** Admin mode enabled permanently

---

## ✅ How to Verify It's Working

After enabling admin mode, you should see:
- **Admin UI button/panel** in the simulation (when implemented)
- **"Save Camera Position"** button visible
- **Admin controls** accessible

**Quick Check:**
Open browser console and type:
```javascript
localStorage.getItem('admin_mode')
// Should return: "true"
```

---

## 🎯 Using Admin Features (Once Implemented)

1. **Position Camera:**
   - Drag to rotate
   - Scroll to zoom
   - Middle-click to pan

2. **Save Position:**
   - Click "Save Camera Position" button
   - Confirm save
   - Position is now default for all users!

3. **Test:**
   - Refresh page
   - Camera should start at saved position

---

## 🔄 Disable Admin Mode

**URL Method:**
- Remove `?admin=true` from URL

**LocalStorage Method:**
```javascript
localStorage.removeItem('admin_mode')
// Then refresh page
```

**Environment Method:**
- Remove or set to `false` in `.env.local`
- Restart server

---

## ⚠️ Important Notes

- **Development Only:** Current methods are for development/testing
- **Not Secure:** These methods are client-side only
- **Production:** Use proper authentication when deploying

---

## 📖 Full Documentation

See `ADMIN_CAMERA_POSITION_GUIDE.md` for complete details.

