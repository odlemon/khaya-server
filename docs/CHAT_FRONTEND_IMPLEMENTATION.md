# Chat Frontend Implementation Guide

## 📋 Overview

This guide provides step-by-step instructions for implementing real-time chat functionality in your Vue.js + Pinia frontend application for the Khaya platform.

---

## 🚀 Getting Started

### Prerequisites

- Vue 3 application
- Pinia for state management


### Install Dependencies

```bash
npm install socket.io-client
```

---

## 📁 Project Structure

Create the following files in your Vue project:

```
src/
├── services/
│   ├── socketService.js       # WebSocket service
│   └── api.js                  # Axios instance (if not exists)
├── stores/
│   └── chatStore.js            # Pinia chat store
├── views/
│   ├── ChatList.vue            # Chat list page
│   └── ChatWindow.vue          # Chat conversation page
└── components/
    ├── ChatListItem.vue        # Single chat item component (optional)
    └── MessageBubble.vue       # Message component (optional)
```

---

## 🔧 Step 1: Create Socket Service

**File:** `src/services/socketService.js`

```javascript
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  /**
   * Connect to Socket.IO server
   * @param {string} token - JWT authentication token
   */
  connect(token) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    // Your backend URL (adjust based on environment)
    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    this.socket = io(SOCKET_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      this.connected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      this.connected = false;
    });

    return this.socket;
  }

  /**
   * Join a specific chat room
   * @param {string} chatId - Chat ID to join
   */
  joinChat(chatId) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }
    this.socket.emit('join_chat', chatId);
    console.log(`📥 Joined chat: ${chatId}`);
  }

  /**
   * Leave a specific chat room
   * @param {string} chatId - Chat ID to leave
   */
  leaveChat(chatId) {
    if (!this.socket) return;
    this.socket.emit('leave_chat', chatId);
    console.log(`📤 Left chat: ${chatId}`);
  }

  /**
   * Listen for new messages
   * @param {Function} callback - Callback function to handle new messages
   */
  onNewMessage(callback) {
    if (!this.socket) return;
    this.socket.on('new_message', callback);
  }

  /**
   * Listen for typing indicators
   * @param {Function} callback - Callback function to handle typing events
   */
  onUserTyping(callback) {
    if (!this.socket) return;
    this.socket.on('user_typing', callback);
  }

  /**
   * Emit typing event
   * @param {string} chatId - Chat ID
   */
  emitTyping(chatId) {
    if (!this.socket) return;
    this.socket.emit('typing', { chatId });
  }

  /**
   * Listen for messages marked as read
   * @param {Function} callback - Callback function
   */
  onMessagesRead(callback) {
    if (!this.socket) return;
    this.socket.on('messages_read', callback);
  }

  /**
   * Listen for online users updates
   * @param {Function} callback - Callback function
   */
  onOnlineUsers(callback) {
    if (!this.socket) return;
    this.socket.on('online_users', callback);
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      console.log('🔌 Socket disconnected');
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected() {
    return this.connected && this.socket?.connected;
  }
}

// Export singleton instance
export default new SocketService();
```

---

## 🗄️ Step 2: Create Chat Store (Pinia)

**File:** `src/stores/chatStore.js`

```javascript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import socketService from '@/services/socketService';
import api from '@/services/api'; // Your axios instance

export const useChatStore = defineStore('chat', () => {
  // State
  const chats = ref([]);
  const currentChat = ref(null);
  const messages = ref([]);
  const onlineUsers = ref([]);
  const unreadCount = ref(0);
  const typingUsers = ref({});
  const loading = ref(false);

  // Computed
  const sortedChats = computed(() => {
    return [...chats.value].sort((a, b) => {
      const aDate = new Date(a.lastMessage?.createdAt || a.updatedAt);
      const bDate = new Date(b.lastMessage?.createdAt || b.updatedAt);
      return bDate - aDate;
    });
  });

  const totalUnreadCount = computed(() => {
    return chats.value.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
  });

  // Actions
  async function initializeSocket(token) {
    try {
      socketService.connect(token);

      // Listen for new messages
      socketService.onNewMessage((message) => {
        console.log('📨 New message received:', message);
        handleNewMessage(message);
      });

      // Listen for typing indicators
      socketService.onUserTyping(({ chatId, userId, isTyping: typing }) => {
        console.log('⌨️ User typing:', { chatId, userId, typing });
        handleTypingIndicator(chatId, userId, typing);
      });

      // Listen for messages read
      socketService.onMessagesRead(({ chatId, userId }) => {
        console.log('✅ Messages read:', { chatId, userId });
        handleMessagesRead(chatId, userId);
      });

      // Listen for online users
      socketService.onOnlineUsers((users) => {
        console.log('🟢 Online users updated:', users);
        onlineUsers.value = users;
      });

    } catch (error) {
      console.error('Error initializing socket:', error);
    }
  }

  async function loadChats() {
    try {
      loading.value = true;
      const response = await api.get('/chat');
      chats.value = response.data.data;
      await loadUnreadCount();
    } catch (error) {
      console.error('Error loading chats:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function loadChatById(chatId) {
    try {
      loading.value = true;
      const response = await api.get(`/chat/${chatId}`);
      currentChat.value = response.data.data.chat;
      messages.value = response.data.data.messages;

      // Join socket room for this chat
      socketService.joinChat(chatId);
    } catch (error) {
      console.error('Error loading chat:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function sendMessage(chatId, content, messageType = 'text') {
    try {
      const response = await api.post(`/chat/${chatId}/messages`, {
        content,
        messageType
      });

      const newMessage = response.data.data;
      
      // Add to messages if we're viewing this chat
      if (currentChat.value?._id === chatId) {
        messages.value.push(newMessage);
      }

      // Update last message in chat list
      const chatIndex = chats.value.findIndex(c => c._id === chatId);
      if (chatIndex !== -1) {
        chats.value[chatIndex].lastMessage = {
          content,
          senderId: newMessage.senderId._id,
          createdAt: newMessage.createdAt
        };
      }

      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async function markAsRead(chatId) {
    try {
      await api.put(`/chat/${chatId}/read`);
      
      // Update unread count in chat list
      const chatIndex = chats.value.findIndex(c => c._id === chatId);
      if (chatIndex !== -1) {
        chats.value[chatIndex].unreadCount = 0;
      }

      await loadUnreadCount();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }

  async function loadUnreadCount() {
    try {
      const response = await api.get('/chat/unread-count');
      unreadCount.value = response.data.data.unreadCount;
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }

  function handleNewMessage(message) {
    // Add message to current chat if viewing
    if (currentChat.value?._id === message.chatId) {
      messages.value.push(message);
      
      // Mark as read if chat is open
      markAsRead(message.chatId);
    }

    // Update chat list
    const chatIndex = chats.value.findIndex(c => c._id === message.chatId);
    if (chatIndex !== -1) {
      chats.value[chatIndex].lastMessage = {
        content: message.content,
        senderId: message.senderId._id || message.senderId,
        createdAt: message.createdAt
      };
      
      // Increment unread count if not viewing this chat
      if (currentChat.value?._id !== message.chatId) {
        chats.value[chatIndex].unreadCount = (chats.value[chatIndex].unreadCount || 0) + 1;
        unreadCount.value++;
      }
    } else {
      // Reload chats to get new chat
      loadChats();
    }
  }

  function handleTypingIndicator(chatId, userId, typing) {
    if (!typingUsers.value[chatId]) {
      typingUsers.value[chatId] = new Set();
    }

    if (typing) {
      typingUsers.value[chatId].add(userId);
    } else {
      typingUsers.value[chatId].delete(userId);
    }
  }

  function handleMessagesRead(chatId, userId) {
    // Update message read status
    if (currentChat.value?._id === chatId) {
      messages.value.forEach(msg => {
        if (msg.senderId._id !== userId) {
          msg.isRead = true;
        }
      });
    }
  }

  function emitTyping(chatId) {
    socketService.emitTyping(chatId);
  }

  function leaveCurrentChat() {
    if (currentChat.value) {
      socketService.leaveChat(currentChat.value._id);
      currentChat.value = null;
      messages.value = [];
    }
  }

  function disconnectSocket() {
    socketService.disconnect();
    currentChat.value = null;
    messages.value = [];
    onlineUsers.value = [];
  }

  function isUserOnline(userId) {
    return onlineUsers.value.some(user => user.userId === userId);
  }

  return {
    // State
    chats,
    currentChat,
    messages,
    onlineUsers,
    unreadCount,
    typingUsers,
    loading,
    
    // Computed
    sortedChats,
    totalUnreadCount,
    
    // Actions
    initializeSocket,
    loadChats,
    loadChatById,
    sendMessage,
    markAsRead,
    loadUnreadCount,
    emitTyping,
    leaveCurrentChat,
    disconnectSocket,
    isUserOnline
  };
});
```

---

## 🎨 Step 3: Create Chat List View

**File:** `src/views/ChatList.vue`

```vue
<template>
  <div class="chat-list-page">
    <div class="chat-header">
      <h2>Messages</h2>
      <span v-if="chatStore.totalUnreadCount > 0" class="unread-badge">
        {{ chatStore.totalUnreadCount }}
      </span>
    </div>

    <div v-if="chatStore.loading" class="loading">
      <p>Loading chats...</p>
    </div>

    <div v-else-if="chatStore.sortedChats.length === 0" class="empty-state">
      <p>No chats yet</p>
      <p class="hint">Start connecting with landlords to begin chatting!</p>
    </div>

    <div v-else class="chats-container">
      <div
        v-for="chat in chatStore.sortedChats"
        :key="chat._id"
        class="chat-item"
        :class="{ unread: chat.unreadCount > 0 }"
        @click="openChat(chat._id)"
      >
        <div class="chat-avatar">
          <div class="avatar">
            {{ getCounterpartInitials(chat) }}
          </div>
          <span v-if="isOnline(chat)" class="online-indicator"></span>
        </div>
        
        <div class="chat-info">
          <div class="chat-top">
            <h4>{{ getCounterpartName(chat) }}</h4>
            <span class="time">{{ formatTime(chat.lastMessage?.createdAt) }}</span>
          </div>
          
          <div class="chat-bottom">
            <p class="property-name">{{ chat.propertyId?.title }}</p>
            <p class="last-message">{{ chat.lastMessage?.content }}</p>
          </div>
        </div>

        <span v-if="chat.unreadCount > 0" class="unread-count">
          {{ chat.unreadCount }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const chatStore = useChatStore();
const authStore = useAuthStore();

onMounted(async () => {
  await chatStore.loadChats();
});

function openChat(chatId) {
  router.push(`/chat/${chatId}`);
}

function getCounterpartName(chat) {
  const currentUserId = authStore.user._id;
  const counterpart = chat.participants.find(p => p._id !== currentUserId);
  return `${counterpart?.firstName} ${counterpart?.lastName}`;
}

function getCounterpartInitials(chat) {
  const currentUserId = authStore.user._id;
  const counterpart = chat.participants.find(p => p._id !== currentUserId);
  return `${counterpart?.firstName?.[0]}${counterpart?.lastName?.[0]}`.toUpperCase();
}

function isOnline(chat) {
  const currentUserId = authStore.user._id;
  const counterpart = chat.participants.find(p => p._id !== currentUserId);
  return chatStore.isUserOnline(counterpart?._id);
}

function formatTime(date) {
  if (!date) return '';
  const messageDate = new Date(date);
  const now = new Date();
  const diff = now - messageDate;
  
  // Less than 1 minute
  if (diff < 60000) return 'Just now';
  
  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }
  
  // Today
  if (messageDate.toDateString() === now.toDateString()) {
    return messageDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  // This week
  if (diff < 604800000) {
    return messageDate.toLocaleDateString('en-US', { weekday: 'short' });
  }
  
  // Older
  return messageDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}
</script>

<style scoped>
.chat-list-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.unread-badge {
  background: #ef4444;
  color: white;
  border-radius: 50%;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: bold;
}

.loading, .empty-state {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.hint {
  font-size: 14px;
  margin-top: 10px;
}

.chats-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.2s;
}

.chat-item:hover {
  background: #f9fafb;
  border-color: #3b82f6;
}

.chat-item.unread {
  background: #eff6ff;
  border-color: #3b82f6;
}

.chat-avatar {
  position: relative;
  flex-shrink: 0;
}

.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background: #10b981;
  border: 2px solid white;
  border-radius: 50%;
}

.chat-info {
  flex: 1;
  min-width: 0;
}

.chat-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.chat-top h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.time {
  font-size: 12px;
  color: #6b7280;
}

.chat-bottom {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.property-name {
  font-size: 13px;
  color: #3b82f6;
  margin: 0;
}

.last-message {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unread-count {
  background: #ef4444;
  color: white;
  border-radius: 50%;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}
</style>
```

---

## 💬 Step 4: Create Chat Window View

**File:** `src/views/ChatWindow.vue`

```vue
<template>
  <div class="chat-window">
    <div class="chat-header">
      <button class="back-button" @click="goBack">
        <i class="pi pi-arrow-left"></i>
      </button>
      
      <div class="user-info">
        <h3>{{ counterpartName }}</h3>
        <div class="property-info">{{ propertyName }}</div>
        <span v-if="isOnline" class="online-status">🟢 Online</span>
        <span v-else class="online-status">⚫ Offline</span>
      </div>
    </div>

    <div ref="messagesContainer" class="messages-container">
      <div
        v-for="message in chatStore.messages"
        :key="message._id"
        class="message"
        :class="{ mine: message.isMine }"
      >
        <div class="message-content">
          <p>{{ message.content }}</p>
          <span class="message-time">
            {{ formatTime(message.createdAt) }}
            <i v-if="message.isMine && message.isRead" class="pi pi-check-double read-icon" />
            <i v-else-if="message.isMine" class="pi pi-check" />
          </span>
        </div>
      </div>

      <div v-if="isTyping" class="typing-indicator">
        <span>{{ counterpartName }} is typing...</span>
      </div>
    </div>

    <div class="message-input">
      <input
        v-model="messageText"
        type="text"
        placeholder="Type a message..."
        @keyup.enter="sendMessage"
        @input="handleTyping"
      />
      <button 
        @click="sendMessage" 
        :disabled="!messageText.trim()"
        class="send-button"
      >
        <i class="pi pi-send"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChatStore } from '@/stores/chatStore';

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();

const messageText = ref('');
const messagesContainer = ref(null);
const typingTimeout = ref(null);

const counterpartName = computed(() => {
  if (!chatStore.currentChat) return '';
  const counterpart = chatStore.currentChat.counterpart;
  return `${counterpart?.firstName} ${counterpart?.lastName}`;
});

const propertyName = computed(() => {
  return chatStore.currentChat?.propertyId?.title || '';
});

const isOnline = computed(() => {
  if (!chatStore.currentChat) return false;
  return chatStore.isUserOnline(chatStore.currentChat.counterpart?._id);
});

const isTyping = computed(() => {
  const chatId = route.params.chatId;
  const counterpartId = chatStore.currentChat?.counterpart?._id;
  return chatStore.typingUsers[chatId]?.has(counterpartId) || false;
});

onMounted(async () => {
  const chatId = route.params.chatId;
  await chatStore.loadChatById(chatId);
  await chatStore.markAsRead(chatId);
  scrollToBottom();
});

onUnmounted(() => {
  chatStore.leaveCurrentChat();
});

watch(() => chatStore.messages.length, () => {
  nextTick(() => scrollToBottom());
});

async function sendMessage() {
  if (!messageText.value.trim()) return;

  const chatId = route.params.chatId;
  await chatStore.sendMessage(chatId, messageText.value);
  messageText.value = '';
  scrollToBottom();
}

function handleTyping() {
  const chatId = route.params.chatId;
  chatStore.emitTyping(chatId);

  if (typingTimeout.value) {
    clearTimeout(typingTimeout.value);
  }

  typingTimeout.value = setTimeout(() => {
    // Stop typing indicator
  }, 2000);
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

function goBack() {
  router.push('/chat');
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}
</script>

<style scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 800px;
  margin: 0 auto;
  background: white;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px 20px;
  background: #3b82f6;
  color: white;
  border-bottom: 1px solid #2563eb;
}

.back-button {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 5px;
}

.user-info h3 {
  margin: 0 0 5px 0;
  font-size: 18px;
}

.property-info {
  font-size: 13px;
  opacity: 0.9;
  margin-bottom: 3px;
}

.online-status {
  font-size: 12px;
  opacity: 0.9;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f9fafb;
}

.message {
  display: flex;
  margin-bottom: 15px;
}

.message.mine {
  justify-content: flex-end;
}

.message-content {
  max-width: 70%;
  padding: 10px 15px;
  border-radius: 12px;
  background: white;
  border: 1px solid #e5e7eb;
}

.message.mine .message-content {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.message-content p {
  margin: 0 0 5px 0;
  word-wrap: break-word;
}

.message-time {
  font-size: 11px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 3px;
}

.message.mine .message-time {
  color: rgba(255, 255, 255, 0.8);
}

.read-icon {
  color: #3b82f6;
}

.message.mine .read-icon {
  color: white;
}

.typing-indicator {
  padding: 10px;
  font-size: 14px;
  color: #6b7280;
  font-style: italic;
}

.message-input {
  display: flex;
  gap: 10px;
  padding: 15px 20px;
  background: white;
  border-top: 1px solid #e5e7eb;
}

.message-input input {
  flex: 1;
  padding: 12px 15px;
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
}

.message-input input:focus {
  border-color: #3b82f6;
}

.send-button {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.send-button:hover:not(:disabled) {
  background: #2563eb;
}

.send-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}
</style>
```

---

## 🔄 Step 5: Initialize Socket in Main App

**File:** `src/App.vue` or main layout component

```vue
<script setup>
import { onMounted, onUnmounted, watch } from 'vue';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';

const chatStore = useChatStore();
const authStore = useAuthStore();

// Initialize socket when user logs in
watch(() => authStore.isAuthenticated, (isAuth) => {
  if (isAuth && authStore.token) {
    chatStore.initializeSocket(authStore.token);
  } else {
    chatStore.disconnectSocket();
  }
}, { immediate: true });

onMounted(() => {
  // Initialize socket if already logged in
  if (authStore.isAuthenticated && authStore.token) {
    chatStore.initializeSocket(authStore.token);
  }
});

onUnmounted(() => {
  // Clean up socket connection
  chatStore.disconnectSocket();
});
</script>
```

---

## 🛣️ Step 6: Add Routes

**File:** `src/router/index.js`

```javascript
import { createRouter, createWebHistory } from 'vue-router';
import ChatList from '@/views/ChatList.vue';
import ChatWindow from '@/views/ChatWindow.vue';

const routes = [
  // ... other routes
  {
    path: '/chat',
    name: 'ChatList',
    component: ChatList,
    meta: { requiresAuth: true }
  },
  {
    path: '/chat/:chatId',
    name: 'ChatWindow',
    component: ChatWindow,
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Add authentication guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else {
    next();
  }
});

export default router;
```

---

## ⚙️ Step 7: Environment Configuration

**File:** `.env`

```env
VITE_API_URL=http://localhost:3000
```

**File:** `.env.production`

```env
VITE_API_URL=https://your-production-api.com
```

---

## 🎯 Step 8: Usage Examples

### Opening Chat from Property Page

```vue
<template>
  <div class="property-card">
    <!-- Property details -->
    <button @click="openChat" v-if="connection.status === 'accepted'">
      Chat with Landlord
    </button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useChatStore } from '@/stores/chatStore';

const router = useRouter();
const chatStore = useChatStore();

async function openChat() {
  // Load chats to find existing chat
  await chatStore.loadChats();
  
  // Find chat for this property
  const chat = chatStore.chats.find(
    c => c.propertyId._id === property.value._id
  );
  
  if (chat) {
    router.push(`/chat/${chat._id}`);
  }
}
</script>
```

### Displaying Unread Count in Navigation

```vue
<template>
  <nav>
    <router-link to="/chat">
      Messages
      <span v-if="chatStore.totalUnreadCount > 0" class="badge">
        {{ chatStore.totalUnreadCount }}
      </span>
    </router-link>
  </nav>
</template>

<script setup>
import { useChatStore } from '@/stores/chatStore';

const chatStore = useChatStore();
</script>
```

---

## 🔔 Step 9: Optional - Add Browser Notifications

```javascript
// Add to socketService.js or chatStore.js

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function showNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/logo.png',
      badge: '/badge.png'
    });
  }
}

// In handleNewMessage function
function handleNewMessage(message) {
  // ... existing code
  
  // Show notification if chat is not open
  if (currentChat.value?._id !== message.chatId) {
    showNotification(
      'New Message',
      `${message.senderId.firstName}: ${message.content}`
    );
  }
}
```

---

## 🧪 Step 10: Testing

### Test Socket Connection

```javascript
// In browser console
console.log('Socket connected:', socketService.isConnected());
```

### Test Real-time Updates

1. Open chat in two different browsers/devices
2. Send a message from one
3. Verify it appears in real-time on the other

### Test Notifications

1. Check unread count updates
2. Verify typing indicators work
3. Test online/offline status

---

## 🐛 Troubleshooting

### Socket Not Connecting

```javascript
// Check backend URL
console.log('API URL:', import.meta.env.VITE_API_URL);

// Check token
console.log('Auth token:', authStore.token);

// Check socket events
socketService.socket.onAny((event, ...args) => {
  console.log('Socket event:', event, args);
});
```

### Messages Not Appearing

```javascript
// Check if joined chat room
console.log('Current chat:', chatStore.currentChat?._id);

// Check messages array
console.log('Messages:', chatStore.messages);
```

### CORS Issues

Ensure your backend allows the frontend origin:

```javascript
// Backend: src/app.ts
io(server, {
  cors: {
    origin: 'http://localhost:5173', // Your Vue app URL
    credentials: true
  }
});
```

---

## ✅ Checklist

- [ ] Install socket.io-client
- [ ] Create socketService.js
- [ ] Create chatStore.js
- [ ] Create ChatList.vue
- [ ] Create ChatWindow.vue
- [ ] Initialize socket in App.vue
- [ ] Add routes
- [ ] Configure environment variables
- [ ] Test socket connection
- [ ] Test sending/receiving messages
- [ ] Test typing indicators
- [ ] Test online status
- [ ] Test unread counts

---

## 📚 Additional Resources

- [Socket.IO Client Documentation](https://socket.io/docs/v4/client-api/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Vue Router Documentation](https://router.vuejs.org/)

---

## 🎉 Congratulations!

You've successfully implemented real-time chat functionality in your Vue.js frontend! Users can now:

✅ View all their chats
✅ Send and receive messages in real-time
✅ See typing indicators
✅ View online/offline status
✅ Get unread message counts
✅ Receive instant notifications

For any issues or questions, refer to the backend documentation or contact support.

