import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import JDUploadPage from './pages/JDUploadPage';
import JDLibraryPage from './pages/JDLibraryPage';
import ResumeUploadPage from './pages/ResumeUploadPage';
import ShortlistPage from './pages/ShortlistPage';
import CandidateDetailPage from './pages/CandidateDetailPage';
import RescreenPage from './pages/RescreenPage';
import DataRightsPortal from './pages/DataRightsPortal';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/data-rights" element={<DataRightsPortal />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/jd/upload" element={<ProtectedRoute><JDUploadPage /></ProtectedRoute>} />
      <Route path="/jd/library" element={<ProtectedRoute><JDLibraryPage /></ProtectedRoute>} />
      <Route path="/candidates" element={<ProtectedRoute><ResumeUploadPage /></ProtectedRoute>} />
      <Route path="/candidates/:id" element={<ProtectedRoute><CandidateDetailPage /></ProtectedRoute>} />
      <Route path="/scoring/:jdId" element={<ProtectedRoute><ShortlistPage /></ProtectedRoute>} />
      <Route path="/rescreen" element={<ProtectedRoute><RescreenPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

