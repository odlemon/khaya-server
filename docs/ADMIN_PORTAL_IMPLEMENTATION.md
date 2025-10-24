# Admin Portal - Complete Implementation Guide

Complete guide for building the Admin Portal in Next.js with all necessary endpoints and features.

---

## 📋 Overview

**Tech Stack:**
- **Frontend:** Next.js (Admin Portal)
- **Backend:** Node.js/Express (Already implemented)
- **Real-time:** Socket.IO

**Admin Features:**
1. View all chats in the system
2. Join any chat conversation
3. Send messages (public or private with @mentions)
4. Monitor tenant-landlord conversations
5. Manage users, properties, connections

---

## 🔌 Backend API Endpoints

### **Authentication**

#### **Admin Login**
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "adminpassword"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "admin123",
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }
}
```

---

### **Chat Management**

#### **1. Get All Chats**
View all active chats in the system.

```
GET /api/chat/admin/all-chats?page=1&limit=50
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "All chats retrieved successfully",
  "data": {
    "chats": [
      {
        "_id": "chat123",
        "participants": [
          {
            "_id": "tenant1",
            "firstName": "John",
            "lastName": "Doe",
            "email": "john@example.com",
            "role": "tenant"
          },
          {
            "_id": "landlord1",
            "firstName": "Jane",
            "lastName": "Smith",
            "email": "jane@example.com",
            "role": "landlord"
          }
        ],
        "propertyId": {
          "_id": "prop123",
          "title": "Modern 2BR Apartment",
          "address": {
            "street": "123 Main St",
            "city": "New York"
          },
          "images": ["image1.jpg"]
        },
        "lastMessage": {
          "content": "Is the property still available?",
          "senderId": "tenant1",
          "timestamp": "2025-10-17T10:00:00Z"
        },
        "isActive": true,
        "createdAt": "2025-10-15T09:00:00Z",
        "updatedAt": "2025-10-17T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "totalPages": 3
    }
  }
}
```

---

#### **2. Admin Join Chat**
Admin joins a specific conversation.

```
POST /api/chat/admin/join/:chatId
Authorization: Bearer <admin_token>
```

**Example:**
```bash
POST /api/chat/admin/join/67123abc456def789
```

**Response:**
```json
{
  "success": true,
  "message": "Admin joined chat successfully",
  "data": {
    "_id": "chat123",
    "participants": [
      { "_id": "tenant1", "firstName": "John", "role": "tenant" },
      { "_id": "landlord1", "firstName": "Jane", "role": "landlord" },
      { "_id": "admin1", "firstName": "Admin", "role": "admin" }
    ],
    "propertyId": "prop123",
    "isActive": true
  }
}
```

---

#### **3. Get Chat Messages**
Load all messages in a chat (with visibility filtering).

```
GET /api/chat/:chatId
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Chat retrieved successfully",
  "data": {
    "chat": {
      "_id": "chat123",
      "participants": [...],
      "propertyId": {...}
    },
    "messages": [
      {
        "_id": "msg1",
        "senderId": {
          "_id": "tenant1",
          "firstName": "John",
          "role": "tenant"
        },
        "senderRole": "tenant",
        "content": "Is this property available?",
        "isMine": false,
        "isPrivate": false,
        "createdAt": "2025-10-17T09:00:00Z"
      },
      {
        "_id": "msg2",
        "senderId": {
          "_id": "admin1",
          "firstName": "Admin",
          "role": "admin"
        },
        "senderRole": "admin",
        "content": "@landlord Please verify ownership",
        "visibleTo": ["admin1", "landlord1"],
        "taggedUser": "landlord",
        "isMine": true,
        "isPrivate": true,
        "createdAt": "2025-10-17T10:00:00Z"
      }
    ]
  }
}
```

---

#### **4. Send Message**
Admin sends a message (public or private with @mention).

```
POST /api/chat/:chatId/message
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "content": "@landlord Please provide property documents"
}
```

**For public message (no tag):**
```json
{
  "content": "Hello, I'm monitoring this conversation"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "_id": "msg123",
    "chatId": "chat123",
    "senderId": {
      "_id": "admin1",
      "firstName": "Admin",
      "role": "admin"
    },
    "senderRole": "admin",
    "content": "@landlord Please provide property documents",
    "visibleTo": ["admin1", "landlord1"],
    "taggedUser": "landlord",
    "isMine": true,
    "isPrivate": true,
    "createdAt": "2025-10-17T10:30:00Z"
  }
}
```

---

### **User Management**

#### **5. Get All Users**
```
GET /api/admin/users?page=1&limit=50&role=tenant
Authorization: Bearer <admin_token>
```

Query params:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `role`: Filter by role (optional: "tenant", "landlord", "admin")
- `search`: Search by name/email (optional)

---

#### **6. Get User Details**
```
GET /api/admin/users/:userId
Authorization: Bearer <admin_token>
```

---

#### **7. Update User Status**
```
PUT /api/admin/users/:userId/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "isActive": false,
  "reason": "Violation of terms"
}
```

---

### **Property Management**

#### **8. Get All Properties**
```
GET /api/admin/properties?page=1&limit=50&status=active
Authorization: Bearer <admin_token>
```

---

#### **9. Get Property Details**
```
GET /api/admin/properties/:propertyId
Authorization: Bearer <admin_token>
```

---

#### **10. Update Property Status**
```
PUT /api/admin/properties/:propertyId/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "suspended",
  "reason": "Verification required"
}
```

---

### **Connection Management**

#### **11. Get All Connections**
```
GET /api/admin/connections?page=1&limit=50&status=pending
Authorization: Bearer <admin_token>
```

---

#### **12. Get Connection Details**
```
GET /api/admin/connections/:connectionId
Authorization: Bearer <admin_token>
```

---

### **Statistics & Analytics**

#### **13. Get Dashboard Stats**
```
GET /api/admin/stats/dashboard
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 5000,
    "totalTenants": 3500,
    "totalLandlords": 1500,
    "totalProperties": 1200,
    "activeChats": 450,
    "pendingConnections": 120,
    "todayRegistrations": 45,
    "todayMessages": 890
  }
}
```

---

## 🏗️ Next.js Frontend Structure

```
admin-portal/
├── app/
│   ├── layout.tsx                 # Root layout with auth
│   ├── page.tsx                   # Dashboard
│   ├── login/
│   │   └── page.tsx               # Admin login
│   ├── chats/
│   │   ├── page.tsx               # Chat list
│   │   └── [chatId]/
│   │       └── page.tsx           # Chat window
│   ├── users/
│   │   ├── page.tsx               # User list
│   │   └── [userId]/
│   │       └── page.tsx           # User details
│   ├── properties/
│   │   ├── page.tsx               # Property list
│   │   └── [propertyId]/
│   │       └── page.tsx           # Property details
│   └── connections/
│       └── page.tsx               # Connection list
├── components/
│   ├── chat/
│   │   ├── ChatList.tsx
│   │   ├── ChatWindow.tsx
│   │   ├── MessageItem.tsx
│   │   └── MessageInput.tsx
│   ├── dashboard/
│   │   ├── StatsCard.tsx
│   │   └── RecentActivity.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Navigation.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Badge.tsx
├── lib/
│   ├── api.ts                     # API client
│   ├── socket.ts                  # Socket.IO client
│   └── auth.ts                    # Auth helpers
├── store/
│   ├── authStore.ts               # Auth state
│   ├── chatStore.ts               # Chat state
│   └── usersStore.ts              # Users state
└── types/
    ├── chat.ts
    ├── user.ts
    └── property.ts
```

---

## 💻 Implementation Steps

### **Step 1: Setup Next.js Project**

```bash
npx create-next-app@latest admin-portal --typescript --tailwind --app
cd admin-portal
npm install axios socket.io-client zustand date-fns
```

---

### **Step 2: Create API Client**

**File: `lib/api.ts`**
```typescript
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

### **Step 3: Create Socket Service**

**File: `lib/socket.ts`**
```typescript
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private connected: boolean = false;

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      this.connected = false;
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.connected = false;
  }

  joinChat(chatId: string) {
    this.socket?.emit('join_chat', chatId);
  }

  leaveChat(chatId: string) {
    this.socket?.emit('leave_chat', chatId);
  }

  onNewMessage(callback: (data: any) => void) {
    this.socket?.on('new_message', callback);
  }

  onUserTyping(callback: (data: any) => void) {
    this.socket?.on('user_typing', callback);
  }

  offNewMessage() {
    this.socket?.off('new_message');
  }

  isConnected() {
    return this.connected;
  }
}

export const socketService = new SocketService();
```

---

### **Step 4: Create Auth Store**

**File: `store/authStore.ts`**
```typescript
import { create } from 'zustand';
import api from '@/lib/api';
import { socketService } from '@/lib/socket';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.user.role !== 'admin') {
        throw new Error('Access denied. Admin only.');
      }

      const { token, user } = response.data;
      
      localStorage.setItem('admin_token', token);
      set({ token, user, isLoading: false });

      // Connect socket
      socketService.connect(token);
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    socketService.disconnect();
    set({ token: null, user: null });
  },

  checkAuth: () => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      // Verify token with backend
      api.get('/auth/me').then((response) => {
        set({ token, user: response.data.user });
        socketService.connect(token);
      }).catch(() => {
        localStorage.removeItem('admin_token');
        set({ token: null, user: null });
      });
    }
  },
}));
```

---

### **Step 5: Create Chat Store**

**File: `store/chatStore.ts`**
```typescript
import { create } from 'zustand';
import api from '@/lib/api';
import { socketService } from '@/lib/socket';

interface Message {
  _id: string;
  senderId: any;
  senderRole: string;
  content: string;
  visibleTo?: string[];
  taggedUser?: string;
  isMine: boolean;
  isPrivate: boolean;
  createdAt: string;
}

interface Chat {
  _id: string;
  participants: any[];
  propertyId: any;
  lastMessage?: any;
  updatedAt: string;
}

interface ChatState {
  chats: Chat[];
  currentChat: Chat | null;
  messages: Message[];
  isLoading: boolean;
  loadAllChats: (page?: number) => Promise<void>;
  joinChat: (chatId: string) => Promise<void>;
  loadChatById: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, content: string) => Promise<void>;
  initSocketListeners: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  currentChat: null,
  messages: [],
  isLoading: false,

  loadAllChats: async (page = 1) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/chat/admin/all-chats?page=${page}&limit=50`);
      set({ chats: response.data.data.chats, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  joinChat: async (chatId: string) => {
    try {
      await api.post(`/chat/admin/join/${chatId}`);
      console.log('Joined chat:', chatId);
    } catch (error) {
      console.error('Error joining chat:', error);
      throw error;
    }
  },

  loadChatById: async (chatId: string) => {
    set({ isLoading: true });
    try {
      // Join chat first (if not already joined)
      await get().joinChat(chatId);

      // Load messages
      const response = await api.get(`/chat/${chatId}`);
      set({
        currentChat: response.data.data.chat,
        messages: response.data.data.messages,
        isLoading: false,
      });

      // Join socket room
      socketService.joinChat(chatId);
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  sendMessage: async (chatId: string, content: string) => {
    try {
      const response = await api.post(`/chat/${chatId}/message`, { content });
      
      // Add to messages if not already added by socket
      const newMessage = response.data.data;
      const messages = get().messages;
      if (!messages.some(m => m._id === newMessage._id)) {
        set({ messages: [...messages, newMessage] });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  initSocketListeners: () => {
    socketService.onNewMessage((data) => {
      const { chatId, message } = data;
      const currentChat = get().currentChat;

      if (currentChat?._id === chatId) {
        const messages = get().messages;
        const exists = messages.some(m => m._id === message._id);
        if (!exists) {
          set({ messages: [...messages, message] });
        }
      }
    });
  },
}));
```

---

### **Step 6: Create Chat List Component**

**File: `components/chat/ChatList.tsx`**
```typescript
'use client';

import { useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useRouter } from 'next/navigation';

export default function ChatList() {
  const { chats, isLoading, loadAllChats } = useChatStore();
  const router = useRouter();

  useEffect(() => {
    loadAllChats();
  }, []);

  if (isLoading) {
    return <div className="p-4">Loading chats...</div>;
  }

  return (
    <div className="chat-list">
      <h2 className="text-2xl font-bold p-4">All Chats</h2>
      
      <div className="divide-y">
        {chats.map((chat) => {
          const tenant = chat.participants.find(p => p.role === 'tenant');
          const landlord = chat.participants.find(p => p.role === 'landlord');
          
          return (
            <div
              key={chat._id}
              className="p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => router.push(`/chats/${chat._id}`)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">
                    {tenant?.firstName} ↔ {landlord?.firstName}
                  </p>
                  <p className="text-sm text-gray-600">
                    Property: {chat.propertyId?.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {chat.lastMessage?.content}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(chat.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

### **Step 7: Create Chat Window Component**

**File: `app/chats/[chatId]/page.tsx`**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useParams } from 'next/navigation';

export default function ChatPage() {
  const params = useParams();
  const chatId = params.chatId as string;
  
  const { currentChat, messages, loadChatById, sendMessage, initSocketListeners } = useChatStore();
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    initSocketListeners();
    loadChatById(chatId);
  }, [chatId]);

  const handleSend = async () => {
    if (!messageText.trim()) return;
    
    await sendMessage(chatId, messageText);
    setMessageText('');
  };

  const insertTag = (tag: string) => {
    setMessageText(`${tag} `);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <h2 className="text-xl font-bold">Chat</h2>
        <div className="flex gap-2 mt-2">
          {currentChat?.participants.map((p) => (
            <span key={p._id} className="text-sm px-2 py-1 bg-gray-100 rounded">
              {p.firstName} ({p.role})
            </span>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`mb-4 ${msg.isMine ? 'text-right' : 'text-left'}`}
          >
            {msg.isPrivate && (
              <span className="text-xs text-orange-600">
                🔒 Private to {msg.taggedUser}
              </span>
            )}
            <div
              className={`inline-block px-4 py-2 rounded-lg ${
                msg.isMine
                  ? 'bg-blue-500 text-white'
                  : msg.senderRole === 'admin'
                  ? 'bg-purple-100'
                  : 'bg-white'
              }`}
            >
              <p className="text-xs font-semibold mb-1">
                {msg.senderId.firstName} ({msg.senderRole})
              </p>
              <p>{msg.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {new Date(msg.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t">
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => insertTag('@landlord')}
            className="px-3 py-1 text-sm bg-gray-100 rounded"
          >
            @ Landlord
          </button>
          <button
            onClick={() => insertTag('@tenant')}
            className="px-3 py-1 text-sm bg-gray-100 rounded"
          >
            @ Tenant
          </button>
        </div>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message... Use @landlord or @tenant for private"
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button
            onClick={handleSend}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 🎯 Key Features

✅ **View all chats** - Admin sees every conversation  
✅ **Join chats** - Admin becomes 3rd participant  
✅ **Send public messages** - Everyone sees  
✅ **Send private messages** - Use @mentions  
✅ **Real-time updates** - Socket.IO integration  
✅ **Message visibility** - Respects privacy rules  
✅ **User management** - View/manage users  
✅ **Property oversight** - Monitor all properties  

---

## 🚀 Deployment

### **Environment Variables**

**Admin Portal (.env.local):**
```env
NEXT_PUBLIC_API_URL=https://api.yourapp.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.yourapp.com
```

**Backend (.env):**
```env
CORS_ORIGIN=https://admin.yourapp.com
```

---

## 🔐 Security

1. **Admin-only access** - All endpoints check for admin role
2. **JWT authentication** - Token required for all requests
3. **Socket authentication** - Token verified on connection
4. **CORS configuration** - Only allow admin portal domain

---

## 📝 Summary

**What You Get:**
- Complete admin portal structure
- All necessary API endpoints (already implemented)
- Socket.IO real-time updates
- Message visibility controls
- @mention parsing for private messages
- User/Property/Chat management

**Next Steps:**
1. Create Next.js project
2. Set up API client and socket service
3. Create stores for state management
4. Build chat components
5. Add user/property management pages
6. Deploy!

Everything is ready on the backend - just build the Next.js frontend! 🎉



