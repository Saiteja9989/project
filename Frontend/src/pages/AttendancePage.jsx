import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import PeriodGrid from '../components/PeriodGrid';
import { baseUrl } from '../baseurl';

/**
 * ATTENDANCE PAGE
 *
 * Two sections:
 *  1. Overall attendance summary (from /api/attendance) — already loaded on
 *     dashboard, but we re-fetch here for standalone access.
 *  2. Subject-wise breakdown (from /api/subject/attendance) — per-subject %.
 *
 * Interview tip: We make two API calls concurrently with Promise.all
 * so both load at the same time instead of waiting for each other.
 */

export default function AttendancePage({ token }) {
  const [overall, setOverall]   = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      // Both requests fire at the same time
      const [overallRes, subjectRes] = await Promise.all([
        axios.post(`${baseUrl}/api/attendance`, {}, { headers }),
        axios.post(`${baseUrl}/api/subject/attendance`, {}, { headers }),
      ]);

      setOverall(overallRes.data);
      setSubjects(subjectRes.data || []);
    } catch (err) {
      setError('Failed to load attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <AttendanceSkeleton />;

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
      <div style={{ color: 'var(--danger)' }}>{error}</div>
      <button className="btn-primary" onClick={fetchAll}>Retry</button>
    </div>
  );

  const totalPct = parseFloat(overall?.totalPercentage || '0');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bottom-nav-space">
      <Navbar token={token} />

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>

        {/* ─── Overall Summary Card ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{ padding: '20px', marginBottom: '16px' }}
        >
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px' }}>
            Overall
          </div>

          {/* Big percentage */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              fontSize: '3.5rem', fontWeight: 800, lineHeight: 1,
              color: totalPct >= 75 ? 'var(--success)' : totalPct >= 65 ? 'var(--warning)' : 'var(--danger)',
            }}>
              {totalPct.toFixed(1)}%
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '6px' }}>
              {totalPct >= 75 ? 'You\'re good 👌' : totalPct >= 65 ? 'Getting risky ⚠️' : 'Critical 💀'}
            </div>
          </div>

          {/* Progress bar */}
          <div className="progress-bar" style={{ marginBottom: '20px' }}>
            <div
              className="progress-fill"
              style={{
                width: `${totalPct}%`,
                background: totalPct >= 75
                  ? 'var(--success)'
                  : totalPct >= 65
                  ? 'var(--warning)'
                  : 'var(--danger)',
              }}
            />
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Present', value: overall?.twoWeekSessions?.present ?? '—', color: 'var(--success)' },
              { label: 'Absent',  value: overall?.twoWeekSessions?.absent  ?? '—', color: 'var(--danger)' },
              { label: 'Total',   value: (overall?.twoWeekSessions?.present ?? 0) + (overall?.twoWeekSessions?.absent ?? 0), color: 'var(--primary)' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>{s.label}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.6875rem' }}>last 2 weeks</div>
              </div>
            ))}
          </div>

          {/* Period grid — last 14 days */}
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Last 14 Days
            </div>
            <PeriodGrid dayObjects={overall?.dayObjects || []} days={14} />
          </div>
        </motion.div>

        {/* ─── Subject-wise Cards ─── */}
        {subjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>
              Subject-wise
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {subjects.map((subject, i) => (
                <SubjectCard key={i} subject={subject} index={i} />
              ))}
            </div>
          </motion.div>
        )}

      </div>

      <BottomNav active="attendance" />
    </motion.div>
  );
}

/**
 * SubjectCard — one subject's attendance with animated progress bar
 */
function SubjectCard({ subject, index }) {
  const pct = parseFloat(subject.percentage || '0');
  const color = pct >= 75 ? 'var(--success)' : pct >= 65 ? 'var(--warning)' : 'var(--danger)';

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass-card"
      style={{ padding: '14px 16px' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
          {/* Strip HTML tags from subject name (college API sometimes sends HTML) */}
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {(subject.subjectname || subject.subject || 'Subject').replace(/<[^>]*>/g, '')}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
            {subject.subjectType || subject.type || ''}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Attended / Total */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {subject.attendedSessions}/{subject.totalSessions}
            </div>
          </div>
          {/* Percentage badge */}
          <div style={{ fontWeight: 800, fontSize: '1rem', color, minWidth: '48px', textAlign: 'right' }}>
            {pct.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, background: color, transition: `width 800ms ${index * 40}ms cubic-bezier(.4,0,.2,1)` }}
        />
      </div>
    </motion.div>
  );
}

/**
 * Loading skeleton
 */
function AttendanceSkeleton() {
  return (
    <div className="bottom-nav-space">
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
        {[200, 100, 80, 80, 80].map((h, i) => (
          <div key={i} className="skeleton" style={{ height: `${h}px`, marginBottom: '12px', borderRadius: 'var(--radius)' }} />
        ))}
      </div>
    </div>
  );
}
