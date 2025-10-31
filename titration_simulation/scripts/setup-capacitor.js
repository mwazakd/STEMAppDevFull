#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Capacitor for Android...');

try {
  // Check if Capacitor is already initialized
  if (!fs.existsSync('capacitor.config.ts')) {
    console.log('📱 Initializing Capacitor...');
    execSync('npx cap init titration-app com.example.titration', { stdio: 'inherit' });
  }

  // Add Android platform
  console.log('🤖 Adding Android platform...');
  execSync('npx cap add android', { stdio: 'inherit' });

  // Build the web app
  console.log('🏗️ Building web app...');
  execSync('npm run build', { stdio: 'inherit' });

  // Copy web assets to native projects
  console.log('📋 Copying assets to native projects...');
  execSync('npx cap copy', { stdio: 'inherit' });

  console.log('✅ Capacitor setup complete!');
  console.log('\n📱 Next steps:');
  console.log('1. Open Android Studio: npx cap open android');
  console.log('2. Build and run on device/emulator');
  console.log('3. Or use: npx cap run android');

} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}
