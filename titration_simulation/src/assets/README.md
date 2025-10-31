# 3D Assets

This directory contains 3D models and assets for the titration simulator.

## Required Files

- `beaker_burette.glb` - Main 3D model containing beaker and burette
- `beaker_burette.opt.glb` - Optimized version (recommended)

## Generating Models

### Using Blender Script

1. Open Blender 3.x or 4.x
2. Go to Scripting workspace
3. Open `generate_beaker_burette_fixed.py` (in project root)
4. Run the script
5. Select "Titration_Export" collection
6. File → Export → glTF 2.0 (.glb)
7. Save as `beaker_burette.glb`

### Optimization (Optional)

Use gltf-transform to optimize the model:

```bash
# Install gltf-transform
npm install -g @gltf-transform/cli

# Optimize the model
gltf-transform quantize src/assets/beaker_burette.glb src/assets/beaker_burette.q.glb
gltf-transform prune src/assets/beaker_burette.q.glb src/assets/beaker_burette.opt.glb
```

## Model Structure

The GLB file should contain these named objects:

- `Beaker_Outer` - Glass beaker outer shell
- `Beaker_Inner` - Inner volume for liquid
- `Burette_Body` - Main burette cylinder
- `Burette_Spout` - Droplet spout
- `Burette_Stopcock` - Control valve
- `Liquid_Mesh` - Liquid surface mesh

## Fallback

If no GLB model is available, the app will use simple Three.js primitives as fallback geometry.
