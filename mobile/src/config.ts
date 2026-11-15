import { Platform } from 'react-native';

// The Android emulator reaches the host machine on 10.0.2.2, not localhost.
const DEV_API_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

// TODO(P1-T6): replace with the Railway production URL once it is deployed.
const PROD_API_URL = 'https://api.example.invalid';

export const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;
