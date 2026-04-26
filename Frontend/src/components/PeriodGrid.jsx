import React from 'react';

/**
 * PERIOD GRID — Shows attendance dots for the last N days
 *
 * Each day is a column: date label + row of colored dots (one per period).
 * Green = Present, Red = Absent, Gray = No class / unknown.
 *
 * Interview tip:
 * This is like a mini version of GitHub's contribution graph.
 * We map the dayObjects array from the attendance API into a visual grid.
 *
 * Props:
 *  dayObjects — array from attendance API:
 *    { date, dayname, periods: [{ status }] }
 *  days — how many recent days to show (default 7)
 */
export default function PeriodGrid({ dayObjects = [], days = 7 }) {
  // Take the last N days, most-recent-first order → reverse for left-to-right
  const recentDays = dayObjects.slice(-days);

  if (recentDays.length === 0) {
    return (
      <div style={{ color: 'var(--text-dim)', fontSize: '0.8125rem', textAlign: 'center', padding: '12px 0' }}>
        No attendance data
      </div>
    );
  }

  // Maximum periods in any day (for consistent grid height)
  const maxPeriods = Math.max(...recentDays.map(d => d.periods?.length || 0), 1);

  return (
    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
      {recentDays.map((day, dayIdx) => {
        // Format date: "Apr 25" from ISO string or date string
        const dateLabel = formatDate(day.date);

        return (
          <div
            key={dayIdx}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}
          >
            {/* Date label */}
            <div style={{ color: 'var(--text-dim)', fontSize: '0.625rem', fontWeight: 600, marginBottom: '2px' }}>
              {dateLabel}
            </div>

            {/* Period dots */}
            {Array.from({ length: maxPeriods }).map((_, periodIdx) => {
              const period = day.periods?.[periodIdx];
              const status = period?.status?.toLowerCase() || '';

              const dotColor =
                status === 'present' || status === 'p' ? 'var(--success)' :
                status === 'absent'  || status === 'a' ? 'var(--danger)'  :
                'var(--border)'; // no class / unknown

              return (
                <div
                  key={periodIdx}
                  title={`${day.dayname} P${periodIdx + 1}: ${period?.status || 'N/A'}`}
                  style={{
                    width: '8px', height: '8px',
                    borderRadius: '2px',
                    background: dotColor,
                    opacity: dotColor === 'var(--border)' ? 0.5 : 1,
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/**
 * formatDate — converts a date string to "Apr 25"
 * Handles both ISO strings (2025-04-25) and DD/MM/YYYY formats
 */
function formatDate(dateStr) {
  if (!dateStr) return '?';
  try {
    // Handle DD/MM/YYYY format from college API
    let date;
    if (dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/');
      date = new Date(`${y}-${m}-${d}`);
    } else {
      date = new Date(dateStr);
    }
    if (isNaN(date.getTime())) return dateStr.slice(0, 5);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '?';
  }
}
