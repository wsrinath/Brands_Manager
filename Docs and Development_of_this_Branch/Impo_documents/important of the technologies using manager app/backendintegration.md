# Firebase Backend & Database Integration

This document outlines how the front end of this web application is integrated with the Firebase backend and Firestore database.

---

## 1. Configuration and Initialization
The connection to Firebase services is established in `src/firebase.js`. It initializes the Firebase app with project credentials and exports instances of Authentication and Firestore.

```javascript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBFDJH_...",
    authDomain: "brands-manager.firebaseapp.com",
    projectId: "brands-manager",
    storageBucket: "brands-manager.firebasestorage.app",
    messagingSenderId: "406158641394",
    appId: "1:406158641394:web:b2458de042fdc3265d286b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

---

## 2. Authentication and User Roles
The application uses a custom React Context (`src/contexts/AuthContext.jsx`) to manage user sessions and permissions (Admin, Editor, Scheduler).

- **`onAuthStateChanged`**: Listens for login/logout events.
- **Role Fetching**: On login, the app fetches the user's specific `role` and `team` from the `users` collection in Firestore to determine UI access levels.

```javascript
const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
            setUserName(userDoc.data().name);
        }
    }
});
```

---

## 3. Database Operations (Firestore)
The application interacts with Firestore for real-time data management using the following patterns:

### A. Real-time Synchronization
Used in dashboards (e.g., `Editor.jsx`) to listen for new tasks or status changes instantly using `onSnapshot`.

```javascript
const q = query(collection(db, 'tasks'));
const unsubscribe = onSnapshot(q, (snapshot) => {
    const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setTasks(tasksData);
});
```

### B. Creating New Records
In `Scheduler.jsx`, new tasks are created using `addDoc`, allowing Managers to assign work.

```javascript
await addDoc(collection(db, 'tasks'), {
    created_at: serverTimestamp(),
    status: 'Pending',
    brand: formData.brand,
    program: formData.program,
    due_date: Timestamp.fromDate(date),
    platform: selectedPlatforms
});
```

### C. Updating Existing Data
Editors update task documents with completed social media links and status changes using `updateDoc`.

```javascript
const taskRef = doc(db, 'tasks', taskId);
await updateDoc(taskRef, {
    editor_links: { youtube: [...] },
    status: 'In_Review'
});
```

---

## 4. Metadata Management
A dedicated `metadata` collection (document `lists`) is used to store and synchronize dropdown options like Brands, Clients, and Programs across the entire application.

```javascript
// Syncing a new client name into the metadata list
await updateDoc(doc(db, 'metadata', 'lists'), {
    clients: arrayUnion(newClientName)
});
```

---

## 5. Summary of Integration Flow
1. **Frontend (React)**: Captures input and triggers updates.
2. **Auth Layer**: Validates identity and identifies user role.
3. **Firestore SDK**: Handles real-time communication via WebSockets.
4. **Data Persistence**: Changes are stored in Firestore and automatically broadcast to all relevant users (e.g., from Scheduler to Editor).
