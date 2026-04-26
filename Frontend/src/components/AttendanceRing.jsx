import React, { useEffect, useState } from 'react';

/**
 * ATTENDANCE RING — Animated SVG circular progress indicator
 *
 * Interview tip:
 * SVG circles use stroke-dasharray + stroke-dashoffset for progress.
 * - dasharray = total circumference of the circle (2π × r)
 * - dashoffset = how much to "hide" = circumference × (1 - percentage/100)
 * Animating dashoffset from full circumference → target = filling animation.
 *
 * Props:
 *  percentage — 0-100 number
 *  size       — diameter in px (default 100)
 */
export default function AttendanceRing({ percentage = 0, size = 100 }) {
  const [animatedPct, setAnimatedPct] = useState(0);

  // Animate from 0 to target percentage on mount
  useEffect(() => {
    const duration = 900;
    const start = Date.now();

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic easing: starts fast, slows at end
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedPct(eased * percentage);
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [percentage]);

  // Geometry
  const strokeWidth = size * 0.1;       // proportional stroke
  const radius      = (size / 2) - (strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;
  const dashOffset    = circumference * (1 - animatedPct / 100);

  // Color thresholds
  const color =
    percentage >= 75 ? 'var(--success)' :
    percentage >= 65 ? 'var(--warning)' :
                       'var(--danger)';

  return (
    <svg
      width={size}
      height={size}
      style={{ flexShrink: 0, transform: 'rotate(-90deg)' }} // start from top
    >
      {/* Track (background circle) */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth={strokeWidth}
      />

      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.05s linear, stroke 0.3s ease' }}
      />
    </svg>
  );
}
