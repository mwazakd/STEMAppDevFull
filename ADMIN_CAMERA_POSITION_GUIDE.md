# Admin Camera Position Settings Guide

## 🔐 How to Access Admin Mode

The system currently supports **3 methods** to enable admin privileges. Choose the method that best fits your use case:

---

## Method 1: Query Parameter (Easiest - Development/Testing)

### How to Use:
1. Open your browser and navigate to the simulation
2. Add `?admin=true` to the URL

### Example URLs:
```
http://localhost:3000/simulations/simple-pendulum?admin=true
https://yourdomain.com/simulations/simple-pendulum?admin=true
```

### Pros:
- ✅ **Easiest to use** - Just add to URL
- ✅ **No code changes needed**
- ✅ **Works immediately**
- ✅ **Good for quick testing**

### Cons:
- ❌ **Visible in URL** (not secure for production)
- ❌ **Lost on page refresh** (unless you bookmark)
- ❌ **Anyone can see the URL**

### Best For:
- **Development and testing**
- **Quick admin access during development**
- **Demonstrations**

---

## Method 2: LocalStorage Flag (Persistent - Development)

### How to Use:

**Option A: Browser Console**
1. Open the simulation page
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab
4. Type and press Enter:
   ```javascript
   localStorage.setItem('admin_mode', 'true')
   ```
5. Refresh the page

**Option B: Browser DevTools Application Tab**
1. Open Developer Tools (`F12`)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Expand **Local Storage**
4. Click on your domain
5. Add new entry:
   - **Key:** `admin_mode`
   - **Value:** `true`
6. Refresh the page

### To Disable:
```javascript
localStorage.removeItem('admin_mode')
// or
localStorage.setItem('admin_mode', 'false')
```

### Pros:
- ✅ **Persists across page refreshes**
- ✅ **No URL changes needed**
- ✅ **Works offline**
- ✅ **Good for development sessions**

### Cons:
- ❌ **Client-side only** (not secure)
- ❌ **Lost if browser data is cleared**
- ❌ **Anyone with browser access can enable it**

### Best For:
- **Extended development sessions**
- **Testing over multiple page loads**
- **Local development only**

---

## Method 3: Environment Variable (Production-Ready)

### How to Use:

**Step 1: Create/Edit `.env.local` file**
Create a file named `.env.local` in the project root (same level as `package.json`):

```env
VITE_ADMIN_MODE=true
```

**Step 2: Restart Development Server**
```bash
# Stop the current server (Ctrl+C)
npm run dev
```

**Step 3: For Production Build**
When building for production, the environment variable is baked into the build:

```bash
# Set environment variable and build
VITE_ADMIN_MODE=true npm run build
```

### For GitHub Pages Deployment:
Update `.github/workflows/deploy.yml` to include the environment variable:

```yaml
- name: Build
  run: npm run build
  env:
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
    VITE_ADMIN_MODE: ${{ secrets.VITE_ADMIN_MODE }}  # Add this line
```

Then add `VITE_ADMIN_MODE` as a GitHub Secret (set to `true` for admin builds).

### Pros:
- ✅ **Most secure** (baked into build)
- ✅ **Not visible to end users**
- ✅ **Production-ready**
- ✅ **Can't be easily changed by users**

### Cons:
- ❌ **Requires rebuild to change**
- ❌ **Requires code access**
- ❌ **More setup required**

### Best For:
- **Production deployments**
- **When you want admin mode permanently enabled**
- **Secure admin access**

---

## 🎯 Recommended Approach by Scenario

### Scenario 1: Quick Testing During Development
**Use:** Query Parameter (`?admin=true`)
- Fastest way to test admin features
- No setup required

### Scenario 2: Extended Development Session
**Use:** LocalStorage Flag
- Set once, works for entire session
- No need to add query param every time

### Scenario 3: Production Deployment
**Use:** Environment Variable
- Most secure
- Proper for production use

### Scenario 4: Multiple Developers
**Use:** Environment Variable in `.env.local`
- Each developer can have their own `.env.local`
- Add `.env.local` to `.gitignore` (already should be)
- Each dev controls their own admin access

---

## 🔍 How to Verify Admin Mode is Active

Once admin mode is enabled, you should see:

1. **Admin UI Component** (when implemented):
   - A button/panel in the simulation view
   - "Save Camera Position" button
   - Admin-only controls

2. **Browser Console Check:**
   ```javascript
   // In browser console
   localStorage.getItem('admin_mode')
   // Should return 'true' if using localStorage method
   ```

3. **Visual Indicator** (can be added):
   - Admin badge/indicator in UI
   - Different styling for admin users

---

## 📝 Step-by-Step: Using Admin Camera Position Feature

### Once Admin UI is Implemented:

1. **Enable Admin Mode** (choose one method above)

2. **Navigate to Simulation:**
   - Go to Simple Pendulum simulation
   - Admin UI should appear (top-right corner)

3. **Adjust Camera Position:**
   - Use mouse/touch to position camera as desired
   - Rotate, zoom, pan to get the perfect view

4. **Save Position:**
   - Click "Save Camera Position" button in admin UI
   - Confirm the save action
   - See success message

5. **Verify:**
   - Refresh page (or open in new tab)
   - Camera should start at the saved position
   - All users will see this default position

---

## 🔒 Security Considerations

### Current Implementation (Development):
- ⚠️ **Not secure for production** - All methods are client-side
- ⚠️ **Anyone can enable admin mode** if they know how
- ⚠️ **No authentication** - No user verification

### Future Improvements (Recommended):
1. **Backend Authentication:**
   - User login system
   - Role-based access control (RBAC)
   - Admin role verification

2. **API-Based Admin:**
   - Admin operations via authenticated API
   - Server-side validation
   - Audit logging

3. **Secure Admin Panel:**
   - Separate admin dashboard
   - Protected routes
   - Session management

---

## 🛠️ Troubleshooting

### Admin UI Not Showing?

1. **Check Admin Mode:**
   ```javascript
   // In browser console
   console.log(localStorage.getItem('admin_mode'))
   // Should be 'true'
   ```

2. **Check URL:**
   - If using query param, ensure `?admin=true` is in URL

3. **Check Environment Variable:**
   - Ensure `.env.local` has `VITE_ADMIN_MODE=true`
   - Restart dev server after adding

4. **Clear Cache:**
   ```javascript
   localStorage.clear()
   // Then re-enable admin mode
   ```

### Saved Position Not Loading?

1. **Check Config File:**
   - Verify `config/cameraPositions.json` exists
   - Check file format is valid JSON

2. **Check Browser Console:**
   - Look for error messages
   - Check network tab for failed requests

3. **Clear Cache:**
   ```javascript
   // Clear camera position cache
   localStorage.removeItem('camera_position_simple-pendulum')
   ```

---

## 📋 Quick Reference

### Enable Admin Mode:

**Query Parameter:**
```
?admin=true
```

**LocalStorage (Console):**
```javascript
localStorage.setItem('admin_mode', 'true')
```

**Environment Variable:**
```env
# .env.local
VITE_ADMIN_MODE=true
```

### Disable Admin Mode:

**Query Parameter:**
```
# Remove ?admin=true from URL
```

**LocalStorage:**
```javascript
localStorage.removeItem('admin_mode')
```

**Environment Variable:**
```env
# .env.local
VITE_ADMIN_MODE=false
# or remove the line
```

---

## 🚀 Future Enhancements

### Planned Improvements:
1. **Admin Dashboard:**
   - Centralized admin panel
   - Manage all simulations
   - View/edit all camera positions

2. **Position Management:**
   - Multiple saved positions per simulation
   - Position naming/descriptions
   - Position preview/thumbnails

3. **User Management:**
   - Admin user list
   - Permission management
   - Activity logging

4. **API Integration:**
   - Backend storage
   - Real-time updates
   - Version control

---

## 💡 Tips & Best Practices

1. **Development:**
   - Use query parameter for quick testing
   - Use localStorage for extended sessions

2. **Production:**
   - Use environment variables
   - Keep admin mode secret
   - Consider backend authentication

3. **Testing:**
   - Test with admin mode enabled
   - Test with admin mode disabled
   - Verify regular users see defaults

4. **Documentation:**
   - Document which method you're using
   - Keep admin access secure
   - Don't commit `.env.local` with admin enabled

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify admin mode is enabled
3. Check network tab for failed requests
4. Review this guide for troubleshooting steps

---

**Last Updated:** 2024
**Version:** 1.0

