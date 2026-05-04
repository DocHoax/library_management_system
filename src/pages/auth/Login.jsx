import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { booksApi, categoriesApi } from '../../services/api';
import { Library, Mail, Lock, Eye, EyeOff, BookOpen, Users, BarChart3, ArrowRight } from 'lucide-react';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeRole, setActiveRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [heroStats, setHeroStats] = useState({ books: 0, available: 0, categories: 0 });
  const { login } = useAuth();
  const navigate = useNavigate();

  const roles = [
    { id: 'student', label: 'Student', icon: BookOpen },
    { id: 'librarian', label: 'Librarian', icon: Users },
    { id: 'admin', label: 'Admin', icon: BarChart3 },
  ];

  const demoCredentials = {
    admin: { email: 'admin@lasustech.edu.ng', password: 'password123' },
    librarian: { email: 'librarian1@lasustech.edu.ng', password: 'password123' },
    student: { email: 'student1@lasustech.edu.ng', password: 'password123' },
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      navigate(`/${user.role}`, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    setActiveRole(role);
    setEmail(demoCredentials[role].email);
    setPassword(demoCredentials[role].password);
  };

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      booksApi.list({ per_page: 1 }),
      booksApi.list({ per_page: 1, available: '1' }),
      categoriesApi.list(),
    ])
      .then(([booksData, availableData, categoriesData]) => {
        if (!isMounted) return;

        setHeroStats({
          books: booksData.pagination?.total || 0,
          available: availableData.pagination?.total || 0,
          categories: categoriesData.categories?.length || 0,
        });
      })
      .catch(() => {
        if (!isMounted) return;
        setHeroStats({ books: 0, available: 0, categories: 0 });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="login-page">
      {/* Left Hero Section */}
      <div className="login-hero">
        <div className="login-hero__bg-pattern" />
        <div className="login-hero__content">
          <div className="login-hero__logo">
            <Library size={48} strokeWidth={1.5} />
          </div>
          <h1 className="login-hero__title">
            Lagos State University<br />
            of Science &amp; Technology
          </h1>
          <p className="login-hero__tagline">
            Empowering Research, Enriching Minds:<br />
            The Future of Library Management.
          </p>
          <div className="login-hero__stats">
            <div className="login-hero__stat">
              <span className="login-hero__stat-number">{heroStats.books.toLocaleString()}</span>
              <span className="login-hero__stat-label">Books</span>
            </div>
            <div className="login-hero__stat">
              <span className="login-hero__stat-number">{heroStats.available.toLocaleString()}</span>
              <span className="login-hero__stat-label">Available</span>
            </div>
            <div className="login-hero__stat">
              <span className="login-hero__stat-number">{heroStats.categories.toLocaleString()}</span>
              <span className="login-hero__stat-label">Departments</span>
            </div>
          </div>
        </div>
        <div className="login-hero__footer">
          <span>© 2026 LASUSTECH Library Services</span>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="login-form-section">
        <div className="login-form-wrapper">
          <div className="login-form-header">
            <h2>Welcome Back</h2>
            <p>Sign in to your library account</p>
          </div>

          {/* Role Tabs */}
          <div className="login-role-tabs">
            {roles.map(role => (
              <button
                key={role.id}
                className={`login-role-tab ${activeRole === role.id ? 'login-role-tab--active' : ''}`}
                onClick={() => fillDemo(role.id)}
                type="button"
              >
                <role.icon size={16} />
                {role.label}
              </button>
            ))}
          </div>

          <form className="login-form" onSubmit={handleSubmit} id="login-form">
            {error && (
              <div className="login-error animate-fade-in">
                <span>{error}</span>
              </div>
            )}

            <div className="input-group">
              <label htmlFor="login-email">Email Address</label>
              <div className="login-input-wrap">
                <Mail size={18} className="login-input-icon" />
                <input
                  id="login-email"
                  type="email"
                  className="input-field login-input"
                  placeholder="you@lasustech.edu.ng"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="login-password">Password</label>
              <div className="login-input-wrap">
                <Lock size={18} className="login-input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field login-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="login-remember">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#" className="login-forgot">Forgot Password?</a>
            </div>

            <button
              type="submit"
              className="btn btn--primary btn--lg login-submit"
              disabled={loading || !email || !password}
              id="login-submit-btn"
            >
              {loading ? (
                <span className="login-spinner" />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="login-demo-hint">
            Click a role tab above to auto-fill demo credentials
          </p>
        </div>
      </div>
    </div>
  );
}
