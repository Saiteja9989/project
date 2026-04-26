import React from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';

/**
 * NAVBAR — Top bar for all authenticated pages
 *
 * Props:
 *  token    — current JWT (to verify user is logged in)
 *  setToken — clears token on logout
 *
 * Interview tip: Putting logout in the navbar means every page
 * gets it for free — single responsibility, no repetition.
 */
export default function Navbar({ token, setToken }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear cookies and state, return to search
    Cookies.remove('token');
    Cookies.remove('refresh_token');
    if (setToken) setToken(null);
    navigate('/');
  };

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(9,9,11,0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
      padding: '0 16px',
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>

        {/* Logo */}
        <div
          onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
        >
          {/* Spark icon */}
          <div style={{
            width: '28px', height: '28px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: '0.875rem' }}>✦</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: '0.9375rem', letterSpacing: '-0.3px', color: 'var(--text)' }}>
            Spectra
          </span>
        </div>

        {/* Logout button — logs student out and goes back to search */}
        <button
          onClick={handleLogout}
          title="Switch student"
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '6px 12px',
            color: 'var(--text-muted)',
            fontSize: '0.75rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'color 150ms, border-color 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          Switch →
        </button>

      </div>
    </nav>
  );
}
