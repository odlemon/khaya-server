# Real-Time Chat Frontend Implementation Guide

Complete guide for implementing WebSocket-based real-time chat with Vue.js 3 + Pinia.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Socket Service Setup](#socket-service-setup)
4. [Pinia Chat Store](#pinia-chat-store)
5. [Chat Component Implementation](#chat-component-implementation)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Vue.js 3
- Pinia (state management)
- Socket.IO Client
- Axios (for HTTP requests)

---

## Installation

```bash
npm install socket.io-client
```

---

## Socket Service Setup

Create a WebSocket service to manage Socket.IO connections.

### **File: `src/services/socketService.js`**

```javascript
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
  }

  /**
   * Connect to WebSocket server
   * @param {string} token - JWT authentication token
   */
  connect(token) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    // Your backend server URL
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

    this.socket = io(SOCKET_URL, {
      auth: {
        token: token  // Send JWT token for authentication
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection event handlers
    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      this.connected = true;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      this.connected = false;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      this.connected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      this.connected = true;
    });

    return this.socket;
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners.clear();
      console.log('Socket disconnected manually');
    }
  }

  /**
   * Join a chat room
   * @param {string} chatId - Chat ID to join
   */
  joinChat(chatId) {
    if (this.socket && this.connected) {
      this.socket.emit('join_chat', chatId);
      console.log('📥 Joined chat:', chatId);
    }
  }

  /**
   * Leave a chat room
   * @param {string} chatId - Chat ID to leave
   */
  leaveChat(chatId) {
    if (this.socket && this.connected) {
      this.socket.emit('leave_chat', chatId);
      console.log('📤 Left chat:', chatId);
    }
  }

  /**
   * Emit typing start indicator
   * @param {string} chatId - Chat ID
   */
  startTyping(chatId) {
    if (this.socket && this.connected) {
      this.socket.emit('typing_start', { chatId });
    }
  }

  /**
   * Emit typing stop indicator
   * @param {string} chatId - Chat ID
   */
  stopTyping(chatId) {
    if (this.socket && this.connected) {
      this.socket.emit('typing_stop', { chatId });
    }
  }

  /**
   * Emit messages read event
   * @param {string} chatId - Chat ID
   * @param {string[]} messageIds - Array of message IDs
   */
  markMessagesAsRead(chatId, messageIds) {
    if (this.socket && this.connected) {
      this.socket.emit('mark_messages_read', { chatId, messageIds });
    }
  }

  /**
   * Listen for new messages
   * @param {Function} callback - Callback function
   */
  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('new_message', callback);
      this.listeners.set('new_message', callback);
    }
  }

  /**
   * Listen for typing indicators
   * @param {Function} callback - Callback function
   */
  onUserTyping(callback) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
      this.listeners.set('user_typing', callback);
    }
  }

  /**
   * Listen for read receipts
   * @param {Function} callback - Callback function
   */
  onMessagesRead(callback) {
    if (this.socket) {
      this.socket.on('messages_read', callback);
      this.listeners.set('messages_read', callback);
    }
  }

  /**
   * Listen for user online status
   * @param {Function} callback - Callback function
   */
  onUserOnline(callback) {
    if (this.socket) {
      this.socket.on('user_online', callback);
      this.listeners.set('user_online', callback);
    }
  }

  /**
   * Listen for user offline status
   * @param {Function} callback - Callback function
   */
  onUserOffline(callback) {
    if (this.socket) {
      this.socket.on('user_offline', callback);
      this.listeners.set('user_offline', callback);
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    if (this.socket) {
      this.listeners.forEach((callback, event) => {
        this.socket.off(event, callback);
      });
      this.listeners.clear();
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
export const socketService = new SocketService();
```

---

## Pinia Chat Store

Create a Pinia store to manage chat state and real-time updates.

### **File: `src/stores/chatStore.js`**

```javascript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { socketService } from '@/services/socketService';
import { useAuthStore } from './authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const useChatStore = defineStore('chat', () => {
  // State
  const chats = ref([]);
  const currentChat = ref(null);
  const messages = ref([]);
  const isLoadingChats = ref(false);
  const isLoadingMessages = ref(false);
  const isSendingMessage = ref(false);
  const typingUsers = ref(new Map()); // chatId -> { userId, isTyping }
  const onlineUsers = ref(new Set());
  const unreadCount = ref(0);

  // Computed
  const sortedChats = computed(() => {
    return [...chats.value].sort((a, b) => {
      const dateA = new Date(a.lastMessage?.createdAt || a.createdAt);
      const dateB = new Date(b.lastMessage?.createdAt || b.createdAt);
      return dateB - dateA;
    });
  });

  const totalUnreadCount = computed(() => {
    return chats.value.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
  });

  // Initialize Socket.IO listeners
  function initializeSocketListeners() {
    const authStore = useAuthStore();
    
    if (!socketService.isConnected()) {
      console.log('Connecting socket...');
      socketService.connect(authStore.token);
    }

    // Listen for new messages
    socketService.onNewMessage((data) => {
      console.log('📨 Received new message:', data);
      handleNewMessage(data);
    });

    // Listen for typing indicators
    socketService.onUserTyping((data) => {
      console.log('⌨️ User typing:', data);
      handleTypingIndicator(data);
    });

    // Listen for read receipts
    socketService.onMessagesRead((data) => {
      console.log('✓✓ Messages read:', data);
      handleMessagesRead(data);
    });

    // Listen for online status
    socketService.onUserOnline((data) => {
      console.log('🟢 User online:', data.userId);
      onlineUsers.value.add(data.userId);
    });

    socketService.onUserOffline((data) => {
      console.log('⚫ User offline:', data.userId);
      onlineUsers.value.delete(data.userId);
    });
  }

  // Handle incoming real-time message
  function handleNewMessage(data) {
    const authStore = useAuthStore();
    const { chatId, message } = data;

    // Add isMine flag based on sender
    const senderId = message.senderId?._id || message.senderId;
    message.isMine = senderId === authStore.user?._id;

    // Update current chat messages if viewing this chat
    if (currentChat.value?._id === chatId) {
      // Check if message already exists (to avoid duplicates)
      const exists = messages.value.some(m => m._id === message._id);
      if (!exists) {
        messages.value.push(message);
        
        // Auto-mark as read if it's not your own message
        if (!message.isMine) {
          markChatAsRead(chatId);
        }
      }
    }

    // Update chat list
    const chatIndex = chats.value.findIndex(c => c._id === chatId);
    if (chatIndex !== -1) {
      chats.value[chatIndex].lastMessage = message;
      chats.value[chatIndex].updatedAt = message.createdAt;
      
      // Increment unread count if not viewing the chat
      if (currentChat.value?._id !== chatId && !message.isMine) {
        chats.value[chatIndex].unreadCount = (chats.value[chatIndex].unreadCount || 0) + 1;
      }
    } else {
      // New chat, reload chat list
      loadUserChats();
    }
  }

  // Handle typing indicator
  function handleTypingIndicator(data) {
    const authStore = useAuthStore();
    const { chatId, userId, isTyping } = data;

    // Ignore own typing events
    if (userId === authStore.user?._id) return;

    if (isTyping) {
      typingUsers.value.set(chatId, { userId, isTyping: true });
    } else {
      typingUsers.value.delete(chatId);
    }
  }

  // Handle messages read
  function handleMessagesRead(data) {
    const { chatId, messageIds } = data;

    // Update messages in current chat
    if (currentChat.value?._id === chatId) {
      messages.value.forEach(msg => {
        if (messageIds.includes(msg._id)) {
          msg.isRead = true;
          msg.readAt = data.readAt;
        }
      });
    }
  }

  // Load all chats for current user
  async function loadUserChats() {
    try {
      isLoadingChats.value = true;
      const authStore = useAuthStore();

      const response = await axios.get(`${API_URL}/chat`, {
        headers: {
          Authorization: `Bearer ${authStore.token}`
        }
      });

      if (response.data.success) {
        chats.value = response.data.data;
        console.log('✅ Loaded chats:', chats.value.length);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      throw error;
    } finally {
      isLoadingChats.value = false;
    }
  }

  // Load specific chat with messages
  async function loadChatById(chatId) {
    try {
      isLoadingMessages.value = true;
      const authStore = useAuthStore();

      const response = await axios.get(`${API_URL}/chat/${chatId}`, {
        headers: {
          Authorization: `Bearer ${authStore.token}`
        }
      });

      if (response.data.success) {
        currentChat.value = response.data.data.chat;
        messages.value = response.data.data.messages || [];
        
        // Join the chat room via socket
        socketService.joinChat(chatId);
        
        // Mark messages as read
        await markChatAsRead(chatId);
        
        console.log('✅ Loaded chat:', chatId, 'Messages:', messages.value.length);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
      throw error;
    } finally {
      isLoadingMessages.value = false;
    }
  }

  // Send a message
  async function sendMessage(chatId, content, messageType = 'text', attachments = []) {
    try {
      isSendingMessage.value = true;
      const authStore = useAuthStore();

      const response = await axios.post(
        `${API_URL}/chat/${chatId}/message`,
        {
          content,
          messageType,
          attachments
        },
        {
          headers: {
            Authorization: `Bearer ${authStore.token}`
          }
        }
      );

      if (response.data.success) {
        const newMessage = response.data.data;
        
        // Add to messages if not already added by socket
        const exists = messages.value.some(m => m._id === newMessage._id);
        if (!exists && currentChat.value?._id === chatId) {
          messages.value.push(newMessage);
        }

        // Update chat list
        const chatIndex = chats.value.findIndex(c => c._id === chatId);
        if (chatIndex !== -1) {
          chats.value[chatIndex].lastMessage = newMessage;
          chats.value[chatIndex].updatedAt = newMessage.createdAt;
        }

        console.log('✅ Message sent:', newMessage._id);
        return newMessage;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    } finally {
      isSendingMessage.value = false;
    }
  }

  // Mark chat as read
  async function markChatAsRead(chatId) {
    try {
      const authStore = useAuthStore();

      await axios.put(
        `${API_URL}/chat/${chatId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authStore.token}`
          }
        }
      );

      // Update unread count locally
      const chatIndex = chats.value.findIndex(c => c._id === chatId);
      if (chatIndex !== -1) {
        chats.value[chatIndex].unreadCount = 0;
      }

      // Update messages in current chat
      if (currentChat.value?._id === chatId) {
        messages.value.forEach(msg => {
          if (!msg.isMine) {
            msg.isRead = true;
            msg.readAt = new Date();
          }
        });
      }

      console.log('✅ Chat marked as read:', chatId);
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  }

  // Start typing
  function startTyping(chatId) {
    socketService.startTyping(chatId);
  }

  // Stop typing
  function stopTyping(chatId) {
    socketService.stopTyping(chatId);
  }

  // Check if user is typing in a chat
  function isUserTypingInChat(chatId) {
    return typingUsers.value.has(chatId);
  }

  // Check if user is online
  function isUserOnline(userId) {
    return onlineUsers.value.has(userId);
  }

  // Leave current chat
  function leaveCurrentChat() {
    if (currentChat.value) {
      socketService.leaveChat(currentChat.value._id);
      currentChat.value = null;
      messages.value = [];
    }
  }

  // Cleanup
  function cleanup() {
    leaveCurrentChat();
    socketService.removeAllListeners();
    socketService.disconnect();
    chats.value = [];
    messages.value = [];
    typingUsers.value.clear();
    onlineUsers.value.clear();
  }

  return {
    // State
    chats,
    currentChat,
    messages,
    isLoadingChats,
    isLoadingMessages,
    isSendingMessage,
    typingUsers,
    onlineUsers,
    unreadCount,

    // Computed
    sortedChats,
    totalUnreadCount,

    // Actions
    initializeSocketListeners,
    loadUserChats,
    loadChatById,
    sendMessage,
    markChatAsRead,
    startTyping,
    stopTyping,
    isUserTypingInChat,
    isUserOnline,
    leaveCurrentChat,
    cleanup
  };
});
```

---

## Chat Component Implementation

### **1. Chat List Component**

Display all chats with real-time updates.

**File: `src/components/ChatList.vue`**

```vue
<template>
  <div class="chat-list">
    <div class="chat-list-header">
      <h2>Messages</h2>
      <span v-if="totalUnreadCount > 0" class="unread-badge">
        {{ totalUnreadCount }}
      </span>
    </div>

    <div v-if="isLoadingChats" class="loading">
      Loading chats...
    </div>

    <div v-else-if="sortedChats.length === 0" class="empty-state">
      No chats yet
    </div>

    <div v-else class="chats">
      <div
        v-for="chat in sortedChats"
        :key="chat._id"
        class="chat-item"
        :class="{ active: currentChat?._id === chat._id }"
        @click="selectChat(chat._id)"
      >
        <!-- Counterpart info -->
        <div class="chat-avatar">
          <div class="avatar-circle">
            {{ chat.counterpart?.firstName?.[0] || '?' }}
          </div>
          <div
            v-if="isUserOnline(chat.counterpart?._id)"
            class="online-indicator"
          ></div>
        </div>

        <div class="chat-info">
          <div class="chat-header">
            <h3 class="chat-name">
              {{ chat.counterpart?.firstName }} {{ chat.counterpart?.lastName }}
            </h3>
            <span class="chat-time">
              {{ formatTime(chat.lastMessage?.createdAt) }}
            </span>
          </div>

          <div class="chat-preview">
            <p class="last-message">
              {{ chat.lastMessage?.content || 'No messages yet' }}
            </p>
            <span v-if="chat.unreadCount > 0" class="unread-count">
              {{ chat.unreadCount }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useChatStore } from '@/stores/chatStore';
import { useRouter } from 'vue-router';

const router = useRouter();
const chatStore = useChatStore();

const {
  sortedChats,
  currentChat,
  isLoadingChats,
  totalUnreadCount
} = storeToRefs(chatStore);

onMounted(async () => {
  // Initialize socket listeners
  chatStore.initializeSocketListeners();
  
  // Load chats
  await chatStore.loadUserChats();
});

onUnmounted(() => {
  chatStore.cleanup();
});

function selectChat(chatId) {
  router.push(`/chat/${chatId}`);
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  // Less than 1 minute
  if (diff < 60000) return 'Just now';
  
  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }
  
  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }
  
  // Show date
  return date.toLocaleDateString();
}

function isUserOnline(userId) {
  return chatStore.isUserOnline(userId);
}
</script>

<style scoped>
.chat-list {
  height: 100vh;
  background: white;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
}

.chat-list-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-list-header h2 {
  margin: 0;
  font-size: 24px;
}

.unread-badge {
  background: #f44336;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.loading, .empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #999;
}

.chat-item {
  display: flex;
  padding: 16px 20px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.chat-item:hover {
  background: #f5f5f5;
}

.chat-item.active {
  background: #e3f2fd;
}

.chat-avatar {
  position: relative;
  margin-right: 12px;
}

.avatar-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #2196f3;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
}

.online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #4caf50;
  border: 2px solid white;
}

.chat-info {
  flex: 1;
  min-width: 0;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.chat-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.chat-time {
  font-size: 12px;
  color: #999;
}

.chat-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.last-message {
  margin: 0;
  font-size: 14px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.unread-count {
  background: #2196f3;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: bold;
  margin-left: 8px;
}
</style>
```

---

### **2. Chat Window Component**

Display messages and handle real-time updates.

**File: `src/components/ChatWindow.vue`**

```vue
<template>
  <div class="chat-window">
    <!-- Chat Header -->
    <div v-if="currentChat" class="chat-header">
      <div class="counterpart-info">
        <div class="avatar-small">
          {{ currentChat.counterpart?.firstName?.[0] || '?' }}
        </div>
        <div>
          <h3 class="counterpart-name">
            {{ currentChat.counterpart?.firstName }}
            {{ currentChat.counterpart?.lastName }}
          </h3>
          <p class="counterpart-status">
            <span
              v-if="isUserOnline(currentChat.counterpart?._id)"
              class="status-online"
            >
              Online
            </span>
            <span v-else class="status-offline">Offline</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Messages Container -->
    <div ref="messagesContainer" class="messages-container">
      <div v-if="isLoadingMessages" class="loading">
        Loading messages...
      </div>

      <div v-else-if="messages.length === 0" class="empty-messages">
        No messages yet. Start the conversation!
      </div>

      <div v-else class="messages">
        <div
          v-for="message in messages"
          :key="message._id"
          class="message-wrapper"
          :class="{ 'my-message': message.isMine }"
        >
          <div class="message">
            <p class="message-content">{{ message.content }}</p>
            <div class="message-meta">
              <span class="message-time">
                {{ formatMessageTime(message.createdAt) }}
              </span>
              <span v-if="message.isMine" class="read-status">
                {{ message.isRead ? '✓✓' : '✓' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Typing Indicator -->
      <div v-if="isTyping" class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>

    <!-- Message Input -->
    <div class="message-input-container">
      <textarea
        v-model="messageText"
        class="message-input"
        placeholder="Type a message..."
        rows="1"
        @keydown.enter.exact.prevent="handleSendMessage"
        @input="handleTyping"
        @blur="handleStopTyping"
      ></textarea>
      <button
        class="send-button"
        :disabled="!messageText.trim() || isSendingMessage"
        @click="handleSendMessage"
      >
        <span v-if="isSendingMessage">Sending...</span>
        <span v-else>Send</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useChatStore } from '@/stores/chatStore';

const route = useRoute();
const chatStore = useChatStore();

const {
  currentChat,
  messages,
  isLoadingMessages,
  isSendingMessage,
  typingUsers
} = storeToRefs(chatStore);

const messageText = ref('');
const messagesContainer = ref(null);
const typingTimeout = ref(null);

// Computed
const chatId = computed(() => route.params.chatId);

const isTyping = computed(() => {
  return chatStore.isUserTypingInChat(chatId.value);
});

// Load chat when component mounts or chatId changes
watch(chatId, async (newChatId) => {
  if (newChatId) {
    await chatStore.loadChatById(newChatId);
    scrollToBottom();
  }
}, { immediate: true });

// Auto-scroll when new messages arrive
watch(messages, () => {
  nextTick(() => {
    scrollToBottom();
  });
}, { deep: true });

onMounted(() => {
  // Ensure socket listeners are initialized
  if (!chatStore.currentChat) {
    chatStore.initializeSocketListeners();
  }
});

onUnmounted(() => {
  chatStore.leaveCurrentChat();
  handleStopTyping();
});

// Methods
async function handleSendMessage() {
  if (!messageText.value.trim() || isSendingMessage.value) return;

  const text = messageText.value.trim();
  messageText.value = '';

  try {
    await chatStore.sendMessage(chatId.value, text);
    handleStopTyping();
    scrollToBottom();
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Failed to send message. Please try again.');
  }
}

function handleTyping() {
  // Clear existing timeout
  if (typingTimeout.value) {
    clearTimeout(typingTimeout.value);
  }

  // Emit typing start
  chatStore.startTyping(chatId.value);

  // Set timeout to emit typing stop after 2 seconds of inactivity
  typingTimeout.value = setTimeout(() => {
    handleStopTyping();
  }, 2000);
}

function handleStopTyping() {
  if (typingTimeout.value) {
    clearTimeout(typingTimeout.value);
    typingTimeout.value = null;
  }
  chatStore.stopTyping(chatId.value);
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

function formatMessageTime(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function isUserOnline(userId) {
  return chatStore.isUserOnline(userId);
}
</script>

<style scoped>
.chat-window {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.chat-header {
  background: white;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.counterpart-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-small {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #2196f3;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
}

.counterpart-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.counterpart-status {
  margin: 0;
  font-size: 12px;
}

.status-online {
  color: #4caf50;
}

.status-offline {
  color: #999;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.loading,
.empty-messages {
  text-align: center;
  color: #999;
  padding: 40px;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-wrapper {
  display: flex;
  justify-content: flex-start;
}

.message-wrapper.my-message {
  justify-content: flex-end;
}

.message {
  max-width: 60%;
  background: white;
  padding: 10px 14px;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.my-message .message {
  background: #2196f3;
  color: white;
}

.message-content {
  margin: 0 0 4px 0;
  word-wrap: break-word;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
}

.message-time {
  font-size: 11px;
  opacity: 0.7;
}

.read-status {
  font-size: 12px;
  color: #4caf50;
}

.my-message .read-status {
  color: rgba(255, 255, 255, 0.8);
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 10px;
  background: white;
  border-radius: 12px;
  width: fit-content;
  margin-top: 8px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #999;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}

.message-input-container {
  background: white;
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  font-size: 14px;
  resize: none;
  font-family: inherit;
  max-height: 120px;
}

.message-input:focus {
  outline: none;
  border-color: #2196f3;
}

.send-button {
  padding: 10px 24px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.send-button:hover:not(:disabled) {
  background: #1976d2;
}

.send-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
```

---

### **3. Initialize Socket in App.vue**

Connect socket when user logs in.

**File: `src/App.vue`** (or `src/layouts/MainLayout.vue`)

```vue
<script setup>
import { onMounted, onUnmounted, watch } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';

const authStore = useAuthStore();
const chatStore = useChatStore();

// Initialize socket when user is authenticated
watch(
  () => authStore.isAuthenticated,
  (isAuth) => {
    if (isAuth) {
      chatStore.initializeSocketListeners();
    } else {
      chatStore.cleanup();
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  chatStore.cleanup();
});
</script>
```

---

## Troubleshooting

### **1. Socket Not Connecting**

**Problem:** Socket connection fails with authentication error.

**Solution:**
- Ensure you're passing the JWT token correctly:
```javascript
socketService.connect(authStore.token);
```

- Check backend is running on the correct port
- Verify CORS is enabled on backend for your frontend URL

### **2. Messages Not Appearing in Real-Time**

**Problem:** Messages appear after page refresh but not in real-time.

**Solution:**
- Ensure you're joining the chat room:
```javascript
socketService.joinChat(chatId);
```

- Check `onNewMessage` listener is set up before loading the chat
- Verify backend is emitting `new_message` event (check backend logs)

### **3. Duplicate Messages**

**Problem:** Same message appears twice.

**Solution:**
- Check for duplicate message IDs before adding:
```javascript
const exists = messages.value.some(m => m._id === message._id);
if (!exists) {
  messages.value.push(message);
}
```

### **4. Messages Appearing on Wrong Side**

**Problem:** Your messages appear on left (incoming) side.

**Solution:**
- Ensure `isMine` flag is set correctly in backend response
- Verify `message.isMine` is being checked in template:
```vue
:class="{ 'my-message': message.isMine }"
```

### **5. Read Receipts Not Working**

**Problem:** Messages not marked as read.

**Solution:**
- Call `markChatAsRead` when opening chat:
```javascript
await chatStore.loadChatById(chatId);
await chatStore.markChatAsRead(chatId);
```

- Ensure socket is emitting `mark_messages_read` event
- Check backend is processing the read status update

---

## Environment Variables

Create `.env` file in your Vue.js project:

```env
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
```

For production:
```env
VITE_API_URL=https://your-api.com/api
VITE_SOCKET_URL=https://your-api.com
```

---

## Complete Flow Summary

```
1. User logs in → Socket connects with JWT
2. Load chat list → Display all chats
3. Click on chat → Join chat room via socket
4. Load messages → Display with isMine flag
5. Type message → Emit typing indicator
6. Send message → HTTP POST + Socket emits to room
7. Receive message → Socket listener adds to UI
8. Mark as read → HTTP PUT + Socket emits read receipt
9. User goes offline → Socket disconnects
```

---

## Testing

### **Test Socket Connection**

```javascript
// In browser console
console.log('Socket connected:', socketService.isConnected());
```

### **Test Real-Time Messages**

1. Open chat in two different browsers (different users)
2. Send message from Browser A
3. Should appear immediately in Browser B
4. Check browser console for socket events

### **Test Typing Indicators**

1. Start typing in Browser A
2. Browser B should show "typing..." indicator
3. Stop typing → indicator disappears

---

## 🎉 Done!

Your real-time chat is now fully functional with:

✅ WebSocket connection with JWT authentication  
✅ Real-time message sending/receiving  
✅ Typing indicators  
✅ Read receipts  
✅ Online/offline status  
✅ Message ownership (left/right display)  
✅ Unread message counts  
✅ Auto-scroll to latest message  

Need help? Check the troubleshooting section or backend logs for debugging.

