
import React, { useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import api from './api/client.js';
import Payment from './pages/Payment.jsx';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState('login');
  const [msg, setMsg] = useState('');
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    try {
      const { data } = await api.post(
        `/auth/${mode}`,
        mode === 'login' ? { email, password } : { name, email, password }
      );
      localStorage.setItem('unfazed_token', data.token);
      localStorage.setItem('unfazed_therapist', JSON.stringify(data.therapist));
      nav('/dashboard');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not connect to API');
    }
  }

  return (
    <section className="panel narrow">
      <h2>{mode === 'login' ? 'Welcome back' : 'Create therapist account'}</h2>
      <form onSubmit={submit}>
        {mode === 'register' && (
          <input placeholder="Full name" value={name}
            onChange={e => setName(e.target.value)} required />
        )}
        <input type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password (8+ characters)"
          value={password} onChange={e => setPassword(e.target.value)}
          minLength="8" required />
        <button>{mode === 'login' ? 'Log in' : 'Register'}</button>
      </form>
      <p className="muted">{msg}</p>
      <button className="linkbtn"
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Need an account? Register' : 'Already registered? Log in'}
      </button>
    </section>
  );
}

function Dashboard() {
  const [clients, setClients] = useState([]);
  const [slots, setSlots] = useState([]);
  const [notes, setNotes] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [startAt, setStart] = useState('');
  const [endAt, setEnd] = useState('');
  const [stats, setStats] = useState(null);
  const [msg, setMsg] = useState('');

  const [noteClientId, setNoteClientId] = useState('');
  const [noteType, setNoteType] = useState('private');
  const [noteContent, setNoteContent] = useState('');
  const [sessionAt, setSessionAt] = useState('');

  async function refresh() {
    try {
      const [c, s, n] = await Promise.all([
        api.get('/clients'),
        api.get('/availability'),
        api.get('/notes')
      ]);
      setClients(c.data);
      setSlots(s.data);
      setNotes(n.data);
      setNoteClientId(current =>
        current || (c.data.length ? c.data[0]._id : '')
      );
    } catch (e) {
      setMsg(e.response?.data?.message || 'Some dashboard data is unavailable.');
    }

    try {
      const a = await api.get('/analytics');
      setStats(a.data);
    } catch {
      setStats(null);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function addClient(e) {
    e.preventDefault();
    try {
      await api.post('/clients', { name, email });
      setName('');
      setEmail('');
      setMsg('Client added successfully.');
      await refresh();
    } catch (e) {
      setMsg(e.response?.data?.message || 'Could not add client');
    }
  }

  async function addSlot(e) {
    e.preventDefault();
    try {
      await api.post('/availability', {
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString()
      });
      setStart('');
      setEnd('');
      setMsg('Availability slot added.');
      await refresh();
    } catch (e) {
      setMsg(e.response?.data?.message || 'Could not add slot');
    }
  }

 
  async function selectTier(tier) {
    setMsg(`Switching to ${tier} plan...`);

    try {
      const response = await api.patch('/therapist/tier', { tier });

      const therapist = JSON.parse(
        localStorage.getItem('unfazed_therapist') || '{}'
      );

      localStorage.setItem(
        'unfazed_therapist',
        JSON.stringify({
          ...therapist,
          ...response.data.therapist
        })
      );

      setMsg(response.data.message || `Successfully switched to ${tier}.`);
      await refresh();
    } catch (error) {
      console.error('Subscription error:', error);
      setMsg(
        error.response?.data?.message ||
        error.message ||
        'Could not change plan. Check the backend.'
      );
    }
  }

  async function addNote(e) {
    e.preventDefault();

    if (!noteClientId) {
      setMsg('Please add a client before creating a note.');
      return;
    }

    if (!noteContent.trim()) {
      setMsg('Please enter your session note.');
      return;
    }

    try {
      await api.post('/notes', {
        clientId: noteClientId,
        type: noteType,
        content: noteContent.trim(),
        sessionAt: sessionAt ? new Date(sessionAt).toISOString() : undefined
      });

      setNoteContent('');
      setSessionAt('');
      setMsg(`${noteType === 'private' ? 'Private' : 'Shared'} note saved.`);
      await refresh();
    } catch (e) {
      setMsg(e.response?.data?.message || 'Could not save note');
    }
  }

  return (
    <div className="dashboard">
      <div className="welcome">
        <div>
          <p className="eyebrow">THERAPIST WORKSPACE</p>
          <h2>Your practice, in one place.</h2>
          <p className="muted">Manage clients, sessions and practice activity.</p>
        </div>
        <button className="secondary" onClick={() => {
          localStorage.removeItem('unfazed_token');
          localStorage.removeItem('unfazed_therapist');
          location.href = '/login';
        }}>
          Log out
        </button>
      </div>

      <p className="notice">{msg}</p>

      <div className="stats">
        <article className="panel">
          <span>Active clients</span>
          <strong>{stats?.activeClients ?? clients.length}</strong>
        </article>
        <article className="panel">
          <span>Recorded revenue</span>
          <strong>₹{stats?.revenue ?? 0}</strong>
        </article>
        <article className="panel">
          <span>Open slots</span>
          <strong>{slots.length}</strong>
        </article>
      </div>

      <div className="columns">
        <section className="panel">
          <h3>Add a client</h3>
          <form onSubmit={addClient}>
            <input placeholder="Client name" value={name}
              onChange={e => setName(e.target.value)} required />
            <input type="email" placeholder="Client email (optional)"
              value={email} onChange={e => setEmail(e.target.value)} />
            <button>Add client</button>
          </form>

          <h3>Clients</h3>
          {clients.length ? clients.map(c => (
            <div className="listrow" key={c._id}>
              <b>{c.name}</b>
              <span>{c.email || 'No email added'}</span>
            </div>
          )) : <p className="muted">No clients yet.</p>}
        </section>

        <section className="panel">
          <h3>Create an available slot</h3>
          <form onSubmit={addSlot}>
            <label>Start time
              <input type="datetime-local" value={startAt}
                onChange={e => setStart(e.target.value)} required />
            </label>
            <label>End time
              <input type="datetime-local" value={endAt}
                onChange={e => setEnd(e.target.value)} required />
            </label>
            <button>Add slot</button>
          </form>

          <h3>Upcoming available slots</h3>
          {slots.map(s => (
            <div className="listrow" key={s._id}>
              <b>{new Date(s.startAt).toLocaleString()}</b>
              <span>{new Date(s.endAt).toLocaleTimeString()}</span>
            </div>
          ))}
        </section>
      </div>

      <section className="panel" style={{ marginTop: 24 }}>
        <p className="eyebrow">CLINICAL DOCUMENTATION</p>
        <h3>Clinical Notes</h3>
        <p className="muted">
          Record session notes for your clients. Private notes are for the
          therapist; shared notes may be shown to the client.
        </p>

        {clients.length === 0 ? (
          <p className="muted">Add a client before creating a clinical note.</p>
        ) : (
          <form onSubmit={addNote}>
            <label>Client
              <select value={noteClientId}
                onChange={e => setNoteClientId(e.target.value)} required>
                {clients.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </label>

            <label>Note type
              <select value={noteType} onChange={e => setNoteType(e.target.value)}>
                <option value="private">Private note</option>
                <option value="shared">Shared with client</option>
              </select>
            </label>

            <label>Session date and time (optional)
              <input type="datetime-local" value={sessionAt}
                onChange={e => setSessionAt(e.target.value)} />
            </label>

            <label>Session note
              <textarea rows="5" value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                placeholder="Write the session note here..." required />
            </label>

            <button type="submit">Save clinical note</button>
          </form>
        )}

        <h3>Saved Notes</h3>
        {notes.length === 0 ? (
          <p className="muted">No clinical notes saved yet.</p>
        ) : notes.map(note => {
          const client = clients.find(c => c._id === note.clientId);
          return (
            <article className="listrow" key={note._id}>
              <div>
                <b>{client?.name || 'Client'}</b>
                <p className="muted">
                  {note.type === 'private' ? 'Private note' : 'Shared note'}
                  {' · '}
                  {note.sessionAt
                    ? new Date(note.sessionAt).toLocaleString()
                    : new Date(note.createdAt).toLocaleString()}
                </p>
                <p style={{ whiteSpace: 'pre-wrap' }}>{note.content}</p>
              </div>
            </article>
          );
        })}
      </section>
      
      <section className="panel">
        <p className="eyebrow">YOUR PLAN</p>
        <h3>Subscription Plans</h3>
        <p className="muted">
          Choose the plan that fits your practice. Plan selection here is for demonstration only.
        </p>

       
  <div className="columns">
    <article className="panel">
      <h3>Free</h3>
      <h2>₹0</h2>
      <p>Up to 5 active clients</p>
      <p>Basic client management and scheduling</p>
      <p className="muted">Analytics not included</p>
      <button type="button" onClick={() => selectTier('free')}>
        Choose Free
      </button>
    </article>

    <article className="panel">
      <h3>Pro</h3>
      <h2>Pro</h2>
      <p>Up to 50 active clients</p>
      <p>Analytics and templates</p>
      <p className="muted">Demo plan, no payment</p>
      
      <button type="button" onClick={() => window.location.href = '/payment'}>
        Choose Pro
       </button>

    </article>

    <article className="panel">
      <h3>Premium</h3>
      <h2>Premium</h2>
      <p>Up to 200 active clients</p>
      <p>Analytics and templates</p>
      <p className="muted">Demo plan, no payment</p>
      
     
    <button type="button" onClick={() => window.location.href = '/payment'}>
       Choose Premium
    </button>


    </article>
  </div>

      </section>



      <div className="panel payment-teaser">
        <div>
          <h3>Payments & packages</h3>
          <p className="muted">
            Create a Razorpay test order and record its returned payment ID.
          </p>
        </div>
        <Link className="button" to="/payment">Open payment module</Link>
      </div>
    </div>
  );
}

function Home() {
  return (
    <div className="hero">
      <div className="hero-copy">
        <p className="eyebrow">A CALMER WAY TO RUN YOUR PRACTICE</p>
        <h1>More care.<br /><em>Less admin.</em></h1>
        <p>Scheduling, client management and practice tools for therapists, gathered in one simple workspace.</p>
        <Link className="button" to="/login">Get started <span>↗</span></Link>
      </div>
      <div className="hero-art">
        <div className="orb">u.</div>
        <div className="floatcard"><span className="dot"></span> Your next session <b>10:30 AM</b></div>
        <div className="floatcard second">A little more room to breathe ✦</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <header className="nav">
        <Link className="brand" to="/">unfazed<span>.</span></Link>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/login">Sign in</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <footer>Unfazed · Practice management for therapists</footer>
    </>
  );
}
