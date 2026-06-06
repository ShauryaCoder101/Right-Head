import React from 'react';
import { Settings } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import './SettingsPage.css';

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="settings-page">
      <h1><Settings size={24} /> Settings</h1>

      <div className="settings-section">
        <h2>Profile</h2>
        <div className="settings-card">
          <div className="setting-row">
            <span className="setting-label">Name</span>
            <span className="setting-value">{user?.name || 'N/A'}</span>
          </div>
          <div className="setting-row">
            <span className="setting-label">Email</span>
            <span className="setting-value">{user?.email || 'N/A'}</span>
          </div>
          <div className="setting-row">
            <span className="setting-label">Role</span>
            <span className="setting-value">{user?.role?.replace('_', ' ') || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>About</h2>
        <div className="settings-card">
          <div className="setting-row">
            <span className="setting-label">Version</span>
            <span className="setting-value">1.0.0-alpha</span>
          </div>
          <div className="setting-row">
            <span className="setting-label">SSO</span>
            <span className="setting-value" style={{ color: 'var(--color-text-tertiary)' }}>Coming in Phase 5 — SSO (Single Sign-On) allows users to log in with their corporate identity provider (e.g., Okta, Azure AD) instead of a separate password. It's essential for enterprise customers.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
