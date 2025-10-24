# 📹 Condition Logs API - Complete Guide

## 🎯 Overview

The Condition Logs system allows users to create video documentation of property conditions throughout the rental period. Users have **full control** to create, edit stage, and delete logs as needed.

---

## ✨ Key Features

✅ **User-Created Logs** - No predefined placeholders, users create when needed  
✅ **1 Video Required** - Single video upload per log  
✅ **Up to 3 Photos** - Additional photo documentation  
✅ **15 Stage Options** - move-in, month-1 through month-12, move-out, other  
✅ **Custom Labels** - For "other" stage type  
✅ **Edit Logs** - Change stage or update content  
✅ **Delete Logs** - Full CRUD control  
✅ **Both Parties Can Create** - Landlord or tenant  

---

## 📊 Log Stages (logType)

| Stage | Description |
|-------|-------------|
| `move-in` | Initial property condition when tenant moves in |
| `month-1` | 1-month check-in |
| `month-2` | 2-month check-in |
| `month-3` | 3-month check-in |
| `month-4` | 4-month check-in |
| `month-5` | 5-month check-in |
| `month-6` | 6-month check-in |
| `month-7` | 7-month check-in |
| `month-8` | 8-month check-in |
| `month-9` | 9-month check-in |
| `month-10` | 10-month check-in |
| `month-11` | 11-month check-in |
| `month-12` | 12-month check-in |
| `move-out` | Final property condition when tenant moves out |
| `other` | Custom log (requires `customLabel`) |

---

## 🔌 API Endpoints

### **1. Get Condition Logs**

**Endpoint:** `GET /api/rentals/:rentalId/condition-logs`

**Authentication:** Required

**Description:** Get all condition logs for a rental

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "log_id_1",
      "logType": "move-in",
      "videoUrl": "https://firebase.../move-in.mp4",
      "photoUrls": [
        "https://firebase.../photo1.jpg",
        "https://firebase.../photo2.jpg",
        "https://firebase.../photo3.jpg"
      ],
      "notes": "All rooms in excellent condition",
      "uploadedBy": "tenant",
      "uploadedAt": "2025-11-01T10:00:00Z",
      "createdAt": "2025-11-01T10:00:00Z"
    },
    {
      "_id": "log_id_2",
      "logType": "month-3",
      "videoUrl": "https://firebase.../month-3.mp4",
      "photoUrls": ["https://firebase.../photo1.jpg"],
      "notes": "Minor wear on kitchen floor",
      "uploadedBy": "tenant",
      "uploadedAt": "2026-02-01T14:30:00Z",
      "createdAt": "2026-02-01T14:30:00Z"
    },
    {
      "_id": "log_id_3",
      "logType": "other",
      "customLabel": "After Repairs",
      "videoUrl": "https://firebase.../repairs.mp4",
      "photoUrls": [],
      "notes": "Documenting repairs completed",
      "uploadedBy": "landlord",
      "uploadedAt": "2026-03-15T09:00:00Z",
      "createdAt": "2026-03-15T09:00:00Z"
    }
  ]
}
```

---

### **2. Create Condition Log**

**Endpoint:** `POST /api/rentals/:rentalId/condition-logs`

**Authentication:** Required (Both landlord & tenant)

**Description:** Create a new condition log

**Request Body:**
```json
{
  "logType": "move-in",
  "videoUrl": "https://firebasestorage.googleapis.com/.../move-in.mp4",
  "photoUrls": [
    "https://firebasestorage.googleapis.com/.../photo1.jpg",
    "https://firebasestorage.googleapis.com/.../photo2.jpg",
    "https://firebasestorage.googleapis.com/.../photo3.jpg"
  ],
  "notes": "All rooms in excellent condition. No visible damage."
}
```

**For "other" stage:**
```json
{
  "logType": "other",
  "customLabel": "After Painting",
  "videoUrl": "https://firebasestorage.googleapis.com/.../after-painting.mp4",
  "photoUrls": ["https://..."],
  "notes": "Property repainted by landlord"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Condition log created successfully",
  "data": {
    "_id": "log_id",
    "logType": "move-in",
    "videoUrl": "https://...",
    "photoUrls": ["https://...", "https://...", "https://..."],
    "notes": "All rooms in excellent condition",
    "uploadedBy": "tenant",
    "uploadedAt": "2025-11-01T10:00:00Z",
    "createdAt": "2025-11-01T10:00:00Z"
  }
}
```

**Validation:**
- `logType` - Required
- `videoUrl` - Required (1 video)
- `photoUrls` - Optional (max 3 photos)
- `customLabel` - Required if `logType` is "other"

---

### **3. Update Condition Log**

**Endpoint:** `PUT /api/rentals/condition-logs/:conditionLogId`

**Authentication:** Required (Both landlord & tenant)

**Description:** Update a condition log (change stage, update content)

**Request Body (all fields optional):**
```json
{
  "logType": "month-1",
  "videoUrl": "https://firebasestorage.googleapis.com/.../new-video.mp4",
  "photoUrls": ["https://..."],
  "notes": "Updated notes"
}
```

**Change stage only:**
```json
{
  "logType": "month-2"
}
```

**Update custom label:**
```json
{
  "customLabel": "After Deep Cleaning"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Condition log updated successfully",
  "data": {
    "_id": "log_id",
    "logType": "month-1",
    "videoUrl": "https://...",
    "photoUrls": ["https://..."],
    "notes": "Updated notes",
    "uploadedBy": "tenant",
    "uploadedAt": "2025-11-01T10:00:00Z",
    "updatedAt": "2025-12-01T15:30:00Z"
  }
}
```

**Note:** You can update any field(s) - stage, video, photos, or notes. All are optional.

---

### **4. Delete Condition Log**

**Endpoint:** `DELETE /api/rentals/condition-logs/:conditionLogId`

**Authentication:** Required (Both landlord & tenant)

**Description:** Permanently delete a condition log

**No Request Body Required**

**Response:**
```json
{
  "success": true,
  "message": "Condition log deleted successfully"
}
```

---

## 📊 Condition Log Data Model

```typescript
{
  _id: ObjectId,
  rentalId: ObjectId,
  agreementId: ObjectId,
  propertyId: ObjectId,
  tenantId: ObjectId,
  
  // Stage
  logType: "move-in" | "month-1" | ... | "month-12" | "move-out" | "other",
  customLabel: "After Repairs", // Only for "other" type
  
  // Media (video required, up to 3 photos)
  videoUrl: "https://firebase.../video.mp4",
  photoUrls: [
    "https://firebase.../photo1.jpg",
    "https://firebase.../photo2.jpg",
    "https://firebase.../photo3.jpg"
  ],
  
  notes: "All rooms in good condition",
  
  // Tracking
  uploadedBy: "tenant" | "landlord",
  uploadedAt: "2025-11-01T10:00:00Z",
  
  createdAt: "2025-11-01T10:00:00Z",
  updatedAt: "2025-11-01T10:00:00Z"
}
```

---

## 💻 Frontend Implementation

### **Condition Logs List**

```vue
<template>
  <div class="condition-logs-tab">
    <!-- Header with create button -->
    <div class="tab-header">
      <h2>Condition Logs</h2>
      <button @click="openCreateModal" class="btn-primary">
        + Add Condition Log
      </button>
    </div>

    <!-- No logs yet -->
    <div v-if="logs.length === 0" class="empty-state">
      <p>📹 No condition logs yet</p>
      <p>Create your first log to document property condition</p>
    </div>

    <!-- Logs list -->
    <div v-else class="logs-list">
      <div 
        v-for="log in logs" 
        :key="log._id"
        class="log-card"
      >
        <div class="log-header">
          <div>
            <h3>{{ formatLogType(log.logType) }}</h3>
            <p v-if="log.customLabel" class="custom-label">{{ log.customLabel }}</p>
          </div>
          
          <div class="log-actions">
            <button @click="editLog(log)" class="btn-icon">
              ✏️ Edit
            </button>
            <button @click="deleteLog(log._id)" class="btn-icon danger">
              🗑️ Delete
            </button>
          </div>
        </div>

        <!-- Video -->
        <div class="log-video">
          <video :src="log.videoUrl" controls></video>
        </div>

        <!-- Photos -->
        <div v-if="log.photoUrls.length > 0" class="log-photos">
          <img 
            v-for="(photo, idx) in log.photoUrls" 
            :key="idx"
            :src="photo"
            @click="viewFullImage(photo)"
          />
        </div>

        <!-- Notes -->
        <div v-if="log.notes" class="log-notes">
          <p>{{ log.notes }}</p>
        </div>

        <!-- Meta info -->
        <div class="log-meta">
          <span>Uploaded by {{ log.uploadedBy }}</span>
          <span>{{ formatDate(log.uploadedAt) }}</span>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <ConditionLogModal 
      v-if="showModal"
      :log="selectedLog"
      :rentalId="rentalId"
      @close="closeModal"
      @saved="onLogSaved"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const rentalId = '...'; // from route params
const logs = ref([]);
const showModal = ref(false);
const selectedLog = ref(null);

onMounted(async () => {
  await fetchLogs();
});

const fetchLogs = async () => {
  const response = await axios.get(`/api/rentals/${rentalId}/condition-logs`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  logs.value = response.data.data;
};

const openCreateModal = () => {
  selectedLog.value = null;
  showModal.value = true;
};

const editLog = (log) => {
  selectedLog.value = log;
  showModal.value = true;
};

const deleteLog = async (logId) => {
  if (!confirm('Are you sure you want to delete this condition log?')) return;
  
  await axios.delete(`/api/rentals/condition-logs/${logId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  await fetchLogs();
};

const closeModal = () => {
  showModal.value = false;
  selectedLog.value = null;
};

const onLogSaved = () => {
  closeModal();
  fetchLogs();
};

const formatLogType = (type) => {
  if (type === 'move-in') return 'Move In';
  if (type === 'move-out') return 'Move Out';
  if (type.startsWith('month-')) {
    const month = type.split('-')[1];
    return `Month ${month}`;
  }
  return type;
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
</script>
```

---

### **Create/Edit Modal Component**

```vue
<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h2>{{ isEdit ? 'Edit' : 'Create' }} Condition Log</h2>
      
      <form @submit.prevent="submit">
        <!-- Stage Selection -->
        <div class="form-group">
          <label for="logType">Stage *</label>
          <select v-model="formData.logType" required>
            <option value="">Select stage</option>
            <option value="move-in">Move In</option>
            <option value="month-1">Month 1</option>
            <option value="month-2">Month 2</option>
            <option value="month-3">Month 3</option>
            <option value="month-4">Month 4</option>
            <option value="month-5">Month 5</option>
            <option value="month-6">Month 6</option>
            <option value="month-7">Month 7</option>
            <option value="month-8">Month 8</option>
            <option value="month-9">Month 9</option>
            <option value="month-10">Month 10</option>
            <option value="month-11">Month 11</option>
            <option value="month-12">Month 12</option>
            <option value="move-out">Move Out</option>
            <option value="other">Other (Custom)</option>
          </select>
        </div>

        <!-- Custom Label (only for "other") -->
        <div v-if="formData.logType === 'other'" class="form-group">
          <label for="customLabel">Custom Label *</label>
          <input 
            type="text" 
            v-model="formData.customLabel"
            placeholder="e.g., After Repairs, After Painting"
            required
          />
        </div>

        <!-- Video Upload -->
        <div class="form-group">
          <label>Video * (1 video required)</label>
          <input 
            type="file" 
            @change="uploadVideo"
            accept="video/*"
            :required="!isEdit"
          />
          <p v-if="uploadingVideo" class="upload-status">Uploading video...</p>
          <p v-if="formData.videoUrl" class="upload-success">✓ Video uploaded</p>
          <video v-if="formData.videoUrl" :src="formData.videoUrl" controls class="preview"></video>
        </div>

        <!-- Photo Upload -->
        <div class="form-group">
          <label>Photos (Optional - max 3)</label>
          <input 
            type="file" 
            @change="uploadPhotos"
            accept="image/*"
            multiple
          />
          <p v-if="uploadingPhotos" class="upload-status">Uploading photos...</p>
          <div v-if="formData.photoUrls.length > 0" class="photos-preview">
            <div v-for="(photo, idx) in formData.photoUrls" :key="idx" class="photo-item">
              <img :src="photo" />
              <button type="button" @click="removePhoto(idx)">✕</button>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div class="form-group">
          <label for="notes">Notes (Optional)</label>
          <textarea 
            v-model="formData.notes"
            rows="4"
            placeholder="Describe the condition of the property..."
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="modal-actions">
          <button type="button" @click="$emit('close')" class="btn-secondary">
            Cancel
          </button>
          <button type="submit" class="btn-primary" :disabled="!canSubmit">
            {{ isEdit ? 'Update' : 'Create' }} Log
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { uploadToFirebase } from '@/utils/firebaseUpload';

const props = defineProps({
  log: Object, // If editing
  rentalId: String
});

const emit = defineEmits(['close', 'saved']);

const isEdit = computed(() => !!props.log);

const uploadingVideo = ref(false);
const uploadingPhotos = ref(false);

const formData = ref({
  logType: '',
  customLabel: '',
  videoUrl: '',
  photoUrls: [],
  notes: ''
});

const canSubmit = computed(() => {
  return formData.value.logType && 
         formData.value.videoUrl &&
         (formData.value.logType !== 'other' || formData.value.customLabel);
});

onMounted(() => {
  if (props.log) {
    formData.value = { ...props.log };
  }
});

const uploadVideo = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  uploadingVideo.value = true;
  try {
    const url = await uploadToFirebase(file, 'condition-logs/videos');
    formData.value.videoUrl = url;
  } catch (error) {
    console.error('Upload failed:', error);
    alert('Failed to upload video');
  } finally {
    uploadingVideo.value = false;
  }
};

const uploadPhotos = async (event) => {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;
  
  if (formData.value.photoUrls.length + files.length > 3) {
    alert('Maximum 3 photos allowed');
    return;
  }
  
  uploadingPhotos.value = true;
  try {
    const uploadPromises = files.map(file => 
      uploadToFirebase(file, 'condition-logs/photos')
    );
    const urls = await Promise.all(uploadPromises);
    formData.value.photoUrls = [...formData.value.photoUrls, ...urls];
  } catch (error) {
    console.error('Upload failed:', error);
    alert('Failed to upload photos');
  } finally {
    uploadingPhotos.value = false;
  }
};

const removePhoto = (idx) => {
  formData.value.photoUrls.splice(idx, 1);
};

const submit = async () => {
  try {
    if (isEdit.value) {
      // Update
      await axios.put(`/api/rentals/condition-logs/${props.log._id}`, formData.value, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } else {
      // Create
      await axios.post(`/api/rentals/${props.rentalId}/condition-logs`, formData.value, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
    
    emit('saved');
  } catch (error) {
    console.error('Failed to save:', error);
    alert(error.response?.data?.message || 'Failed to save condition log');
  }
};
</script>
```

---

## 🎯 User Workflow

### **Creating a Log**

1. User clicks "+ Add Condition Log"
2. Selects stage (move-in, month-1, etc.)
3. Uploads 1 video (required)
4. Uploads up to 3 photos (optional)
5. Adds notes (optional)
6. Clicks "Create Log"
7. Log appears in list

### **Editing a Log**

1. User clicks "Edit" on existing log
2. Can change:
   - Stage (logType)
   - Video
   - Photos
   - Notes
3. Clicks "Update Log"
4. Changes saved

### **Deleting a Log**

1. User clicks "Delete"
2. Confirms deletion
3. Log removed permanently

---

## ✅ Complete Endpoint Summary

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 1 | GET | `/api/rentals/:rentalId/condition-logs` | Get all logs |
| 2 | POST | `/api/rentals/:rentalId/condition-logs` | Create new log |
| 3 | PUT | `/api/rentals/condition-logs/:conditionLogId` | Update log (change stage/content) |
| 4 | DELETE | `/api/rentals/condition-logs/:conditionLogId` | Delete log |

---

**Last Updated:** October 19, 2025  
**Version:** 1.0



