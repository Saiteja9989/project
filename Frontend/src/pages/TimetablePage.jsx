import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import { baseUrl } from '../baseurl';

/**
 * TIMETABLE PAGE
 *
 * Features:
 *  - Day tab strip (Mon–Sat), auto-selects today on load
 *  - Morning / Afternoon sections separated by lunch break
 *  - Current period highlighted if today is selected
 *  - HTML tags in subject names stripped (college API quirk)
 *
 * Interview tip:
 * We strip HTML with a regex: str.replace(/<[^>]*>/g, '')
 * This is safe for display-only use. Never use innerHTML with untrusted HTML.
 */

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };

export default function TimetablePage({ token }) {
  const [timetable, setTimetable]   = useState([]);  // array of day objects from API
  const [selectedDay, setSelectedDay] = useState('');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  // Detect today's day name for auto-selection
  const todayName = DAYS[new Date().getDay() - 1] || 'Monday'; // getDay() 1=Mon..6=Sat, 0=Sun

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const { data } = await axios.post(
        `${baseUrl}/api/timetable`,
        { method: '317' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const raw = data?.timetable || [];

      // Ensure all 6 weekdays are present (fill in empty days)
      const normalized = DAYS.map(day =>
        raw.find(d => d.dayname?.toLowerCase() === day.toLowerCase()) ||
        { dayname: day, beforelunch: [], lunch: '', afterlunch: [] }
      );

      setTimetable(normalized);
      // Auto-select today (or Monday if weekend)
      setSelectedDay(DAYS.includes(todayName) ? todayName : 'Monday');
    } catch (err) {
      setError('Failed to load timetable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <TimetableSkeleton />;

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
      <div style={{ color: 'var(--danger)' }}>{error}</div>
      <button className="btn-primary" onClick={fetchTimetable}>Retry</button>
    </div>
  );

  const currentDayData = timetable.find(d => d.dayname === selectedDay);
  const isToday = selectedDay === todayName;

  // Current period index (only meaningful if today is selected)
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  // KMIT schedule: first period 9:00, each period 60 min
  const currentPeriodIndex = isToday
    ? Math.floor((currentMinutes - 9 * 60) / 60)
    : -1;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bottom-nav-space">
      <Navbar token={token} />

      {/* ─── Day Tab Strip — sticky so it doesn't scroll away ─── */}
      <div style={{
        position: 'sticky',
        top: '52px',   // height of Navbar
        zIndex: 40,
        background: 'rgba(9,9,11,0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        padding: '8px 16px',
        overflowX: 'auto',
        display: 'flex',
        gap: '6px',
      }}>
        {DAYS.map(day => {
          const isActive  = selectedDay === day;
          const isDayToday = day === todayName;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              style={{
                flexShrink: 0,
                padding: '6px 14px',
                borderRadius: '10px',
                border: isActive
                  ? 'none'
                  : isDayToday
                  ? '1px solid var(--primary)'
                  : '1px solid var(--border)',
                cursor: 'pointer',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.8125rem',
                background: isActive
                  ? 'linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%)'
                  : 'transparent',
                color: isActive ? '#fff' : isDayToday ? 'var(--primary)' : 'var(--text-muted)',
                transition: 'all 150ms',
              }}
            >
              {DAY_SHORT[day]}
              {isDayToday && !isActive && (
                <span style={{ display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary)', marginLeft: '5px', verticalAlign: 'middle' }}/>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>

        {/* ─── Morning ─── */}
        <SessionSection
          title="Morning"
          icon="🌅"
          sessions={currentDayData?.beforelunch || []}
          currentPeriodIndex={currentPeriodIndex}
          startIndex={0}
          isToday={isToday}
        />

        {/* ─── Lunch Break ─── */}
        {currentDayData?.lunch && (
          <div
            className="glass-card"
            style={{ padding: '12px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <span style={{ fontSize: '1.25rem' }}>🍱</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>Lunch Break</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '1px' }}>
                {currentDayData.lunch.replace(/<[^>]*>/g, '')}
              </div>
            </div>
          </div>
        )}

        {/* ─── Afternoon ─── */}
        <SessionSection
          title="Afternoon"
          icon="☀️"
          sessions={currentDayData?.afterlunch || []}
          currentPeriodIndex={currentPeriodIndex}
          startIndex={currentDayData?.beforelunch?.length || 0}
          isToday={isToday}
        />

      </div>

      <BottomNav active="timetable" />
    </motion.div>
  );
}

/**
 * SessionSection — renders a group of class sessions (morning or afternoon)
 */
function SessionSection({ title, icon, sessions, currentPeriodIndex, startIndex, isToday }) {
  // Filter out "break" entries from display
  const classes = sessions.filter(s => s.subject && !s.subject.toLowerCase().includes('break'));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ marginBottom: '16px' }}
    >
      {/* Section label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <span>{icon}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {title}
        </span>
      </div>

      {classes.length === 0 ? (
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.875rem' }}>
          No {title.toLowerCase()} sessions
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {classes.map((session, i) => {
            const absoluteIndex = startIndex + i;
            const isCurrent = isToday && absoluteIndex === currentPeriodIndex;

            return (
              <PeriodCard
                key={i}
                session={session}
                number={absoluteIndex + 1}
                isCurrent={isCurrent}
              />
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/**
 * PeriodCard — single class period card
 * Highlighted in primary color if it's the current class
 */
function PeriodCard({ session, number, isCurrent }) {
  const subject = (session.subject || '').replace(/<[^>]*>/g, '').trim();
  const hour    = (session.hour    || '').replace(/<[^>]*>/g, '').trim();

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        borderColor: isCurrent ? 'var(--primary)' : 'var(--border)',
        background: isCurrent ? 'var(--primary-dim)' : 'var(--surface)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left accent bar for current period */}
      {isCurrent && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: '3px',
          background: 'linear-gradient(180deg, var(--primary), #8B5CF6)',
        }}/>
      )}

      {/* Period number badge */}
      <div style={{
        width: '32px', height: '32px',
        borderRadius: '10px',
        background: isCurrent ? 'var(--primary)' : 'var(--surface-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800,
        fontSize: '0.875rem',
        color: isCurrent ? '#fff' : 'var(--text-muted)',
        flexShrink: 0,
      }}>
        {number}
      </div>

      {/* Subject info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: isCurrent ? 'var(--text)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {subject || 'Free Period'}
        </div>
        {hour && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '2px' }}>
            {hour}
          </div>
        )}
      </div>

      {/* "NOW" badge */}
      {isCurrent && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          background: 'var(--danger)',
          borderRadius: '6px',
          padding: '3px 8px',
          flexShrink: 0,
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff', animation: 'pulse 1.5s ease-in-out infinite' }}/>
          <span style={{ color: '#fff', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em' }}>NOW</span>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </motion.div>
  );
}

function TimetableSkeleton() {
  return (
    <div className="bottom-nav-space">
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
        <div className="skeleton" style={{ height: '48px', marginBottom: '16px', borderRadius: '10px' }} />
        {[80, 80, 80, 80].map((h, i) => (
          <div key={i} className="skeleton" style={{ height: `${h}px`, marginBottom: '8px', borderRadius: 'var(--radius)' }} />
        ))}
      </div>
    </div>
  );
}
