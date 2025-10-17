// @ts-nocheck
import type { Document, Types } from "mongoose"

export interface BaseDocument extends Document {
  _id: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export interface DatabaseError {
  code: number
  message: string
  details?: any
}

export interface QueryOptions {
  page?: number
  limit?: number
  sort?: Record<string, 1 | -1>
  populate?: string | string[]
  filter?: Record<string, any>
}

export interface PaginationResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface DatabaseConfig {
  uri: string
  options?: {
    maxPoolSize?: number
    serverSelectionTimeoutMS?: number
    socketTimeoutMS?: number
    bufferMaxEntries?: number
  }
}

export type SortOrder = 1 | -1 | "asc" | "desc"

export interface AggregationPipeline {
  $match?: Record<string, any>
  $group?: Record<string, any>
  $sort?: Record<string, SortOrder>
  $limit?: number
  $skip?: number
  $project?: Record<string, any>
  $lookup?: Record<string, any>
  $unwind?: string | Record<string, any>
} 