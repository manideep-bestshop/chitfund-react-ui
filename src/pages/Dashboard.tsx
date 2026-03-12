import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Badge, Button, Spinner, Dropdown, ProgressBar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Bell, Users, Layers, PlayCircle, CreditCard, Gavel, 
  CheckCircle, Clock, AlertCircle, Activity, Plus, UserPlus, 
  IndianRupee, ChevronRight, Send, Eye, MessageSquare, Check 
} from 'lucide-react';
import API_BASE_URL from '../config/api';

// --- Interfaces ---
interface DashboardStats {
  totalUsers: number;
  totalChitGroups: number;
  activeChitGroups: number;
  totalMembers: number;
  totalPayments: number;
  pendingPayments: number;
  totalAuctions: number;
  completedAuctions: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  activity_Time: string;
  status: string;
}

interface WhatsAppAnalytics {
  messageType: string;
  totalSent: number;
  deliveredCount: number;
  readCount: number;
}

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pendingRequestCount, setPendingRequestCount] = useState<number>(0);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [whatsappStats, setWhatsappStats] = useState<WhatsAppAnalytics[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0, totalChitGroups: 0, activeChitGroups: 0, totalMembers: 0,
    totalPayments: 0, pendingPayments: 0, totalAuctions: 0, completedAuctions: 0
  });

  // --- API Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('jwtToken');
        if (!token) return;
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

        const [statsRes, activityRes, pendingRes, waRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/Reports/dashboard-metrics`, { headers }),
            fetch(`${API_BASE_URL}/api/Reports/recent-activities`, { headers }),
            fetch(`${API_BASE_URL}/api/GroupRequests/admin/pending`, { headers }),
            fetch(`${API_BASE_URL}/api/WhatsApp/whatsapp-analytics`, { headers })
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (activityRes.ok) setRecentActivities(await activityRes.json());
        if (waRes.ok) setWhatsappStats(await waRes.json());
        if (pendingRes.ok) {
            const data = await pendingRes.json();
            setPendingRequestCount(Array.isArray(data) ? data.length : 0);
        }
      } catch (error) {
        console.error('Dashboard Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Analytics Logic ---
  const totalWA = whatsappStats?.reduce((acc, curr) => acc + (curr.totalSent || 0), 0) || 0;
  const totalDelivered = whatsappStats?.reduce((acc, curr) => acc + (curr.deliveredCount || 0), 0) || 0;
  const totalRead = whatsappStats?.reduce((acc, curr) => acc + (curr.readCount || 0), 0) || 0;
  
  const readRate = totalWA > 0 ? Math.round((totalRead / totalWA) * 100) : 0;
  const deliveryRate = totalWA > 0 ? Math.round((totalDelivered / totalWA) * 100) : 0;

  // --- Navigation Handlers ---
  const handleCreateGroup = () => navigate('/members', { state: { openCreateModal: true } });
  const handlePayment = () => navigate('/payments', { state: { openRecordPaymentModal: true } });

  // --- Visual Helpers ---
  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    let bgColor = '#1580ec'; 
    let icon = null;

    if (s.includes('active')) { bgColor = '#1580ec'; icon = <Activity size={12} className="me-1" />; } 
    else if (s.includes('complete')) { bgColor = '#15803d'; icon = <CheckCircle size={12} className="me-1" />; } 
    else if (s.includes('progress')) { bgColor = '#f57004'; icon = <PlayCircle size={12} className="me-1" />; } 
    else if (s.includes('pending')) { bgColor = '#facc15'; icon = <Clock size={12} className="me-1" />; }

    return (
      <span className="rounded-pill px-3 py-2 d-inline-flex align-items-center fw-semibold"
        style={{ backgroundColor: bgColor, color: '#ffffff', fontSize: '0.75rem' }}>
        {icon} {status}
      </span>
    );
  };

  const StatCard = ({ label, value, icon: Icon, color, subText }: any) => (
    <Card className="border-0 shadow-sm h-100 hover-shadow transition-all">
        <Card.Body className="d-flex align-items-center">
            <div className={`rounded-circle p-3 me-3 bg-${color} bg-opacity-10 text-${color}`}>
                <Icon size={24} />
            </div>
            <div>
                <h3 className="fw-bold mb-0 text-dark">{value}</h3>
                <div className="text-muted small text-uppercase fw-bold" style={{ fontSize: '0.65rem' }}>{label}</div>
                {subText && <div className="text-success x-small fw-bold" style={{ fontSize: '0.6rem' }}>{subText}</div>}
            </div>
        </Card.Body>
    </Card>
  );

  if (loading) return <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>;

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
      
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-dark mb-1">{t('dashboard.title')}</h2>
        <Dropdown align="end">
          <Dropdown.Toggle variant="white" className="border-0 bg-white shadow-sm p-2 rounded-circle no-caret position-relative">
            <Bell size={20} />
            {pendingRequestCount > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                {pendingRequestCount}
              </span>
            )}
          </Dropdown.Toggle>
        </Dropdown>
      </div>

      {/* Primary Financial Stats */}
      <Row className="g-3 mb-4">
        <Col md={3} sm={6}><StatCard label={t('dashboard.stats.totalUsers')} value={stats.totalUsers} icon={Users} color="primary" /></Col>
        <Col md={3} sm={6}><StatCard label={t('dashboard.stats.totalGroups')} value={stats.totalChitGroups} icon={Layers} color="info" /></Col>
        <Col md={3} sm={6}><StatCard label={t('dashboard.stats.payments')} value={stats.totalPayments} icon={IndianRupee} color="success" /></Col>
        <Col md={3} sm={6}><StatCard label={t('dashboard.stats.pendingDue')} value={stats.pendingPayments} icon={AlertCircle} color="warning" /></Col>
      </Row>

      {/* WhatsApp Performance row */}
      <Row className="g-3 mb-4">
        <Col md={3} sm={6}><StatCard label={t('dashboard.whatsapp.totalSent')} value={totalWA} icon={Send} color="primary" /></Col>
        <Col md={3} sm={6}><StatCard label={t('dashboard.whatsapp.delivered')} value={totalDelivered} icon={Check} color="success" subText={`${deliveryRate}% ${t('dashboard.whatsapp.success')}`} /></Col>
        <Col md={3} sm={6}><StatCard label={t('dashboard.whatsapp.readRate')} value={`${readRate}%`} icon={Eye} color="indigo" /></Col>
        <Col md={3} sm={6}><StatCard label={t('dashboard.whatsapp.activeAlerts')} value={whatsappStats.length} icon={MessageSquare} color="warning" /></Col>
      </Row>

      <Row className="g-4">
        <Col lg={8}>
          {/* Detailed Breakdown Table */}
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white border-0 py-3">
              <h5 className="mb-0 fw-bold text-dark">{t('dashboard.communication.title')}</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive className="align-middle mb-0">
                <thead className="bg-light text-muted small text-uppercase">
                  <tr>
                    <th className="ps-4 fw-bold">{t('dashboard.communication.table.type')}</th>
                    <th className="fw-bold">{t('dashboard.communication.table.sent')}</th>
                    <th className="fw-bold">{t('dashboard.communication.table.delivered')}</th>
                    <th className="fw-bold">{t('dashboard.communication.table.read')}</th>
                    <th className="fw-bold text-end pe-4">{t('dashboard.communication.table.engagement')}</th>
                  </tr>
                </thead>
                <tbody>
                  {whatsappStats.length > 0 ? whatsappStats.map((wa, i) => (
                    <tr key={i}>
                      <td className="ps-4 fw-medium text-dark">{wa.messageType}</td>
                      <td className="fw-bold">{wa.totalSent || 0}</td>
                      <td><Badge bg="info" className="bg-opacity-10 text-info fw-bold border-0">{wa.deliveredCount || 0}</Badge></td>
                      <td><Badge bg="success" className="bg-opacity-10 text-success fw-bold border-0">{wa.readCount || 0}</Badge></td>
                      <td className="text-end pe-4">
                        <div className="d-flex align-items-center justify-content-end gap-2">
                          <span className="small fw-bold">{wa.totalSent > 0 ? Math.round((wa.readCount / wa.totalSent) * 100) : 0}%</span>
                          <ProgressBar variant="primary" now={wa.totalSent > 0 ? (wa.readCount / wa.totalSent) * 100 : 0} style={{ height: '6px', width: '60px' }} />
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="text-center py-4 text-muted">{t('dashboard.communication.noLogs')}</td></tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {/* Recent Activity */}
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold text-dark">{t('dashboard.activity.title')}</h5>
              <Button variant="link" size="sm" onClick={() => navigate('/reports')} className="text-decoration-none fw-bold">{t('dashboard.activity.viewAll')}</Button>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="align-middle mb-0">
                <thead className="bg-light text-muted small text-uppercase">
                  <tr>
                    <th className="ps-4 fw-bold">{t('dashboard.activity.table.type')}</th>
                    <th className="fw-bold">{t('dashboard.activity.table.description')}</th>
                    <th className="fw-bold text-end pe-4">{t('dashboard.activity.table.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivities.slice(0, 5).map((act, i) => (
                    <tr key={i}>
                      <td className="ps-4"><Badge bg="light" text="dark" className="border fw-normal">{act.type}</Badge></td>
                      <td className="small text-dark fw-medium">{act.description}</td>
                      <td className="text-end pe-4">{getStatusBadge(act.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        {/* Quick Actions */}
        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 py-3"><h5 className="mb-0 fw-bold text-dark">{t('dashboard.quickActions.title')}</h5></Card.Header>
            <Card.Body className="d-flex flex-column gap-3">
              <Button variant="white" className="w-100 text-start p-3 border shadow-sm d-flex align-items-center justify-content-between" onClick={handleCreateGroup}>
                <div className="d-flex align-items-center">
                  <div className="bg-primary bg-opacity-10 p-2 rounded-circle me-3 text-primary"><Plus size={20}/></div>
                  <div><div className="fw-bold text-dark">{t('dashboard.quickActions.newGroup')}</div><div className="small text-muted">{t('dashboard.quickActions.newGroupSub')}</div></div>
                </div>
                <ChevronRight size={18} className="text-muted"/>
              </Button>
              <Button variant="white" className="w-100 text-start p-3 border shadow-sm d-flex align-items-center justify-content-between" onClick={handlePayment}>
                <div className="d-flex align-items-center">
                  <div className="bg-success bg-opacity-10 p-2 rounded-circle me-3 text-success"><CreditCard size={20}/></div>
                  <div><div className="fw-bold text-dark">{t('dashboard.quickActions.payment')}</div><div className="small text-muted">{t('dashboard.quickActions.paymentSub')}</div></div>
                </div>
                <ChevronRight size={18} className="text-muted"/>
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;