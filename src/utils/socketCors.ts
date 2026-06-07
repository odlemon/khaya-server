// @ts-nocheck

/** Production web portal — https://khayamanage.co.zw */
const PRODUCTION_PORTAL_ORIGINS = [
  "https://khayamanage.co.zw",
  "https://www.khayamanage.co.zw",
];

/** Local dev + Capacitor mobile shells */
const DEV_AND_MOBILE_ORIGINS = [
  "http://localhost:5173", // Vite portal local dev
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
  "capacitor://localhost",
  "ionic://localhost",
  "http://31.220.82.129:4002",
];

const ALLOWED_ORIGINS = [...PRODUCTION_PORTAL_ORIGINS, ...DEV_AND_MOBILE_ORIGINS];

/**
 * Origins allowed for Socket.IO handshake (CORS).
 * Hardcoded — no env vars required on the server.
 */
export function getSocketCorsOrigins(): string[] {
  return ALLOWED_ORIGINS;
}
