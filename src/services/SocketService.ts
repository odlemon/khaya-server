import { Server as SocketIOServer, Socket } from "socket.io"
import jwt from "jsonwebtoken"
import { User } from "../models/User"
import { logger } from "../utils/logger"

interface AuthenticatedSocket extends Socket {
  userId?: string
  userRole?: string
}

interface OnlineUser {
  userId: string
  socketId: string
  lastSeen: Date
}

class SocketService {
  private io: SocketIOServer
  private onlineUsers: Map<string, OnlineUser> = new Map()
  private userSockets: Map<string, Set<string>> = new Map() // userId -> Set of socketIds

  constructor(io: SocketIOServer) {
    this.io = io
    this.setupMiddleware()
    this.setupEventHandlers()
  }

  private setupMiddleware() {
    // Authentication middleware for Socket.IO
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'))
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
        const user = await User.findById(decoded.userId).select('_id role firstName lastName email')
        
        if (!user) {
          return next(new Error('Authentication error: User not found'))
        }

        socket.userId = user._id.toString()
        socket.userRole = user.role
        
        next()
      } catch (error) {
        logger.error('Socket authentication error:', error)
        next(new Error('Authentication error: Invalid token'))
      }
    })
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const userId = socket.userId!
      const socketId = socket.id

      logger.info(`User ${userId} connected with socket ${socketId}`)

      // Add user to online users
      this.addOnlineUser(userId, socketId)

      // Join user to their personal room
      socket.join(`user:${userId}`)

      // Handle joining chat rooms
      socket.on('join_chat', (chatId: string) => {
        socket.join(`chat:${chatId}`)
        logger.info(`User ${userId} joined chat ${chatId}`)
      })

      // Handle leaving chat rooms
      socket.on('leave_chat', (chatId: string) => {
        socket.leave(`chat:${chatId}`)
        logger.info(`User ${userId} left chat ${chatId}`)
      })

      // Handle typing indicators
      socket.on('typing_start', (data: { chatId: string }) => {
        logger.info(`📥 [SOCKET RECEIVE] typing_start from user ${userId} in chat ${data.chatId}`);
        
        socket.to(`chat:${data.chatId}`).emit('user_typing', {
          userId,
          chatId: data.chatId,
          isTyping: true
        });
        
        logger.info(`📤 [SOCKET BROADCAST] Typing indicator sent to chat:${data.chatId}`);
      })

      socket.on('typing_stop', (data: { chatId: string }) => {
        logger.info(`📥 [SOCKET RECEIVE] typing_stop from user ${userId} in chat ${data.chatId}`);
        
        socket.to(`chat:${data.chatId}`).emit('user_typing', {
          userId,
          chatId: data.chatId,
          isTyping: false
        });
        
        logger.info(`📤 [SOCKET BROADCAST] Stop typing sent to chat:${data.chatId}`);
      })

      // Handle message read receipts
      socket.on('mark_messages_read', (data: { chatId: string, messageIds: string[] }) => {
        logger.info(`📥 [SOCKET RECEIVE] mark_messages_read from user ${userId}`);
        logger.info(`   Chat: ${data.chatId}`);
        logger.info(`   Messages: ${data.messageIds.join(', ')}`);
        
        socket.to(`chat:${data.chatId}`).emit('messages_read', {
          userId,
          chatId: data.chatId,
          messageIds: data.messageIds,
          readAt: new Date()
        });
        
        logger.info(`📤 [SOCKET BROADCAST] Read receipt sent to chat:${data.chatId}`);
      })

      // Handle disconnect
      socket.on('disconnect', () => {
        this.removeOnlineUser(userId, socketId)
        logger.info(`User ${userId} disconnected (socket ${socketId})`)
      })
    })
  }

  private addOnlineUser(userId: string, socketId: string) {
    const onlineUser: OnlineUser = {
      userId,
      socketId,
      lastSeen: new Date()
    }
    
    this.onlineUsers.set(socketId, onlineUser)
    
    // Track user's sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set())
    }
    this.userSockets.get(userId)!.add(socketId)

    // Notify others that user is online
    logger.info(`📤 [SOCKET BROADCAST] user_online event for user ${userId}`);
    this.io.emit('user_online', { userId });
  }

  private removeOnlineUser(userId: string, socketId: string) {
    this.onlineUsers.delete(socketId)
    
    const userSocketSet = this.userSockets.get(userId)
    if (userSocketSet) {
      userSocketSet.delete(socketId)
      
      // If user has no more sockets, they're offline
      if (userSocketSet.size === 0) {
        this.userSockets.delete(userId)
        logger.info(`📤 [SOCKET BROADCAST] user_offline event for user ${userId}`);
        this.io.emit('user_offline', { userId });
      }
    }
  }

  // Public methods for use in controllers
  public emitNewMessage(chatId: string, message: any) {
    const payload = {
      chatId,
      message
    };
    
    logger.info(`📤 [SOCKET EMIT] new_message to chat:${chatId}`);
    logger.info(`   Message ID: ${message._id}`);
    logger.info(`   Sender: ${message.senderId}`);
    logger.info(`   Content: ${message.content?.substring(0, 50)}...`);
    logger.info(`   isMine flag: ${message.isMine}`);
    
    this.io.to(`chat:${chatId}`).emit('new_message', payload);
    
    logger.info(`✅ [SOCKET EMIT] Message emitted successfully to room chat:${chatId}`);
  }

  public emitMessageRead(chatId: string, messageIds: string[], readBy: string) {
    const payload = {
      chatId,
      messageIds,
      readBy,
      readAt: new Date()
    };
    
    logger.info(`📤 [SOCKET EMIT] messages_read to chat:${chatId}`);
    logger.info(`   Message IDs: ${messageIds.join(', ')}`);
    logger.info(`   Read by: ${readBy}`);
    
    this.io.to(`chat:${chatId}`).emit('messages_read', payload);
    
    logger.info(`✅ [SOCKET EMIT] Read receipt emitted to room chat:${chatId}`);
  }

  public emitTypingIndicator(chatId: string, userId: string, isTyping: boolean) {
    const payload = {
      userId,
      chatId,
      isTyping
    };
    
    logger.info(`📤 [SOCKET EMIT] user_typing to chat:${chatId}`);
    logger.info(`   User: ${userId} - ${isTyping ? 'Started' : 'Stopped'} typing`);
    
    this.io.to(`chat:${chatId}`).emit('user_typing', payload);
  }

  public isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0
  }

  public getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys())
  }

  public emitToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data)
  }

  public emitToChat(chatId: string, event: string, data: any) {
    this.io.to(`chat:${chatId}`).emit(event, data)
  }
}

export default SocketService











