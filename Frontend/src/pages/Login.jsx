import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Cookies from 'js-cookie';
import { baseUrl } from '../baseurl';

/**
 * LOGIN PAGE — Terminal animation while Playwright runs
 *
 * HOW IT WORKS:
 * 1. We receive the selected student from Landing page (via navigation state)
 * 2. The ID card flips (3D CSS animation) to reveal a terminal on the back
 * 3. We call POST /api/browser-login which returns SSE (Server-Sent Events)
 * 4. As Playwright progresses, the backend emits step events
 * 5. Each step types into the terminal one character at a time (typewriter effect)
 * 6. On success → save JWT token in cookie → navigate to dashboard
 *
 * Interview tip:
 * SSE = one-way stream from server to client over HTTP.
 * EventSource API: browser keeps connection open, server pushes events.
 * We use fetch + ReadableStream because EventSource only supports GET.
 */

// Login steps with their terminal messages
const STEPS = [
  { key: 'launching',  msg: 'Launching secure browser...' },
  { key: 'navigating', msg: 'Connecting to college portal...' },
  { key: 'filling',    msg: 'Entering credentials...' },
  { key: 'verifying',  msg: 'Waiting for verification...' },
  { key: 'signing',    msg: 'Signing you in...' },
];

// Typewriter hook — types text character by character
function useTypewriter(text, speed = 30) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    if (!text) return;

    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        setDone(true);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayed, done };
}

export default function Login({ setToken }) {
  const location = useLocation();
  const navigate  = useNavigate();

  // Student data passed from Landing page
  const student = location.state?.student;

  const [flipped, setFlipped]         = useState(false);
  const [completedSteps, setCompleted] = useState([]);
  const [activeStep, setActiveStep]   = useState(null);
  const [progress, setProgress]       = useState(0);
  const [error, setError]             = useState(null);
  const [done, setDone]               = useState(false);

  // If no student data, redirect back to search
  useEffect(() => {
    if (!student) navigate('/');
  }, [student]);

  // Start login process after card flip animation (0.8s delay)
  useEffect(() => {
    if (!student) return;
    const timer = setTimeout(() => {
      setFlipped(true);
      // Start SSE login after flip completes
      setTimeout(() => startLogin(), 800);
    }, 500);
    return () => clearTimeout(timer);
  }, [student]);

  /**
   * startLogin — connects to the SSE endpoint and processes events
   *
   * We use fetch + ReadableStream instead of EventSource
   * because EventSource only supports GET requests,
   * but our login requires POST with a body.
   */
  const startLogin = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/browser-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: student.phone, // Always use phone number for Playwright login
          password: 'Kmit123$',
        }),
      });

      // Read the SSE stream
      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE format: "event: name\ndata: {json}\n\n"
        // Split by double newline to get individual events
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() || ''; // Keep incomplete chunk in buffer

        for (const chunk of chunks) {
          const lines = chunk.split('\n');
          let eventName = 'message';
          let eventData = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) eventName = line.slice(7).trim();
            if (line.startsWith('data: '))  eventData = line.slice(6).trim();
          }

          if (!eventData) continue;

          try {
            const data = JSON.parse(eventData);
            handleSSEEvent(eventName, data);
          } catch {
            // Ignore malformed events
          }
        }
      }

    } catch (err) {
      setError('Connection failed. Please try again.');
    }
  };

  const handleSSEEvent = (event, data) => {
    if (event === 'step') {
      const stepIndex = STEPS.findIndex(s => s.key === data.step);
      setActiveStep(data.step);
      setProgress(((stepIndex + 1) / STEPS.length) * 85); // Max 85% until done

    } else if (event === 'done' && data.success) {
      // Success! Save token and redirect.
      setCompleted(STEPS.map(s => s.key)); // Mark all steps complete
      setActiveStep(null);
      setProgress(100);
      setDone(true);

      // Save JWT token in cookies (expires in 1 day)
      Cookies.set('token', data.token, { expires: 1 });
      Cookies.set('refresh_token', data.refresh_token, { expires: 7 });
      setToken(data.token);

      // Navigate to dashboard after brief celebration
      setTimeout(() => navigate('/dashboard'), 1200);

    } else if (event === 'error') {
      setError(data.error || 'Login failed. Please try again.');
    }
  };

  // Mark step as completed when next step starts
  useEffect(() => {
    if (!activeStep) return;
    const idx = STEPS.findIndex(s => s.key === activeStep);
    if (idx > 0) {
      setCompleted(prev => [...new Set([...prev, STEPS[idx - 1].key])]);
    }
  }, [activeStep]);

  if (!student) return null;

  const name = student.firstname
    ? `${student.firstname} ${student.lastname || ''}`.trim()
    : student.phone;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg)',
      }}
    >
      {/* ─── 3D Card Flip Container ─── */}
      {/* perspective() on parent creates the 3D space */}
      <div style={{ perspective: '1200px', width: '300px' }}>
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: 'relative',
            transformStyle: 'preserve-3d',
            width: '300px',
            height: '400px',
          }}
        >

          {/* ─── FRONT — ID Card ─── */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden',
            borderRadius: '20px', overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
          }}>
            {/* Card Header */}
            <div style={{ background: 'linear-gradient(135deg, #1a237e, #283593)', padding: '20px' }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '2px' }}>KMIT</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', letterSpacing: '1px' }}>HYDERABAD</div>
            </div>
            {/* Card Body */}
            <div style={{ background: '#fff', padding: '20px', height: '100%' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '10px', background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.75rem', marginBottom: '12px' }}>
                {(student.firstname?.[0] || '?').toUpperCase()}
              </div>
              <div style={{ color: '#111', fontWeight: 700, fontSize: '1rem' }}>{name}</div>
              {student.dept && <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '4px' }}>{student.dept} · {student.currentyear}nd Year</div>}
            </div>
          </div>

          {/* ─── BACK — Terminal ─── */}
          {/* rotateY(180deg) flips it to the back face */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: '20px', overflow: 'hidden',
            background: '#0a0a0f',
            border: '1px solid var(--border)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Terminal header */}
            <div style={{ background: '#111118', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF5F57' }}/>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FFBD2E' }}/>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28CA41' }}/>
              <div style={{ marginLeft: '8px', color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                spectra — login
              </div>
            </div>

            {/* Terminal body */}
            <div style={{ flex: 1, padding: '16px', fontFamily: 'monospace', fontSize: '0.8125rem', overflow: 'hidden' }}>
              {STEPS.map((step) => (
                <TerminalLine
                  key={step.key}
                  step={step}
                  isCompleted={completedSteps.includes(step.key)}
                  isActive={activeStep === step.key}
                  isDone={done}
                />
              ))}

              {done && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ color: '#22C55E', marginTop: '8px' }}
                >
                  ✓ Login successful! Redirecting...
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ color: '#EF4444', marginTop: '8px', fontSize: '0.75rem' }}
                >
                  ✗ {error}
                </motion.div>
              )}

              {!done && !error && !activeStep && flipped && (
                <div style={{ color: 'var(--primary)' }}>
                  Initializing<span className="cursor-blink" style={{ marginLeft: '4px' }}/>
                </div>
              )}
            </div>

            {/* Progress bar at bottom of card */}
            <div style={{ padding: '0 16px 16px' }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}/>
              </div>
            </div>
          </div>

        </motion.div>
      </div>

      {/* Student name below card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{ marginTop: '24px', textAlign: 'center' }}
      >
        <div style={{ color: 'var(--text)', fontWeight: 600 }}>
          {flipped ? (done ? '🎉 Welcome!' : 'Logging in...') : `Logging in as ${name}`}
        </div>
        {error && (
          <button
            onClick={() => navigate('/')}
            style={{ marginTop: '12px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Go back
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

/**
 * TerminalLine — a single step in the terminal
 * Shows: ✓ (completed) | pulsing dot (active) | nothing (pending)
 */
function TerminalLine({ step, isCompleted, isActive, isDone }) {
  const [typed, setTyped] = useState('');

  // Type out the message when this step becomes active
  useEffect(() => {
    if (!isActive && !isCompleted) return;
    if (typed) return; // Already typed

    let i = 0;
    const timer = setInterval(() => {
      i++;
      setTyped(step.msg.slice(0, i));
      if (i >= step.msg.length) clearInterval(timer);
    }, 25);

    return () => clearInterval(timer);
  }, [isActive, isCompleted]);

  if (!isActive && !isCompleted) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}
    >
      {/* Status icon */}
      {isCompleted || isDone ? (
        <span style={{ color: '#22C55E', fontWeight: 700, fontSize: '0.875rem' }}>✓</span>
      ) : (
        <span style={{ color: 'var(--primary)', fontSize: '0.875rem' }}>›</span>
      )}

      {/* Typed text */}
      <span style={{ color: isCompleted ? 'var(--text-muted)' : 'var(--text)' }}>
        {typed}
        {isActive && typed.length < step.msg.length && (
          <span className="cursor-blink" style={{ width: '6px', height: '12px' }}/>
        )}
      </span>
    </motion.div>
  );
}
