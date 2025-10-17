// @ts-nocheck
export class HttpError extends Error {
    status: number
    message: string
    code?: string
    details?: any
  
    constructor(status: number, message: string, code?: string, details?: any) {
      super(message)
      this.status = status
      this.message = message
      this.code = code
      this.details = details
      this.name = "HttpError"
    }
  }
  
  export class ValidationError extends HttpError {
    constructor(message: string, details?: any) {
      super(400, message, "VALIDATION_ERROR", details)
      this.name = "ValidationError"
    }
  }
  
  export class AuthenticationError extends HttpError {
    constructor(message = "Authentication failed") {
      super(401, message, "AUTHENTICATION_ERROR")
      this.name = "AuthenticationError"
    }
  }
  
  export class AuthorizationError extends HttpError {
    constructor(message = "Access denied") {
      super(403, message, "AUTHORIZATION_ERROR")
      this.name = "AuthorizationError"
    }
  }
  
  export class NotFoundError extends HttpError {
    constructor(resource = "Resource") {
      super(404, `${resource} not found`, "NOT_FOUND_ERROR")
      this.name = "NotFoundError"
    }
  }
  
  export class ConflictError extends HttpError {
    constructor(message: string) {
      super(409, message, "CONFLICT_ERROR")
      this.name = "ConflictError"
    }
  }
  
  export class DatabaseError extends HttpError {
    constructor(message: string, details?: any) {
      super(500, message, "DATABASE_ERROR", details)
      this.name = "DatabaseError"
    }
  }
  
  export class ExternalServiceError extends HttpError {
    constructor(service: string, message: string) {
      super(502, `${service}: ${message}`, "EXTERNAL_SERVICE_ERROR")
      this.name = "ExternalServiceError"
    }
  }
  
  export interface ErrorResponse {
    success: false
    error: {
      code: string
      message: string
      details?: any
      timestamp: string
      path: string
    }
  }
  
  export enum ErrorCode {
    VALIDATION_ERROR = "VALIDATION_ERROR",
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
    NOT_FOUND_ERROR = "NOT_FOUND_ERROR",
    CONFLICT_ERROR = "CONFLICT_ERROR",
    DATABASE_ERROR = "DATABASE_ERROR",
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
    RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",
    FILE_UPLOAD_ERROR = "FILE_UPLOAD_ERROR",
    PAYMENT_ERROR = "PAYMENT_ERROR",
  } 