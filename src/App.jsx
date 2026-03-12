import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';

// Lazy-load all pages so they only download when navigated to
const Login = React.lazy(() => import('./pages/Login'));
const SignUp = React.lazy(() => import('./pages/SignUp'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Scheduler = React.lazy(() => import('./pages/Scheduler'));
const Editor = React.lazy(() => import('./pages/Editor'));
const Admin = React.lazy(() => import('./pages/Admin'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Kanban = React.lazy(() => import('./pages/Kanban'));
const CalendarView = React.lazy(() => import('./pages/CalendarView'));
const MarketingDashboard = React.lazy(() => import('./pages/MarketingDashboard'));
const TaskHistory = React.lazy(() => import('./pages/TaskHistory'));
const AuditorView = React.lazy(() => import('./pages/AuditorView'));
const Review = React.lazy(() => import('./pages/Review'));
const Compare = React.lazy(() => import('./pages/Compare'));

function RoleRedirect() {
  const { userRole } = useAuth();
  const role = userRole?.toLowerCase();

  if (role === 'admin') return <Navigate to="/dashboard" replace />;
  if (role === 'scheduler') return <Navigate to="/schedule" replace />;
  if (role === 'marketing') return <Navigate to="/marketing-dashboard" replace />;
  if (role === 'auditor') return <Navigate to="/tasks" replace />;
  return <Navigate to="/tasks" replace />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        }>
          <Routes>
            <Route path="/login" element={<Login />} />


          <Route element={
            <AuthGuard>
              <Layout />
            </AuthGuard>
          }>
            <Route path="/" element={<RoleRedirect />} />

            <Route path="/dashboard" element={
              <AuthGuard requiredRole="Admin">
                <Dashboard />
              </AuthGuard>
            } />

            <Route path="/marketing-dashboard" element={
              <AuthGuard requiredRole="Marketing">
                <MarketingDashboard />
              </AuthGuard>
            } />

            <Route path="/auditor" element={
              <AuthGuard requiredRole="Auditor">
                <AuditorView />
              </AuthGuard>
            } />

            <Route path="/schedule" element={
              <AuthGuard requiredRole={['Admin', 'Scheduler']}>
                <Scheduler />
              </AuthGuard>
            } />

            <Route path="/tasks" element={
              <AuthGuard requiredRole={['Admin', 'Editor', 'Scheduler', 'Auditor']}>
                <Editor />
              </AuthGuard>
            } />

            <Route path="/compare" element={
              <AuthGuard requiredRole={['Admin', 'Editor', 'Scheduler', 'Auditor']}>
                <Compare />
              </AuthGuard>
            } />

            <Route path="/kanban" element={
              <AuthGuard requiredRole={['Admin', 'Scheduler', 'Editor']}>
                <Kanban />
              </AuthGuard>
            } />

            <Route path="/calendar" element={<CalendarView />} />

            <Route path="/admin" element={
              <AuthGuard requiredRole="Admin">
                <Admin />
              </AuthGuard>
            } />

            <Route path="/signup" element={
              <AuthGuard requiredRole="Admin">
                <SignUp />
              </AuthGuard>
            } />

            <Route path="/history" element={
              <AuthGuard requiredRole={['Scheduler', 'Editor', 'Admin']}>
                <TaskHistory />
              </AuthGuard>
            } />

            <Route path="/review" element={
              <AuthGuard requiredRole={['Admin', 'Scheduler']}>
                <Review />
              </AuthGuard>
            } />
          </Route>

          <Route path="/profile" element={
            <AuthGuard>
              <Profile />
            </AuthGuard>
          } />
        </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
}

export default App;
