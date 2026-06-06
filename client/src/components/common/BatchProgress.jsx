import React, { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../../services/api';
import './BatchProgress.css';

/**
 * Real-time batch job progress tracker.
 * Polls the batch status endpoint and shows a progress bar with live updates.
 *
 * @param {string} batchJobId - The batch job ID to track
 * @param {string} label - e.g. "Parsing resumes" or "Scoring candidates"
 * @param {function} onComplete - Called when batch finishes
 * @param {function} onDismiss - Called when user dismisses
 */
export default function BatchProgress({ batchJobId, label, onComplete, onDismiss }) {
  const [batch, setBatch] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  const timerRef = useRef(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (!batchJobId) return;

    // Poll batch status every 2 seconds
    const poll = async () => {
      try {
        const { data } = await api.get(`/candidates/batch/${batchJobId}`);
        setBatch(data);
        if (data.status === 'DONE' || data.status === 'FAILED') {
          clearInterval(intervalRef.current);
          clearInterval(timerRef.current);
          if (onComplete) setTimeout(() => onComplete(data), 1500);
        }
      } catch {
        // Silently retry
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 2000);

    // Elapsed time counter
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(timerRef.current);
    };
  }, [batchJobId]);

  if (!batch) return null;

  const total = batch.totalCount || 1;
  const done = batch.doneCount || 0;
  const failed = batch.failedCount || 0;
  const processed = done + failed;
  const pct = Math.round((processed / total) * 100);
  const isDone = batch.status === 'DONE';
  const isFailed = batch.status === 'FAILED';
  const isRunning = batch.status === 'RUNNING' || batch.status === 'QUEUED';

  const formatTime = (s) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  const estimateRemaining = () => {
    if (processed === 0 || !isRunning) return null;
    const perItem = elapsed / processed;
    const remaining = Math.round(perItem * (total - processed));
    return formatTime(remaining);
  };

  return (
    <div className={`batch-progress ${isDone ? 'done' : isFailed ? 'failed' : 'running'}`}>
      <div className="batch-progress-header">
        <div className="batch-progress-icon">
          {isDone ? <CheckCircle size={20} /> : isFailed ? <XCircle size={20} /> : <Loader2 size={20} className="spin" />}
        </div>
        <div className="batch-progress-info">
          <span className="batch-progress-label">
            {isDone ? `${label} complete!` : isFailed ? `${label} failed` : `${label}...`}
          </span>
          <span className="batch-progress-stats">
            {processed}/{total} processed
            {failed > 0 && <span className="batch-failed"> · {failed} failed</span>}
            {isRunning && <span className="batch-time"> · {formatTime(elapsed)}</span>}
            {isRunning && estimateRemaining() && (
              <span className="batch-eta"> · ~{estimateRemaining()} remaining</span>
            )}
          </span>
        </div>
        {(isDone || isFailed) && onDismiss && (
          <button className="batch-dismiss" onClick={onDismiss}>✕</button>
        )}
      </div>
      <div className="batch-progress-bar-track">
        <div
          className="batch-progress-bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
