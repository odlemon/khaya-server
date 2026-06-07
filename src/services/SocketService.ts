//@ts-nocheck
import { Server as SocketIOServer, Socket } from "socket.io"
import jwt from "jsonwebtoken"
import { User } from "../models/User"
import { Chat } from "../models/Chat"
import { chatService } from "./ChatService"
import { logger } from "../utils/logger"
import { JWT_SECRET } from "../config/jwtConfig"
import { isMessageReadByUser } from "../utils/messageReadStatus"
import {
  cacheUserDisplayName,
  displayNameFromPopulatedSender,
  displayNameFromUser,
  resolveUserDisplayName,
  resolveUserDisplayNames,
} from "../utils/userDisplayName"

interface AuthenticatedSocket extends Socket {
  userId?: string
  userRole?: string
  userDisplayName?: string
}

interface OnlineUser {
  userId: string
  socketId: string
  lastSeen: Date
}

class SocketService {
  private io: SocketIOServer
  private onlineUsers: Map<string, OnlineUser> = new Map()
  private userSockets: Map<string, Set<string>> = new Map()
  /** userId -> Set of chatIds the user has joined via join_chat */
  private userChatRooms: Map<string, Set<string>> = new Map()

  constructor(io: SocketIOServer) {
    this.io = io
    this.setupMiddleware()
    this.setupEventHandlers()
  }

  private setupMiddleware() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'))
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any
        const user = await User.findById(decoded.userId).select('_id role firstName lastName email')
        
        if (!user) {
          return next(new Error('Authentication error: User not found'))
        }

        socket.userId = user._id.toString()
        socket.userRole = user.role
        socket.userDisplayName = displayNameFromUser(user)
        cacheUserDisplayName(socket.userId, socket.userDisplayName)

        console.log(
          `[REALTIME] socket auth OK | ${socket.userDisplayName} (${user.email}) role=${user.role}`
        )

        next()
      } catch (error) {
        logger.error('Socket authentication error:', error)
        next(new Error('Authentication error: Invalid token'))
      }
    })
  }

  private trackChatJoin(userId: string, chatId: string) {
    if (!this.userChatRooms.has(userId)) {
      this.userChatRooms.set(userId, new Set())
    }
    this.userChatRooms.get(userId)!.add(chatId)
  }

  private trackChatLeave(userId: string, chatId: string) {
    const rooms = this.userChatRooms.get(userId)
    if (rooms) {
      rooms.delete(chatId)
      if (rooms.size === 0) {
        this.userChatRooms.delete(userId)
      }
    }
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const userId = socket.userId!
      const userName = socket.userDisplayName || userId
      const socketId = socket.id

      console.log(`[REALTIME] socket connected | ${userName} socketId=${socketId}`)
      logger.info(`User ${userId} connected with socket ${socketId}`)

      this.addOnlineUser(userId, socketId)
      socket.join(`user:${userId}`)
      console.log(`[REALTIME] joined room | ${userName}`)

      if (socket.userRole === "admin") {
        socket.join("role:admin")
        console.log(`[REALTIME] admin monitoring room joined | ${userName}`)
      }

      socket.on('join_chat', async (chatId: string) => {
        try {
          const chat = await Chat.findById(chatId).select('participants')
          if (!chat) {
            socket.emit('socket_error', { message: 'Chat not found', chatId })
            return
          }

          const isParticipant = chat.participants.some(
            (p: any) => p.toString() === userId
          )

          if (!isParticipant) {
            socket.emit('socket_error', { message: 'Access denied', chatId })
            return
          }

          socket.join(`chat:${chatId}`)
          this.trackChatJoin(userId, chatId)
          console.log(`[REALTIME] join_chat OK | ${userName} chatId=${chatId}`)
          logger.info(`User ${userId} joined chat ${chatId}`)
          socket.emit('joined_chat', { chatId })
        } catch (error: any) {
          socket.emit('socket_error', { message: error.message, chatId })
        }
      })

      socket.on('leave_chat', (chatId: string) => {
        socket.leave(`chat:${chatId}`)
        this.trackChatLeave(userId, chatId)
        console.log(`[REALTIME] leave_chat | ${userName} chatId=${chatId}`)
        logger.info(`User ${userId} left chat ${chatId}`)
      })

      socket.on('typing_start', (data: { chatId: string }) => {
        socket.to(`chat:${data.chatId}`).emit('user_typing', {
          userId,
          chatId: data.chatId,
          isTyping: true
        })
      })

      socket.on('typing_stop', (data: { chatId: string }) => {
        socket.to(`chat:${data.chatId}`).emit('user_typing', {
          userId,
          chatId: data.chatId,
          isTyping: false
        })
      })

      socket.on('mark_messages_read', async (data: { chatId: string, messageIds?: string[] }) => {
        try {
          const messageIds = data.messageIds || []
          let idsToMark = messageIds

          if (!idsToMark.length) {
            const { messages } = await chatService.getChatById(data.chatId, userId)
            idsToMark = messages
              .filter((m: any) => {
                const messageObj = m.toObject ? m.toObject() : m
                const senderIdStr = (messageObj.senderId?._id || messageObj.senderId)?.toString?.() || ""
                return senderIdStr !== userId && !isMessageReadByUser(messageObj, userId)
              })
              .map((m: any) => m._id.toString())
          }

          if (idsToMark.length) {
            await chatService.markMessagesAsRead(data.chatId, idsToMark, userId)
            console.log(
              `[REALTIME] mark_messages_read | chatId=${data.chatId} readBy=${userName} count=${idsToMark.length}`
            )
            this.emitMessageRead(data.chatId, idsToMark, userId)
          }

          const { syncNotificationsReadForChat } = await import("../utils/notificationReadSync")
          await syncNotificationsReadForChat(userId, data.chatId)
        } catch (error: any) {
          logger.error('mark_messages_read error:', error)
        }
      })

      socket.on('disconnect', () => {
        this.userChatRooms.delete(userId)
        this.removeOnlineUser(userId, socketId)
        console.log(`[REALTIME] socket disconnected | ${userName} socketId=${socketId}`)
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
    
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set())
    }
    this.userSockets.get(userId)!.add(socketId)

    this.io.emit('user_online', { userId })
  }

  private removeOnlineUser(userId: string, socketId: string) {
    this.onlineUsers.delete(socketId)
    
    const userSocketSet = this.userSockets.get(userId)
    if (userSocketSet) {
      userSocketSet.delete(socketId)
      
      if (userSocketSet.size === 0) {
        this.userSockets.delete(userId)
        this.io.emit('user_offline', { userId })
      }
    }
  }

  public isUserInChatRoom(userId: string, chatId: string): boolean {
    return this.userChatRooms.get(userId)?.has(chatId) || false
  }

  public async emitNewMessage(chatId: string, message: any) {
    const payload = {
      chatId,
      message
    }

    const senderId =
      (message.senderId?._id || message.senderId)?.toString?.() || ""

    const messageId = message._id?.toString?.() || "unknown"

    if (message.visibleTo && message.visibleTo.length > 0) {
      const visibleToIds = message.visibleTo.map((id: any) =>
        id.toString ? id.toString() : id
      )

      const recipientUserIds = visibleToIds.filter((uid) => uid !== senderId)

      recipientUserIds.forEach((uid: string) => {
        this.io.to(`user:${uid}`).emit("new_message", payload)
      })

      // Admin portal sees all messages (including private); no notification/socket to untagged parties
      this.io.to("role:admin").emit("new_message", payload)

      const senderName =
        displayNameFromPopulatedSender(message.senderId) ||
        (await resolveUserDisplayName(senderId))
      const recipientNames = await resolveUserDisplayNames(recipientUserIds)
      const recipientLabels = recipientUserIds.map((id) => recipientNames.get(id) || id)

      console.log(
        `[REALTIME] emit new_message (private) | chatId=${chatId} messageId=${messageId} from=${senderName} → ${recipientLabels.join(", ")} + admin monitoring (no notification to others)`
      )
      return
    }

    this.io.to(`chat:${chatId}`).emit("new_message", payload)
    this.io.to("role:admin").emit("new_message", payload)

    const participantTargets: string[] = []
    try {
      const chat = await Chat.findById(chatId).select("participants").lean()
      if (chat?.participants?.length) {
        for (const participant of chat.participants) {
          const participantId = participant.toString()
          if (participantId && participantId !== senderId) {
            this.io.to(`user:${participantId}`).emit("new_message", payload)
            participantTargets.push(participantId)
          }
        }
      }
    } catch (error: any) {
      logger.error("emitNewMessage participant delivery failed:", error)
    }

    const senderName =
      displayNameFromPopulatedSender(message.senderId) ||
      (await resolveUserDisplayName(senderId))
    const participantNames = await resolveUserDisplayNames(participantTargets)
    const recipientLabels = participantTargets.map(
      (id) => participantNames.get(id) || "Unknown user"
    )

    console.log(
      `[REALTIME] emit new_message | chatId=${chatId} messageId=${messageId} from=${senderName} → ${recipientLabels.join(", ") || "no other participants"} + all admins`
    )
  }

  public emitNotificationCreated(userId: string, payload: any) {
    const notifId = payload?.notification?._id?.toString?.() || "unknown"
    const notifType = payload?.notification?.type || "unknown"

    void resolveUserDisplayName(userId).then((recipientName) => {
      console.log(
        `[REALTIME] emit notification_created | to=${recipientName} id=${notifId} type=${notifType}`
      )
    })

    this.io.to(`user:${userId}`).emit('notification_created', payload)
  }

  public emitNotificationsMarkedRead(
    userId: string,
    payload: {
      chatId: string;
      markedCount: number;
      notificationIds: string[];
      unreadCount: number;
    }
  ) {
    void resolveUserDisplayName(userId).then((name) => {
      console.log(
        `[REALTIME] emit notifications_marked_read | user=${name} chatId=${payload.chatId} marked=${payload.markedCount} unreadCount=${payload.unreadCount}`
      );
    });

    this.io.to(`user:${userId}`).emit("notifications_marked_read", payload);
  }

  public emitChatNotification(userId: string, notification: any) {
    const notifId = notification?.notification?._id?.toString?.() || "unknown"

    void resolveUserDisplayName(userId).then((recipientName) => {
      console.log(
        `[REALTIME] emit chat_notification (legacy) | to=${recipientName} id=${notifId}`
      )
    })

    this.io.to(`user:${userId}`).emit('chat_notification', notification)
  }

  public emitMessageRead(chatId: string, messageIds: string[], readBy: string) {
    const payload = {
      chatId,
      messageIds,
      readBy,
      readAt: new Date()
    }

    void resolveUserDisplayName(readBy).then((readerName) => {
      console.log(
        `[REALTIME] emit messages_read | chatId=${chatId} readBy=${readerName} count=${messageIds.length}`
      )
    })

    this.io.to(`chat:${chatId}`).emit('messages_read', payload)
  }

  public emitTypingIndicator(chatId: string, userId: string, isTyping: boolean) {
    this.io.to(`chat:${chatId}`).emit('user_typing', {
      userId,
      chatId,
      isTyping
    })
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
