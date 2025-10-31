# Blender Script Troubleshooting Guide

## 🚨 "Nothing is happening" - Common Issues

### Issue 1: Script Not Running
**Symptoms:** Click "Run Script" but nothing appears in viewport

**Solutions:**
1. **Check the Console:**
   - Go to `Window > Toggle System Console` (Windows) or `Window > Toggle System Console` (Mac/Linux)
   - Look for error messages in red
   - If you see errors, note them down

2. **Verify Blender Version:**
   - Make sure you're using Blender 3.x or 4.x
   - Older versions may have API differences

3. **Check Script Location:**
   - Make sure you're in the Scripting workspace
   - The script should be in the text editor

### Issue 2: Objects Created But Not Visible
**Symptoms:** Console shows success but no objects in viewport

**Solutions:**
1. **Check Viewport Settings:**
   - Press `Numpad 0` to go to camera view
   - Press `Numpad 5` to toggle perspective/orthographic
   - Press `Numpad 1` for front view
   - Press `Numpad 7` for top view

2. **Zoom Out:**
   - Objects might be very small or very large
   - Press `Numpad .` (period) to frame all objects
   - Or use mouse wheel to zoom

3. **Check Object Location:**
   - Look in the Outliner (top-right panel)
   - Objects should appear in the list
   - Click on object names to select them

### Issue 3: Python Errors
**Symptoms:** Red error messages in console

**Common Errors & Fixes:**

#### Error: "bpy.ops.mesh.primitive_cylinder_add()"
**Fix:** This is usually a Blender version issue
```python
# Try this alternative:
bpy.ops.mesh.primitive_cylinder_add(
    vertices=16, 
    radius=1, 
    depth=2, 
    location=(0, 0, 0)
)
```

#### Error: "AttributeError: 'NoneType' object has no attribute"
**Fix:** Object creation failed
```python
# Add error checking:
result = bpy.ops.mesh.primitive_cylinder_add(location=(0, 0, 0))
if result == {'FINISHED'}:
    obj = bpy.context.active_object
    print(f"Created: {obj.name}")
else:
    print("Failed to create object")
```

## 🔧 Step-by-Step Debugging

### Step 1: Test Basic Functionality
1. **Open Blender**
2. **Go to Scripting workspace**
3. **Copy and paste this simple test:**

```python
import bpy

# Clear scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Create a cube
bpy.ops.mesh.primitive_cube_add(location=(0, 0, 0))
cube = bpy.context.active_object
cube.name = "Test_Cube"

print("Cube created successfully!")
print(f"Object name: {cube.name}")
print(f"Location: {cube.location}")
```

4. **Click "Run Script"**
5. **Check if you see a cube in the viewport**

### Step 2: Test Object Creation
If Step 1 works, try this:

```python
import bpy

# Create multiple objects
bpy.ops.mesh.primitive_cube_add(location=(0, 0, 0))
bpy.ops.mesh.primitive_cylinder_add(location=(2, 0, 0))
bpy.ops.mesh.primitive_sphere_add(location=(4, 0, 0))

print("Created 3 objects")
for obj in bpy.context.scene.objects:
    print(f"- {obj.name} at {obj.location}")
```

### Step 3: Test Materials
```python
import bpy

# Create object
bpy.ops.mesh.primitive_cube_add(location=(0, 0, 0))
obj = bpy.context.active_object

# Create material
mat = bpy.data.materials.new(name="Test_Material")
mat.use_nodes = True
obj.data.materials.append(mat)

print("Material created and assigned")
```

## 🎯 Quick Fixes

### Fix 1: Use the Simple Test Script
1. **Open `blender_simple_test.py`**
2. **Copy the entire content**
3. **Paste into Blender's text editor**
4. **Run the script**
5. **You should see test objects appear**

### Fix 2: Manual Object Creation
If scripts don't work, create objects manually:

1. **Add > Mesh > Cylinder** (for beaker)
2. **Add > Mesh > Cylinder** (for burette)
3. **Scale and position as needed**
4. **Rename objects:**
   - Select object
   - Press `F2` or double-click name in Outliner
   - Rename to "Beaker_Outer", "Burette_Body", etc.

### Fix 3: Check Blender Settings
1. **Go to Edit > Preferences > Add-ons**
2. **Make sure "Import-Export: glTF 2.0 format" is enabled**
3. **Restart Blender**

## 📋 Complete Working Script

If the original script doesn't work, try this simplified version:

```python
import bpy
import math

def create_simple_models():
    """Create simple beaker and burette models"""
    
    # Clear scene
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    
    # Create beaker (outer)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=16, 
        radius=0.5, 
        depth=1.0, 
        location=(0, 0.5, 0)
    )
    beaker = bpy.context.active_object
    beaker.name = "Beaker_Outer"
    
    # Create beaker (inner)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=16, 
        radius=0.48, 
        depth=0.98, 
        location=(0, 0.51, 0)
    )
    inner = bpy.context.active_object
    inner.name = "Beaker_Inner"
    
    # Create burette
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=12, 
        radius=0.1, 
        depth=2.0, 
        location=(-2, 1, 0)
    )
    burette = bpy.context.active_object
    burette.name = "Burette_Body"
    
    # Create spout
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8, 
        radius=0.02, 
        depth=0.3, 
        location=(-2, 0.2, 0.2)
    )
    spout = bpy.context.active_object
    spout.name = "Burette_Spout"
    spout.rotation_euler = (math.radians(45), 0, 0)
    
    # Create liquid
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=16, 
        radius=0.47, 
        depth=0.02, 
        location=(0, 0.1, 0)
    )
    liquid = bpy.context.active_object
    liquid.name = "Liquid_Mesh"
    
    print("✅ Simple models created!")
    print("Objects created:")
    for obj in bpy.context.scene.objects:
        print(f"  - {obj.name}")

# Run the function
create_simple_models()
```

## 🚀 Export Instructions

Once objects are created:

1. **Select all objects** (A key)
2. **File > Export > glTF 2.0 (.glb)**
3. **Choose location:** `titration-app/src/assets/`
4. **Name:** `beaker_burette.glb`
5. **Click Export**

## 📞 Still Having Issues?

If nothing works:

1. **Check Blender version** (3.x or 4.x recommended)
2. **Try the simple test script first**
3. **Check console for error messages**
4. **Make sure you're in the right workspace**
5. **Try creating objects manually as fallback**

The app will work with fallback Three.js primitives even without custom models!
