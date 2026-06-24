import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function SentimentBadge({ label, confidence }) {
  const upper = (label || '').toUpperCase();
  let cls = 'neutral';
  if (upper === 'POSITIVE') cls = 'positive';
  else if (upper === 'NEGATIVE') cls = 'negative';

  return (
    <span className={`badge ${cls}`}>
      <span className="dot" />
      {upper || 'UNKNOWN'}
    </span>
  );
}

function App() {
  const [tickets, setTickets] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [health, setHealth] = useState({ status: 'checking' });

  const loadTickets = async () => {
    try {
      const res = await fetch(`${API_BASE}/tickets`);
      if (!res.ok) throw new Error(`Failed to load tickets (${res.status})`);
      const data = await res.json();
      setTickets(data);
    } catch (e) {
      setError(e.message);
    }
  };

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth({ status: 'down' });
    }
  };

  useEffect(() => {
    checkHealth();
    loadTickets();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !message.trim()) {
      setError('Title and message are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          category: category.trim() || null,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Submit failed (${res.status}): ${t}`);
      }

      setTitle('');
      setMessage('');
      setCategory('');
      await loadTickets();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const healthOk = health.status === 'ok';
  const healthClass = health.status === 'checking'
    ? ''
    : healthOk ? 'ok' : 'err';
  const healthLabel = health.status === 'checking'
    ? 'Checking…'
    : healthOk ? 'API healthy' : 'API down';

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-icon">🎫</div>
          <div>
            <h1>Ticket Analyzer</h1>
            <p>AI-powered sentiment analysis for support tickets</p>
          </div>
        </div>
        <div className="health-pill">
          <span className={`health-dot ${healthClass}`} />
          {healthLabel}
        </div>
      </header>

      <div className="grid">
        <section className="card">
          <h2>📝 Submit a ticket</h2>

          {error && <div className="error">{error}</div>}

          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                type="text"
                placeholder="Brief summary of the issue"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={255}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                placeholder="Describe the problem in detail…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="category">Category (optional)</label>
              <input
                id="category"
                type="text"
                placeholder="e.g. lab, billing, account"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                maxLength={64}
              />
            </div>

            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? 'Analyzing…' : 'Analyze & Save'}
            </button>
          </form>
        </section>

        <section className="card">
          <h2>📋 Ticket history ({tickets.length})</h2>

          {tickets.length === 0 ? (
            <div className="empty">
              No tickets yet. Submit one to see sentiment analysis in action.
            </div>
          ) : (
            <div className="ticket-list">
              {tickets.map((t) => (
                <article key={t.id} className="ticket">
                  <div className="ticket-head">
                    <div>
                      <div className="ticket-title">
                        #{t.id} · {t.title}
                        {t.category && (
                          <span className="category-tag">{t.category}</span>
                        )}
                      </div>
                      <div className="ticket-meta">
                        {formatDate(t.created_at)}
                      </div>
                    </div>
                    <SentimentBadge
                      label={t.sentiment}
                      confidence={t.confidence}
                    />
                  </div>
                  <div className="ticket-msg">{t.message}</div>
                  <div className="ticket-foot">
                    <span>Confidence</span>
                    <span className="confidence">
                      {(t.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
