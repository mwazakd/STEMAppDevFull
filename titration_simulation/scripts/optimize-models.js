#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎨 Optimizing 3D models...');

const assetsDir = path.join(__dirname, '../src/assets');
const modelPath = path.join(assetsDir, 'beaker_burette.glb');
const optimizedPath = path.join(assetsDir, 'beaker_burette.opt.glb');

try {
  // Check if model exists
  if (!fs.existsSync(modelPath)) {
    console.log('⚠️  No GLB model found. Please generate one using the Blender script first.');
    console.log('📋 Instructions:');
    console.log('1. Open Blender 3.x or 4.x');
    console.log('2. Go to Scripting workspace');
    console.log('3. Open generate_beaker_burette_fixed.py');
    console.log('4. Run the script');
    console.log('5. Export as beaker_burette.glb to src/assets/');
    return;
  }

  // Check if gltf-transform is available
  try {
    execSync('gltf-transform --version', { stdio: 'pipe' });
  } catch (error) {
    console.log('📦 Installing gltf-transform...');
    execSync('npm install -g @gltf-transform/cli', { stdio: 'inherit' });
  }

  // Optimize the model
  console.log('🔧 Optimizing model...');
  execSync(`gltf-transform quantize ${modelPath} ${optimizedPath}`, { stdio: 'inherit' });
  
  console.log('✅ Model optimization complete!');
  console.log(`📁 Optimized model saved to: ${optimizedPath}`);

  // Show file sizes
  const originalSize = fs.statSync(modelPath).size;
  const optimizedSize = fs.statSync(optimizedPath).size;
  const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);

  console.log(`📊 File sizes:`);
  console.log(`   Original: ${(originalSize / 1024).toFixed(1)} KB`);
  console.log(`   Optimized: ${(optimizedSize / 1024).toFixed(1)} KB`);
  console.log(`   Reduction: ${reduction}%`);

} catch (error) {
  console.error('❌ Optimization failed:', error.message);
  console.log('\n💡 Alternative: Use the model as-is or manually optimize in Blender');
}
