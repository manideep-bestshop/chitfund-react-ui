import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Button, Modal, Form, Row, Col, Badge, Alert, Spinner, InputGroup, OverlayTrigger, Tooltip, Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Edit2, Trash2, Power, Key, MapPin, Phone, Filter, CheckSquare, Upload } from 'lucide-react';
import API_BASE_URL from '../config/api';

interface User {
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  aadharNumber?: string;
  panNumber?: string;
  isActive: boolean;
  createdDate: string;
  modifiedDate: string;
  userRole: string;
}

const Users: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    username: '', email: '', password: '', firstName: '', lastName: '',
    phoneNumber: '', address: '', city: '', state: '', pincode: '',
    aadharNumber: '', panNumber: '', userRole: 'Member'
  });

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { applyFilters(allUsers); }, [filterRole, filterStatus]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const url = searchQuery.trim()
        ? `${API_BASE_URL}/api/Users/search?query=${searchQuery}`
        : `${API_BASE_URL}/api/Users`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setAllUsers(data);
      applyFilters(data);
    } catch (error) {
      setAlert({ type: "danger", message: "Error fetching users" });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data: User[]) => {
    let filtered = data;
    if (filterRole !== "All") filtered = filtered.filter((u) => u.userRole === filterRole);
    if (filterStatus === "Active") filtered = filtered.filter((u) => u.isActive === true);
    else if (filterStatus === "Inactive") filtered = filtered.filter((u) => u.isActive === false);
    setUsers(filtered);
    setSelectedUserIds(new Set());
  };

  const handleShowModal = (user?: User) => {
    setErrors({});
    setModalError(null);
    if (user) {
      setEditingUser(user);
      setFormData({ ...user, password: '', phoneNumber: user.phoneNumber || '', address: user.address || '', city: user.city || '', state: user.state || '', pincode: user.pincode || '', aadharNumber: user.aadharNumber || '', panNumber: user.panNumber || '' });
    } else {
      setEditingUser(null);
      setFormData({ username: '', email: '', password: '', firstName: '', lastName: '', phoneNumber: '', address: '', city: '', state: '', pincode: '', aadharNumber: '', panNumber: '', userRole: 'Member' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // (Validation logic remains same)
    try {
      const method = editingUser ? 'PUT' : 'POST';
      const url = editingUser ? `${API_BASE_URL}/api/Users/${editingUser.userId}` : `${API_BASE_URL}/api/Users`;
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        setModalError("Failed to save user");
        return;
      }
      setAlert({ type: 'success', message: editingUser ? 'User updated' : 'User created' });
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      setModalError("Network error.");
    }
  };

  const getUserStatusBadge = (isActive: boolean) => {
    const bgColor = isActive ? '#10b981' : '#ef4444';
    return (
      <span className="rounded-pill px-3 py-1 d-inline-flex align-items-center fw-semibold shadow-sm text-white" style={{ backgroundColor: bgColor, fontSize: '0.75rem' }}>
        {isActive ? t('users.status.active') : t('users.status.inactive')}
      </span>
    );
  };

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '24px' }}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
        <h2 className="fw-bold text-dark mb-1">{t('users.title')}</h2>
        <div className="d-flex gap-2">
          <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} />
          <Button variant="light" className="border d-flex align-items-center px-3 shadow-sm text-success" onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} className="me-2" /> {t('users.import')}
          </Button>
          <Button variant="primary" className="d-flex align-items-center px-4 py-2 shadow-sm" onClick={() => handleShowModal()}>
            <Plus size={18} className="me-2" /> {t('users.addNew')}
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-3">
          <Row className="g-3 align-items-center">
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text className="bg-white border-end-0 text-muted"><Search size={18}/></InputGroup.Text>
                <Form.Control 
                  placeholder={t('users.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                <option value="All">{t('users.roles.all')}</option>
                <option value="Admin">{t('users.roles.admin')}</option>
                <option value="Agent">{t('users.roles.agent')}</option>
                <option value="Member">{t('users.roles.member')}</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="All">{t('users.status.all')}</option>
                <option value="Active">{t('users.status.activeOnly')}</option>
                <option value="Inactive">{t('users.status.inactiveOnly')}</option>
              </Form.Select>
            </Col>
            <Col md={2} className="d-grid">
              <Button variant="light" className="border text-muted" onClick={fetchUsers}>{t('users.refresh')}</Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="align-middle mb-0">
            <thead className="bg-light text-uppercase small text-muted">
              <tr>
                <th className="ps-4 border-0"></th>
                <th className="py-3 border-0 fw-bold">{t('users.table.details')}</th>
                <th className="py-3 border-0 fw-bold">{t('users.table.contact')}</th>
                <th className="py-3 border-0 fw-bold text-center">{t('users.table.role')}</th>
                <th className="py-3 border-0 fw-bold text-center">{t('users.table.status')}</th>
                <th className="py-3 border-0 text-end pe-4 fw-bold">{t('users.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.userId}>
                  <td className="ps-4"><Form.Check type="checkbox" /></td>
                  <td className="py-3">
                    <div className="fw-semibold text-dark">{user.firstName} {user.lastName}</div>
                    <div className="small text-muted">@{user.username}</div>
                  </td>
                  <td className="text-muted small">{user.email}</td>
                  <td className="text-center"><Badge bg="light" text="dark" className="border">{user.userRole}</Badge></td>
                  <td className="text-center">{getUserStatusBadge(user.isActive)}</td>
                  <td className="text-end pe-4">
                    <Button variant="light" size="sm" className="border me-1" onClick={() => handleShowModal(user)}><Edit2 size={16} /></Button>
                    <Button variant="light" size="sm" className="border"><Trash2 size={16} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingUser ? t('users.modal.edit') : t('users.modal.create')}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <h6 className="text-muted text-uppercase small fw-bold mb-3">{t('users.modal.account')}</h6>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label className="small fw-bold mb-1">{t('users.modal.labels.username')}</Form.Label>
                <Form.Control name="username" value={formData.username} />
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-bold mb-1">{t('users.modal.labels.email')}</Form.Label>
                <Form.Control name="email" value={formData.email} />
              </Col>
            </Row>
            <h6 className="text-muted text-uppercase small fw-bold mb-3 mt-4">{t('users.modal.personal')}</h6>
            <Row className="g-3">
              <Col md={6}><Form.Label className="small fw-bold mb-1">{t('users.modal.labels.firstName')}</Form.Label><Form.Control value={formData.firstName} /></Col>
              <Col md={6}><Form.Label className="small fw-bold mb-1">{t('users.modal.labels.lastName')}</Form.Label><Form.Control value={formData.lastName} /></Col>
              <Col md={6}><Form.Label className="small fw-bold mb-1">{t('users.modal.labels.phone')}</Form.Label><Form.Control value={formData.phoneNumber} /></Col>
              <Col md={6}><Form.Label className="small fw-bold mb-1">{t('users.modal.labels.city')}</Form.Label><Form.Control value={formData.city} /></Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>{t('users.modal.buttons.cancel')}</Button>
            <Button variant="primary" type="submit">{editingUser ? t('users.modal.buttons.save') : t('users.modal.buttons.create')}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Users;