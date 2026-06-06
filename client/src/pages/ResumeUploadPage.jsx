import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Trash2, Search, FileText, CheckCircle, Clock, User } from 'lucide-react';
import api from '../services/api';
import { useCandidateStore } from '../store/candidateStore';
import { useToast } from '../components/common/ToastContainer';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import FileUpload from '../components/common/FileUpload';
import BatchProgress from '../components/common/BatchProgress';
import './ResumeUploadPage.css';

/* ── helpers ─────────────────────────────────────────── */

function statusBadge(status) {
  switch (status) {
    case 'parsed':
      return (
        <Badge variant="success" size="sm">
          <CheckCircle size={12} /> Parsed
        </Badge>
      );
    case 'parsing':
      return (
        <Badge variant="warning" size="sm">
          <Clock size={12} /> Parsing
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="danger" size="sm">
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="default" size="sm">
          <Clock size={12} /> Pending
        </Badge>
      );
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ── component ───────────────────────────────────────── */

export default function ResumeUploadPage() {
  /* upload state (kept from original) */
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [batchJobId, setBatchJobId] = useState(null);
  const [parseComplete, setParseComplete] = useState(false);
  const [parsedCount, setParsedCount] = useState(0);
  const { uploadResumes } = useCandidateStore();
  const toast = useToast();
  const navigate = useNavigate();

  /* candidate-list state */
  const [candidates, setCandidates] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  /* ── fetch candidates ─────────────────────────────── */
  const fetchCandidates = useCallback(async () => {
    setLoadingList(true);
    try {
      const { data } = await api.get('/candidates', {
        params: { page: 1, limit: 100 },
      });
      setCandidates(data.candidates ?? data.data ?? data ?? []);
    } catch {
      toast.error('Failed to load candidates');
    } finally {
      setLoadingList(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  /* re-fetch after a parse batch finishes */
  useEffect(() => {
    if (parseComplete) fetchCandidates();
  }, [parseComplete, fetchCandidates]);

  /* ── upload handler (original) ────────────────────── */
  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setParseComplete(false);
    try {
      const result = await uploadResumes(files);
      setBatchJobId(result.batchJobId);
      toast.success(
        `${files.length} resume${files.length > 1 ? 's' : ''} uploaded — parsing with AI...`
      );
    } catch (err) {
      const errData = err.response?.data?.error;
      const msg = typeof errData === 'object' ? errData?.message : errData;
      toast.error(msg || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleParseComplete = (batch) => {
    setParseComplete(true);
    setParsedCount(batch.doneCount || 0);
    if (batch.doneCount > 0) {
      toast.success(
        `${batch.doneCount} resume${batch.doneCount > 1 ? 's' : ''} parsed successfully!`
      );
    }
  };

  const handleReset = () => {
    setBatchJobId(null);
    setParseComplete(false);
    setParsedCount(0);
    setFiles([]);
  };

  /* ── delete handler ───────────────────────────────── */
  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/candidates/${id}/data`);
      setCandidates((prev) => prev.filter((c) => c._id !== id && c.id !== id));
      toast.success('Candidate deleted');
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  /* ── filtered list ────────────────────────────────── */
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return candidates;
    const q = searchQuery.toLowerCase();
    return candidates.filter((c) => {
      const name = (c.name || '').toLowerCase();
      return name.includes(q);
    });
  }, [candidates, searchQuery]);

  /* ── render ───────────────────────────────────────── */
  return (
    <div className="resume-upload-page">
      {/* ── Header ─────────────────────────────────── */}
      <h1>
        <FileText size={28} /> Candidates
      </h1>
      <p className="page-desc">
        Upload candidate resumes for AI-powered parsing, or manage existing candidates below.
      </p>

      {/* ── Batch progress ─────────────────────────── */}
      {batchJobId && (
        <BatchProgress
          batchJobId={batchJobId}
          label="Parsing resumes with AI"
          onComplete={handleParseComplete}
          onDismiss={parseComplete ? handleReset : undefined}
        />
      )}

      {/* ── Upload form ────────────────────────────── */}
      {!batchJobId && (
        <>
          <FileUpload
            onFilesSelected={setFiles}
            multiple
            maxFiles={500}
            label="Drop resumes here (PDF, DOCX, or TXT — up to 500 files)"
          />
          <div className="upload-actions">
            <span className="file-count">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </span>
            <Button
              variant="primary"
              icon={Upload}
              onClick={handleUpload}
              loading={uploading}
              disabled={files.length === 0}
            >
              Upload &amp; Parse
            </Button>
          </div>
        </>
      )}

      {/* ── Post-parse actions ─────────────────────── */}
      {parseComplete && (
        <div className="parse-complete-actions">
          <p className="parse-summary">
            {parsedCount > 0
              ? `${parsedCount} resume${parsedCount > 1 ? 's' : ''} ready for scoring. Head to a Job Description to run scoring.`
              : 'Parsing failed — try uploading the files again.'}
          </p>
          <div className="batch-actions">
            <Button variant="ghost" onClick={handleReset}>
              Upload More
            </Button>
            <Button variant="primary" onClick={() => navigate('/jds')}>
              Go to Job Descriptions
            </Button>
          </div>
        </div>
      )}

      {/* ── Candidate List ─────────────────────────── */}
      <section className="candidate-list-section">
        <div className="candidate-list-header">
          <h2>
            <User size={20} /> All Candidates
            {!loadingList && (
              <span className="candidate-count">{candidates.length}</span>
            )}
          </h2>

          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* loading skeleton */}
        {loadingList && (
          <div className="candidate-list-loading">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-row" />
            ))}
          </div>
        )}

        {/* empty state */}
        {!loadingList && candidates.length === 0 && (
          <div className="candidate-list-empty">
            <User size={40} />
            <p>No candidates yet — upload some resumes above to get started.</p>
          </div>
        )}

        {/* no search results */}
        {!loadingList && candidates.length > 0 && filtered.length === 0 && (
          <div className="candidate-list-empty">
            <Search size={32} />
            <p>No candidates match "{searchQuery}"</p>
          </div>
        )}

        {/* candidate rows */}
        {!loadingList && filtered.length > 0 && (
          <div className="candidate-list">
            {filtered.map((c) => {
              const id = c._id || c.id;
              return (
                <div key={id} className="candidate-row">
                  <div className="candidate-avatar">
                    <User size={18} />
                  </div>

                  <div className="candidate-info">
                    <span className="candidate-name">
                      {c.name || 'Unnamed Candidate'}
                    </span>
                    {c.email && (
                      <span className="candidate-email">{c.email}</span>
                    )}
                  </div>

                  <div className="candidate-meta">
                    {statusBadge(c.status)}
                    <span className="candidate-date">
                      {formatDate(c.createdAt || c.uploadedAt)}
                    </span>
                  </div>

                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={() => handleDelete(id)}
                    loading={deletingId === id}
                    disabled={deletingId === id}
                    className="candidate-delete-btn"
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
