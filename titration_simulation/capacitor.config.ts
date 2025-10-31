import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.titration',
  appName: 'Titration Simulator',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
