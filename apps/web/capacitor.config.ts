import type { CapacitorConfig } from '@capacitor/cli';

// appId ist ein Platzhalter - vor der App-Store-Einreichung durch die
// tatsächliche Bundle-ID aus dem Apple-Developer-Konto/App-Store-Connect-
// Eintrag ersetzen (muss zum dort registrierten Konto passen).
const config: CapacitorConfig = {
  appId: 'com.ptone.app',
  appName: 'PT One',
  webDir: 'out',
};

export default config;
