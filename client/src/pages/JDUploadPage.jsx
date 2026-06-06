import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Link as LinkIcon, Type, Check } from 'lucide-react';
import { useJdStore } from '../store/jdStore';
import { useToast } from '../components/common/ToastContainer';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import FileUpload from '../components/common/FileUpload';
import Badge from '../components/common/Badge';
import './JDUploadPage.css';

const STEPS = ['Upload', 'Review', 'Weights', 'Confirm'];

export default function JDUploadPage() {
  const [step, setStep] = useState(0);
  const [inputMethod, setInputMethod] = useState('file');
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [parsedJd, setParsedJd] = useState(null);
  const [weights, setWeights] = useState({ skills: 40, experience: 30, education: 15, profile: 15 });
  const [loading, setLoading] = useState(false);

  const { createJd, updateWeights } = useJdStore();
  const toast = useToast();
  const navigate = useNavigate();

  const handleUpload = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      if (inputMethod === 'file' && file) formData.append('jd', file);
      else if (inputMethod === 'url') formData.append('url', url);
      else formData.append('rawText', rawText);

      const jd = await createJd(formData);
      setParsedJd(jd);
      setStep(1);
      toast.success('JD parsed successfully!');
    } catch (err) {
      const errData = err.response?.data?.error;
      const msg = typeof errData === 'object' ? errData?.message : errData;
      toast.error(msg || 'Failed to parse JD');
    } finally { setLoading(false); }
  };

  const handleWeightChange = (dim, val) => {
    const numVal = parseInt(val);
    const oldVal = weights[dim];
    const diff = numVal - oldVal;
    const others = Object.keys(weights).filter((k) => k !== dim);
    const otherSum = others.reduce((s, k) => s + weights[k], 0);
    const newWeights = { ...weights, [dim]: numVal };
    others.forEach((k) => {
      newWeights[k] = Math.max(0, Math.round(weights[k] - (diff * weights[k]) / (otherSum || 1)));
    });
    const total = Object.values(newWeights).reduce((s, v) => s + v, 0);
    if (total !== 100) newWeights[others[0]] += 100 - total;
    setWeights(newWeights);
  };

  const handleConfirm = async () => {
    if (parsedJd?.id) {
      try {
        await updateWeights(parsedJd.id, weights);
        toast.success('JD saved! Ready for screening.');
        navigate(`/scoring/${parsedJd.id}`);
      } catch { toast.error('Failed to save weights'); }
    }
  };

  return (
    <div className="jd-upload-page">
      <h1>Upload Job Description</h1>

      <div className="stepper">
        {STEPS.map((s, i) => (
          <div key={s} className={`step ${i <= step ? 'step-active' : ''} ${i < step ? 'step-done' : ''}`}>
            <div className="step-circle">{i < step ? <Check size={14} /> : i + 1}</div>
            <span className="step-label">{s}</span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="upload-step">
          <div className="input-tabs">
            {[{ key: 'file', icon: FileText, label: 'File' }, { key: 'url', icon: LinkIcon, label: 'URL' }, { key: 'text', icon: Type, label: 'Paste' }].map(({ key, icon: Icon, label }) => (
              <button key={key} className={`input-tab ${inputMethod === key ? 'active' : ''}`} onClick={() => setInputMethod(key)}>
                <Icon size={16} />{label}
              </button>
            ))}
          </div>
          {inputMethod === 'file' && <FileUpload onFilesSelected={(files) => setFile(files[0])} accept=".pdf,.docx,.txt" label="Drop your job description here" />}
          {inputMethod === 'url' && <Input label="Job Posting URL" icon={LinkIcon} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://careers.company.com/job/123" />}
          {inputMethod === 'text' && <Input type="textarea" label="Paste Job Description" value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="Paste the full job description text here..." />}
          <Button variant="primary" onClick={handleUpload} loading={loading} disabled={!file && !url && !rawText} style={{ marginTop: 20 }}>Parse Job Description</Button>
        </div>
      )}

      {step === 1 && parsedJd?.parsedRequirements && (
        <div className="review-step">
          <h2>Review Parsed Fields</h2>
          <p className="review-hint">Review and correct any parsing errors before proceeding.</p>
          <div className="parsed-grid">
            {Object.entries(parsedJd.parsedRequirements).filter(([k]) => k !== 'confidence').map(([key, value]) => (
              <div key={key} className="parsed-field">
                <label className="parsed-label">{key.replace(/_/g, ' ')}</label>
                <div className="parsed-value">{Array.isArray(value) ? value.map((v, i) => <Badge key={i} variant="primary" size="sm">{typeof v === 'object' ? JSON.stringify(v) : v}</Badge>) : typeof value === 'object' ? JSON.stringify(value) : String(value)}</div>
              </div>
            ))}
          </div>
          <div className="step-actions">
            <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
            <Button variant="primary" onClick={() => setStep(2)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="weights-step">
          <h2>Set Scoring Weights</h2>
          <p className="review-hint">Adjust how much each dimension contributes to the overall score.</p>
          <div className="weight-sliders">
            {[{ key: 'skills', label: 'Skills Match', color: 'var(--color-primary)' }, { key: 'experience', label: 'Experience', color: 'var(--color-success)' }, { key: 'education', label: 'Education', color: 'var(--color-warning)' }, { key: 'profile', label: 'Profile', color: 'var(--color-accent)' }].map(({ key, label, color }) => (
              <div key={key} className="weight-slider-row">
                <label>{label}</label>
                <input type="range" min="0" max="100" value={weights[key]} onChange={(e) => handleWeightChange(key, e.target.value)} style={{ accentColor: color }} />
                <span className="weight-value" style={{ color }}>{weights[key]}%</span>
              </div>
            ))}
          </div>
          <div className="step-actions">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button variant="primary" onClick={() => setStep(3)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="confirm-step">
          <h2>Ready to Screen</h2>
          <div className="confirm-summary">
            <p><strong>Title:</strong> {parsedJd?.title}</p>
            <p><strong>Required Skills:</strong> {parsedJd?.parsedRequirements?.required_skills?.length || 0}</p>
            <p><strong>Weights:</strong> Skills {weights.skills}% · Experience {weights.experience}% · Education {weights.education}% · Profile {weights.profile}%</p>
          </div>
          <div className="step-actions">
            <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
            <Button variant="primary" onClick={handleConfirm}>Save & Start Screening</Button>
          </div>
        </div>
      )}
    </div>
  );
}
