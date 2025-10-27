// @ts-nocheck
import dotenv from "dotenv"

// Load environment variables
dotenv.config()

interface EnvConfig {
  PORT: number
  NODE_ENV: string
  MONGODB_URI: string
  JWT_SECRET?: string
  JWT_EXPIRES_IN?: string
  DEEP_SEEK?: string
  FRONTEND_URL?: string
  REDIS_URL?: string
  SOCKET_MAX_CONNECTIONS?: number
}

class EnvironmentConfig {
  private config: EnvConfig

  constructor() {
    this.config = this.loadConfig()
    this.validateConfig()
  }

  private loadConfig(): EnvConfig {
    return {
      PORT: Number.parseInt(process.env.PORT || "3000", 10),
      NODE_ENV: process.env.NODE_ENV || "development",
      MONGODB_URI: process.env.MONGODB_URI || "",
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
      DEEP_SEEK: process.env.DEEP_SEEK,
      FRONTEND_URL: process.env.FRONTEND_URL,
      REDIS_URL: process.env.REDIS_URL,
      SOCKET_MAX_CONNECTIONS: Number.parseInt(process.env.SOCKET_MAX_CONNECTIONS || "1000", 10),
    }
  }

  private validateConfig(): void {
    const requiredVars = ["MONGODB_URI"]

    for (const varName of requiredVars) {
      if (!this.config[varName as keyof EnvConfig]) {
        throw new Error(`Missing required environment variable: ${varName}`)
      }
    }
  }

  public get(key: keyof EnvConfig) {
    return this.config[key]
  }

  public getAll(): EnvConfig {
    return { ...this.config }
  }

  public isDevelopment(): boolean {
    return this.config.NODE_ENV === "development"
  }

  public isProduction(): boolean {
    return this.config.NODE_ENV === "production"
  }

  public isTest(): boolean {
    return this.config.NODE_ENV === "test"
  }
}

export const envConfig = new EnvironmentConfig()
export type { EnvConfig }
