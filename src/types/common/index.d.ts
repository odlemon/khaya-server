// @ts-nocheck
export interface ApiResponse<T = any> {
    success: boolean
    data?: T
    message?: string
    errors?: ValidationError[]
    meta?: ResponseMeta
  }
  
  export interface ResponseMeta {
    pagination?: PaginationMeta
    timestamp: string
    version: string
  }
  
  export interface PaginationMeta {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  
  export interface PaginationQuery {
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: SortOrder
    search?: string
    filters?: Record<string, any>
  }
  
  export interface ValidationError {
    field: string
    message: string
    code: string
  }
  
  export interface FileUpload {
    id: string
    filename: string
    originalName: string
    mimetype: string
    size: number
    url: string
    uploadedAt: Date
  }
  
  export interface SearchQuery {
    query: string
    filters?: SearchFilters
    pagination?: PaginationQuery
  }
  
  export interface SearchFilters {
    language?: string
    difficulty?: string
    category?: string
    tags?: string[]
    dateRange?: DateRange
  }
  
  export interface DateRange {
    start: Date
    end: Date
  }
  
  export interface NotificationData {
    id: string
    type: NotificationType
    title: string
    message: string
    data?: Record<string, any>
    read: boolean
    createdAt: Date
  }
  
  export enum SortOrder {
    ASC = "ASC",
    DESC = "DESC",
  }
  
  export enum NotificationType {
    ACHIEVEMENT = "ACHIEVEMENT",
    REMINDER = "REMINDER",
    STREAK = "STREAK",
    LESSON_COMPLETE = "LESSON_COMPLETE",
    FRIEND_REQUEST = "FRIEND_REQUEST",
    SYSTEM = "SYSTEM",
  } 