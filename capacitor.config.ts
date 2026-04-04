// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.topclean.app",
  appName: "TOP CLEAN",
  webDir: "out",           // Next.js static export dir
  bundledWebRuntime: false,
  server: {
    // للتطوير: استخدم URL المحلي
    // url: "http://192.168.1.100:3000",
    // cleartext: true,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0a0f1e",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0f1e",
    },
    Keyboard: {
      resize: "body",
      style: "DARK",
      resizeOnFullScreen: true,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#00c6ff",
    },
  },
};

export default config;
