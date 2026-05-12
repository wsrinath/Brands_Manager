# Brand Manager Project: Web and Mobile Architecture Overview

This document provides a summary of the project structure, the relationship between the Web and Mobile applications, and guidelines for future development or project separation.

## 1. Project Structure

The project is divided into two primary interfaces that share a single backend.

### Web Application (React + Vite)
The root directory contains the web application and backend configuration files.
- **`src/`**: React source code, components, and application logic.
- **`index.html`**: Main entry point for the web app.
- **`firebase.json`**: Deployment configuration for Firebase Hosting.
- **`firestore.rules`**: Security rules for the shared database.

### Mobile Application (Flutter)
The mobile application is contained within the `daily_task_app/` subdirectory.
- **`daily_task_app/lib/`**: Dart source code for the Flutter app.
- **`daily_task_app/pubspec.yaml`**: Flutter manifest and dependency list.
- **Platform-specific**: `android/` and `ios/` folders for native builds.

---

## 2. The Shared Backend "Link"

The web and mobile projects are **directly linked** via a shared Firebase Backend.

- **Shared Database (Firestore)**: Both apps read from and write to the same database. A task created on mobile appears instantly on the web.
- **Shared Authentication**: Users use the same credentials for both platforms.
- **Key Connection Files**:
    - Web: `src/firebase.js`
    - Mobile: `daily_task_app/lib/firebase_options.dart`
    - Both point to the `brands-manager` Firebase project ID.

---

## 3. Project Separation Clarification

If the web and mobile files are moved into separate repositories or folders:

1. **Will it work?** Yes. Both projects connect to Firebase over the internet. As long as the credentials in `firebase.js` and `firebase_options.dart` remain correct, they will continue to sync data regardless of where the files are stored locally.
2. **What to keep in the Web Project?** The root files (`firebase.json`, `firestore.rules`, `.firebaserc`) must stay with the web application to maintain deployment capabilities via the Firebase CLI.
3. **What to keep in the Mobile Project?** The entire `daily_task_app/` folder.

> [!IMPORTANT]
> Since security rules (`firestore.rules`) are shared, any update to the database schema in one project must be carefully mirrored in the other to avoid breaking the sync or security.

---

## 4. Advice for New Developers
- **Environment**: Ensure you have both Node.js (for web) and Flutter SDK (for mobile) installed.
- **Shared Logic**: Always verify that data models created in `src/` (Web) match those in `lib/models/` (Mobile).
- **Security**: Be cautious when modifying `firestore.rules`, as it affects both platforms simultaneously.
