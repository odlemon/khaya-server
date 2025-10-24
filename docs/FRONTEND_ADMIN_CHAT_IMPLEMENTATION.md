# Frontend Implementation - Admin Chat Integration

Quick guide for frontend developers to integrate admin chat features into the tenant/landlord apps.

---

## 🎯 What Changed?

Admins can now join tenant-landlord chats and send:
- **Public messages** - Everyone sees them
- **Private messages** - Only tagged person sees them (using @landlord or @tenant)

---

## 📦 What Your Frontend Needs to Handle

### **1. New Message Fields**

Messages now include these additional fields:

```typescript
interface Message {
  _id: string;
  senderId: {
    _id: string;
    firstName: string;
    lastName: string;
    role: "tenant" | "landlord" | "admin";  // NEW: admin role
  };
  senderRole: "tenant" | "landlord" | "admin";  // NEW
  content: string;
  isMine: boolean;
  isPrivate: boolean;  // NEW: true if this is a private @mention message
  taggedUser?: "landlord" | "tenant";  // NEW: who was tagged
  visibleTo?: string[];  // NEW: array of user IDs who can see this
  createdAt: string;
  isRead: boolean;
}
```

---

## 🎨 UI Changes Needed

### **1. Show Admin Badge on Messages**

When `senderRole === "admin"`, display an admin badge:

```jsx
// Example in React/Vue
{message.senderRole === "admin" && (
  <span className="admin-badge">
    👤 Admin
  </span>
)}
```

**Visual:**
```
┌─────────────────────────────────┐
│ 👤 Admin                        │
│ Hello, I'm monitoring this chat │
│ 10:30 AM                        │
└─────────────────────────────────┘
```

---

### **2. Show Private Message Indicator**

When `isPrivate === true`, show it's a private message:

```jsx
{message.isPrivate && (
  <span className="private-badge">
    🔒 Private
  </span>
)}
```

**Visual:**
```
┌─────────────────────────────────┐
│ 👤 Admin  🔒 Private            │
│ @landlord Please verify docs    │
│ 10:35 AM                        │
└─────────────────────────────────┘
```

---

### **3. Complete Message Component Example**

```jsx
function MessageItem({ message, currentUserId }) {
  const isMine = message.senderId._id === currentUserId;
  const isAdmin = message.senderRole === "admin";
  
  return (
    <div className={`message ${isMine ? 'mine' : 'theirs'}`}>
      {/* Header with badges */}
      <div className="message-header">
        <span className="sender-name">
          {isMine ? 'You' : message.senderId.firstName}
        </span>
        
        {/* Admin badge */}
        {isAdmin && (
          <span className="badge admin-badge">
            👤 Admin
          </span>
        )}
        
        {/* Private badge */}
        {message.isPrivate && (
          <span className="badge private-badge">
            🔒 Private
          </span>
        )}
      </div>
      
      {/* Message content */}
      <p className="message-content">{message.content}</p>
      
      {/* Time and read status */}
      <div className="message-footer">
        <span className="time">{formatTime(message.createdAt)}</span>
        {isMine && (
          <span className="read-status">
            {message.isRead ? '✓✓' : '✓'}
          </span>
        )}
      </div>
    </div>
  );
}
```

---

### **4. CSS Styling (Optional)**

```css
.admin-badge {
  background: #9333ea;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.private-badge {
  background: #ea580c;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.message.admin-message {
  border-left: 3px solid #9333ea;
}
```

---

## 🔧 No API Changes Needed

Your existing chat API calls work as-is:

### **Load Chat**
```javascript
GET /api/chat/{chatId}
// Returns messages with new fields automatically
```

### **Send Message**
```javascript
POST /api/chat/{chatId}/messages
{
  "content": "Hello admin, I have a question"
}
// Works normally - admin will see it
```

### **Real-time Updates**
```javascript
socket.on('new_message', (data) => {
  // Handle new message
  // Check message.senderRole and message.isPrivate
});
```

---

## 📋 Implementation Checklist

### **Required:**
- [ ] Add `senderRole` to message interface/type
- [ ] Add `isPrivate` field to message interface/type
- [ ] Display admin badge when `senderRole === "admin"`
- [ ] Display private badge when `isPrivate === true`

### **Recommended:**
- [ ] Add `taggedUser` field for clarity
- [ ] Style admin messages differently (border/background)
- [ ] Show notification when admin joins chat
- [ ] Add tooltip explaining private messages

### **Optional:**
- [ ] Show "Admin is typing..." differently
- [ ] Add admin icon/avatar
- [ ] Show "Admin has joined the conversation" system message

---

## 🎨 Visual Examples

### **Example 1: Normal Flow**

```
Tenant (You):    "Is this property available?"
Landlord:        "Yes, when would you like to view it?"

--- Admin joins ---

👤 Admin:        "Hello, I'm monitoring this conversation"
Tenant (You):    "Great! Can we schedule a viewing?"
```

---

### **Example 2: Private Message (Landlord View)**

```
Tenant:          "Is this property available?"
Landlord (You):  "Yes, it is"

👤 Admin 🔒 Private: "@landlord Please verify property ownership"
                     (Only you see this message)

Landlord (You):  "Documents uploaded"
Tenant:          "When can I view it?"
```

---

### **Example 3: Private Message (Tenant View)**

```
Tenant (You):    "Is this property available?"
Landlord:        "Yes, it is"

👤 Admin 🔒 Private: "@tenant Please provide your ID verification"
                     (Only you see this message)

Tenant (You):    "ID submitted"
Landlord:        "Great, let's schedule a viewing"
```

---

## 🧪 Testing

### **Test Case 1: Admin Joins Chat**
1. Open existing tenant-landlord chat
2. Admin joins from admin portal
3. Frontend should show all messages including admin's
4. No errors should occur

### **Test Case 2: Admin Public Message**
1. Admin sends: "Hello everyone"
2. Both tenant and landlord should see it
3. Message should have admin badge 👤

### **Test Case 3: Admin Private Message**
1. Admin sends: "@landlord Please verify"
2. Landlord sees message with 🔒 badge
3. Tenant does NOT see this message

### **Test Case 4: Real-time Updates**
1. Open chat in two browsers (tenant & landlord)
2. Admin sends message from admin portal
3. Both should receive it instantly via socket

---

## 📱 Mobile App Considerations

### **React Native / Flutter:**

Same logic applies, just adjust the UI components:

```jsx
// React Native Example
<View style={styles.message}>
  {message.senderRole === 'admin' && (
    <View style={styles.adminBadge}>
      <Text style={styles.badgeText}>👤 Admin</Text>
    </View>
  )}
  
  {message.isPrivate && (
    <View style={styles.privateBadge}>
      <Text style={styles.badgeText}>🔒 Private</Text>
    </View>
  )}
  
  <Text>{message.content}</Text>
</View>
```

---

## ❓ FAQ

### **Q: What if I don't show the admin badge?**
A: Users might be confused about who sent the message. It's recommended to show it.

### **Q: Do I need to handle @mentions in the input?**
A: No! Only admins can send @mentions. Tenants/landlords send normal messages.

### **Q: Will old chats break?**
A: No! Old messages without these fields will work fine. Just add fallbacks:
```javascript
const isAdmin = message.senderRole === "admin" || false;
const isPrivate = message.isPrivate || false;
```

### **Q: Do I need to filter messages on frontend?**
A: No! Backend already filters. You only receive messages you're allowed to see.

---

## 🚀 Summary

**What You Need to Do:**
1. Add 3 new fields to your message type: `senderRole`, `isPrivate`, `taggedUser`
2. Show admin badge (👤) when `senderRole === "admin"`
3. Show private badge (🔒) when `isPrivate === true`
4. Style them nicely so users understand

**What You DON'T Need to Do:**
- Change API endpoints
- Add new API calls
- Change socket connection
- Filter messages manually

That's it! Simple changes for a powerful feature. 🎉



