import React from 'react';
import './Badge.css';

export default function Badge({ children, variant = 'default', size = 'md', dot = false, className = '' }) {
  return (
    <span className={`badge badge-${variant} badge-${size} ${dot ? 'badge-dot' : ''} ${className}`}>
      {dot && <span className="badge-dot-indicator" />}
      {children}
    </span>
  );
}
