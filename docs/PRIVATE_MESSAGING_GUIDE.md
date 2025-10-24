# Private Messaging with @Mentions - Complete Guide

Everyone in the chat (tenant, landlord, admin) can now send private messages using @mentions!

---

## 🎯 How It Works

### **Anyone can tag anyone:**
- **Tenant** can tag `@landlord` or `@admin`
- **Landlord** can tag `@tenant` or `@admin`
- **Admin** can tag `@tenant` or `@landlord`

---

## 📝 Request Body Examples

### **1. Tenant sends private message to Admin**

```json
POST /api/chat/{chatId}/messages
Authorization: Bearer <tenant_token>

{
  "content": "@admin I have a problem with this landlord"
}
```

**Result:**
- Only **Tenant + Admin** see this message
- Landlord does **NOT** see it

---

### **2. Landlord sends private message to Admin**

```json
POST /api/chat/{chatId}/messages
Authorization: Bearer <landlord_token>

{
  "content": "@admin This tenant is not responding"
}
```

**Result:**
- Only **Landlord + Admin** see this message
- Tenant does **NOT** see it

---

### **3. Admin sends private message to Tenant**

```json
POST /api/chat/{chatId}/messages
Authorization: Bearer <admin_token>

{
  "content": "@tenant Please provide your ID documents"
}
```

**Result:**
- Only **Admin + Tenant** see this message
- Landlord does **NOT** see it

---

### **4. Tenant sends private message to Landlord**

```json
POST /api/chat/{chatId}/messages
Authorization: Bearer <tenant_token>

{
  "content": "@landlord Can we reduce the rent?"
}
```

**Result:**
- Only **Tenant + Landlord** see this message
- Admin does **NOT** see it (unless admin is tagged)

---

### **5. Public Message (No Tag)**

```json
POST /api/chat/{chatId}/messages
Authorization: Bearer <any_token>

{
  "content": "Hello everyone!"
}
```

**Result:**
- **Everyone** sees it (Tenant + Landlord + Admin)

---

## 🎨 Visual Example

### **Complete Conversation:**

```
Tenant (You):    "Is this property available?"
Landlord:        "Yes, it is"

Tenant (You):    "@admin I need help with verification" 🔒
                 (Only you and admin see this)

Admin:           "@tenant Sure, please upload your ID" 🔒
                 (Only tenant and admin see this)

Landlord:        "When would you like to view it?"

Tenant (You):    "@landlord Can we schedule for tomorrow?"
                 (Only tenant and landlord see this)

Admin:           "Hello everyone, I'm monitoring this chat"
                 (Everyone sees this)
```

---

## 🔑 Available Tags

- `@tenant` - Tag the tenant
- `@landlord` - Tag the landlord
- `@admin` - Tag the admin

**Case-insensitive:** `@Admin`, `@ADMIN`, `@admin` all work!

---

## ⚙️ Backend Processing

1. **Message sent with @mention**
2. **Backend parses the content** (looks for @landlord, @tenant, @admin)
3. **Finds the tagged user** in chat participants
4. **Sets `visibleTo`** = [sender + tagged user]
5. **Saves message** with visibility restrictions
6. **Sends notifications** only to visible users
7. **Socket emits** only to visible users' rooms

---

## 🔒 Privacy Rules

| Sender | Tag | Who Sees It |
|--------|-----|-------------|
| Tenant | `@admin` | Tenant + Admin |
| Tenant | `@landlord` | Tenant + Landlord |
| Landlord | `@admin` | Landlord + Admin |
| Landlord | `@tenant` | Landlord + Tenant |
| Admin | `@tenant` | Admin + Tenant |
| Admin | `@landlord` | Admin + Landlord |
| Anyone | (no tag) | Everyone |

---

## 💻 Frontend Implementation

### **Message Display:**

```jsx
function MessageItem({ message }) {
  return (
    <div className={`message ${message.isMine ? 'mine' : 'theirs'}`}>
      {/* Sender badge */}
      {message.senderRole === 'admin' && (
        <span className="badge admin">👤 Admin</span>
      )}
      
      {/* Private indicator */}
      {message.isPrivate && (
        <span className="badge private">
          🔒 Private to {message.taggedUser}
        </span>
      )}
      
      {/* Message content */}
      <p>{message.content}</p>
      
      {/* Time */}
      <span className="time">{formatTime(message.createdAt)}</span>
    </div>
  );
}
```

---

## 🧪 Testing

### **Test Case 1: Tenant tags Admin**

**Request:**
```json
POST /api/chat/123/messages
Authorization: Bearer <tenant_token>

{
  "content": "@admin Help me please"
}
```

**Expected:**
- Message saved with `visibleTo: [tenantId, adminId]`
- Tenant sees message
- Admin sees message
- Landlord does NOT see message

---

### **Test Case 2: Multiple Tags**

**Request:**
```json
{
  "content": "@admin @landlord both of you need to see this"
}
```

**Expected:**
- First tag takes priority (`@admin`)
- Message visible to sender + admin only

---

### **Test Case 3: No Tag**

**Request:**
```json
{
  "content": "Hello everyone"
}
```

**Expected:**
- `visibleTo` is empty/undefined
- Everyone sees the message

---

## 📱 Mobile App Example

### **React Native:**

```jsx
<View style={styles.messageContainer}>
  {/* Private badge */}
  {message.isPrivate && (
    <View style={styles.privateBadge}>
      <Text>🔒 Private to {message.taggedUser}</Text>
    </View>
  )}
  
  {/* Message content */}
  <Text>{message.content}</Text>
</View>
```

---

## ✅ Summary

**What Changed:**
1. ✅ Added `@admin` support to message parser
2. ✅ Updated `taggedUser` enum to include "admin"
3. ✅ Removed admin-only restriction for @mentions
4. ✅ Anyone can now send private messages

**How to Use:**
- Add `@tenant`, `@landlord`, or `@admin` in your message
- Backend handles the rest automatically
- Only sender + tagged user see the message

**Request Body:**
```json
{
  "content": "@admin your message here"
}
```

That's it! 🎉



