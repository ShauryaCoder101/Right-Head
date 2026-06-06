import React from 'react';
import { Loader2 } from 'lucide-react';
import './Button.css';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  icon: Icon,
  iconRight: IconRight,
  fullWidth = false,
  className = '',
  onClick,
  ...props
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${fullWidth ? 'btn--full' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <Loader2 className="btn__spinner" size={size === 'sm' ? 14 : 18} />
      ) : Icon ? (
        <Icon className="btn__icon btn__icon--left" size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
      ) : null}
      {children && <span className="btn__label">{children}</span>}
      {!loading && IconRight && (
        <IconRight className="btn__icon btn__icon--right" size={size === 'sm' ? 14 : 16} />
      )}
    </button>
  );
}
