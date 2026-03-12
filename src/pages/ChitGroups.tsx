import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Row, Col, Badge, Alert, ProgressBar, InputGroup, Dropdown, Spinner } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import { 
  Search, Plus, MoreVertical, Edit2, Archive, Trash2, 
  Layers, DollarSign, Calendar, PlayCircle, CheckCircle, 
  PauseCircle, XCircle, Filter 
} from 'lucide-react';
import API_BASE_URL from '../config/api';

// --- Interfaces ---
interface ChitGroup {
  chitGroupId: string;
  groupName: string;
  groupCode: string;
  totalAmount: number;
  monthlyAmount: number;
  durationMonths: number;
  commissionPercentage: number;
  startDate: string;
  endDate: string;
  status: string;
  description?: string;
  createdBy: string;
  memberCount: number;
  completedInstallments: number;
  isArchived: boolean;
}

const ChitGroups: React.FC = () => {
  const location = useLocation();
  
  // --- State ---
  const [chitGroups, setChitGroups] = useState<ChitGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ChitGroup | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Feedback
  const [modalError, setModalError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  const [formData, setFormData] = useState({
    groupName: '', groupCode: '', totalAmount: '', monthlyAmount: '',
    durationMonths: '', commissionPercentage: '', startDate: '', description: ''
  });

  // --- Effects ---
  useEffect(() => {
    if (location.state && location.state.openCreateModal) {
      handleShowModal(); 
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => { fetchChitGroups(); }, []);

  // --- API Logic ---
  const fetchChitGroups = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("jwtToken");
      const response = await fetch(`${API_BASE_URL}/api/ChitGroups`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      setChitGroups(data);
    } catch (error) {
      setAlert({ type: "danger", message: "Error fetching groups" });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (groupId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem("jwtToken");
      const response = await fetch(`${API_BASE_URL}/api/ChitGroups/${groupId}/status`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(newStatus) 
      });
      if (!response.ok) throw new Error("Failed");
      
      setChitGroups(prev => prev.map(g => g.chitGroupId === groupId ? { ...g, status: newStatus } : g));
      setAlert({ type: "success", message: `Status updated to ${newStatus}` });
    } catch { setAlert({ type: "danger", message: "Failed to update status" }); }
  };

  const handleArchive = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ChitGroups/${id}/archive`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${localStorage.getItem("jwtToken")}` },
      });
      if (!response.ok) throw new Error("Failed");
      setAlert({ type: "success", message: "Archived successfully" });
      fetchChitGroups();
    } catch { setAlert({ type: "danger", message: "Archive failed" }); }
  };

  const handleHardDelete = async (groupId: string) => {
    if (!window.confirm("Permanently delete this group?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/ChitGroups/${groupId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("jwtToken")}` }
      });
      if (!response.ok) throw new Error("Failed");
      setAlert({ type: "success", message: "Group deleted" });
      fetchChitGroups();
    } catch { setAlert({ type: "danger", message: "Delete failed" }); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    try {
      const token = localStorage.getItem("jwtToken");
      if (!token) return;
      
      // Basic Validation
      if (Number(formData.totalAmount) !== Number(formData.monthlyAmount) * Number(formData.durationMonths)) {
        setModalError("Total Amount must equal Monthly Amount × Duration");
        return;
      }

      const decoded = JSON.parse(atob(token.split(".")[1]));
      const payloadBase = {
        groupName: formData.groupName,
        groupCode: formData.groupCode,
        totalAmount: Number(formData.totalAmount),
        monthlyAmount: Number(formData.monthlyAmount),
        durationMonths: Number(formData.durationMonths),
        commissionPercentage: Number(formData.commissionPercentage),
        startDate: formData.startDate,
        description: formData.description
      };

      const url = editingGroup 
        ? `${API_BASE_URL}/api/ChitGroups/${editingGroup.chitGroupId}`
        : `${API_BASE_URL}/api/ChitGroups`;
      
      const method = editingGroup ? "PUT" : "POST";
      const body = editingGroup ? payloadBase : { createChitGroupDto: payloadBase, creatorId: decoded.userId };

      const response = await fetch(url, {
        method,
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const txt = await response.text();
        setModalError(txt || "Operation failed");
        return;
      }

      setAlert({ type: "success", message: editingGroup ? "Group updated" : "Group created" });
      handleCloseModal();
      fetchChitGroups();
    } catch (err) { setModalError("Network error"); }
  };

  // --- Modal Handlers ---
  const handleShowModal = (group?: ChitGroup) => {
    setModalError(null);
    if (group) {
      setEditingGroup(group);
      setFormData({
        groupName: group.groupName,
        groupCode: group.groupCode,
        totalAmount: group.totalAmount.toString(),
        monthlyAmount: group.monthlyAmount.toString(),
        durationMonths: group.durationMonths.toString(),
        commissionPercentage: group.commissionPercentage.toString(),
        startDate: group.startDate ? new Date(group.startDate).toISOString().split("T")[0] : "",
        description: group.description || ""
      });
    } else {
      setEditingGroup(null);
      setFormData({ groupName: "", groupCode: "", totalAmount: "", monthlyAmount: "", durationMonths: "", commissionPercentage: "", startDate: "", description: "" });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => { setShowModal(false); setEditingGroup(null); };
  const handleInputChange = (e: any) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // --- Helpers ---
  // FIXED: Ensure this always returns an object structure, never just '0'
  const calculateProgress = (start: string, duration: number) => {
    if (!start) return { val: 0, pct: 0 };
    const s = new Date(start);
    const n = new Date();
    const months = (n.getFullYear() - s.getFullYear()) * 12 + (n.getMonth() - s.getMonth());
    const progress = months < 0 ? 0 : (months > duration ? duration : months);
    return { val: progress, pct: Math.round((progress / duration) * 100) };
  };

  const filteredGroups = chitGroups.filter(g => {
    const matchSearch = g.groupName.toLowerCase().includes(searchTerm.toLowerCase()) || g.groupCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'All' || g.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    const map: any = {
      'Active': { bg: 'success', icon: <PlayCircle size={12} className="me-1"/> },
      'Completed': { bg: 'primary', icon: <CheckCircle size={12} className="me-1"/> },
      'Suspended': { bg: 'warning', icon: <PauseCircle size={12} className="me-1"/> },
      'Cancelled': { bg: 'danger', icon: <XCircle size={12} className="me-1"/> },
    };
    const conf = map[status] || { bg: 'secondary', icon: null };
    return (
      <span className={`badge bg-${conf.bg} bg-opacity-10 text-${conf.bg} border border-${conf.bg} rounded-pill d-inline-flex align-items-center px-3 py-2`}>
        {conf.icon} {status}
      </span>
    );
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
      
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold text-dark mb-1">Chit Groups</h2>
          <p className="text-muted mb-0">Manage cycles, funds, and members</p>
        </div>
        <Button variant="primary" className="d-flex align-items-center shadow-sm px-4" onClick={() => handleShowModal()}>
          <Plus size={18} className="me-2"/> Create Group
        </Button>
      </div>

      {alert && <Alert variant={alert.type} dismissible onClose={() => setAlert(null)} className="shadow-sm">{alert.message}</Alert>}

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-3">
          <Row className="g-2 align-items-center">
            <Col md={5}>
              <InputGroup>
                <InputGroup.Text className="bg-white border-end-0 text-muted"><Search size={18}/></InputGroup.Text>
                <Form.Control 
                  placeholder="Search groups..." 
                  className="border-start-0 shadow-none"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <InputGroup>
                <InputGroup.Text className="bg-white border-end-0 text-muted"><Filter size={18}/></InputGroup.Text>
                <Form.Select className="border-start-0 shadow-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Archived">Archived</option>
                </Form.Select>
              </InputGroup>
            </Col>
            <Col md={4} className="text-md-end text-muted small pt-2 pt-md-0">
              Showing {filteredGroups.length} groups
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Content */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center p-5"><Spinner animation="border" variant="primary"/></div>
          ) : (
            <Table responsive hover className="align-middle mb-0 custom-horizontal-lines">
              <thead className="bg-light text-muted small text-uppercase">
                <tr>
                  <th className="ps-4 py-3 border-0">Group Details</th>
                  <th className="py-3 border-0">Financials</th>
                  <th className="py-3 border-0" style={{width: '20%'}}>Cycle Progress</th>
                  <th className="py-3 border-0 text-center">Members</th>
                  <th className="py-3 border-0 text-center">Status</th>
                  <th className="py-3 border-0 text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.length > 0 ? filteredGroups.map(group => {
                  // Now calculateProgress always returns {val, pct}, so .val and .pct are safe
                  const prog = calculateProgress(group.startDate, group.durationMonths);
                  return (
                    <tr key={group.chitGroupId} className={group.isArchived ? 'opacity-50' : ''}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center">
                          <div className="bg-primary bg-opacity-10 text-primary p-2 rounded me-3"><Layers size={20}/></div>
                          <div>
                            <div className="fw-bold text-dark">{group.groupName}</div>
                            <div className="small text-muted font-monospace">{group.groupCode}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-column">
                          <span className="text-muted mb-0" style={{ fontSize: '10px !important', lineHeight: '1',display: 'block',marginBottom: '2px' }}>₹{group.totalAmount.toLocaleString()}</span>
                          <span className="small text-muted">₹{group.monthlyAmount.toLocaleString()} / mo</span>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex justify-content-between small mb-1">
                          <span className="text-muted">{prog.val} / {group.durationMonths} Months</span>
                          <span className="fw-bold text-primary">{prog.pct}%</span>
                        </div>
                        <ProgressBar now={prog.pct} variant="primary" style={{height: '6px'}} className="rounded-pill bg-light"/>
                      </td>
                      <td className="text-center">
                        <Badge bg="light" text="dark" className="border px-3 py-2 rounded-pill fw-normal">
                          {group.memberCount} / {group.durationMonths}
                        </Badge>
                      </td>
                      <td className="text-center">
                        {group.isArchived ? <Badge bg="secondary" className="px-3 py-2 rounded-pill">Archived</Badge> : getStatusBadge(group.status)}
                      </td>
                      <td className="text-end pe-4">
                        <Dropdown align="end">
                          <Dropdown.Toggle variant="light" size="sm" className="no-caret border-0 bg-transparent p-1">
                            <MoreVertical size={18} className="text-muted"/>
                          </Dropdown.Toggle>
                          <Dropdown.Menu className="shadow border-0">
                            <Dropdown.Item onClick={() => handleShowModal(group)} disabled={group.isArchived}>
                              <Edit2 size={16} className="me-2 text-primary"/> Edit Details
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => handleArchive(group.chitGroupId)} disabled={group.isArchived}>
                              <Archive size={16} className="me-2 text-warning"/> {group.isArchived ? 'Archived' : 'Archive'}
                            </Dropdown.Item>
                            
                            {!group.isArchived && (
                              <>
                                <Dropdown.Divider />
                                <Dropdown.Header>Change Status</Dropdown.Header>
                                <Dropdown.Item onClick={() => handleStatusChange(group.chitGroupId, 'Active')} disabled={group.status === 'Active'}>Set Active</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleStatusChange(group.chitGroupId, 'Completed')} disabled={group.status === 'Completed'}>Set Completed</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleStatusChange(group.chitGroupId, 'Suspended')} disabled={group.status === 'Suspended'}>Suspend</Dropdown.Item>
                              </>
                            )}
                            
                            <Dropdown.Divider />
                            <Dropdown.Item onClick={() => handleHardDelete(group.chitGroupId)} className="text-danger">
                              <Trash2 size={16} className="me-2"/> Delete Group
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={6} className="text-center py-5 text-muted">No groups found.</td></tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* --- Create/Edit Modal --- */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" backdrop="static" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="h5 fw-bold">{editingGroup ? 'Edit Group' : 'Create New Chit Group'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {modalError && <Alert variant="danger" className="py-2">{modalError}</Alert>}
            
            <h6 className="text-uppercase text-muted small fw-bold mb-3 mt-2">Basic Info</h6>
            <Row className="g-3 mb-4">
              <Col md={6}>
                <Form.Label className="small fw-bold">Group Name</Form.Label>
                <InputGroup>
                  <InputGroup.Text className="bg-light"><Layers size={16}/></InputGroup.Text>
                  <Form.Control name="groupName" value={formData.groupName} onChange={handleInputChange} required />
                </InputGroup>
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-bold">Group Code</Form.Label>
                <Form.Control name="groupCode" value={formData.groupCode} onChange={handleInputChange} required />
              </Col>
            </Row>

            <h6 className="text-uppercase text-muted small fw-bold mb-3 border-top pt-3">Financials & Schedule</h6>
            <Row className="g-3 mb-3">
              <Col md={4}>
                <Form.Label className="small fw-bold">Total Amount</Form.Label>
                <InputGroup>
                  <InputGroup.Text className="bg-light"><DollarSign size={16}/></InputGroup.Text>
                  <Form.Control type="number" name="totalAmount" value={formData.totalAmount} onChange={handleInputChange} required />
                </InputGroup>
              </Col>
              <Col md={4}>
                <Form.Label className="small fw-bold">Monthly Due</Form.Label>
                <Form.Control type="number" name="monthlyAmount" value={formData.monthlyAmount} onChange={handleInputChange} required />
              </Col>
              <Col md={4}>
                <Form.Label className="small fw-bold">Commission %</Form.Label>
                <Form.Control type="number" name="commissionPercentage" value={formData.commissionPercentage} onChange={handleInputChange} required />
              </Col>
            </Row>
            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Label className="small fw-bold">Duration (Months)</Form.Label>
                <Form.Control type="number" name="durationMonths" value={formData.durationMonths} onChange={handleInputChange} required />
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-bold">Start Date</Form.Label>
                <InputGroup>
                  <InputGroup.Text className="bg-light"><Calendar size={16}/></InputGroup.Text>
                  <Form.Control type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} required disabled={!!editingGroup} />
                </InputGroup>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Description</Form.Label>
                <Form.Control as="textarea" rows={2} name="description" value={formData.description} onChange={handleInputChange} />
            </Form.Group>

          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button variant="light" onClick={handleCloseModal}>Cancel</Button>
            <Button variant="primary" type="submit" className="px-4">{editingGroup ? 'Update' : 'Create'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default ChitGroups;