import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * BOTTOM NAV — Mobile-style tab bar at the bottom of the screen
 *
 * Interview tip: Fixed positioning + z-index keeps it above all content.
 * We use `active` prop (string) to highlight the current tab.
 */

const TABS = [
  {
    key: 'dashboard',
    path: '/dashboard',
    label: 'Home',
    // SVG path for a house icon
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    ),
  },
  {
    key: 'attendance',
    path: '/attendance',
    label: 'Attend.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    key: 'results',
    path: '/results',
    label: 'Results',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10,9 9,9 8,9"/>
      </svg>
    ),
  },
  {
    key: 'timetable',
    path: '/timetable',
    label: 'Schedule',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12,6 12,12 16,14"/>
      </svg>
    ),
  },
];

export default function BottomNav({ active }) {
  const navigate = useNavigate();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      zIndex: 50,
      background: 'rgba(9,9,11,0.92)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      height: '64px',
      paddingBottom: 'env(safe-area-inset-bottom)', // iPhone notch support
    }}>
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? 'var(--primary)' : 'var(--text-muted)',
              transition: 'color 150ms',
              padding: '8px 0',
            }}
          >
            {tab.icon}
            <span style={{
              fontSize: '0.625rem',
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '0.02em',
            }}>
              {tab.label}
            </span>

            {/* Active indicator dot */}
            {isActive && (
              <div style={{
                position: 'absolute',
                bottom: '6px',
                width: '4px', height: '4px',
                borderRadius: '50%',
                background: 'var(--primary)',
              }}/>
            )}
          </button>
        );
      })}
    </nav>
  );
}
