import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, Mail, Lock, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import './LoginPage.css';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [formError, setFormError] = useState('');
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (password !== confirmPass) { setFormError('Passwords do not match'); return; }
    if (password.length < 8) { setFormError('Password must be at least 8 characters'); return; }
    try {
      await register(email, password, name);
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
          <p className="login-subtitle">Create your account</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {(error || formError) && <div className="login-error">{formError || error}</div>}
          <Input label="Full Name" icon={User} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" required />
          <Input label="Email" type="email" icon={Mail} value={email} onChange={(e) => { setEmail(e.target.value); clearError(); }} placeholder="you@company.com" required />
          <Input label="Password" type="password" icon={Lock} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" required />
          <Input label="Confirm Password" type="password" icon={Lock} value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} placeholder="••••••••" required />
          <Button type="submit" variant="primary" size="lg" loading={isLoading} className="login-btn">Create Account</Button>
        </form>
        <p className="login-footer">Already have an account? <Link to="/login">Sign In</Link></p>
      </div>
    </div>
  );
}
