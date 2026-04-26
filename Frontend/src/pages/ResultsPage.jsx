import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import { baseUrl } from '../baseurl';

/**
 * RESULTS PAGE
 *
 * Two tabs:
 *  - Internal Assessment: mid-term marks by subject/semester
 *  - Semester Results:    end-semester grades + SGPA + backlog count
 *
 * Interview tip:
 * The college API returns nested objects. We "transform" (flatten/reshape)
 * the data into a simple array before rendering — separation of concerns:
 * data fetching/shaping is separate from rendering logic.
 */

export default function ResultsPage({ token }) {
  const [tab, setTab]                       = useState('internal');
  const [internalData, setInternalData]     = useState([]);
  const [externalData, setExternalData]     = useState([]);
  const [totalBacklogs, setTotalBacklogs]   = useState(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      // We need rollno from the JWT for result endpoints
      const { rollno } = jwtDecode(token);

      const [intRes, extRes] = await Promise.all([
        axios.post(`${baseUrl}/api/internalResultData`, { rollno }, { headers }),
        axios.post(`${baseUrl}/api/externalResultData`, { rollno }, { headers }),
      ]);

      if (!intRes.data.Error) {
        setInternalData(transformInternal(intRes.data.payload));
      }
      if (!extRes.data.Error) {
        setExternalData(transformExternal(extRes.data.payload));
        setTotalBacklogs(calcBacklogs(extRes.data.payload));
      }
    } catch (err) {
      setError('Failed to load results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Data transforms ───

  /**
   * transformInternal — flattens the nested year/semester/internalType structure
   * into a flat array of { year, semester, internalType, columns, data }
   */
  const transformInternal = (payload) => {
    if (!Array.isArray(payload)) return [];
    const result = [];
    payload.forEach(yearData => {
      yearData.semesters?.forEach(sem => {
        sem.internal_types?.forEach(internalType => {
          const columns = ['Subject', 'Type', 'Assignment', 'Descriptive', 'Objective', 'Total'];
          const data = internalType.subjects.map(sub => {
            const row = { Subject: sub.name, Type: sub.subject_type, Total: sub.totalMarks };
            sub.types?.forEach(t => { row[t.type] = t.marks; });
            row.Assignment  = row.Assignment  ?? 'N/A';
            row.Descriptive = row.Descriptive ?? 'N/A';
            row.Objective   = row.Objective   ?? 'N/A';
            return row;
          });
          result.push({
            year: yearData.year,
            semester: sem.semester,
            internalType: internalType.internalType,
            columns, data,
          });
        });
      });
    });
    return result;
  };

  /**
   * transformExternal — flattens yearlyResults into semester cards
   */
  const transformExternal = (payload) => {
    if (!payload?.yearlyResults) return [];
    const result = [];
    Object.entries(payload.yearlyResults).forEach(([yearKey, yearData]) => {
      const year = parseInt(yearKey.split(' ')[1]);
      Object.entries(yearData).forEach(([semKey, semData]) => {
        const semester = parseInt(semKey.split(' ')[1]);
        const data = semData.results?.map((sub, i) => ({
          '#': i + 1,
          Subject: sub.subjectName,
          Grade: sub.grade,
          Points: sub.gradepoints,
          Credits: sub.credits,
        })) || [];
        result.push({
          year, semester,
          sgpa: semData.SGPA?.sgpa || '—',
          credits: semData.SGPA?.totalCredits || '—',
          data,
        });
      });
    });
    return result;
  };

  const calcBacklogs = (payload) => {
    if (!payload?.yearlyResults) return 0;
    let count = 0;
    Object.values(payload.yearlyResults).forEach(yearData => {
      Object.values(yearData).forEach(semData => {
        count += semData.SGPA?.backlogcount || 0;
      });
    });
    return count;
  };

  // ─── Render ───

  if (loading) return <ResultsSkeleton />;

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
      <div style={{ color: 'var(--danger)' }}>{error}</div>
      <button className="btn-primary" onClick={fetchAll}>Retry</button>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bottom-nav-space">
      <Navbar token={token} />

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>

        {/* ─── Tab Switcher ─── */}
        <div
          className="glass-card"
          style={{ display: 'flex', padding: '4px', marginBottom: '16px', gap: '4px' }}
        >
          {[
            { key: 'internal', label: '📝 Internal' },
            { key: 'external', label: '🎓 Semester' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
                transition: 'background 200ms, color 200ms',
                background: tab === t.key ? 'var(--primary)' : 'transparent',
                color:      tab === t.key ? '#fff' : 'var(--text-muted)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── External: Backlog Banner ─── */}
        {tab === 'external' && totalBacklogs !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card"
            style={{
              padding: '14px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderColor: totalBacklogs > 0 ? 'var(--danger)' : 'var(--success)',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: totalBacklogs > 0 ? 'var(--danger)' : 'var(--success)', fontSize: '0.9375rem' }}>
                {totalBacklogs > 0 ? '⚠️ Active Backlogs' : '✓ No Backlogs'}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '2px' }}>
                {totalBacklogs > 0 ? `${totalBacklogs} subject(s) to clear` : 'All exams cleared — great job!'}
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: totalBacklogs > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {totalBacklogs}
            </div>
          </motion.div>
        )}

        {/* ─── Content ─── */}
        {tab === 'internal'
          ? <InternalList data={internalData} />
          : <ExternalList data={externalData} />
        }

      </div>

      <BottomNav active="results" />
    </motion.div>
  );
}

// ─── Internal Assessment list ───
function InternalList({ data }) {
  if (!data.length) return <EmptyState message="No internal results yet." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {data.map((block, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass-card"
          style={{ overflow: 'hidden' }}
        >
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)' }}>
              Year {block.year} · Semester {block.semester} · Internal {block.internalType}
            </div>
          </div>

          {/* Rows */}
          <div style={{ overflowX: 'auto' }}>
            {block.data.map((row, ri) => (
              <div
                key={ri}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 16px',
                  borderBottom: ri < block.data.length - 1 ? '1px solid var(--border)' : 'none',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.Subject}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '1px' }}>
                    {row.Type}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
                  {[
                    { label: 'Assgn', value: row.Assignment },
                    { label: 'Desc',  value: row.Descriptive },
                    { label: 'Obj',   value: row.Objective },
                  ].map(f => (
                    <div key={f.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: getMarkColor(f.value) }}>{f.value}</div>
                      <div style={{ fontSize: '0.625rem', color: 'var(--text-dim)' }}>{f.label}</div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'center', minWidth: '36px' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: getMarkColor(row.Total) }}>{row.Total}</div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--text-dim)' }}>Total</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── External semester list ───
function ExternalList({ data }) {
  if (!data.length) return <EmptyState message="No semester results yet." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {data.map((sem, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass-card"
          style={{ overflow: 'hidden' }}
        >
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)' }}>
              Year {sem.year} · Semester {sem.semester}
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SGPA</div>
                <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--success)' }}>{sem.sgpa}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Credits</div>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text)' }}>{sem.credits}</div>
              </div>
            </div>
          </div>

          {/* Subject rows */}
          {sem.data.map((row, ri) => (
            <div
              key={ri}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 16px',
                borderBottom: ri < sem.data.length - 1 ? '1px solid var(--border)' : 'none',
                gap: '12px',
              }}
            >
              <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', width: '20px', flexShrink: 0 }}>{row['#']}</div>
              <div style={{ flex: 1, fontWeight: 500, fontSize: '0.875rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.Subject}
              </div>
              <div style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: getGradeColor(row.Grade) }}>{row.Grade}</div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--text-dim)' }}>Grade</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--primary)' }}>{row.Points}</div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--text-dim)' }}>GP</div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      ))}
    </div>
  );
}

// ─── Helpers ───

function getMarkColor(mark) {
  if (mark === 'N/A' || mark == null) return 'var(--text-dim)';
  const n = parseFloat(mark);
  if (isNaN(n)) return 'var(--text-muted)';
  if (n >= 8) return 'var(--success)';
  if (n >= 5) return 'var(--warning)';
  return 'var(--danger)';
}

function getGradeColor(grade) {
  if (!grade) return 'var(--text-muted)';
  const g = grade.toUpperCase();
  if (g === 'O' || g === 'A+') return 'var(--success)';
  if (g === 'A' || g === 'B+') return '#60A5FA'; // blue
  if (g === 'B' || g === 'C')  return 'var(--warning)';
  if (g === 'F' || g === 'AB') return 'var(--danger)';
  return 'var(--text)';
}

function EmptyState({ message }) {
  return (
    <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
      {message}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="bottom-nav-space">
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
        {[60, 120, 120].map((h, i) => (
          <div key={i} className="skeleton" style={{ height: `${h}px`, marginBottom: '12px', borderRadius: 'var(--radius)' }} />
        ))}
      </div>
    </div>
  );
}
