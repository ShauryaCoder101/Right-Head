import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, Mail, Lock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import './LoginPage.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {}
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-blob login-blob-1" />
        <div className="login-blob login-blob-2" />
        <div className="login-blob login-blob-3" />
      </div>

      <div className="login-card">
        <div className="login-brand">
          <Brain size={36} className="login-logo" />
          <h1 className="login-title">RecruitIQ</h1>
          <p className="login-subtitle">AI-Powered Resume Screening</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <Input
            label="Email" type="email" icon={Mail}
            value={email} onChange={(e) => { setEmail(e.target.value); clearError(); }}
            placeholder="you@company.com" required
          />
          <Input
            label="Password" type="password" icon={Lock}
            value={password} onChange={(e) => { setPassword(e.target.value); clearError(); }}
            placeholder="••••••••" required
          />

          <Button type="submit" variant="primary" size="lg" loading={isLoading} className="login-btn">
            Sign In
          </Button>
        </form>

        <p className="login-footer">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
