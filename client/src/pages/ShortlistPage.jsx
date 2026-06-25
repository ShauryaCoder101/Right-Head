import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ArrowUpDown, Zap, Users, MessageSquare, ChevronDown, ChevronUp, Save, SlidersHorizontal, CheckSquare, Square, X, RefreshCw, UserCheck, Upload, Plus } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/common/ToastContainer';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import BatchProgress from '../components/common/BatchProgress';
import { getScoreColor } from '../utils/formatters';
import './ShortlistPage.css';

export default function ShortlistPage() {
  const { jdId } = useParams();
  const [jd, setJd] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [scoringBatchId, setScoringBatchId] = useState(null);
  const [instructions, setInstructions] = useState('');
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [rescreening, setRescreening] = useState(false);
  const [rescreenBatchId, setRescreenBatchId] = useState(null);
  const [parsedCandidateCount, setParsedCandidateCount] = useState(null);
  const [weights, setWeights] = useState({ skills: 35, experience: 25, education: 15, profile: 15, location: 10 });
  const [savingWeights, setSavingWeights] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showScoringModal, setShowScoringModal] = useState(false);
  const [showCandidatePicker, setShowCandidatePicker] = useState(false);
  const [allCandidates, setAllCandidates] = useState([]);
  const [pickerSelectedIds, setPickerSelectedIds] = useState(new Set());
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const navigate = useNavigate();
  const toast = useToast();

  const weightsTotal = useMemo(() => Object.values(weights).reduce((a, b) => a + b, 0), [weights]);
  const weightsValid = Math.abs(weightsTotal - 100) < 0.5;

  useEffect(() => {
    loadResults();
    loadCandidateCount();
  }, [jdId]);

  const loadResults = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/scoring/results/${jdId}?sortBy=totalScore&limit=50`);
      setJd(data.jd);
      setResults(data.results);
      if (data.jd?.screeningInstructions) {
        setInstructions(data.jd.screeningInstructions);
      }
      if (data.jd?.weightProfile) {
        const wp = data.jd.weightProfile;
        setWeights({
          skills: wp.skills ?? 35,
          experience: wp.experience ?? 25,
          education: wp.education ?? 15,
          profile: wp.profile ?? 15,
          location: wp.location ?? 10,
        });
      }
    } catch {
      toast.error('Failed to load results');
    } finally { setLoading(false); }
  };

  const loadCandidateCount = async () => {
    try {
      const { data } = await api.get('/candidates?limit=1');
      setParsedCandidateCount(data.total || 0);
    } catch {}
  };

  const openScoringModal = () => {
    setShowScoringModal(true);
  };

  const runScoringWith = async (candidateIdsList) => {
    setShowScoringModal(false);
    setShowCandidatePicker(false);
    setScoring(true);
    try {
      const body = { jdId };
      if (candidateIdsList && candidateIdsList.length > 0) body.candidateIds = candidateIdsList;
      const { data } = await api.post('/scoring/run', body);
      setScoringBatchId(data.batchJobId);
      toast.success(data.message || `Scoring ${data.candidateCount} candidates...`);
    } catch (err) {
      const errData = err.response?.data?.error;
      const msg = typeof errData === 'object' ? errData?.message : errData;
      toast.error(msg || 'Failed to start scoring');
    } finally { setScoring(false); }
  };

  const handleRunAll = () => runScoringWith(null);

  const handleRunPreviouslyScored = () => {
    const ids = results.map(r => r.candidate.id);
    if (ids.length === 0) {
      toast.error('No previously scored candidates found');
      return;
    }
    runScoringWith(ids);
  };

  const handleOpenCandidatePicker = async () => {
    setShowScoringModal(false);
    setLoadingCandidates(true);
    setShowCandidatePicker(true);
    try {
      const { data } = await api.get('/candidates?limit=500');
      setAllCandidates(data.candidates || []);
      // Pre-select previously scored candidates
      const scoredIds = new Set(results.map(r => r.candidate.id));
      setPickerSelectedIds(scoredIds);
    } catch {
      toast.error('Failed to load candidates');
    } finally {
      setLoadingCandidates(false);
    }
  };

  const togglePickerCandidate = (id) => {
    setPickerSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePickerAll = () => {
    if (pickerSelectedIds.size === allCandidates.length) {
      setPickerSelectedIds(new Set());
    } else {
      setPickerSelectedIds(new Set(allCandidates.map(c => c.id)));
    }
  };

  const handleRunSelected = () => {
    if (pickerSelectedIds.size === 0) {
      toast.error('Select at least one candidate');
      return;
    }
    runScoringWith([...pickerSelectedIds]);
  };

  const handleSaveInstructions = async () => {
    setSavingInstructions(true);
    try {
      await api.put(`/jd/${jdId}`, { screeningInstructions: instructions });
      toast.success('Instructions saved');
    } catch {
      toast.error('Failed to save instructions');
    } finally {
      setSavingInstructions(false);
    }
  };

  const handleSaveWeights = async () => {
    if (!weightsValid) {
      toast.error(`Weights must sum to 100 (currently ${weightsTotal})`);
      return;
    }
    setSavingWeights(true);
    try {
      await api.put(`/jd/${jdId}/weights`, weights);
      toast.success('Weight profile saved');
    } catch (err) {
      const msg = err.response?.data?.error;
      toast.error(typeof msg === 'string' ? msg : 'Failed to save weights');
    } finally {
      setSavingWeights(false);
    }
  };

  const handleWeightChange = (key, value) => {
    setWeights(prev => ({ ...prev, [key]: parseInt(value) || 0 }));
  };

  const handleRescreenWithInstructions = async () => {
    setRescreening(true);
    try {
      const body = { jdId, instructions };
      if (selectedIds.size > 0) body.candidateIds = [...selectedIds];
      const { data } = await api.post('/scoring/run', body);
      setRescreenBatchId(data.batchJobId);
      toast.success(data.message || `Re-screening ${data.candidateCount} candidates...`);
    } catch (err) {
      const errData = err.response?.data?.error;
      const msg = typeof errData === 'object' ? errData?.message : errData;
      toast.error(msg || 'Failed to start re-screening');
    } finally {
      setRescreening(false);
    }
  };

  const toggleSelectCandidate = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map(r => r.candidate.id)));
    }
  };

  const handleRescreenComplete = (batch) => {
    setRescreenBatchId(null);
    if (batch.doneCount > 0) {
      toast.success(`Re-screening complete! ${batch.doneCount} candidates re-ranked.`);
    }
    loadResults();
  };

  const handleScoringComplete = (batch) => {
    setScoringBatchId(null);
    if (batch.doneCount > 0) {
      toast.success(`Scoring complete! ${batch.doneCount} candidates ranked.`);
    }
    loadResults();
  };

  const handleExportCsv = async () => {
    try {
      const res = await api.get(`/export/csv/${jdId}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `shortlist_${jdId}.csv`; a.click();
      toast.success('CSV exported!');
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="shortlist-page">
      <div className="shortlist-header">
        <div>
          <h1>{jd?.title || 'Shortlist'}</h1>
          <p className="shortlist-meta">
            {results.length} candidates scored
            {parsedCandidateCount !== null && (
              <span className="candidate-pool"> · <Users size={12} /> {parsedCandidateCount} in candidate pool</span>
            )}
          </p>
        </div>
        <div className="shortlist-actions">
          <Button variant="ghost" size="sm" icon={Upload} onClick={() => navigate(`/candidates?jdId=${jdId}`)}>
            Add Resumes
          </Button>
          <Button variant="ghost" size="sm" icon={Download} onClick={handleExportCsv}>Export CSV</Button>
          <Button variant="secondary" size="sm" icon={Zap} onClick={openScoringModal} loading={scoring} disabled={!!scoringBatchId}>
            {scoring ? 'Starting...' : 'Run Scoring'}
          </Button>
          <Button variant="primary" size="sm" icon={ArrowUpDown} onClick={loadResults}>Refresh</Button>
        </div>
      </div>

      {/* AI Instructions collapsible section */}
      <div className="ai-instructions-section">
        <button
          className="ai-instructions-toggle"
          onClick={() => setInstructionsExpanded((v) => !v)}
        >
          <div className="ai-instructions-toggle-left">
            <MessageSquare size={16} />
            <span>AI Instructions</span>
            {instructions && !instructionsExpanded && (
              <span className="ai-instructions-preview">{instructions.slice(0, 60)}{instructions.length > 60 ? '…' : ''}</span>
            )}
          </div>
          {instructionsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {instructionsExpanded && (
          <div className="ai-instructions-body">
            {/* Weight Sliders */}
            <div className="weight-sliders-section">
              <div className="weight-sliders-header">
                <SlidersHorizontal size={14} />
                <span>Scoring Weights</span>
                <span className={`weight-total ${weightsValid ? 'valid' : 'invalid'}`}>
                  {weightsTotal}/100
                </span>
              </div>
              <div className="weight-sliders">
                {[
                  { key: 'skills', label: 'Skills', color: 'var(--color-primary)' },
                  { key: 'experience', label: 'Experience', color: 'var(--color-success)' },
                  { key: 'education', label: 'Education', color: 'var(--color-warning)' },
                  { key: 'profile', label: 'Profile', color: 'var(--color-accent)' },
                  { key: 'location', label: 'Location', color: '#f472b6' },
                ].map(({ key, label, color }) => (
                  <div key={key} className="weight-slider-row">
                    <label className="weight-slider-label">{label}</label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={weights[key]}
                      onChange={(e) => handleWeightChange(key, e.target.value)}
                      className="weight-slider-input"
                      style={{ '--slider-color': color }}
                    />
                    <span className="weight-slider-value">{weights[key]}</span>
                  </div>
                ))}
              </div>
              <div className="weight-slider-actions">
                <Button variant="ghost" size="sm" icon={Save} onClick={handleSaveWeights} loading={savingWeights} disabled={!weightsValid}>
                  Save Weights
                </Button>
              </div>
            </div>

            {/* Instructions textarea */}
            <div className="instructions-divider" />
            <textarea
              className="ai-instructions-textarea"
              placeholder="e.g. Prioritize candidates with defense sector experience, or penalize gaps longer than 2 years…"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
            />
            <div className="ai-instructions-actions">
              <Button
                variant="ghost"
                size="sm"
                icon={Save}
                onClick={handleSaveInstructions}
                loading={savingInstructions}
              >
                Save Instructions
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={Zap}
                onClick={handleRescreenWithInstructions}
                loading={rescreening}
                disabled={!instructions.trim() || !!rescreenBatchId}
              >
                {rescreening ? 'Starting…' : 'Re-screen with Instructions'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Re-screen progress bar */}
      {rescreenBatchId && (
        <BatchProgress
          batchJobId={rescreenBatchId}
          label="Re-screening candidates with custom instructions"
          onComplete={handleRescreenComplete}
          onDismiss={() => setRescreenBatchId(null)}
        />
      )}

      {/* Scoring progress bar */}
      {scoringBatchId && (
        <BatchProgress
          batchJobId={scoringBatchId}
          label="Scoring candidates with AI"
          onComplete={handleScoringComplete}
          onDismiss={() => setScoringBatchId(null)}
        />
      )}

      {loading ? (
        <div className="loading-state">Loading candidates...</div>
      ) : results.length === 0 ? (
        <div className="empty-state">
          <h3>No scored candidates yet</h3>
          <p>
            {parsedCandidateCount > 0
              ? `You have ${parsedCandidateCount} candidate${parsedCandidateCount > 1 ? 's' : ''} ready. Click "Run Scoring" to rank them against this JD.`
              : 'Upload resumes first on the Candidates page, then come back to run scoring.'}
          </p>
          <div className="empty-state-actions">
            {parsedCandidateCount === 0 && (
              <Button variant="ghost" onClick={() => navigate('/candidates')}>Upload Resumes</Button>
            )}
            <Button variant="primary" icon={Zap} onClick={openScoringModal} loading={scoring} disabled={parsedCandidateCount === 0 || !!scoringBatchId}>
              {scoring ? 'Starting...' : 'Run Scoring'}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {results.length > 0 && (
            <div className="selection-bar">
              <button className="select-all-btn" onClick={toggleSelectAll}>
                {selectedIds.size === results.length ? <CheckSquare size={16} /> : <Square size={16} />}
                {selectedIds.size === results.length ? 'Deselect All' : 'Select All'}
              </button>
              {selectedIds.size > 0 && (
                <span className="selection-count">
                  {selectedIds.size} selected — scoring will only apply to selected candidates
                </span>
              )}
              {selectedIds.size > 0 && (
                <Button variant="primary" size="sm" icon={Zap} onClick={() => runScoringWith([...selectedIds])} loading={scoring} disabled={!!scoringBatchId}>
                  Score Selected ({selectedIds.size})
                </Button>
              )}
            </div>
          )}
        <div className="shortlist-grid">
          {results.map((r) => {
            const dims = r.dimensionScores || {};
            return (
              <div key={r.candidate.id} className={`candidate-card ${selectedIds.has(r.candidate.id) ? 'selected' : ''}`} onClick={() => navigate(`/candidates/${r.candidate.id}`)}>
                <div className="candidate-card-top">
                  <div className="card-checkbox" onClick={(e) => toggleSelectCandidate(r.candidate.id, e)}>
                    {selectedIds.has(r.candidate.id) ? <CheckSquare size={18} className="checkbox-checked" /> : <Square size={18} className="checkbox-unchecked" />}
                  </div>
                  <div className="score-ring" style={{ '--score-color': getScoreColor(r.totalScore), '--score-pct': `${r.totalScore}%` }}>
                    <svg viewBox="0 0 36 36" className="score-svg">
                      <circle cx="18" cy="18" r="15.91" className="score-bg-circle" />
                      <circle cx="18" cy="18" r="15.91" className="score-fg-circle" strokeDasharray={`${r.totalScore} ${100 - r.totalScore}`} />
                    </svg>
                    <span className="score-number">{r.totalScore}</span>
                  </div>
                  <div className="candidate-info">
                    <h3>{r.candidate.name || 'Unknown'}</h3>
                    <p className="candidate-email">{r.candidate.email || ''}</p>
                    <div className="rank-badge">#{r.rank}</div>
                  </div>
                </div>

                <div className="dimension-bars">
                  {[
                    { key: 'skills', label: 'Skills', color: 'var(--color-primary)' },
                    { key: 'experience', label: 'Exp', color: 'var(--color-success)' },
                    { key: 'education', label: 'Edu', color: 'var(--color-warning)' },
                    { key: 'profile', label: 'Profile', color: 'var(--color-accent)' },
                    { key: 'location', label: 'Loc', color: '#f472b6' },
                  ].map(({ key, label, color }) => (
                    <div key={key} className="dim-bar">
                      <span className="dim-label">{label}</span>
                      <div className="dim-track">
                        <div className="dim-fill" style={{ width: `${dims[key] || 0}%`, background: color }} />
                      </div>
                      <span className="dim-value">{dims[key] || 0}</span>
                    </div>
                  ))}
                </div>

                {r.explanation && typeof r.explanation === 'object' && r.explanation.key_strengths && (
                  <div className="candidate-strengths">
                    {r.explanation.key_strengths.slice(0, 2).map((s, i) => (
                      <span key={i} className="strength-tag">✓ {s}</span>
                    ))}
                  </div>
                )}

                {r.candidate.parsedData?.skills && (
                  <div className="candidate-skills">
                    {r.candidate.parsedData.skills.slice(0, 5).map((s, i) => (
                      <Badge key={i} variant="default" size="sm">{s}</Badge>
                    ))}
                    {r.candidate.parsedData.skills.length > 5 && (
                      <Badge variant="default" size="sm">+{r.candidate.parsedData.skills.length - 5}</Badge>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>
      )}
    </div>

      {/* Scoring Options Modal */}
      {showScoringModal && (
        <div className="modal-overlay" onClick={() => setShowScoringModal(false)}>
          <div className="scoring-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Zap size={20} /> Run Scoring</h2>
              <button className="modal-close" onClick={() => setShowScoringModal(false)}><X size={18} /></button>
            </div>
            <p className="modal-subtitle">How would you like to score candidates against this JD?</p>
            <div className="scoring-options">
              <button className="scoring-option" onClick={handleRunAll}>
                <div className="scoring-option-icon all"><Users size={24} /></div>
                <div className="scoring-option-text">
                  <h3>All Candidates</h3>
                  <p>Score every parsed candidate in your pool ({parsedCandidateCount || 0} candidates)</p>
                </div>
              </button>
              {results.length > 0 && (
                <button className="scoring-option" onClick={handleRunPreviouslyScored}>
                  <div className="scoring-option-icon previous"><RefreshCw size={24} /></div>
                  <div className="scoring-option-text">
                    <h3>Re-run Previously Scored</h3>
                    <p>Re-score only the {results.length} candidate{results.length > 1 ? 's' : ''} already scored for this JD</p>
                  </div>
                </button>
              )}
              <button className="scoring-option" onClick={handleOpenCandidatePicker}>
                <div className="scoring-option-icon select"><UserCheck size={24} /></div>
                <div className="scoring-option-text">
                  <h3>Select Specific Candidates</h3>
                  <p>Choose which candidates to score from your pool</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Picker Modal */}
      {showCandidatePicker && (
        <div className="modal-overlay" onClick={() => setShowCandidatePicker(false)}>
          <div className="candidate-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><UserCheck size={20} /> Select Candidates</h2>
              <button className="modal-close" onClick={() => setShowCandidatePicker(false)}><X size={18} /></button>
            </div>
            <div className="picker-toolbar">
              <button className="select-all-btn" onClick={togglePickerAll}>
                {pickerSelectedIds.size === allCandidates.length ? <CheckSquare size={16} /> : <Square size={16} />}
                {pickerSelectedIds.size === allCandidates.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="selection-count">{pickerSelectedIds.size} of {allCandidates.length} selected</span>
              <input
                type="text"
                className="picker-search"
                placeholder="Search candidates..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
              />
            </div>
            <div className="picker-list">
              {loadingCandidates ? (
                <div className="loading-state">Loading candidates...</div>
              ) : allCandidates.length === 0 ? (
                <div className="loading-state">No parsed candidates found</div>
              ) : (
                allCandidates.filter(c => {
                  if (!pickerSearch.trim()) return true;
                  const q = pickerSearch.toLowerCase();
                  return (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
                }).map(c => {
                  const isScored = results.some(r => r.candidate.id === c.id);
                  return (
                    <div
                      key={c.id}
                      className={`picker-item ${pickerSelectedIds.has(c.id) ? 'selected' : ''}`}
                      onClick={() => togglePickerCandidate(c.id)}
                    >
                      <div className="picker-checkbox">
                        {pickerSelectedIds.has(c.id) ? <CheckSquare size={16} className="checkbox-checked" /> : <Square size={16} className="checkbox-unchecked" />}
                      </div>
                      <div className="picker-item-info">
                        <span className="picker-name">{c.name || 'Unknown'}</span>
                        {c.email && <span className="picker-email">{c.email}</span>}
                      </div>
                      {isScored && <Badge variant="success" size="sm">Scored</Badge>}
                    </div>
                  );
                })
              )}
            </div>
            <div className="picker-footer">
              <Button variant="ghost" onClick={() => setShowCandidatePicker(false)}>Cancel</Button>
              <Button variant="primary" icon={Zap} onClick={handleRunSelected} disabled={pickerSelectedIds.size === 0}>
                Score {pickerSelectedIds.size} Candidate{pickerSelectedIds.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
