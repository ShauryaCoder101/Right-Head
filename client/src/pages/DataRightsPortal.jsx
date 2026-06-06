import React, { useState } from 'react';
import { Brain, Mail, Shield, Trash2, Download, CheckCircle } from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import './DataRightsPortal.css';

export default function DataRightsPortal() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLookup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/v1/data-rights/lookup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message);
      setStep('verify');
    } catch { setMessage('Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/v1/data-rights/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      if (res.ok) {
        setStep('actions');
        setMessage('Verified! Choose an action below.');
      } else { setMessage('Invalid or expired code. Please try again.'); }
    } catch { setMessage('Verification failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="data-rights-page">
      <div className="data-rights-card">
        <div className="data-rights-header">
          <Brain size={32} className="data-rights-logo" />
          <h1>Data Rights Portal</h1>
          <p>Manage your data stored in RecruitIQ</p>
        </div>

        {message && <div className="data-rights-message">{message}</div>}

        {step === 'email' && (
          <form onSubmit={handleLookup} className="data-rights-form">
            <Input label="Your Email" type="email" icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            <Button type="submit" variant="primary" loading={loading} className="full-width">Look Up My Data</Button>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerify} className="data-rights-form">
            <p className="verify-hint">We sent a verification code to {email}. Enter it below.</p>
            <Input label="Verification Code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" required />
            <Button type="submit" variant="primary" loading={loading} className="full-width">Verify</Button>
          </form>
        )}

        {step === 'actions' && (
          <div className="data-rights-actions">
            <button className="action-card" onClick={() => setMessage('Your data will be shown here.')}>
              <Download size={24} />
              <span>Download My Data</span>
            </button>
            <button className="action-card action-danger" onClick={() => setMessage('Deletion request submitted. Your data will be removed within 30 days.')}>
              <Trash2 size={24} />
              <span>Delete My Data</span>
            </button>
            <button className="action-card" onClick={() => setMessage('Enrichment consent updated.')}>
              <Shield size={24} />
              <span>Manage Consent</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
