// Default local server: http://localhost:4001
// Can be overridden at build time with: --dart-define=API_URL=https://test-we-play-server.fqjdvf.easypanel.host
const String kApiBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://localhost:4001',
);

const String kApiUrl = '$kApiBaseUrl/api';

// Firebase config is loaded via google-services.json / GoogleService-Info.plist
// For demo mode (no Firebase), set this to true
const bool kDemoMode = false;
