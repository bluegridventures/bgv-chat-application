import { getEnv } from "../utils/get-env";

export const Env = {
  NODE_ENV: getEnv("NODE_ENV", "development"),
  PORT: getEnv("PORT", "8000"),
  DATABASE_URL: getEnv("DATABASE_URL"),
  JWT_SECRET: getEnv("JWT_SECRET", "secret_jwt"),
  JWT_EXPIRES_IN: getEnv("JWT_EXPIRES_IN", "15m"),
  FRONTEND_ORIGIN: getEnv("FRONTEND_ORIGIN", "http://localhost:5173").trim().replace(/\/+$/, ""),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: getEnv("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: getEnv("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: getEnv("CLOUDINARY_API_SECRET"),

  // LiveKit (self-host or cloud)
  LIVEKIT_URL: getEnv("LIVEKIT_URL"),
  LIVEKIT_API_KEY: getEnv("LIVEKIT_API_KEY"),
  LIVEKIT_API_SECRET: getEnv("LIVEKIT_API_SECRET"),

  // Twilio Network Traversal (TURN)
  TWILIO_ACCOUNT_SID: getEnv("TWILIO_ACCOUNT_SID"),
  TWILIO_AUTH_TOKEN: getEnv("TWILIO_AUTH_TOKEN"),
  TWILIO_API_KEY_SID: getEnv("TWILIO_API_KEY_SID"),
  TWILIO_API_KEY_SECRET: getEnv("TWILIO_API_KEY_SECRET"),
} as const;
