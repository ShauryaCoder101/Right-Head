import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useJdStore } from '../store/jdStore';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Input from '../components/common/Input';
import './DashboardPage.css';

export default function JDLibraryPage() {
  const { jds, fetchJds, isLoading } = useJdStore();
  const navigate = useNavigate();

  useEffect(() => { fetchJds(); }, []);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>Job Descriptions</h1>
        <Button variant="primary" icon={Plus} onClick={() => navigate('/jd/upload')}>New JD</Button>
      </div>

      {jds.length === 0 ? (
        <div className="empty-state">
          <h3>No job descriptions yet</h3>
          <p>Upload your first JD to start screening.</p>
          <Button variant="primary" icon={Plus} onClick={() => navigate('/jd/upload')}>Upload JD</Button>
        </div>
      ) : (
        <div className="jd-grid">
          {jds.map((jd) => (
            <div key={jd.id} className="jd-card" onClick={() => navigate(`/scoring/${jd.id}`)}>
              <div className="jd-card-header">
                <h3 className="jd-card-title">{jd.title}</h3>
                <Badge variant={jd.status === 'ACTIVE' ? 'success' : jd.status === 'DRAFT' ? 'warning' : 'default'} size="sm">{jd.status}</Badge>
              </div>
              <div className="jd-card-meta">
                <span>{jd._count?.scoreRecords || 0} candidates</span>
                <span>•</span>
                <span>{new Date(jd.createdAt).toLocaleDateString()}</span>
              </div>
              {jd.parsedRequirements?.required_skills && (
                <div className="jd-card-skills">
                  {jd.parsedRequirements.required_skills.slice(0, 5).map((s, i) => (
                    <Badge key={i} variant="primary" size="sm">{s}</Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
