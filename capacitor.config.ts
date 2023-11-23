import { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize, KeyboardStyle } from "@capacitor/keyboard";

const config: CapacitorConfig = {
  appId: "apps.phantom",
  appName: "phantom-mobile",
  webDir: "out",
  android: {
    allowMixedContent: true,
  },
  server: {
    // hostname: `phantomlive.space`, // We need to change hostname to subdomain of our domain the API is hosted on
    // androidScheme: "https", // HTTPS should be set preferably
    url: "https://phantomlive.space",
    cleartext: true,
  },
  includePlugins: [
    "@capacitor/push-notifications",
    "@capacitor/local-notifications",
    "@capacitor/app",
    "@capacitor/keyboard",
    "@capacitor/clipboard",
    "capacitor-plugin-filedownload",
  ],
  plugins: {
    PushNotifications: { presentationOptions: [] },
    LocalNotifications: {
      smallIcon: "logo",
      iconColor: "#9b34eb",
      sound: "local.mp3",
    },
    Keyboard: {
      // resize: KeyboardResize.Body,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
