import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Mail, Phone, MapPin, Briefcase, GraduationCap, Code, Award, ArrowLeft, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCandidateStore } from '../store/candidateStore';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import { getScoreColor, getScoreLabel, formatDate } from '../utils/formatters';
import './CandidateDetailPage.css';

export default function CandidateDetailPage() {
  const { id } = useParams();
  const { currentCandidate, fetchCandidate, isLoading } = useCandidateStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState('profile');

  useEffect(() => { fetchCandidate(id); }, [id]);

  if (isLoading || !currentCandidate) return <div className="loading-state">Loading...</div>;

  const c = currentCandidate;
  const parsed = c.parsedData || {};
  const latestScore = c.scoreRecords?.[0];
  const dims = latestScore?.dimensionScores || {};

  return (
    <div className="candidate-detail-page">
      <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate(-1)}>Back</Button>

      <div className="candidate-header">
        <div className="candidate-avatar">{(c.name || 'U')[0].toUpperCase()}</div>
        <div className="candidate-header-info">
          <h1>{c.name || 'Unknown Candidate'}</h1>
          <div className="candidate-header-meta">
            {c.email && <span><Mail size={14} /> {c.email}</span>}
            {c.phone && <span><Phone size={14} /> {c.phone}</span>}
            {parsed.location && <span><MapPin size={14} /> {parsed.location}</span>}
          </div>
        </div>
        {latestScore && (
          <div className="candidate-score-big" style={{ '--sc': getScoreColor(latestScore.totalScore) }}>
            <span className="score-big-number">{latestScore.totalScore}</span>
            <span className="score-big-label">{getScoreLabel(latestScore.totalScore)}</span>
          </div>
        )}
      </div>

      {latestScore && (
        <div className="score-dimensions">
          {[{ key: 'skills', label: 'Skills', icon: Code, color: 'var(--color-primary)' }, { key: 'experience', label: 'Experience', icon: Briefcase, color: 'var(--color-success)' }, { key: 'education', label: 'Education', icon: GraduationCap, color: 'var(--color-warning)' }, { key: 'profile', label: 'Profile', icon: Award, color: 'var(--color-accent)' }, { key: 'location', label: 'Location', icon: MapPin, color: '#f472b6' }].map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="score-dim-card">
              <Icon size={20} style={{ color }} />
              <span className="dim-card-value" style={{ color }}>{dims[key] || 0}</span>
              <span className="dim-card-label">{label}</span>
            </div>
          ))}
        </div>
      )}

      {latestScore?.explanation && (() => {
        let parsed = null;
        const raw = latestScore.explanation;
        if (typeof raw === 'object' && raw !== null) {
          parsed = raw;
        } else if (typeof raw === 'string') {
          try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
        }
        return (
          <div className="explanation-box">
            <h3>AI Assessment</h3>
            {parsed ? (
              <>
                {parsed.summary && <p className="assessment-summary">{parsed.summary}</p>}
                {parsed.key_strengths?.length > 0 && (
                  <div className="assessment-section">
                    <h4><CheckCircle size={16} className="strength-icon" /> Strengths</h4>
                    <ul className="assessment-list">
                      {parsed.key_strengths.map((s, i) => (
                        <li key={i}><CheckCircle size={14} className="strength-icon" /> {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {parsed.key_gaps?.length > 0 && (
                  <div className="assessment-section">
                    <h4><XCircle size={16} className="gap-icon" /> Gaps</h4>
                    <ul className="assessment-list">
                      {parsed.key_gaps.map((g, i) => (
                        <li key={i}><XCircle size={14} className="gap-icon" /> {g}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {parsed.critical_missing_skills?.length > 0 && (
                  <div className="assessment-section">
                    <h4><AlertTriangle size={16} className="gap-icon" /> Critical Missing Skills</h4>
                    <div className="missing-skills">
                      {parsed.critical_missing_skills.map((skill, i) => (
                        <Badge key={i} variant="danger" size="sm">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p>{String(raw)}</p>
            )}
          </div>
        );
      })()}

      <div className="detail-tabs">
        {['profile', 'history'].map((t) => (
          <button key={t} className={`detail-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="profile-content">
          {parsed.work_experience?.length > 0 && (
            <section>
              <h3><Briefcase size={18} /> Work Experience</h3>
              {parsed.work_experience.map((exp, i) => (
                <div key={i} className="exp-item">
                  <div className="exp-header">
                    <strong>{exp.title}</strong> at {exp.company}
                  </div>
                  <div className="exp-dates">{exp.start_date} — {exp.end_date || 'Present'}</div>
                  {exp.responsibilities?.map((r, j) => <p key={j} className="exp-resp">• {r}</p>)}
                </div>
              ))}
            </section>
          )}

          {parsed.education?.length > 0 && (
            <section>
              <h3><GraduationCap size={18} /> Education</h3>
              {parsed.education.map((edu, i) => (
                <div key={i} className="edu-item">
                  <strong>{edu.degree} {edu.field}</strong>
                  <div className="edu-meta">{edu.institution} {edu.year && `(${edu.year})`}</div>
                </div>
              ))}
            </section>
          )}

          {parsed.skills?.length > 0 && (
            <section>
              <h3><Code size={18} /> Skills</h3>
              <div className="skills-grid">{parsed.skills.map((s, i) => <Badge key={i} variant="primary" size="sm">{s}</Badge>)}</div>
            </section>
          )}

          {parsed.certifications?.length > 0 && (
            <section>
              <h3><Award size={18} /> Certifications</h3>
              <div className="skills-grid">{parsed.certifications.map((c, i) => <Badge key={i} variant="success" size="sm">{c}</Badge>)}</div>
            </section>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="history-content">
          {c.scoreRecords?.length > 0 ? (
            <table className="history-table">
              <thead><tr><th>Job Description</th><th>Score</th><th>Skills</th><th>Exp</th><th>Edu</th><th>Profile</th><th>Date</th></tr></thead>
              <tbody>
                {c.scoreRecords.map((sr, i) => (
                  <tr key={i}>
                    <td>{sr.jd?.title || 'N/A'}</td>
                    <td style={{ color: getScoreColor(sr.totalScore), fontWeight: 700 }}>{sr.totalScore}</td>
                    <td>{sr.dimensionScores?.skills || '-'}</td>
                    <td>{sr.dimensionScores?.experience || '-'}</td>
                    <td>{sr.dimensionScores?.education || '-'}</td>
                    <td>{sr.dimensionScores?.profile || '-'}</td>
                    <td>{formatDate(sr.scoredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="no-history">No scoring history yet.</p>}
        </div>
      )}
    </div>
  );
}
