// Development: the API runs on your computer. Android (emulator or USB phone)
// reaches it through `adb reverse tcp:3000 tcp:3000`, so localhost works everywhere.
const DEV_API_URL = 'http://localhost:3000';

// TODO(P1-T6): replace with the Railway production URL once it is deployed.
const PROD_API_URL = 'https://api.example.invalid';

export const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;
