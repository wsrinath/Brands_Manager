# Brand Manager App 🚀

A comprehensive Brand Management solution featuring a React-based web dashboard and a Flutter-based mobile application. This project provides a centralized platform for managing tasks, schedules, and marketing intelligence with role-based access.

---

## 📂 Project Structure

- **Web Dashboard (React + Vite)**: Root directory. Provides Admin, Auditor, Editor, and Marketing views.
- **Mobile App (Flutter)**: Located in `daily_task_app/`. Designed for field tasks and mobile access.
- **Backend**: Powered by Firebase (Firestore, Auth, Hosting).

---

## ✨ Key Features

- **Role-Based Dashboards**: Tailored views for Admin, Auditor, Editor, and Marketing personnel.
- **Kanban Board**: Drag-and-drop task management.
- **Scheduler**: Integrated calendar for planning and tracking events/tasks.
- **Marketing Intelligence**: Explorer and actor tracking for marketing insights.
- **Task History**: Comprehensive logging of all system activities.
- **PWA Support**: Installable web application for a native experience.

---

## 🛠️ Tech Stack

### Web (React)
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS + PostCSS
- **State Management**: React Context API
- **Utilities**: Lucide Icons, Recharts, dnd-kit, xlsx, moment

### Mobile (Flutter)
- **Framework**: Flutter SDK (Dart)
- **Navigation**: GoRouter / Material Design
- **Integration**: Firestore Service

### Backend (Firebase)
- **Authentication**: Firebase Auth (Social & Password)
- **Database**: Cloud Firestore
- **Hosting**: Firebase Hosting

---

## 🚀 Getting Started

### 🌐 Web Dashboard Setup

1. **Prerequisites**: Ensure you have [Node.js](https://nodejs.org/) installed.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Run Development Server**:
   ```bash
   npm run dev
   ```
4. **Build for Production**:
   ```bash
   npm run build
   ```

### 📱 Mobile App Setup

1. **Prerequisites**: Ensure you have the [Flutter SDK](https://docs.flutter.dev/get-started/install) installed.
2. **Navigate to Directory**:
   ```bash
   cd daily_task_app
   ```
3. **Install Dependencies**:
   ```bash
   flutter pub get
   ```
4. **Run the App**:
   ```bash
   flutter run
   ```

---

## 🔒 Firebase & Configuration

The project is pre-configured with the necessary Firebase settings in the source code, so a new developer doesn't need external JSON files to get started with the Web or basic Flutter app.

### Configuration Files
- **Web**: Configured in `src/firebase.js`.
- **Flutter**: Configured in `lib/firebase_options.dart`.

### Deploying Changes
If you have been added as a collaborator in the Firebase Console, you can deploy updates:
```bash
# Login to your account
npx firebase login

# Deploy website
npm run build
npx firebase deploy --only hosting

# Deploy firestore rules
npx firebase deploy --only firestore:rules
```

> [!NOTE]
> If you are building for Android/iOS specifically, you may need to download `google-services.json` or `GoogleService-Info.plist` from the Firebase Console and place them in the respective platform folders.

---

## 🔗 Repository Information

- **GitHub Repo**: [Brand_Manager_App](https://github.com/chamith-Loyus/Brand_Manager_App.git)
- **Author**: chamith-Loyus

---

## 📄 License

###### Run local
 npm run dev -- --host

###### Deployment for firebase
This project is private and intended for authorized personnel only.
 npm run build; npx firebase deploy (### do not use this)
 npm run build; npx firebase deploy --only hosting (# USE this)



Project Console: https://console.firebase.google.com/project/brands-manager/overview    
Hosting URL: https://brands-manager.web.app
PS C:\Users\HP\Desktop\Brand managers\Brand_Manager_App-main> 