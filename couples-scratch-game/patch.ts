// This patch suppresses harmless but annoying native warnings
// that pollute the Metro bundler terminal during development.

const originalWarn = console.warn;

console.warn = (...args) => {
  const msg = args[0];
  if (typeof msg === "string") {
    // Suppress known Expo Router missing native view warnings (bug in SDK 52)
    if (msg.includes("ExpoRouterToolbarModule")) return;
    // Suppress Expo AV deprecation warnings (if any remain)
    if (msg.includes("expo-av")) return;
  }
  originalWarn(...args);
};
