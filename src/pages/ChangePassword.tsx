import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, Form, Button, Alert, Container, Row, Col } from 'react-bootstrap';
import API_BASE_URL from '../config/api';

const ChangePassword: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { userId?: string };

  const [userId, setUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Ensure userId is present
  useEffect(() => {
    if (state?.userId) {
      setUserId(state.userId);
    } else {
      // No userId -> redirect to login
      navigate('/login', { replace: true });
    }
  }, [state, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!userId) {
      setError('Invalid request. Please log in again.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await axios.put(
        `${API_BASE_URL}/api/Users/${userId}/change-password`,
        { newPassword }
      );

      setSuccess('Password changed successfully! Redirecting to login...');
      setTimeout(() => {
        // Clear localStorage just in case
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!userId) {
    // Prevent rendering form if userId is missing
    return null;
  }

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={6} lg={4}>
          <Card>
            <Card.Header className="text-center">
              <h4>Change Password</h4>
              <p className="text-muted mb-0">You must change your password on first login</p>
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Confirm Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </Form.Group>
                <Button type="submit" className="w-100" disabled={loading}>
                  {loading ? 'Changing...' : 'Change Password'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ChangePassword;
