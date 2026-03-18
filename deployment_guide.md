# Deployment Guide: Updating the Live Application

This guide explains how to update your live application hosted at `https://brands-manager.web.app`.

## Prerequisites
-   You have the **Firebase CLI** installed and logged in (which you likely do, as you've deployed before).
-   You are in the project root directory (`c:\Users\HP\Desktop\Brand managers\Brand_Manager_App-main`).

## Steps to Deploy

### 1. Authenticate with Firebase
If you haven't logged in recently (or if you see an authentication error), run:
```bash
npx firebase login
```
Follow the browser prompts to log in with your Google account.

### 2. Build the Application
First, you need to create a production-ready version of your latest code.

Run this command in your terminal:
```bash
npm run build
```
**What this does:**
-   It compiles your React code.
-   It creates a `dist` folder in your project directory containing the optimized files.

### 2. Deploy to Firebase
Once the build is complete, upload the `dist` folder to Firebase.

Run this command:
```bash
npx firebase deploy
```
**What this does:**
-   It uses the locally installed `firebase-tools` (which we verified is in your package.json).
-   It takes the contents of the `dist` folder.
-   It uploads them to the Firebase Hosting server associated with your project (`brands-manager`).
-   It updates the live URL `https://brands-manager.web.app` within seconds.

## Troubleshooting
-   **"Command not found"**: If `firebase` is not recognized, try `npm install -g firebase-tools` then `firebase login`.
-   **Wrong Project**: If it tries to deploy to the wrong project, run `firebase use default` or `firebase use brands-manager` before deploying.

# To deploy the TTYTFB_VIEW application

*** npx firebase deploy --only hosting

```bash
npm run build
npx firebase deploy --only hosting:ttytfb_view
```

### Command	Purpose
npm run dev	develop the app
npm run build	: create production build
npm run preview	: test production build locally
firebase deploy --only hosting	: publish the site