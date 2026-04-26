import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import AttendanceRing from '../components/AttendanceRing';
import PeriodGrid from '../components/PeriodGrid';
import { baseUrl } from '../baseurl';

/**
 * DASHBOARD PAGE
 *
 * This is the main hub students see after logging in.
 * We make 3 API calls in parallel (Promise.all) for speed:
 *   1. Profile  → student name, dept, photo
 *   2. Attendance → overall %, period-wise grid data
 *   3. Timetable  → today's schedule for "Now in class" card
 *
 * Interview tip: Promise.all fires all requests simultaneously.
 * Sequential await would take 3x longer.
 */

export default function Dashboard({ token, setToken }) {
  const navigate = useNavigate();

  const [profile, setProfile]       = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [timetable, setTimetable]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  // Count up animation for stats
  const [countPresent, setCountPresent]   = useState(0);
  const [countAbsent, setCountAbsent]     = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const headers = { Authorization: `Bearer ${token}` };

      // Decode JWT to get studentId (stored in `sub` claim)
      const { sub: studentId, rollno } = jwtDecode(token);

      // Fire all 3 requests simultaneously
      const [profileRes, attendanceRes, timetableRes] = await Promise.all([
        axios.post(`${baseUrl}/api/studentprofile`, { studentId }, { headers }),
        axios.post(`${baseUrl}/api/attendance`, {}, { headers }),
        axios.post(`${baseUrl}/api/timetable`, { method: '317' }, { headers }),
      ]);

      setProfile(profileRes.data?.payload?.student || profileRes.data);
      setAttendance(attendanceRes.data);
      setTimetable(timetableRes.data?.timetable || null);

      // Animate count-up for stats
      const present = attendanceRes.data?.twoWeekSessions?.present || 0;
      const absent  = attendanceRes.data?.twoWeekSessions?.absent  || 0;
      animateCount(present, setCountPresent);
      animateCount(absent,  setCountAbsent);

    } catch (err) {
      console.error('[dashboard] fetch error:', err.message);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * animateCount — counts up from 0 to target over ~800ms
   * Interview tip: requestAnimationFrame gives smooth 60fps animation
   */
  const animateCount = (target, setter) => {
    const duration = 800;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setter(Math.round(progress * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  // Determine today's timetable
  const getTodayClasses = () => {
    if (!timetable) return [];
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const today = days[new Date().getDay()];
    const daySchedule = timetable.find(d => d.dayname?.toLowerCase() === today.toLowerCase());
    if (!daySchedule) return [];
    return [...(daySchedule.beforelunch || []), ...(daySchedule.afterlunch || [])];
  };

  // Get current class based on time
  const getCurrentClass = (classes) => {
    const now = new Date();
    const hours = now.getHours();
    const mins  = now.getMinutes();
    const currentTime = hours * 60 + mins;

    // Simple time range check (KMIT schedule: 9:00 - 16:00)
    const periods = classes.filter(c => c.subject && !c.subject.toLowerCase().includes('break'));
    if (currentTime >= 9*60 && currentTime < 17*60 && periods.length > 0) {
      const periodIndex = Math.floor((currentTime - 9*60) / 60);
      return periods[Math.min(periodIndex, periods.length - 1)];
    }
    return null;
  };

  const todayClasses = getTodayClasses();
  const currentClass = getCurrentClass(todayClasses);

  const percentage = parseFloat(attendance?.totalPercentage || '0');
  const attendanceColor = percentage >= 75 ? 'var(--success)' : percentage >= 65 ? 'var(--warning)' : 'var(--danger)';
  const attendanceLabel = percentage >= 75 ? 'Steady 👌' : percentage >= 65 ? 'Getting risky ⚠️' : 'Critical 💀';

  if (loading) return <DashboardSkeleton />;

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', flexDirection: 'column', gap: '12px' }}>
      <div>{error}</div>
      <button className="btn-primary" onClick={fetchData}>Retry</button>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bottom-nav-space"
    >
      <Navbar token={token} setToken={setToken} />

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>

        {/* ─── Profile Card ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{ padding: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}
        >
          {/* Avatar */}
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: '1.4rem', flexShrink: 0,
          }}>
            {(profile?.firstname?.[0] || '?').toUpperCase()}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Hey, {profile?.firstname || 'Student'} 👋
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '2px' }}>
              {[profile?.dept, profile?.currentyear && `${profile.currentyear}nd Year`, profile?.section && `Section ${profile.section}`].filter(Boolean).join(' · ')}
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontFamily: 'monospace', marginTop: '2px' }}>
              {profile?.rollno}
            </div>
          </div>
        </motion.div>

        {/* ─── Attendance + Weekly Grid ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card"
          style={{ padding: '20px', marginBottom: '16px' }}
        >
          {/* Attendance Ring + Summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
            <AttendanceRing percentage={percentage} size={100} />
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: attendanceColor }}>{percentage.toFixed(1)}%</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '2px' }}>{attendanceLabel}</div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '4px' }}>Overall attendance</div>
            </div>
          </div>

          {/* Period Grid — last 7 days */}
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Last 7 Days
            </div>
            <PeriodGrid dayObjects={attendance?.dayObjects || []} days={7} />
          </div>
        </motion.div>

        {/* ─── Stats Row ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}
        >
          <StatCard label="Present" value={countPresent} color="var(--success)" sublabel="(last 2 weeks)" />
          <StatCard label="Absent"  value={countAbsent}  color="var(--danger)"  sublabel="(last 2 weeks)" />
        </motion.div>

        {/* ─── Now in Class (Spotify-style) ─── */}
        {currentClass && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card"
            style={{ padding: '16px', marginBottom: '16px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
              <span style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em' }}>NOW IN CLASS</span>
            </div>
            <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1rem' }}>
              {currentClass.subject?.replace(/<[^>]*>/g, '') || 'Class'}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '2px' }}>
              {currentClass.hour?.replace(/<[^>]*>/g, '') || ''}
            </div>
          </motion.div>
        )}

        {/* ─── Quick Actions ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}
        >
          {[
            { label: 'Attendance', icon: '📊', path: '/attendance' },
            { label: 'Results',    icon: '📝', path: '/results' },
            { label: 'Timetable', icon: '📅', path: '/timetable' },
            { label: 'QR Code',   icon: '▦',  path: '/qr' },
          ].map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="glass-card"
              style={{
                padding: '14px 8px', border: '1px solid var(--border)',
                cursor: 'pointer', textAlign: 'center',
                transition: 'background 150ms, transform 150ms',
                background: 'var(--surface)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>{item.icon}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 500 }}>{item.label}</div>
            </button>
          ))}
        </motion.div>

      </div>

      <BottomNav active="dashboard" />

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; transform: scale(1); }
          50%      { opacity:0.6; transform: scale(1.3); }
        }
      `}</style>
    </motion.div>
  );
}

// ─── Reusable stat card ───
function StatCard({ label, value, color, sublabel }) {
  return (
    <div className="glass-card" style={{ padding: '16px' }}>
      <div style={{ color, fontSize: '1.75rem', fontWeight: 800 }}>{value}</div>
      <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.875rem', marginTop: '2px' }}>{label}</div>
      <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '2px' }}>{sublabel}</div>
    </div>
  );
}

// ─── Loading skeleton ───
function DashboardSkeleton() {
  return (
    <div className="bottom-nav-space">
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
        {[1,2,3].map(i => (
          <div key={i} className="skeleton" style={{ height: i === 1 ? '80px' : i === 2 ? '180px' : '100px', marginBottom: '16px', borderRadius: 'var(--radius)' }}/>
        ))}
      </div>
    </div>
  );
}
