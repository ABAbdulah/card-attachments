import { NativeModules, TurboModuleRegistry } from 'react-native';

/**
 * Development: the API runs on the same computer that serves the app's code
 * (Metro), on port 3000. Taking the host from the bundle URL makes one build
 * work everywhere:
 *  - emulator: 10.0.2.2
 *  - phone on USB: localhost (with `adb reverse tcp:3000 tcp:3000`)
 *  - phone on the same Wi-Fi: the computer's network address, e.g. 192.168.1.20
 */
function devApiUrl(): string {
  type SourceCode = {
    getConstants?: () => { scriptURL?: string };
    scriptURL?: string;
  };
  const sourceCode =
    (TurboModuleRegistry.get('SourceCode') as SourceCode | null) ??
    (NativeModules.SourceCode as SourceCode | undefined);
  const scriptURL =
    sourceCode?.getConstants?.().scriptURL ?? sourceCode?.scriptURL;
  const host = scriptURL?.match(/^https?:\/\/([^/:]+)/)?.[1];
  return `http://${host ?? 'localhost'}:3000`;
}

// TODO(P1-T6): replace with the Railway production URL once it is deployed.
const PROD_API_URL = 'https://api.example.invalid';

export const API_URL = __DEV__ ? devApiUrl() : PROD_API_URL;
