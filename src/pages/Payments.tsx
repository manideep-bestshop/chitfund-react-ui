import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Badge, Alert, Spinner, Row, Col, InputGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import API_CONFIG from '../config/api';
import { 
  Search, Plus, Download, Filter, Calendar, History, 
  Edit2, Trash2, CheckCircle, AlertCircle, Clock, XCircle, 
  TrendingUp, CreditCard, 
  IndianRupee
} from 'lucide-react';

// --- Constants ---
const API_BASE_URL = `${API_CONFIG}/api/MemberPayments`;
const GROUPS_API_URL = `${API_CONFIG}/api/ChitGroups`;
const MEMBERS_API_URL = `${API_CONFIG}/api/ChitMembers`;
const INSTALLMENTS_API_URL = `${API_CONFIG}/api/MonthlyInstallments`; 
const AUDIT_LOGS_API_URL = `${API_CONFIG}/api/AuditLogs`;

// --- Interfaces ---
interface Payment {
  paymentId: string;
  chitMemberId: string;
  chitGroupId: string;
  installmentId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  transactionReference?: string;
  status: string;
  memberName: string;
  groupName: string;
  installmentNumber: number;
  isDeleted: boolean;
}

interface AuditLog {
  auditLogId: number | string;
  action: string;       
  username: string;      
  userRole: string;      
  timestamp: string;     
  details: string;       
  recordId: string;
}

interface GroupOption { chitGroupId: string; groupName: string; }
interface MemberOption { chitMemberId: string; userId: string; userName: string; }
interface InstallmentOption { installmentId: string; installmentNumber: number; amount: number; chitGroupId: string; }

const getAuthHeader = () => {
  const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const Payments: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  
  // Data
  const [payments, setPayments] = useState<Payment[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [installments, setInstallments] = useState<InstallmentOption[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyContext, setHistoryContext] = useState<{member: string, group: string} | null>(null);

  const [filters, setFilters] = useState({ groupName: '', memberName: '', status: '', startDate: '', endDate: '' });

  const initialFormState = {
    chitGroupId: '', chitMemberId: '', installmentId: '', amount: '',
    paymentDate: new Date().toISOString().split('T')[0], 
    paymentMethod: 'Cash', transactionReference: '', remarks: '', status: 'Completed'
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (location.state && location.state.openRecordPaymentModal) {
      handleOpenRecordPaymentModal();
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    fetchPayments();
    fetchGroups();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await axios.get<Payment[]>(API_BASE_URL, getAuthHeader());
      setPayments(res.data);
    } catch { setPageError('Failed to load payments.'); } 
    finally { setLoading(false); }
  };

  const fetchGroups = async () => {
    try {
      const res = await axios.get(GROUPS_API_URL + '/active', getAuthHeader());
      setGroups(res.data);
    } catch (err) { console.error(err); }
  };

  const handleOpenRecordPaymentModal = () => {
    setPageError(null); setFormError(null); setIsEditMode(false); setEditingPaymentId(null);
    setFormData(initialFormState); setShowModal(true);
  };

  const handleGroupChange = async (groupId: string) => {
    setFormError(null); 
    setFormData(prev => ({ ...prev, chitGroupId: groupId, chitMemberId: '', installmentId: '', amount: '' }));
    if (!groupId) { setMembers([]); setInstallments([]); return; }
    try {
      const [memRes, instRes] = await Promise.all([
          axios.get(`${MEMBERS_API_URL}/group/${groupId}`, getAuthHeader()),
          axios.get(`${INSTALLMENTS_API_URL}/group/${groupId}`, getAuthHeader())
      ]);
      setMembers(memRes.data); setInstallments(instRes.data);
    } catch { setFormError("Could not load group details."); }
  };

  const handleMemberChange = (memberId: string) => {
    const memberPayments = payments.filter(p => p.chitMemberId === memberId && p.status !== 'Failed');
    const nextNum = memberPayments.length === 0 ? 1 : Math.max(...memberPayments.map(p => p.installmentNumber)) + 1;
    const nextInst = installments.find(i => i.installmentNumber === nextNum);
    setFormData(prev => ({
        ...prev, chitMemberId: memberId, 
        installmentId: nextInst?.installmentId || '', 
        amount: nextInst?.amount.toString() || '' 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    const payload = { ...formData, amount: parseFloat(formData.amount) };
    try {
      if (isEditMode && editingPaymentId) {
        await axios.put(`${API_BASE_URL}/${editingPaymentId}`, payload, getAuthHeader());
      } else {
        await axios.post(API_BASE_URL, payload, getAuthHeader());
      }
      setShowModal(false); fetchPayments();
    } catch { setFormError("Failed to save."); } 
    finally { setSubmitting(false); }
  };

  const confirmDelete = async () => {
    if (!deletingPaymentId) return;
    try {
      await axios.delete(`${API_BASE_URL}/${deletingPaymentId}`, getAuthHeader());
      fetchPayments();
    } catch { setAlert({ type: 'danger', message: 'Delete failed.' }); } 
    finally { setShowDeleteModal(false); }
  };

  const processedPayments = payments.filter(p => {
    const pDate = new Date(p.paymentDate);
    return (!filters.groupName || p.groupName === filters.groupName) &&
           (!filters.memberName || p.memberName === filters.memberName) &&
           (!filters.status || p.status === filters.status) &&
           (!filters.startDate || pDate >= new Date(filters.startDate)) &&
           (!filters.endDate || pDate <= new Date(filters.endDate));
  });

  const handleExportToExcel = () => {
    const data = processedPayments.map(p => ({
        "Member": p.memberName, "Group": p.groupName, "Amount": p.amount, "Status": p.status
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(wb, ws, "Payments");
    XLSX.writeFile(wb, "Payments.xlsx");
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    let bgColor = '#6ee7b7'; 
    let label = status;
    let icon = null;

    if (s === 'completed') {
      bgColor = '#15803d'; 
      label = t('payments.status.paid');
      icon = <CheckCircle size={12} className="me-1" />;
    } else if (s === 'pending') {
      bgColor = '#ffd900'; 
      label = t('payments.status.pending');
      icon = <Clock size={12} className="me-1" />;
    } else if (s === 'failed') {
      bgColor = '#ef4444'; 
      label = t('payments.status.failed');
      icon = <XCircle size={12} className="me-1" />;
    }

    return (
      <span className="rounded-pill px-3 py-2 d-inline-flex align-items-center fw-semibold" style={{ backgroundColor: bgColor, color: '#ffffff', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
        {icon} {label}
      </span>
    );
  };

  if (loading) return <div className="text-center p-5"><Spinner animation="border" variant="primary"/></div>;

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
      
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
        <h2 className="fw-bold text-dark mb-1">{t('payments.title')}</h2>
        <div className="d-flex gap-2">
            <Button variant="white" className="border shadow-sm d-flex align-items-center text-success" onClick={handleExportToExcel}>
                <Download size={18} className="me-2"/> {t('payments.export')}
            </Button>
            <Button variant="primary" className="shadow-sm d-flex align-items-center px-4" onClick={handleOpenRecordPaymentModal}>
                <Plus size={18} className="me-2"/> {t('payments.recordNew')}
            </Button>
        </div>
      </div>

      {/* Stats Cards */}
       <Row className="mb-4 g-3">
        <Col md={4}>
            <Card className="border-0 shadow-sm bg-white h-100">
                <Card.Body className="d-flex align-items-center">
                    <div className="bg-primary bg-opacity-10 p-3 rounded-circle me-3"><IndianRupee size={24}/></div>
                    <div>
                        <div className="small text-uppercase text-muted fw-bold">{t('payments.stats.totalCollected')}</div>
                        <h4 className="fw-bold mb-0">₹{processedPayments.reduce((acc, p) => acc + (p.status === 'Completed' ? p.amount : 0), 0).toLocaleString()}</h4>
                    </div>
                </Card.Body>
            </Card>
        </Col>
        <Col md={4}>
            <Card className="border-0 shadow-sm bg-white h-100">
                <Card.Body className="d-flex align-items-center">
                    <div className="bg-warning bg-opacity-10 text-warning p-3 rounded-circle me-3"><Clock size={24}/></div>
                    <div>
                        <div className="small text-uppercase text-muted fw-bold">{t('payments.stats.pendingAmount')}</div>
                        <h4 className="fw-bold mb-0">₹{processedPayments.reduce((acc, p) => acc + (p.status === 'Pending' ? p.amount : 0), 0).toLocaleString()}</h4>
                    </div>
                </Card.Body>
            </Card>
        </Col>
        <Col md={4}>
            <Card className="border-0 shadow-sm bg-white h-100">
                <Card.Body className="d-flex align-items-center">
                    <div className="bg-success bg-opacity-10 text-success p-3 rounded-circle me-3"><TrendingUp size={24}/></div>
                    <div>
                        <div className="small text-uppercase text-muted fw-bold">{t('payments.stats.transactionCount')}</div>
                        <h4 className="fw-bold mb-0">{processedPayments.length}</h4>
                    </div>
                </Card.Body>
            </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-3">
          <Row className="g-2">
            <Col md={3}>
                <Form.Label className="small fw-bold text-muted mb-1">{t('payments.filters.group')}</Form.Label>
                <Form.Select value={filters.groupName} onChange={(e) => setFilters({...filters, groupName: e.target.value})}>
                    <option value="">{t('payments.filters.allGroups')}</option>
                    {Array.from(new Set(payments.map(p => p.groupName))).map(g => <option key={g} value={g}>{g}</option>)}
                </Form.Select>
            </Col>
            <Col md={3}>
                <Form.Label className="small fw-bold text-muted mb-auto">{t('payments.filters.member')}</Form.Label>
                <Form.Select value={filters.memberName} onChange={(e) => setFilters({...filters, memberName: e.target.value})}>
                    <option value="">{t('payments.filters.allMembers')}</option>
                    {Array.from(new Set(payments.map(p => p.memberName))).map(m => <option key={m} value={m}>{m}</option>)}
                </Form.Select>
            </Col>
            <Col md={2}>
                <Form.Label className="small fw-bold text-muted mb-1">{t('payments.filters.status')}</Form.Label>
                <Form.Select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})}>
                    <option value="">{t('payments.filters.all')}</option>
                    <option value="Completed">{t('payments.status.paid')}</option>
                    <option value="Pending">{t('payments.status.pending')}</option>
                </Form.Select>
            </Col>
            <Col md={1} className="d-flex align-items-end ms-auto">
                <Button variant="light" className="w-100 border text-muted" onClick={() => setFilters({ groupName: '', memberName: '', status: '', startDate: '', endDate: '' })}>{t('payments.filters.clear')}</Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="align-middle mb-0">
            <thead className="bg-light text-muted small text-uppercase">
              <tr>
                <th className="ps-4 py-3 border-0 fw-bold">{t('payments.table.memberInfo')}</th>
                <th className="py-3 border-0 fw-bold">{t('payments.table.groupInfo')}</th>
                <th className="py-3 border-0 fw-bold">{t('payments.table.payment')}</th>
                <th className="py-3 border-0 fw-bold">{t('payments.table.details')}</th>
                <th className="py-3 border-0 text-center fw-bold">{t('payments.table.status')}</th>
                <th className="py-3 border-0 text-end pe-4 fw-bold">{t('payments.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {processedPayments.length > 0 ? processedPayments.map(p => (
                <tr key={p.paymentId}>
                  <td className="ps-4">
                    <div className="d-flex align-items-center">
                        <div className="bg-primary bg-opacity-10 text-primary fw-bold rounded-circle d-flex align-items-center justify-content-center me-2" style={{width:'35px', height:'35px', fontSize:'0.8rem'}}>
                            {p.memberName.substring(0,2).toUpperCase()}
                        </div>
                        <span className="fw-bold text-dark">{p.memberName}</span>
                    </div>
                  </td>
                  <td>{p.groupName} <Badge bg="light" text="dark" className="border">Inst #{p.installmentNumber}</Badge></td>
                  <td><div className="fw-bold">₹{p.amount.toLocaleString()}</div><div className="small text-muted">{p.paymentMethod}</div></td>
                  <td className="small text-muted">{new Date(p.paymentDate).toLocaleDateString()}</td>
                  <td className="text-center">{getStatusBadge(p.status)}</td>
                  <td className="text-end pe-4">
                        <OverlayTrigger overlay={<Tooltip>{t('payments.tooltips.edit')}</Tooltip>}>
                            <Button variant="light" size="sm" onClick={() => handleOpenRecordPaymentModal()} className="text-primary me-1"><Edit2 size={16}/></Button>
                        </OverlayTrigger>
                        <OverlayTrigger overlay={<Tooltip>{t('payments.tooltips.delete')}</Tooltip>}>
                            <Button variant="light" size="sm" onClick={() => { setDeletingPaymentId(p.paymentId); setShowDeleteModal(true); }} className="text-danger"><Trash2 size={16}/></Button>
                        </OverlayTrigger>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="text-center py-5 text-muted">{t('payments.table.noPayments')}</td></tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* MODAL: Record/Edit */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered backdrop="static">
        <Modal.Header closeButton className="border-0"><Modal.Title className="h5 fw-bold">{isEditMode ? t('payments.modal.editTitle') : t('payments.modal.recordTitle')}</Modal.Title></Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
                <Col md={6}>
                    <Form.Label className="small fw-bold">{t('payments.modal.selectGroup')}</Form.Label>
                    <Form.Select value={formData.chitGroupId} onChange={e => handleGroupChange(e.target.value)} required>
                        <option value="">{t('payments.modal.groupPlaceholder')}</option>
                        {groups.map(g => <option key={g.chitGroupId} value={g.chitGroupId}>{g.groupName}</option>)}
                    </Form.Select>
                </Col>
                <Col md={6}>
                    <Form.Label className="small fw-bold">{t('payments.modal.selectMember')}</Form.Label>
                    <Form.Select value={formData.chitMemberId} onChange={e => handleMemberChange(e.target.value)} disabled={!formData.chitGroupId} required>
                        <option value="">{t('payments.modal.memberPlaceholder')}</option>
                        {members.map(m => <option key={m.chitMemberId} value={m.chitMemberId}>{m.userName}</option>)}
                    </Form.Select>
                </Col>
                <Col md={6}>
                    <Form.Label className="small fw-bold">{t('payments.modal.amount')}</Form.Label>
                    <Form.Control type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required/>
                </Col>
                <Col md={6}>
                    <Form.Label className="small fw-bold">{t('payments.modal.date')}</Form.Label>
                    <Form.Control type="date" value={formData.paymentDate} onChange={e => setFormData({...formData, paymentDate: e.target.value})} required/>
                </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setShowModal(false)}>{t('payments.modal.cancel')}</Button>
            <Button variant="primary" type="submit">{submitting ? <Spinner size="sm"/> : t('payments.modal.save')}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* DELETE MODAL */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered size="sm">
        <Modal.Body className="text-center p-4">
            <AlertCircle size={48} className="text-danger mb-3 opacity-50"/>
            <h5 className="fw-bold">{t('payments.delete.title')}</h5>
            <p className="text-muted small">{t('payments.delete.warning')}</p>
            <div className="d-flex gap-2 justify-content-center mt-4">
                <Button variant="light" onClick={() => setShowDeleteModal(false)}>{t('payments.delete.cancel')}</Button>
                <Button variant="danger" onClick={confirmDelete}>{t('payments.delete.confirm')}</Button>
            </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Payments;