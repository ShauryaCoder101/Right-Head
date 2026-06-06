import React from 'react';
import { Loader2 } from 'lucide-react';
import './Input.css';

export default function Input({
  label, type = 'text', error, helperText, icon: Icon,
  className = '', ...props
}) {
  const isTextarea = type === 'textarea';
  const Component = isTextarea ? 'textarea' : 'input';

  return (
    <div className={`input-group ${error ? 'input-error' : ''} ${className}`}>
      {label && <label className="input-label">{label}</label>}
      <div className="input-wrapper">
        {Icon && <Icon size={18} className="input-icon" />}
        <Component
          type={isTextarea ? undefined : type}
          className={`input-field ${Icon ? 'has-icon' : ''} ${isTextarea ? 'input-textarea' : ''}`}
          {...props}
        />
      </div>
      {error && <span className="input-error-text">{error}</span>}
      {helperText && !error && <span className="input-helper">{helperText}</span>}
    </div>
  );
}
