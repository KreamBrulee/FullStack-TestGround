import { useState, useEffect, useCallback } from "react";

// ── Constants ────────────────────────────────────────────────────────────────
const API = "/api/feedback";

const SUBJECTS = [
  "Mathematics", "Physics", "Data Structures", "Operating Systems",
  "Computer Networks", "Machine Learning", "Web Technologies",
  "Database Management", "Software Engineering", "Compiler Design",
];

const FACULTIES = {
  "Mathematics":         "Prof. R. Sharma",
  "Physics":             "Prof. A. Kulkarni",
  "Data Structures":     "Prof. S. Mehta",
  "Operating Systems":   "Prof. P. Desai",
  "Computer Networks":   "Prof. N. Joshi",
  "Machine Learning":    "Prof. K. Nair",
  "Web Technologies":    "Prof. M. Pillai",
  "Database Management": "Prof. V. Patil",
  "Software Engineering":"Prof. R. Iyer",
  "Compiler Design":     "Prof. A. Bhat",
};

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

// ── Helpers ──────────────────────────────────────────────────────────────────
function StarRating({ value, onChange, readOnly = false }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div className={`stars ${readOnly ? "stars--readonly" : ""}`}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          className={`star ${n <= display ? "star--on" : ""}`}
          onClick={() => !readOnly && onChange(n)}
          onMouseEnter={() => !readOnly && setHovered(n)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          title={STAR_LABELS[n]}
        >★</span>
      ))}
      {!readOnly && value > 0 && (
        <span className="star-label">{STAR_LABELS[value]}</span>
      )}
    </div>
  );
}

function Badge({ status }) {
  return <span className={`badge badge--${status}`}>{status}</span>;
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ tab, setTab }) {
  return (
    <nav className="navbar">
      <div className="nav-inner">
        <div className="nav-logo">📋 EduPulse</div>
        <div className="nav-tabs">
          {["submit", "browse", "stats"].map(t => (
            <button
              key={t}
              className={`nav-tab ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              {{ submit: "Submit Feedback", browse: "Browse", stats: "Stats" }[t]}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

// ── FeedbackForm ─────────────────────────────────────────────────────────────
function FeedbackForm({ onSubmitted }) {
  const init = {
    studentName: "", rollNo: "", subject: "", faculty: "",
    rating: 0, comment: "", anonymous: false,
  };
  const [form,    setForm]    = useState(init);
  const [loading, setLoading] = useState(false);
  const [alert,   setAlert]   = useState(null); // { type, msg }

  function set(k, v) {
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === "subject") next.faculty = FACULTIES[v] || "";
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setAlert(null);
    if (!form.subject) return setAlert({ type: "error", msg: "Please select a subject." });
    if (!form.rating)  return setAlert({ type: "error", msg: "Please give a star rating." });

    setLoading(true);
    try {
      const res  = await fetch(API, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const json = await res.json();
      if (json.ok) {
        setAlert({ type: "success", msg: "✅ Feedback submitted successfully! Thank you." });
        setForm(init);
        onSubmitted();
      } else {
        setAlert({ type: "error", msg: "⚠️ " + json.error });
      }
    } catch {
      setAlert({ type: "error", msg: "⚠️ Network error. Is the backend running?" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-body">
      <div className="hero">
        <p className="hero-eyebrow">PCCoE — Academic Year 2025–26</p>
        <h1 className="hero-heading">Share Your Feedback</h1>
        <p className="hero-sub">Help us improve by rating your subjects and faculty.</p>
      </div>

      <div className="form-card">
        <h2 className="card-title">📝 Submit Feedback</h2>

        <form onSubmit={handleSubmit} noValidate>

          {/* Anonymous toggle */}
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={form.anonymous}
              onChange={e => set("anonymous", e.target.checked)}
            />
            <span>Submit anonymously</span>
          </label>

          {!form.anonymous && (
            <div className="form-row">
              <div className="field">
                <label>Student Name</label>
                <input
                  type="text"
                  placeholder="e.g. Kunal Shitole"
                  value={form.studentName}
                  onChange={e => set("studentName", e.target.value)}
                />
              </div>
              <div className="field">
                <label>Roll Number</label>
                <input
                  type="text"
                  placeholder="e.g. 2021CSE042"
                  value={form.rollNo}
                  onChange={e => set("rollNo", e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="field">
              <label>Subject <span className="req">*</span></label>
              <select
                value={form.subject}
                onChange={e => set("subject", e.target.value)}
                required
              >
                <option value="">Select subject…</option>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Faculty</label>
              <input
                type="text"
                value={form.faculty}
                placeholder="Auto-filled or type name"
                onChange={e => set("faculty", e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label>Rating <span className="req">*</span></label>
            <StarRating value={form.rating} onChange={v => set("rating", v)} />
          </div>

          <div className="field">
            <label>Comment</label>
            <textarea
              rows={4}
              placeholder="Tell us about the teaching quality, syllabus coverage, pace, etc."
              value={form.comment}
              onChange={e => set("comment", e.target.value)}
            />
          </div>

          {alert && (
            <div className={`alert alert--${alert.type}`}>{alert.msg}</div>
          )}

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Submitting…" : "Submit Feedback"}
          </button>

        </form>
      </div>
    </div>
  );
}

// ── FeedbackBrowse ────────────────────────────────────────────────────────────
function FeedbackBrowse({ refresh }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterRating,  setFilterRating]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)        params.set("search",  search);
      if (filterSubject) params.set("subject", filterSubject);
      if (filterRating)  params.set("rating",  filterRating);
      const res  = await fetch(`${API}?${params}`);
      const json = await res.json();
      setItems(json.data || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [search, filterSubject, filterRating]);

  useEffect(() => { load(); }, [load, refresh]);

  async function handleDelete(id) {
    if (!confirm("Delete this feedback entry?")) return;
    await fetch(`${API}/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="page-body browse-page">
      {/* Filters */}
      <div className="filters-bar">
        <input
          className="search-input"
          type="search"
          placeholder="🔍 Search name or comment…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
          <option value="">All Subjects</option>
          {SUBJECTS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterRating} onChange={e => setFilterRating(e.target.value)}>
          <option value="">All Ratings</option>
          {[5,4,3,2,1].map(r => <option key={r} value={r}>{"★".repeat(r)} ({r})</option>)}
        </select>
        <button className="btn-outline" onClick={load}>↺ Refresh</button>
      </div>

      <p className="results-count">
        {loading ? "Loading…" : `${items.length} result${items.length !== 1 ? "s" : ""}`}
      </p>

      {!loading && items.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>No feedback found. Try adjusting filters.</p>
        </div>
      )}

      <div className="feedback-grid">
        {items.map(fb => (
          <div key={fb._id} className="feedback-card">
            <div className="fc-header">
              <div>
                <div className="fc-name">
                  {fb.anonymous ? "🎭 Anonymous" : `👤 ${fb.studentName}`}
                  {fb.rollNo && <span className="fc-roll"> · {fb.rollNo}</span>}
                </div>
                <div className="fc-date">{fmtDate(fb.createdAt)}</div>
              </div>
              <button
                className="btn-icon"
                title="Delete"
                onClick={() => handleDelete(fb._id)}
              >🗑</button>
            </div>
            <div className="fc-tags">
              <span className="tag tag--subject">{fb.subject}</span>
              <span className="tag tag--faculty">{fb.faculty}</span>
            </div>
            <StarRating value={fb.rating} readOnly />
            {fb.comment && <p className="fc-comment">"{fb.comment}"</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function Stats({ refresh }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`${API}/stats`)
      .then(r => r.json())
      .then(j => setData(j.data))
      .catch(() => {});
  }, [refresh]);

  if (!data) return <div className="page-body"><p className="muted">Loading stats…</p></div>;

  const { summary, bySubject } = data;
  const total = summary.total || 0;
  const ratingDist = [
    { r: 5, count: summary.r5 || 0 },
    { r: 4, count: summary.r4 || 0 },
    { r: 3, count: summary.r3 || 0 },
    { r: 2, count: summary.r2 || 0 },
    { r: 1, count: summary.r1 || 0 },
  ];

  return (
    <div className="page-body stats-page">
      {/* Summary cards */}
      <div className="stat-grid">
        <div className="stat-card stat-card--accent">
          <div className="stat-val">{total}</div>
          <div className="stat-lbl">Total Responses</div>
        </div>
        <div className="stat-card stat-card--gold">
          <div className="stat-val">
            {total ? Number(summary.avgRating).toFixed(1) : "—"}
          </div>
          <div className="stat-lbl">Average Rating</div>
        </div>
        <div className="stat-card stat-card--green">
          <div className="stat-val">{bySubject.length}</div>
          <div className="stat-lbl">Subjects Rated</div>
        </div>
        <div className="stat-card stat-card--purple">
          <div className="stat-val">{summary.r5 || 0}</div>
          <div className="stat-lbl">⭐ 5-Star Reviews</div>
        </div>
      </div>

      <div className="stats-row">
        {/* Rating distribution */}
        <div className="stats-card">
          <h3 className="stats-card-title">Rating Distribution</h3>
          {ratingDist.map(({ r, count }) => {
            const pct = total ? Math.round((count / total) * 100) : 0;
            return (
              <div key={r} className="dist-row">
                <span className="dist-label">{"★".repeat(r)}</span>
                <div className="dist-bar-wrap">
                  <div className="dist-bar" style={{ width: `${pct}%` }} />
                </div>
                <span className="dist-count">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Per-subject table */}
        <div className="stats-card">
          <h3 className="stats-card-title">By Subject</h3>
          <table className="stats-table">
            <thead>
              <tr><th>Subject</th><th>Responses</th><th>Avg Rating</th></tr>
            </thead>
            <tbody>
              {bySubject.map(s => (
                <tr key={s._id}>
                  <td>{s._id}</td>
                  <td>{s.count}</td>
                  <td>
                    <span className="avg-pill">{Number(s.avg).toFixed(1)} ★</span>
                  </td>
                </tr>
              ))}
              {bySubject.length === 0 && (
                <tr><td colSpan={3} className="muted" style={{textAlign:"center"}}>No data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── App (root) ────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,     setTab]     = useState("submit");
  const [refresh, setRefresh] = useState(0);

  function onSubmitted() {
    setRefresh(r => r + 1);
  }

  return (
    <>
      <Navbar tab={tab} setTab={setTab} />
      {tab === "submit" && <FeedbackForm  onSubmitted={onSubmitted} />}
      {tab === "browse" && <FeedbackBrowse refresh={refresh} />}
      {tab === "stats"  && <Stats          refresh={refresh} />}
      <footer className="site-footer">
        <p><strong>EduPulse</strong> — Student Feedback System &nbsp;·&nbsp; FSDL Assignment 7 &nbsp;·&nbsp; Kunal Shitole &nbsp;·&nbsp; 2026</p>
        <p className="footer-sub">React &bull; Vite &bull; Node.js &bull; Express &bull; MongoDB</p>
      </footer>
    </>
  );
}
