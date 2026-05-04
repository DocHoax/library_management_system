import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { booksApi, categoriesApi } from '../../services/api';
import { Library, Mail, Lock, Eye, EyeOff, BookOpen, ArrowRight, UserPlus } from 'lucide-react';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [heroStats, setHeroStats] = useState({ books: 0, available: 0, categories: 0 });
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = mode === 'login'
        ? await login(email, password)
        : await register({
            full_name: fullName,
            email,
            password,
            matric_number: matricNumber,
            department,
            phone,
          });

      navigate(`/${user.role}`, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
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
              <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
              <p>{mode === 'login' ? 'Sign in to your library account' : 'Register to start using the library system'}</p>
            </div>

            <div className="login-mode-toggle" style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
              <button
                type="button"
                className={`btn btn--sm ${mode === 'login' ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setMode('login')}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`btn btn--sm ${mode === 'register' ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setMode('register')}
              >
                <UserPlus size={16} /> Sign Up
              </button>
            </div>

          <form className="login-form" onSubmit={handleSubmit} id="login-form">
            {error && (
              <div className="login-error animate-fade-in">
                <span>{error}</span>
              </div>
            )}

            {mode === 'register' && (
              <>
                <div className="input-group">
                  <label htmlFor="full-name">Full Name</label>
                  <div className="login-input-wrap">
                    <input
                      id="full-name"
                      type="text"
                      className="input-field login-input"
                      placeholder="Your full name"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="matric-number">Matric Number</label>
                  <div className="login-input-wrap">
                    <input
                      id="matric-number"
                      type="text"
                      className="input-field login-input"
                      placeholder="Optional matric number"
                      value={matricNumber}
                      onChange={e => setMatricNumber(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="department">Department</label>
                  <div className="login-input-wrap">
                    <input
                      id="department"
                      type="text"
                      className="input-field login-input"
                      placeholder="Your department"
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      autoComplete="organization"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="phone">Phone Number</label>
                  <div className="login-input-wrap">
                    <input
                      id="phone"
                      type="tel"
                      className="input-field login-input"
                      placeholder="Your phone number"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </>
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
              disabled={loading || !email || !password || (mode === 'register' && !fullName)}
              id="login-submit-btn"
            >
              {loading ? (
                <span className="login-spinner" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="login-mode-hint">
            {mode === 'login'
              ? 'Need an account? Switch to Sign Up to register as a student.'
              : 'Already have an account? Switch back to Sign In.'}
          </p>
        </div>
      </div>
    </div>
  );
}
