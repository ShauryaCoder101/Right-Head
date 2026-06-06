import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, Loader2, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { useJdStore } from '../store/jdStore';
import { useToast } from '../components/common/ToastContainer';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import './RescreenPage.css';

export default function RescreenPage() {
  const [selectedJd, setSelectedJd] = useState('');
  const [screening, setScreening] = useState(false);
  const [result, setResult] = useState(null);
  const { jds, fetchJds } = useJdStore();
  const toast = useToast();

  useEffect(() => { fetchJds(); }, []);

  const handleRescreen = async () => {
    if (!selectedJd) return;
    setScreening(true);
    try {
      const { data } = await api.post('/scoring/rescreen', { jdId: selectedJd });
      setResult(data);
      toast.success(`Re-screening started for ${data.totalCount} candidates!`);
    } catch (err) {
      const errData = err.response?.data?.error;
      const msg = typeof errData === 'object' ? errData?.message : errData;
      toast.error(msg || 'Failed to start re-screening');
    } finally { setScreening(false); }
  };

  return (
    <div className="rescreen-page">
      <h1><RefreshCw size={28} /> Retroactive Re-Screening</h1>
      <p className="page-desc">Score your entire candidate pool against a new job description without re-uploading resumes.</p>

      <div className="rescreen-form">
        <label className="rescreen-label">Select Job Description</label>
        <select className="rescreen-select" value={selectedJd} onChange={(e) => setSelectedJd(e.target.value)}>
          <option value="">Choose a JD...</option>
          {jds.map((jd) => (
            <option key={jd.id} value={jd.id}>{jd.title}</option>
          ))}
        </select>

        <Button variant="primary" icon={RefreshCw} onClick={handleRescreen} loading={screening} disabled={!selectedJd}>
          Start Re-Screening
        </Button>
      </div>

      {result && (
        <div className="rescreen-result">
          <CheckCircle size={32} className="result-icon" />
          <h3>Re-Screening Initiated</h3>
          <p>{result.totalCount} candidates being scored.</p>
          <p className="result-hint">This runs in the background. You'll receive a notification when it's complete.</p>
          <Badge variant="success" dot>Processing</Badge>
        </div>
      )}

      <div className="rescreen-info">
        <div className="info-card">
          <Sparkles size={24} className="info-icon" />
          <h4>Hidden Gems</h4>
          <p>After re-screening, we'll flag candidates who scored much higher on the new JD than on any previous one.</p>
        </div>
      </div>
    </div>
  );
}
