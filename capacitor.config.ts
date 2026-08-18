import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.crossmartmm.shop',
  appName: 'CrossMart',
  webDir: 'dist',
  server: {
    url: 'https://telegramecommerce.shop',
    cleartext: true,
    allowNavigation: ['*']
  },
};

export default config;
