import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, Row, Col, Badge, Spinner, Nav, Container } from 'react-bootstrap';
import { 
  CheckCircle, XCircle, Clock, User, FileText, 
  IndianRupee, ShieldCheck, AlertCircle, History 
} from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import API_CONFIG from '../config/api';

// --- Configuration ---
const API_BASE_URL = `${API_CONFIG}/api/GroupRequests`;

// --- Types ---
interface AdminRequest {
  requestId: string;
  chitGroupId: string;
  userId: string;
  memberName: string;
  memberId: string;
  kycStatus: string;
  groupName: string;
  monthlyAmount: number;
  requestDate: string;
  avatar: string;
  status?: string;
}

type ActionType = 'approve' | 'reject' | null;

const AdminRequestsPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<AdminRequest | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);
  
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [historyList, setHistoryList] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length > 1 
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() 
      : name.slice(0, 2).toUpperCase();
  };

  const getRandomColor = (name: string) => {
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];
    return colors[name.length % colors.length];
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'pending') {
          const res = await axios.get(`${API_BASE_URL}/admin/pending`);
          setRequests(res.data);
        } else {
          const res = await axios.get(`${API_BASE_URL}/admin/history`);
          setHistoryList(res.data);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);

  const handleAction = (req: AdminRequest, type: ActionType) => {
    setSelectedRequest(req);
    setActionType(type);
  };

  const confirmAction = async () => {
    if (!selectedRequest || !actionType) return;
    try {
      await axios.post(`${API_BASE_URL}/admin/${selectedRequest.requestId}/${actionType}`);
      setRequests(prev => prev.filter(r => r.requestId !== selectedRequest.requestId));
      setSelectedRequest(null);
      setActionType(null);
    } catch (error: any) {
      alert(error.response?.data?.message || t('adminRequests.alerts.failed'));
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
      
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">{t('adminRequests.title')}</h2>
          <p className="text-muted mb-0">{t('adminRequests.subtitle')}</p>
        </div>
        <div className="bg-white p-1 rounded border d-flex shadow-sm">
            <Button 
                variant={activeTab === 'pending' ? 'light' : 'white'} 
                className={activeTab === 'pending' ? 'fw-bold text-primary' : 'text-muted border-0'}
                onClick={() => setActiveTab('pending')}
            >
                {t('adminRequests.tabs.pending')} <Badge bg={activeTab === 'pending' ? 'primary' : 'secondary'} className="ms-2">{requests.length}</Badge>
            </Button>
            <Button 
                variant={activeTab === 'history' ? 'light' : 'white'} 
                className={activeTab === 'history' ? 'fw-bold text-primary' : 'text-muted border-0'}
                onClick={() => setActiveTab('history')}
            >
                {t('adminRequests.tabs.history')}
            </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
      ) : (
        <Row className="g-3">
          {activeTab === 'pending' ? (
            requests.length > 0 ? requests.map((req) => (
              <Col lg={6} xl={4} key={req.requestId}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                        <div className="d-flex align-items-center">
                            <div 
                                className="rounded-circle text-white d-flex align-items-center justify-content-center me-3 fw-bold shadow-sm"
                                style={{ width: '50px', height: '50px', backgroundColor: getRandomColor(req.memberName) }}
                            >
                                {getInitials(req.memberName)}
                            </div>
                            <div>
                                <h6 className="fw-bold mb-0 text-dark">{req.memberName}</h6>
                                <div className="text-muted small">ID: {req.memberId}</div>
                            </div>
                        </div>
                        <Badge bg="success" className="bg-opacity-10 text-success border border-success border-opacity-25 fw-normal px-2 py-1">
                            <ShieldCheck size={12} className="me-1"/> {t('adminRequests.labels.kycVerified')}
                        </Badge>
                    </div>

                    <div className="bg-light rounded p-3 mb-3">
                        <div className="d-flex justify-content-between mb-2">
                            <span className="text-muted small"><FileText size={14} className="me-1"/> {t('adminRequests.labels.applyingFor')}</span>
                            <span className="fw-bold text-dark">{req.groupName}</span>
                        </div>
                        <div className="d-flex justify-content-between">
                            <span className="text-muted small"><IndianRupee size={14} className="me-1"/> {t('adminRequests.labels.commitment')}</span>
                            <span className="fw-bold text-primary">₹{req.monthlyAmount.toLocaleString()}/mo</span>
                        </div>
                    </div>

                    <div className="d-flex gap-2">
                        <Button variant="outline-danger" className="w-50" onClick={() => handleAction(req, 'reject')}>
                            <XCircle size={16} className="me-2"/> {t('adminRequests.actions.reject')}
                        </Button>
                        <Button variant="success" className="w-50 text-white" onClick={() => handleAction(req, 'approve')}>
                            <CheckCircle size={16} className="me-2"/> {t('adminRequests.actions.approve')}
                        </Button>
                    </div>
                  </Card.Body>
                  <Card.Footer className="bg-white border-0 text-center">
                    <small className="text-muted"><Clock size={12} className="me-1"/> {t('adminRequests.labels.requestedOn')} {new Date(req.requestDate).toLocaleDateString()}</small>
                  </Card.Footer>
                </Card>
              </Col>
            )) : (
              <Col xs={12}>
                <div className="text-center p-5 text-muted">
                    <div className="bg-light rounded-circle p-3 d-inline-block mb-3"><CheckCircle size={32} className="text-success opacity-50"/></div>
                    <h5>{t('adminRequests.empty.noPendingTitle')}</h5>
                    <p>{t('adminRequests.empty.noPendingSub')}</p>
                </div>
              </Col>
            )
          ) : (
            historyList.length > 0 ? historyList.map((req) => (
              <Col xs={12} key={req.requestId}>
                <Card className="border-0 shadow-sm mb-2">
                    <Card.Body className="py-3 d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-3">
                            <div className={`rounded-circle p-2 ${req.status === 'Approved' ? 'bg-success' : 'bg-danger'} bg-opacity-10 text-${req.status === 'Approved' ? 'success' : 'danger'}`}>
                                {req.status === 'Approved' ? <CheckCircle size={20}/> : <XCircle size={20}/>}
                            </div>
                            <div>
                                <h6 className="mb-0 fw-bold">
                                  {t('adminRequests.historyText', { 
                                    name: req.memberName, 
                                    status: req.status?.toLowerCase(), 
                                    group: req.groupName 
                                  })}
                                </h6>
                                <small className="text-muted">{new Date(req.requestDate).toLocaleDateString()}</small>
                            </div>
                        </div>
                        <Badge bg={req.status === 'Approved' ? 'success' : 'danger'} className="bg-opacity-10 text-reset px-3 py-2 rounded-pill">
                            {req.status}
                        </Badge>
                    </Card.Body>
                </Card>
              </Col>
            )) : (
                <Col xs={12}>
                    <div className="text-center p-5 text-muted">
                        <History size={32} className="mb-3 opacity-50"/>
                        <p>{t('adminRequests.empty.noHistory')}</p>
                    </div>
                </Col>
            )
          )}
        </Row>
      )}

      {/* Confirmation Modal */}
      <Modal show={!!selectedRequest} onHide={() => setSelectedRequest(null)} centered size="sm">
        <Modal.Body className="text-center p-4">
            <div className={`rounded-circle p-3 d-inline-flex mb-3 ${actionType === 'approve' ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                {actionType === 'approve' ? <CheckCircle size={32}/> : <AlertCircle size={32}/>}
            </div>
            <h5 className="fw-bold mb-2">
                {actionType === 'approve' ? t('adminRequests.modal.approveTitle') : t('adminRequests.modal.rejectTitle')}
            </h5>
            <p className="text-muted small mb-4">
                {t('adminRequests.modal.body', {
                  action: actionType === 'approve' ? t('adminRequests.actions.approve').toLowerCase() : t('adminRequests.actions.reject').toLowerCase(),
                  name: selectedRequest?.memberName,
                  group: selectedRequest?.groupName
                })}
            </p>
            <div className="d-flex gap-2 justify-content-center">
                <Button variant="light" onClick={() => setSelectedRequest(null)}>{t('adminRequests.actions.cancel')}</Button>
                <Button 
                    variant={actionType === 'approve' ? 'success' : 'danger'} 
                    onClick={confirmAction}
                >
                    {t('adminRequests.actions.confirm')}
                </Button>
            </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default AdminRequestsPage;