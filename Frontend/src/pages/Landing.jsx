import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { baseUrl } from '../baseurl';

/**
 * LANDING PAGE — Search + ID Card Reveal
 *
 * Flow:
 * 1. Student types name / phone / hall ticket
 * 2. We query our MongoDB via /api/search
 * 3. Results appear as a dropdown (staggered animation)
 * 4. Student clicks a result → ID card slides up (3D tilt effect)
 * 5. Student clicks "Continue" → navigate to /login with student data
 *
 * Interview tip: We search our OWN database (MongoDB), not the college API.
 * The college API requires auth — our DB is the fast lookup layer.
 */

// Placeholder text cycles every 2.5 seconds
const PLACEHOLDERS = [
  'Search by name...',
  'Search by roll number...',
  'Search by phone...',
  'Search by hall ticket...',
];

// Department color dots — visual identity per branch
const DEPT_COLORS = {
  CSE: '#6366F1',  // Indigo
  ECE: '#22C55E',  // Green
  EEE: '#F59E0B',  // Amber
  MECH:'#F97316',  // Orange
  CIVIL:'#06B6D4', // Cyan
  IT:  '#8B5CF6',  // Purple
  MBA: '#EC4899',  // Pink
};

const getDeptColor = (dept) => DEPT_COLORS[dept?.toUpperCase()] || '#6366F1';

export default function Landing({ setToken }) {
  const navigate = useNavigate();

  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [selected, setSelected]   = useState(null);  // Student chosen for ID card
  const [phIdx, setPhIdx]         = useState(0);     // Placeholder index
  const [focused, setFocused]     = useState(false);

  const inputRef   = useRef(null);
  const debounceRef = useRef(null);

  // ─── Rotate placeholder text ───
  useEffect(() => {
    const timer = setInterval(() => {
      setPhIdx(i => (i + 1) % PLACEHOLDERS.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // ─── Debounced search ───
  // We wait 300ms after the user stops typing before hitting the API.
  // Interview tip: debouncing prevents an API call on every keystroke.
  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await axios.post(`${baseUrl}/api/search`, {
          searchInput: query.trim(),
        });
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (inputRef.current && !inputRef.current.closest('.search-wrapper')?.contains(e.target)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (student) => {
    setSelected(student);
    setFocused(false);
  };

  const handleContinue = () => {
    // Pass selected student to Login page via navigation state
    navigate('/login', { state: { student: selected } });
  };

  const showDropdown = focused && query.trim() && (results.length > 0 || loading);

  return (
    <motion.div
      className="page-wrapper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
    >

      {/* ─── Background Orb ─── */}
      <div
        className="bg-orb"
        style={{
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          top: '40%',
          left: '50%',
        }}
      />

      {/* ─── Logo ─── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center', marginBottom: '48px', position: 'relative', zIndex: 1 }}
      >
        <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text)', marginBottom: '8px' }}>
          ✦ Spectra
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
          Your college, beautifully.
        </div>
      </motion.div>

      {/* ─── Search Box ─── */}
      <motion.div
        className="search-wrapper"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{ position: 'relative', width: '100%', maxWidth: '480px', zIndex: 10 }}
      >
        {/* Search Icon */}
        <svg
          style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 2 }}
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>

        <input
          ref={inputRef}
          className="search-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={PLACEHOLDERS[phIdx]}
          autoComplete="off"
        />

        {/* Loading spinner inside input */}
        {loading && (
          <div style={{ position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          </div>
        )}

        {/* ─── Search Results Dropdown ─── */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0, right: 0,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            >
              {results.map((student, i) => (
                <motion.button
                  key={student._id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => handleSelect(student)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Department color dot + Avatar */}
                  <div style={{
                    width: '36px', height: '36px',
                    borderRadius: '50%',
                    background: getDeptColor(student.dept),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '0.875rem',
                    flexShrink: 0,
                  }}>
                    {(student.firstname?.[0] || student.phone?.[0] || '?').toUpperCase()}
                  </div>

                  <div>
                    <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.9375rem' }}>
                      {student.firstname
                        ? `${student.firstname} ${student.lastname || ''}`.trim()
                        : student.phone || student.hallticketno}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '2px' }}>
                      {[student.dept, student.currentyear && `${student.currentyear}${['st','nd','rd','th'][student.currentyear-1]||'th'} Year`, student.section && `Sec ${student.section}`]
                        .filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </motion.button>
              ))}

              {results.length === 0 && !loading && (
                <div style={{ padding: '16px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' }}>
                  No students found
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Footer hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{ marginTop: '32px', color: 'var(--text-dim)', fontSize: '0.8125rem', zIndex: 1 }}
      >
        2,000+ students · KMIT
      </motion.div>

      {/* ─── ID Card Overlay ─── */}
      <AnimatePresence>
        {selected && (
          <IDCardOverlay
            student={selected}
            onClose={() => setSelected(null)}
            onContinue={handleContinue}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
}

/**
 * ID CARD OVERLAY
 *
 * After selecting a student, this full-screen overlay appears.
 * The card has a 3D tilt effect that follows the mouse.
 *
 * Interview tip:
 * - perspective() on the parent creates a 3D space
 * - rotateX/rotateY on the child creates the tilt
 * - We calculate tilt angle from cursor position relative to card center
 */
function IDCardOverlay({ student, onClose, onContinue }) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [shine, setShine] = useState({ x: 50, y: 50 }); // shine position %

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    // Tilt: max ±8 degrees
    setTilt({
      x: ((y - cy) / cy) * 8,
      y: ((cx - x) / cx) * 8,
    });
    // Shine follows cursor
    setShine({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    // Smoothly return to flat position
    setTilt({ x: 0, y: 0 });
    setShine({ x: 50, y: 50 });
  };

  const name = student.firstname
    ? `${student.firstname} ${student.lastname || ''}`.trim()
    : student.phone;

  const dept = student.dept ? `${student.dept} • ${student.currentyear || ''}${['st','nd','rd','th'][(student.currentyear||1)-1]||'th'} Year${student.section ? ` • Section ${student.section}` : ''}` : '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* Card — stop propagation so clicking card doesn't close overlay */}
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.9 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={e => e.stopPropagation()}
        style={{ perspective: '1000px' }}
      >
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            width: '300px',
            borderRadius: '20px',
            overflow: 'hidden',
            position: 'relative',
            cursor: 'default',
            transformStyle: 'preserve-3d',
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: 'transform 0.15s ease',
            boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          }}
        >
          {/* Holographic shine overlay — moves with mouse */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
            background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,0.08) 0%, transparent 60%)`,
            borderRadius: '20px',
          }}/>

          {/* Card Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
            padding: '20px 20px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '2px' }}>KMIT</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', letterSpacing: '1px' }}>HYDERABAD</div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '4px 10px',
              color: '#fff', fontSize: '0.7rem', fontWeight: 600,
            }}>
              STUDENT ID
            </div>
          </div>

          {/* Card Body */}
          <div style={{ background: '#fff', padding: '20px' }}>
            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
              <div style={{
                width: '72px', height: '72px',
                borderRadius: '10px',
                background: `linear-gradient(135deg, ${getDeptColor(student.dept)} 0%, ${getDeptColor(student.dept)}aa 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: '1.75rem',
                flexShrink: 0,
              }}>
                {(student.firstname?.[0] || '?').toUpperCase()}
              </div>
              <div>
                <div style={{ color: '#111', fontWeight: 700, fontSize: '1rem', lineHeight: 1.3 }}>{name}</div>
                {student.dept && <div style={{ color: '#555', fontSize: '0.8rem', marginTop: '4px' }}>{dept}</div>}
                {student.hallticketno && (
                  <div style={{ color: '#888', fontSize: '0.75rem', marginTop: '4px', fontFamily: 'monospace' }}>
                    {student.hallticketno}
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: '#f0f0f0', margin: '12px 0' }}/>

            {/* Barcode placeholder */}
            <div style={{ display: 'flex', gap: '2px', height: '36px', alignItems: 'stretch' }}>
              {Array.from({ length: 40 }, (_, i) => (
                <div key={i} style={{
                  flex: 1,
                  background: i % 3 === 0 ? '#111' : i % 2 === 0 ? '#555' : '#ddd',
                  borderRadius: '1px',
                }}/>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
        onClick={e => e.stopPropagation()}
      >
        <button className="btn-primary" onClick={onContinue} style={{ padding: '14px 40px', fontSize: '1rem' }}>
          Continue as {student.firstname || 'Student'} →
        </button>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}
        >
          Not you? Go back
        </button>
      </motion.div>
    </motion.div>
  );
}
