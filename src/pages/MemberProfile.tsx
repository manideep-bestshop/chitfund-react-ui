import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Modal, Spinner, Alert, Tabs, Tab } from 'react-bootstrap';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import API_BASE_URL from '../config/api';

// ================= TYPES =================
interface MemberProfileData {
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  aadharNumber: string;
  panNumber: string;
}

interface FinancialStats {
  totalInvested: number;
  totalDividends: number;
  upcomingDueAmount: number;
  activeChitCount: number;
}

interface ActiveGroup {
  ChitMemberId: string; 
  GroupId: string;
  GroupName: string;
  TotalValue: number;
  MonthlyAmount: number;
  Status: string;
}

interface PaymentHistory {
  GroupName: string;
  Amount: number;
  PaymentDate: string;
  Status: string;
}

const MemberProfile: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [alertMsg, setAlertMsg] = useState<{ type: string, message: string } | null>(null);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [activeGroups, setActiveGroups] = useState<ActiveGroup[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  
  const [profile, setProfile] = useState<MemberProfileData>({
    fullName: '', email: '', phoneNumber: '', address: '', aadharNumber: '', panNumber: ''
  });

  const [editFormData, setEditFormData] = useState({ 
    fullName: '', phoneNumber: '', address: '', aadharNumber: '', panNumber: ''
  });

  const [payFormData, setPayFormData] = useState({ groupId: '', amount: 0 });

  const getAuthHeader = () => {
    const token = localStorage.getItem('jwtToken');
    return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  };

  const fetchAllData = () => {
    fetchProfile();
    fetchStats();
    fetchActiveGroups();
    fetchPaymentHistory();
  };

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/Users/profile`, getAuthHeader());
      const data = response.data;
      setProfile({
        fullName: data.fullName || data.FullName || '',
        email: data.email || data.Email || '',
        phoneNumber: data.phoneNumber || data.PhoneNumber || '',
        address: data.address || data.Address || '',
        aadharNumber: data.aadharNumber || data.AadharNumber || '',
        panNumber: data.panNumber || data.PanNumber || ''
      });
      setLoading(false);
    } catch (error) { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/Users/financial-stats`, getAuthHeader());
      setStats(response.data);
    } catch (error) { console.error(error); }
  };

  const fetchActiveGroups = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/Users/active-groups`, getAuthHeader());
      setActiveGroups(response.data);
    } catch (error) { console.error(error); }
  };

  const fetchPaymentHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/Users/payment-history`, getAuthHeader());
      setPaymentHistory(response.data);
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchAllData(); }, []);

  const handleEditClick = () => {
    setEditFormData({ 
        fullName: profile.fullName, 
        phoneNumber: profile.phoneNumber, 
        address: profile.address,
        aadharNumber: profile.aadharNumber, 
        panNumber: profile.panNumber        
    });
    setShowEditModal(true);
  };

  const handleDownloadReport = () => {
    if (paymentHistory.length === 0) {
        alert(t('memberProfile.alerts.noDataDownload'));
        return;
    }
    const excelData = paymentHistory.map((p: any) => ({
        [t('memberProfile.table.date')]: new Date(p.paymentDate || p.PaymentDate).toLocaleDateString(),
        [t('memberProfile.table.groupName')]: p.groupName || p.GroupName,
        [t('memberProfile.table.amount')]: p.amount ?? p.Amount,
        [t('memberProfile.table.status')]: p.status || p.Status
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "History");
    XLSX.writeFile(workbook, `Statement_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;

  return (
    <Container fluid className="py-4">
      {alertMsg && <Alert variant={alertMsg.type} onClose={() => setAlertMsg(null)} dismissible>{alertMsg.message}</Alert>}

      {/* 1. PROFILE HEADER */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <div className="d-flex flex-column flex-md-row align-items-center">
            <div className="text-center me-md-5 mb-3 mb-md-0">
              <img src={`https://ui-avatars.com/api/?name=${profile.fullName}&background=0D8ABC&color=fff`} alt="Profile" className="rounded-circle shadow-sm" style={{ width: '90px', height: '90px' }} />
            </div>
            
            <div className="flex-grow-1 text-center text-md-start">
              <h3 className="mb-1 fw-bold text-dark">{profile.fullName}</h3>
              <div className="text-muted d-flex gap-4 flex-wrap justify-content-center justify-content-md-start mb-2">
                <span><i className="fas fa-envelope me-2 text-primary"></i>{profile.email}</span> 
                <span><i className="fas fa-phone me-2 text-success"></i>{profile.phoneNumber || 'N/A'}</span>
              </div>
            </div>

            <div className="mt-3 mt-md-0">
              <Button variant="outline-primary" size="sm" onClick={handleEditClick} className="px-4">
                {t('memberProfile.editProfile')}
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* 2. STATS CARDS */}
      <Row className="mb-4">
        <Col md={4} className="mb-3">
          <Card className="h-100 border-start border-4 border-success shadow-sm">
            <Card.Body>
              <div className="text-muted small text-uppercase">{t('memberProfile.stats.totalInvested')}</div>
              <h3 className="fw-bold text-success mb-0">₹{stats?.totalInvested?.toLocaleString() ?? 0}</h3>
              <small className="text-muted">{t('memberProfile.stats.lifetime')}</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-3">
          <Card className="h-100 border-start border-4 border-info shadow-sm">
            <Card.Body>
              <div className="text-muted small text-uppercase">{t('memberProfile.stats.activeChits')}</div>
              <h3 className="fw-bold mb-0">{stats?.activeChitCount ?? 0}</h3>
              <small className="text-muted">{t('memberProfile.stats.currentlyActive')}</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-3">
          <Card className="h-100 border-start border-4 border-warning shadow-sm">
            <Card.Body>
              <div className="text-muted small text-uppercase">{t('memberProfile.stats.upcomingPayment')}</div>
              <h3 className="fw-bold text-danger mb-0">₹{stats?.upcomingDueAmount?.toLocaleString() ?? 0}</h3>
              <small className="text-muted">{t('memberProfile.stats.nextMonth')}</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* 3. QUICK ACTIONS */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body className="p-3">
            <Row className="align-items-center">
                <Col md={4}><h5 className="mb-0 fw-bold text-secondary">{t('memberProfile.quickActions.title')}</h5></Col>
                <Col md={8} className="d-flex gap-2 justify-content-md-end flex-wrap">
                    <Button variant="outline-success" onClick={handleDownloadReport}><i className="fas fa-file-excel me-2"></i>{t('memberProfile.quickActions.download')}</Button>
                    <Button variant="outline-secondary" onClick={() => setShowSupportModal(true)}><i className="fas fa-headset me-2"></i>{t('memberProfile.quickActions.support')}</Button>
                </Col>
            </Row>
        </Card.Body>
      </Card>

      {/* 4. TABS */}
      <div className="bg-white rounded shadow-sm p-3 mb-4">
        <Tabs defaultActiveKey="active-groups" className="mb-3 fw-bold"> 
          <Tab eventKey="active-groups" title={<span className="fw-bold">{t('memberProfile.tabs.myGroups')}</span>}>
            <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr> 
                        <th className="fw-bold">{t('memberProfile.table.groupName')}</th>
                        <th className="fw-bold">{t('memberProfile.table.totalValue')}</th>
                        <th className="fw-bold">{t('memberProfile.table.monthlyDue')}</th>
                        <th className="fw-bold">{t('memberProfile.table.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeGroups.map((g: any, index) => (
                        <tr key={index}> 
                          <td className="fw-bold text-primary">{g.groupName || g.GroupName}</td> 
                          <td>₹{Number(g.totalValue || g.TotalValue).toLocaleString()}</td> 
                          <td>₹{Number(g.monthlyAmount || g.MonthlyAmount).toLocaleString()}</td> 
                          <td><span className="badge bg-success bg-opacity-10 text-success px-3">{g.status || g.Status}</span></td>
                        </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </Tab>
          
          <Tab eventKey="history" title={<span className="fw-bold">{t('memberProfile.tabs.history')}</span>}>
            <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light"> 
                    <tr>
                        <th className="fw-bold">{t('memberProfile.table.date')}</th>
                        <th className="fw-bold">{t('memberProfile.table.groupName')}</th>
                        <th className="fw-bold">{t('memberProfile.table.amount')}</th>
                        <th className="fw-bold">{t('memberProfile.table.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((pay: any, index) => (
                        <tr key={index}>
                          <td>{new Date(pay.paymentDate || pay.PaymentDate).toLocaleDateString()}</td>
                          <td className="fw-bold">{pay.groupName || pay.GroupName}</td>
                          <td>₹{Number(pay.amount || pay.Amount).toLocaleString()}</td>
                          <td><span className="badge bg-success bg-opacity-10 text-success px-3">{pay.status || pay.Status}</span></td>
                        </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </Tab>
        </Tabs>
      </div>

      {/* EDIT MODAL */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton><Modal.Title>{t('memberProfile.modal.editTitle')}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>{t('memberProfile.modal.fullName')}</Form.Label>
              <Form.Control type="text" value={editFormData.fullName} onChange={(e) => setEditFormData({...editFormData, fullName: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('memberProfile.modal.phone')}</Form.Label>
              <Form.Control type="text" value={editFormData.phoneNumber} onChange={(e) => setEditFormData({...editFormData, phoneNumber: e.target.value})} required />
            </Form.Group>
            <div className="d-grid mt-4">
                <Button variant="primary" type="submit">{t('memberProfile.modal.save')}</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* SUPPORT MODAL */}
      <Modal show={showSupportModal} onHide={() => setShowSupportModal(false)} centered>
        <Modal.Header closeButton className="bg-light border-0">
          <Modal.Title className="fw-bold text-secondary"><i className="fas fa-headset me-2"></i>{t('memberProfile.modal.supportTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 text-center">
            <div className="bg-primary bg-opacity-10 p-4 rounded mb-4">
                <h5 className="fw-bold text-primary mb-3">{t('memberProfile.modal.adminContact')}</h5>
                <div className="mb-2 fs-5"><i className="fas fa-envelope me-2"></i> <strong>support@chitfund.com</strong></div>
                <div className="mb-0 fs-5"><i className="fas fa-phone me-2"></i> <strong>+91 98765 43210</strong></div>
            </div>
            <div className="alert alert-success">
                <strong>{t('memberProfile.modal.updateNotice')}</strong>
                <div className="small mt-1 text-muted">{t('memberProfile.modal.reachOut')}</div>
            </div>
            <Button variant="outline-dark" onClick={() => setShowSupportModal(false)}>{t('memberProfile.modal.close')}</Button>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default MemberProfile;