import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Scheduler from './pages/Scheduler';
import Editor from './pages/Editor';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Kanban from './pages/Kanban';
import CalendarView from './pages/CalendarView';
import MarketingDashboard from './pages/MarketingDashboard';
import TaskHistory from './pages/TaskHistory';
import AuditorView from './pages/AuditorView';
import Review from './pages/Review';
import Compare from './pages/Compare';

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
      </AuthProvider>
    </Router>
  );
}

export default App;
