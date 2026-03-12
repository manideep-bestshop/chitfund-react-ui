import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Container, InputGroup, Spinner, Dropdown } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { Mail, Lock, LogIn, Hexagon, AlertCircle, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import API_BASE_URL from '../config/api';
import LanguageSwitcher from "../components/LanguageSwitcher";

// --- Interfaces & Helpers ---
interface JwtPayload {
  exp: number;
  email?: string;
  userId?: string;
}

const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoutMsg, setLogoutMsg] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  useEffect(() => {
    const message = location.state?.loggedOutMessage;
    if (message) {
      setLogoutMsg(message);
      const timer = setTimeout(() => {
        setLogoutMsg(null);
        navigate(location.pathname, { replace: true, state: {} });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [location, navigate]);

  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    const userRole = localStorage.getItem('userRole');

    if (token && !isTokenExpired(token)) {
      const decoded = jwtDecode<JwtPayload>(token);
      const expiryTime = decoded.exp * 1000 - Date.now();

      const timer = setTimeout(() => {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        alert(t('login.sessionExpired'));
        navigate('/login');
      }, expiryTime);

      if (userRole === 'Member') {
        navigate('/MemberProfile');
      } else {
        navigate('/');
      }

      return () => clearTimeout(timer);
    } else {
      localStorage.removeItem('jwtToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
    }
  }, [navigate, t]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/Users/login`, {
        email: formData.email,
        password: formData.password
      });

      if (response.status === 200) {
        const { token, user } = response.data;

        localStorage.setItem('jwtToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userRole', user.userRole);

        const decoded = jwtDecode<JwtPayload>(token);

        setTimeout(() => {
          localStorage.removeItem('jwtToken');
          localStorage.removeItem('user');
          localStorage.removeItem('userRole');
          alert(t('login.sessionExpired'));
          navigate('/login');
        }, decoded.exp * 1000 - Date.now());

        if (user.userRole === 'Member') {
          navigate('/MemberProfile');
        } else {
          navigate('/');
        }
      }
    } catch (err: any) {
      if (
        err.response?.status === 403 &&
        err.response.data?.message === 'Password must be changed on first login'
      ) {
        const { userId } = err.response.data;
        navigate('/change-password', { state: { userId } });
        return;
      }
      setError(t('login.errorInvalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#f8f9fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        margin: 0,
        padding: '20px'
      }}
    >
      {/* 🌐 Language Dropdown — Top Right */}
    <LanguageSwitcher />

      <Container style={{ maxWidth: '420px' }}>
        <div className="text-center mb-4">
          <div
            className="bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3 shadow-sm"
            style={{ width: '64px', height: '64px' }}
          >
            <Hexagon size={32} strokeWidth={2} />
          </div>
          <h3 className="fw-bold text-dark mb-1">ChitFund</h3>
          <p className="text-muted">{t('login.subtitle')}</p>
        </div>

        <Card className="border-0 shadow-lg">
          <Card.Body className="p-4 p-md-5">
            {logoutMsg && (
              <Alert variant="success" className="d-flex align-items-center small">
                <CheckCircle size={16} className="me-2" /> {logoutMsg}
              </Alert>
            )}

            {error && (
              <Alert
                variant="danger"
                className="d-flex align-items-center small"
                dismissible
                onClose={() => setError(null)}
              >
                <AlertCircle size={16} className="me-2" /> {error}
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold text-muted">
                  {t('login.emailLabel')}
                </Form.Label>
                <InputGroup>
                  <InputGroup.Text className="bg-light border-end-0 text-muted">
                    <Mail size={18} />
                  </InputGroup.Text>
                  <Form.Control
                    type="email"
                    name="email"
                    className="bg-light border-start-0 shadow-none ps-0"
                    placeholder={t('login.emailPlaceholder')}
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </InputGroup>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="small fw-bold text-muted">
                  {t('login.passwordLabel')}
                </Form.Label>
                <InputGroup>
                  <InputGroup.Text className="bg-light border-end-0 text-muted">
                    <Lock size={18} />
                  </InputGroup.Text>
                  <Form.Control
                    type="password"
                    name="password"
                    className="bg-light border-start-0 shadow-none ps-0"
                    placeholder={t('login.passwordPlaceholder')}
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </InputGroup>
              </Form.Group>

              <div className="d-flex justify-content-between align-items-center mb-4">
                <Form.Check
                  type="checkbox"
                  label={t('login.rememberMe')}
                  className="small text-muted"
                  id="rememberMe"
                />
                <a
                  href="#forgot"
                  className="small text-decoration-none fw-bold"
                  onClick={(e) => e.preventDefault()}
                >
                  {t('login.forgotPassword')}
                </a>
              </div>

              <Button
                variant="primary"
                type="submit"
                className="w-100 py-2 fw-bold shadow-sm d-flex align-items-center justify-content-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                    {t('login.signingIn')}
                  </>
                ) : (
                  <>
                    {t('login.signIn')} <LogIn size={18} className="ms-2" />
                  </>
                )}
              </Button>
            </Form>
          </Card.Body>
        </Card>

        <div className="text-center mt-4">
          <small className="text-muted">
            {t('login.needHelp')}{' '}
            <a href="#contact" className="text-decoration-none fw-bold">
              {t('login.contactSupport')}
            </a>
          </small>
        </div>
      </Container>
    </div>
  );
};

const CheckCircle = ({ size, className }: { size: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export default Login;