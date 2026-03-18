# cli_dev is deployed to the live site https://brands-manager.web.app/cli_dev


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
