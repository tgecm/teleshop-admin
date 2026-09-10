import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.crossmartmm.shop',
  appName: 'CrossMart',
  webDir: 'dist',
  server: {
    url: 'https://www.telegramecommerce.shop/dashboard',
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: ['*'],
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
