# 🚀 Production WebSocket Deployment Guide

## 📋 **Pre-Deployment Checklist**

### **1. Environment Variables**
Create a production `.env` file with these variables:

```env
# Core Configuration
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://your-production-mongodb-uri

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=7d

# Frontend Configuration
FRONTEND_URL=https://yourdomain.com,https://www.yourdomain.com

# WebSocket Configuration
SOCKET_MAX_CONNECTIONS=1000

# Optional: Redis for scaling (if using multiple instances)
REDIS_URL=redis://your-redis-instance:6379

# Email Configuration (if using email features)
ZEPTO_MAIL_URL=api.zeptomail.com/
ZEPTO_MAIL_TOKEN=Zoho-enczapikey YOUR_API_KEY
ZEPTO_FROM_ADDRESS=noreply@yourdomain.com
ZEPTO_FROM_NAME=Khayalami

# AI Configuration (if using AI features)
DEEP_SEEK=your-deepseek-api-key
```

### **2. Security Considerations**

#### **CORS Configuration**
- ✅ **Production**: Only allow your frontend domains
- ✅ **Development**: Allow all origins for testing
- ✅ **Credentials**: Enabled for authentication

#### **Socket.IO Security**
- ✅ **Authentication**: JWT token validation on every connection
- ✅ **Rate Limiting**: Implement connection rate limiting
- ✅ **Message Size**: Limited to 1MB per message
- ✅ **Ping Timeouts**: Optimized for production (60s timeout, 25s interval)

### **3. Performance Optimizations**

#### **Connection Management**
```typescript
// Production settings applied automatically:
pingTimeout: 60000,        // 60 seconds
pingInterval: 25000,       // 25 seconds
maxHttpBufferSize: 1e6,   // 1MB max message
perMessageDeflate: {        // Compression
  threshold: 1024,
  concurrencyLimit: 10,
  memLevel: 7
}
```

#### **Transport Configuration**
- ✅ **WebSocket**: Primary transport (faster)
- ✅ **Polling**: Fallback transport (more compatible)
- ✅ **Upgrades**: Automatic transport upgrades

## 🌐 **Deployment Platforms**

### **Option 1: Single Server (Simple)**

#### **Requirements:**
- Node.js 18+ server
- MongoDB instance
- Reverse proxy (Nginx/Apache)

#### **Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket specific headers
        proxy_set_header Connection "upgrade";
        proxy_set_header Upgrade $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

### **Option 2: Multiple Instances (Scalable)**

#### **Requirements:**
- Load balancer
- Multiple Node.js instances
- Redis for session sharing
- MongoDB cluster

#### **Redis Adapter Setup:**
```bash
npm install @socket.io/redis-adapter redis
```

#### **Code Changes for Scaling:**
```typescript
// Add to src/app.ts for Redis adapter
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

if (envConfig.isProduction() && process.env.REDIS_URL) {
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();
  
  await Promise.all([pubClient.connect(), subClient.connect()]);
  
  io.adapter(createAdapter(pubClient, subClient));
}
```

## 🔧 **Production Configuration**

### **1. Process Management**
Use PM2 for process management:

```bash
npm install -g pm2
```

#### **PM2 Ecosystem File (`ecosystem.config.js`):**
```javascript
module.exports = {
  apps: [{
    name: 'khaya-backend',
    script: 'dist/app.js',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // WebSocket specific settings
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    // Graceful shutdown for WebSocket connections
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
```

#### **Start with PM2:**
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### **2. Monitoring & Logging**

#### **Socket.IO Monitoring:**
```typescript
// Add to SocketService.ts
if (envConfig.isProduction()) {
  // Monitor connection counts
  setInterval(() => {
    const connectionCount = io.engine.clientsCount;
    logger.info(`WebSocket connections: ${connectionCount}`);
    
    if (connectionCount > (envConfig.get('SOCKET_MAX_CONNECTIONS') || 1000)) {
      logger.warn(`High connection count: ${connectionCount}`);
    }
  }, 30000); // Every 30 seconds
}
```

#### **Health Check Endpoint:**
```typescript
// Add to app.ts
app.get('/health/websocket', (req, res) => {
  res.json({
    status: 'OK',
    connections: io.engine.clientsCount,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

## 🚨 **Common Production Issues & Solutions**

### **1. Connection Limits**
**Problem**: Too many concurrent connections
**Solution**: 
- Implement connection limits
- Use Redis adapter for scaling
- Monitor connection counts

### **2. Memory Leaks**
**Problem**: Memory usage grows over time
**Solution**:
- Proper cleanup on disconnect
- Monitor memory usage
- Restart processes periodically

### **3. Authentication Failures**
**Problem**: JWT tokens expire during long connections
**Solution**:
- Implement token refresh mechanism
- Handle authentication errors gracefully
- Reconnect on auth failure

### **4. Network Issues**
**Problem**: Connections drop frequently
**Solution**:
- Increase ping timeouts
- Implement reconnection logic
- Use multiple transport methods

## 📊 **Performance Monitoring**

### **Key Metrics to Monitor:**
- ✅ **Connection Count**: Active WebSocket connections
- ✅ **Message Rate**: Messages per second
- ✅ **Memory Usage**: Node.js memory consumption
- ✅ **CPU Usage**: Server CPU utilization
- ✅ **Response Times**: API response times
- ✅ **Error Rates**: Failed connections/messages

### **Monitoring Tools:**
- **PM2 Monitoring**: `pm2 monit`
- **Custom Metrics**: Add to your SocketService
- **External Monitoring**: New Relic, DataDog, etc.

## 🔒 **Security Best Practices**

### **1. Rate Limiting**
```typescript
// Add rate limiting middleware
import rateLimit from 'express-rate-limit';

const socketRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many connection attempts'
});

app.use('/socket.io/', socketRateLimit);
```

### **2. Input Validation**
- ✅ Validate all incoming messages
- ✅ Sanitize user input
- ✅ Limit message size
- ✅ Implement message rate limiting per user

### **3. Authentication**
- ✅ JWT token validation on every connection
- ✅ Token expiration handling
- ✅ User role verification
- ✅ Session management

## 🎯 **Frontend Configuration**

### **Client-Side Socket.IO Setup:**
```javascript
import { io } from 'socket.io-client';

const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:3000', {
  auth: {
    token: localStorage.getItem('token')
  },
  transports: ['websocket', 'polling'],
  timeout: 20000,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  maxReconnectionAttempts: 5
});
```

## ✅ **Deployment Checklist**

- [ ] Environment variables configured
- [ ] CORS settings updated for production domains
- [ ] JWT secrets are secure and unique
- [ ] Database connection string is production-ready
- [ ] Reverse proxy configured (if using)
- [ ] Process manager installed (PM2)
- [ ] Monitoring setup
- [ ] SSL certificates configured
- [ ] Rate limiting implemented
- [ ] Error handling tested
- [ ] Health check endpoints working
- [ ] WebSocket connections tested
- [ ] Authentication flow tested
- [ ] Performance monitoring active

## 🚀 **Go Live Steps**

1. **Deploy to staging** and test WebSocket functionality
2. **Run load tests** to ensure performance
3. **Configure monitoring** and alerts
4. **Deploy to production** during low-traffic hours
5. **Monitor closely** for the first 24 hours
6. **Test all WebSocket features** in production
7. **Verify authentication** and security measures

Your WebSocket setup is now production-ready! 🎉
