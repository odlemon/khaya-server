// @ts-nocheck
import mongoose from 'mongoose';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  
  private constructor() {}
  
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }
  
  public async connect(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI;
      
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not defined');
      }
      
      const serverSelectionTimeoutMS = parseInt(
        process.env.DB_SERVER_SELECTION_TIMEOUT || "10000",
        10
      );
      const maxPoolSize = parseInt(process.env.DB_MAX_POOL_SIZE || "10", 10);

      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS,
        socketTimeoutMS: 45000,
        maxPoolSize,
        heartbeatFrequencyMS: 10000,
        retryWrites: true,
      });
      
      console.log('✅ Connected to MongoDB successfully');
      
      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('📤 MongoDB disconnected');
      });
      
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      process.exit(1);
    }
  }
  
  public async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      console.log('📤 Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
    }
  }
  
  public getConnection() {
    return mongoose.connection;
  }
}

// Export a singleton instance
export const dbConnection = DatabaseConnection.getInstance();
