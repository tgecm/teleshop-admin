import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.teleshop.admin',
  appName: 'TeleshopAdmin',
  webDir: 'dist',
  server: {
    url: 'https://telegramecommerce.shop/dashboard',
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
