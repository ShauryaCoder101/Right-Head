import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, BarChart3, Clock, Plus, Upload, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useJdStore } from '../store/jdStore';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import './DashboardPage.css';

function StatCard({ icon: Icon, label, value, trend, trendUp, color }) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: `${color}15`, color }}>
        <Icon size={22} />
      </div>
      <div className="stat-card-content">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
      {trend && (
        <div className={`stat-trend ${trendUp ? 'trend-up' : 'trend-down'}`}>
          {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { jds, fetchJds } = useJdStore();
  const navigate = useNavigate();

  useEffect(() => { fetchJds(); }, []);

  const activeJds = jds.filter((j) => j.status === 'ACTIVE');

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-welcome">Welcome back, <span className="gradient-text">{user?.name || 'Recruiter'}</span></h1>
          <p className="dashboard-subtitle">Here's what's happening with your screening pipeline.</p>
        </div>
        <div className="dashboard-actions">
          <Button variant="secondary" icon={Plus} onClick={() => navigate('/jd/upload')}>New JD</Button>
          <Button variant="primary" icon={Upload} onClick={() => navigate('/candidates')}>Upload Resumes</Button>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard icon={Users} label="Total Candidates" value={jds.reduce((sum, j) => sum + (j._count?.scoreRecords || 0), 0)} trend="+12%" trendUp color="var(--color-primary)" />
        <StatCard icon={FileText} label="Active JDs" value={activeJds.length} color="var(--color-success)" />
        <StatCard icon={BarChart3} label="Avg. Score" value="72" trend="+5" trendUp color="var(--color-accent)" />
        <StatCard icon={Clock} label="Screenings This Month" value={jds.length} color="var(--color-warning)" />
      </div>

      <section className="dashboard-section">
        <div className="section-header">
          <h2>Job Descriptions</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/jd/library')}>View All</Button>
        </div>

        {jds.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} className="empty-icon" />
            <h3>No job descriptions yet</h3>
            <p>Upload a job description to start screening candidates.</p>
            <Button variant="primary" icon={Plus} onClick={() => navigate('/jd/upload')}>Upload JD</Button>
          </div>
        ) : (
          <div className="jd-grid">
            {jds.slice(0, 6).map((jd) => (
              <div key={jd.id} className="jd-card" onClick={() => navigate(`/scoring/${jd.id}`)}>
                <div className="jd-card-header">
                  <h3 className="jd-card-title">{jd.title}</h3>
                  <Badge variant={jd.status === 'ACTIVE' ? 'success' : jd.status === 'DRAFT' ? 'warning' : 'default'} size="sm">
                    {jd.status}
                  </Badge>
                </div>
                <div className="jd-card-meta">
                  <span>{jd._count?.scoreRecords || 0} candidates</span>
                  <span>•</span>
                  <span>{new Date(jd.createdAt).toLocaleDateString()}</span>
                </div>
                {jd.parsedRequirements?.required_skills && (
                  <div className="jd-card-skills">
                    {jd.parsedRequirements.required_skills.slice(0, 4).map((s, i) => (
                      <Badge key={i} variant="primary" size="sm">{s}</Badge>
                    ))}
                    {jd.parsedRequirements.required_skills.length > 4 && (
                      <Badge variant="default" size="sm">+{jd.parsedRequirements.required_skills.length - 4}</Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
