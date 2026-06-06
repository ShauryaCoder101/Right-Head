import React from 'react';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import './Header.css';

export default function Header({ title }) {
  const { unreadCount } = useNotificationStore();

  return (
    <header className="app-header">
      <h1 className="header-title">{title || 'Dashboard'}</h1>
      <div className="header-actions">
        <button className="header-notification-btn">
          <Bell size={20} />
          {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
      </div>
    </header>
  );
}
