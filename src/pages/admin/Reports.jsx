import { useState, useEffect } from 'react';
import { reportsApi } from '../../services/api';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Download, TrendingUp, BookOpen, Users, Clock } from 'lucide-react';
import '../Dashboard.css';

const CHART_COLORS = ['#001e40', '#003366', '#3a5f94', '#6f87ae', '#afc8f2', '#d5e3ff', '#e6e8ea', '#fdb793', '#ba1a1a', '#16a34a'];

export default function Reports() {
  const [analytics, setAnalytics] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      reportsApi.analytics(),
      reportsApi.dashboard(),
    ]).then(([analyticsData, dashData]) => {
      setAnalytics(analyticsData);
      setStats(dashData.stats);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dashboard-page"><div className="skeleton" style={{height:400, borderRadius:12}} /></div>;

  const monthlyData = (analytics?.monthly_trends || []).map(m => ({
    month: m.month,
    checkouts: parseInt(m.checkouts),
    returns: parseInt(m.returns),
  }));

  const categoryData = (analytics?.books_by_category || []).map(c => ({
    name: c.category,
    value: parseInt(c.count),
  })).filter(c => c.value > 0);

  const topBooks = analytics?.top_books || [];

  return (
    <div className="dashboard-page animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div><h2>Library Analytics</h2><p>Comprehensive reports and data analysis</p></div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn--ghost btn--sm"><Download size={16} /> Export CSV</button>
          <button className="btn btn--ghost btn--sm"><Download size={16} /> Export PDF</button>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="stats-grid">
        <div className="card card--stat"><div className="stat-card__icon stat-card__icon--primary" style={{marginBottom: 'var(--space-3)'}}><TrendingUp size={22}/></div><div className="stat-card__value" style={{fontSize:'var(--text-headline-md)'}}>{stats?.month_checkouts || 0}</div><div className="stat-card__label">Checkouts This Month</div></div>
        <div className="card card--stat"><div className="stat-card__icon stat-card__icon--secondary" style={{marginBottom: 'var(--space-3)'}}><Users size={22}/></div><div className="stat-card__value" style={{fontSize:'var(--text-headline-md)'}}>{stats?.active_borrowers || 0}</div><div className="stat-card__label">Active Borrowers</div></div>
        <div className="card card--stat"><div className="stat-card__icon stat-card__icon--success" style={{marginBottom: 'var(--space-3)'}}><BookOpen size={22}/></div><div className="stat-card__value" style={{fontSize:'var(--text-headline-md)'}}>{stats?.total_books || 0}</div><div className="stat-card__label">Total Books</div></div>
        <div className="card card--stat"><div className="stat-card__icon stat-card__icon--error" style={{marginBottom: 'var(--space-3)'}}><Clock size={22}/></div><div className="stat-card__value" style={{fontSize:'var(--text-headline-md)'}}>{stats?.overdue_books || 0}</div><div className="stat-card__label">Overdue Books</div></div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-5)' }}>
        {/* Monthly Trends */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-6)' }}>Monthly Borrowing Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorCheckouts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#001e40" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#001e40" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ghost-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--outline)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--outline)' }} />
              <Tooltip contentStyle={{ background: 'var(--surface-container-lowest)', border: 'none', borderRadius: 8, boxShadow: 'var(--shadow-md)' }} />
              <Area type="monotone" dataKey="checkouts" stroke="#001e40" fill="url(#colorCheckouts)" strokeWidth={2} />
              <Line type="monotone" dataKey="returns" stroke="#3a5f94" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Books by Category */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-6)' }}>Books by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--surface-container-lowest)', border: 'none', borderRadius: 8, boxShadow: 'var(--shadow-md)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
            {categoryData.slice(0, 5).map((cat, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-label-sm)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: CHART_COLORS[i] }} />
                {cat.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Top Books */}
      <div className="card">
        <h3 style={{ marginBottom: 'var(--space-6)' }}>Top 10 Most Borrowed Books</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topBooks} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ghost-border)" />
            <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--outline)' }} />
            <YAxis dataKey="title" type="category" width={200} tick={{ fontSize: 11, fill: 'var(--on-surface-variant)' }} />
            <Tooltip contentStyle={{ background: 'var(--surface-container-lowest)', border: 'none', borderRadius: 8, boxShadow: 'var(--shadow-md)' }} />
            <Bar dataKey="borrow_count" fill="#001e40" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
