import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Row, Col, Form, Spinner, Badge, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { 
  Printer, Download, Calendar, FileText, TrendingUp, 
  Users, Layers, IndianRupee, CheckCircle, AlertCircle, 
  Activity, PieChart, 
  Clock,
  PlayCircle
} from 'lucide-react';
import API_BASE_URL from '../config/api';

/* ===================== TYPES ===================== */

interface ReportData {
  totalChitGroups: number;
  activeChitGroups: number;
  totalMembers: number;
  totalPayments: number;
  totalAmount: number;    
  pendingPayments: number;
  completedAuctions: number;
  totalCommission: number;
}

interface TopChitGroup {
  groupName: string;
  status: string;
  totalAmount: number;
  memberCount: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  activity_Time: string;
  status: string;
}

interface FinancialReport {
  totalCollectedAmount: number;
  totalCommission: number;
  pendingPaymentsCount: number;
  totalPayments: number;
}

/* ===================== COMPONENT ===================== */

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const [selectedReportType, setSelectedReportType] = useState<'Summary' | 'Financial'>('Summary');
  const [activeReportType, setActiveReportType] = useState<'Summary' | 'Financial'>('Summary');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  const [summary, setSummary] = useState<ReportData | null>(null);
  const [topGroups, setTopGroups] = useState<TopChitGroup[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [financial, setFinancial] = useState<FinancialReport | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const authHeader = { Authorization: `Bearer ${localStorage.getItem('jwtToken')}` };

  // --- Helpers ---
  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    let bgColor = '#1580ec'; 
    let icon = null;

    if (s.includes('active')) {
      bgColor = '#1580ec'; 
      icon = <Activity size={12} className="me-1" />;
    } 
    else if (s.includes('complete')) {
      bgColor = '#15803d'; 
      icon = <CheckCircle size={12} className="me-1" />;
    } 
    else if (s.includes('progress')) {
      bgColor = '#f57004'; 
      icon = <PlayCircle size={12} className="me-1" />;
    } 
    else if (s.includes('pending')) {
      bgColor = '#facc15'; 
      icon = <Clock size={12} className="me-1" />;
    }

    return (
      <span
        className="rounded-pill px-3 py-2 d-inline-flex align-items-center fw-semibold"
        style={{ backgroundColor: bgColor, color: '#ffffff', fontSize: '0.75rem' }}
      >
        {icon}
        {status}
      </span>
    );
  };

  // --- API Calls ---
  useEffect(() => { loadDefaultSummary(); }, []);

  const loadDefaultSummary = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchSummary(), fetchTopGroups(), fetchRecentActivities()]);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const fetchSummary = async () => {
    const res = await fetch(`${API_BASE_URL}/api/Reports/dashboard-metrics`, { headers: authHeader });
    if(res.ok) setSummary(await res.json());
  };

  const fetchTopGroups = async () => {
    const res = await fetch(`${API_BASE_URL}/api/Reports/top-groups`, { headers: authHeader });
    if(res.ok) {
        const data = await res.json();
        setTopGroups(Array.isArray(data) ? data : []);
    }
  };

  const fetchRecentActivities = async () => {
    const res = await fetch(`${API_BASE_URL}/api/Reports/recent-activities`, { headers: authHeader });
    if(res.ok) {
        const data = await res.json();
        setRecentActivities(Array.isArray(data) ? data : []);
    }
  };

  const fetchFinancial = async () => {
    const res = await fetch(`${API_BASE_URL}/api/Reports/financial-report?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, { headers: authHeader });
    if(res.ok) setFinancial(await res.json());
  };

  const handleGenerate = async () => {
    if (!dateRange.startDate || !dateRange.endDate) { 
      setError(t('reports.errors.selectDates')); 
      return; 
    }
    setError('');
    setActiveReportType(selectedReportType);
    setLoading(true);

    try {
        if (selectedReportType === 'Summary') {
          setFinancial(null);
          const res = await fetch(`${API_BASE_URL}/api/Reports/generate`, {
              method: 'POST',
              headers: { ...authHeader, 'Content-Type': 'application/json' },
              body: JSON.stringify({ startDate: dateRange.startDate, endDate: dateRange.endDate, reportType: 'Summary' })
          });
          if(res.ok) setSummary(await res.json());
        }

        if (selectedReportType === 'Financial') {
          setTopGroups([]);
          setRecentActivities([]);
          await fetchFinancial();
        }
    } finally { setLoading(false); }
  };

  const handlePrint = () => window.print();

  const handleExport = () => {
    let csv = "data:text/csv;charset=utf-8,";
    const date = new Date().toLocaleDateString();

    if (activeReportType === 'Summary' && summary) {
        csv += `${t('reports.types.summary')} (${date})\n\nMetric,Value\n`;
        csv += `${t('reports.metrics.totalGroups')},${summary.totalChitGroups}\n`;
        csv += `${t('reports.metrics.activeGroups')},${summary.activeChitGroups}\n`;
        csv += `${t('reports.metrics.totalMembers')},${summary.totalMembers}\n`;
        csv += `${t('reports.metrics.totalVolume')},${summary.totalAmount}\n`;
        csv += `${t('reports.metrics.pendingDues')},${summary.pendingPayments}\n`;
        csv += `${t('reports.metrics.commission')},${summary.totalCommission}\n\n`;
    } else if (activeReportType === 'Financial' && financial) {
        csv += `${t('reports.types.financial')} (${date})\n\nMetric,Value\n`;
        csv += `${t('reports.financial.totalCollected')},${financial.totalCollectedAmount}\n`;
        csv += `${t('reports.financial.totalCommission')},${financial.totalCommission}\n`;
        csv += `${t('reports.financial.pendingPayments')},${financial.pendingPaymentsCount}\n`;
        csv += `${t('reports.financial.totalTransactions')},${financial.totalPayments}\n`;
    } else {
        alert(t('reports.empty.noData')); 
        return;
    }
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `Report_${activeReportType}_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  

  // --- StatCard Component ---
  const StatCard = ({ label, value, icon: Icon, color }: any) => {
    return (
        <Card className="border-0 shadow-sm h-100 stat-card">
            <Card.Body className="d-flex align-items-center p-3">
                <div className={`rounded-circle p-3 me-3 bg-${color} bg-opacity-10 d-flex align-items-center justify-content-center`} style={{minWidth: '56px', minHeight: '56px'}}>
                    <Icon size={24} className="text-white" />
                </div>
                <div>
                    <h4 className="fw-bold mb-0 text-white">{value}</h4>
                    <div className="text-white small text-uppercase fw-bold" style={{fontSize: '0.75rem', letterSpacing: '0.5px'}}>{label}</div>
                </div>
            </Card.Body>
        </Card>
    );
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #printable-report, #printable-report * { visibility: visible; }
            #printable-report { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; background: white; }
            .no-print { display: none !important; }
            .d-print-table { display: table !important; width: 100%; }
            .card { border: 1px solid #ddd !important; box-shadow: none !important; }
          }
        `}
      </style>

      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3 no-print">
        <div>
          <h2 className="fw-bold text-dark mb-1">{t('reports.title')}</h2>
        </div>
        <div className="d-flex gap-2">
          <Button variant="white" className="border shadow-sm d-flex align-items-center text-success" onClick={handleExport}>
            <Download size={18} className="me-2"/> {t('reports.export')}
          </Button>
          <Button variant="primary" className="shadow-sm d-flex align-items-center px-4" onClick={handlePrint}>
            <Printer size={18} className="me-2"/> {t('reports.print')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-4 no-print">
        <Card.Body className="p-3">
          <Row className="g-3 align-items-end">
            <Col md={3}>
              <Form.Label className="small fw-bold text-muted mb-1">{t('reports.filters.startDate')}</Form.Label>
              <InputGroup>
                <InputGroup.Text className="bg-light border-end-0"><Calendar size={16}/></InputGroup.Text>
                <Form.Control type="date" className="border-start-0 bg-light shadow-none" onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })} />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold text-muted mb-1">{t('reports.filters.endDate')}</Form.Label>
              <InputGroup>
                <InputGroup.Text className="bg-light border-end-0"><Calendar size={16}/></InputGroup.Text>
                <Form.Control type="date" className="border-start-0 bg-light shadow-none" onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })} />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold text-muted mb-1">{t('reports.filters.type')}</Form.Label>
              <Form.Select className="bg-light shadow-none" value={selectedReportType} onChange={e => setSelectedReportType(e.target.value as any)}>
                <option value="Summary">{t('reports.types.summary')}</option>
                <option value="Financial">{t('reports.types.financial')}</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Button variant="primary" className="w-100 d-flex align-items-center justify-content-center" onClick={handleGenerate} disabled={loading}>
                {loading ? <Spinner as="span" animation="border" size="sm" className="me-2"/> : <FileText size={18} className="me-2"/>}
                {t('reports.filters.generate')}
              </Button>
            </Col>
          </Row>
          {error && <div className="text-danger mt-2 small"><AlertCircle size={14} className="me-1"/>{error}</div>}
        </Card.Body>
      </Card>

      {/* === PRINTABLE CONTENT === */}
      <div id="printable-report">
        
        {/* Print-Only Title */}
        <div className="d-none d-print-block mb-4 text-center">
            <h1>{activeReportType === 'Summary' ? t('reports.types.summary') : t('reports.types.financial')}</h1>
            <p className="text-muted">Generated on {new Date().toLocaleDateString()}</p>
            <hr />
        </div>

        {/* SUMMARY VIEW */}
        {activeReportType === 'Summary' && summary && (
          <>
            {/* Stats Grid */}
            <Row className="g-3 mb-4">
                <Col md={3} sm={6}><StatCard label={t('reports.metrics.totalGroups')} value={summary.totalChitGroups} icon={Layers} color="primary" /></Col>
                <Col md={3} sm={6}><StatCard label={t('reports.metrics.activeGroups')} value={summary.activeChitGroups} icon={Activity} color="success" /></Col>
                <Col md={3} sm={6}><StatCard label={t('reports.metrics.totalMembers')} value={summary.totalMembers} icon={Users} color="info" /></Col>
                <Col md={3} sm={6}><StatCard label={t('reports.metrics.transactions')} value={summary.totalPayments} icon={FileText} color="secondary" /></Col>
                
                <Col md={3} sm={6}><StatCard label={t('reports.metrics.totalVolume')} value={`₹${summary.totalAmount.toLocaleString()}`} icon={IndianRupee} color="indigo" /></Col>
                <Col md={3} sm={6}><StatCard label={t('reports.metrics.commission')} value={`₹${summary.totalCommission.toLocaleString()}`} icon={TrendingUp} color="success" /></Col>
                <Col md={3} sm={6}><StatCard label={t('reports.metrics.pendingDues')} value={summary.pendingPayments} icon={AlertCircle} color="warning" /></Col>
                <Col md={3} sm={6}><StatCard label={t('reports.metrics.auctionsDone')} value={summary.completedAuctions} icon={CheckCircle} color="dark" /></Col>
            </Row>

            <Row className="g-4">
              {/* Top Groups */}
              <Col lg={6}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Header className="bg-white border-0 py-3"><h5 className="mb-0 fw-bold">{t('reports.tables.topGroups')}</h5></Card.Header>
                  <Card.Body className="p-0">
                    <Table responsive hover className="align-middle mb-0 custom-horizontal-lines">
                      <thead className="bg-light text-muted small text-uppercase">
                        <tr>
                          <th className="ps-4 border-0 fw-bold">{t('reports.tables.group')}</th>
                          <th className="border-0 text-center fw-bold">{t('reports.tables.members')}</th>
                          <th className="border-0 fw-bold">{t('reports.tables.volume')}</th>
                          <th className="border-0 text-end pe-4 fw-bold">{t('reports.tables.status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topGroups.length > 0 ? topGroups.map((g, i) => (
                          <tr key={i}>
                            <td className="ps-4 fw-medium text-dark">{g.groupName}</td>
                            <td className="text-center"><Badge bg="light" text="dark" className="border">{g.memberCount}</Badge></td>
                            <td className="text-dark">₹{g.totalAmount.toLocaleString()}</td>
                            <td className="text-end pe-4">{getStatusBadge(g.status)}</td>
                          </tr>
                        )) : <tr><td colSpan={4} className="text-center py-4 text-muted">{t('reports.empty.noData')}</td></tr>}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>

              {/* Recent Activity */}
              <Col lg={6}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Header className="bg-white border-0 py-3"><h5 className="mb-0 fw-bold">{t('reports.tables.recentActivity')}</h5></Card.Header>
                  <Card.Body className="p-0">
                    <Table responsive hover className="align-middle mb-0 custom-horizontal-lines">
                      <thead className="bg-light text-muted small text-uppercase">
                        <tr>
                          <th className="ps-4 border-0 fw-bold">{t('reports.tables.type')}</th>
                          <th className="border-0 fw-bold">{t('reports.tables.description')}</th>
                          <th className="border-0 fw-bold">{t('reports.tables.date')}</th>
                          <th className="border-0 text-end pe-4 fw-bold">{t('reports.tables.status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentActivities.length > 0 ? recentActivities.slice(0,6).map((a, i) => (
                          <tr key={i}>
                            <td className="ps-4"><Badge bg="light" text="dark" className="border fw-normal">{a.type}</Badge></td>
                            <td className="small text-dark text-truncate" style={{maxWidth: '200px'}} title={a.description}>{a.description}</td>
                            <td className="small text-muted">{a.activity_Time ? new Date(a.activity_Time).toLocaleDateString() : '-'}</td>
                            <td className="text-end pe-4">{getStatusBadge(a.status)}</td>
                          </tr>
                        )) : <tr><td colSpan={4} className="text-center py-4 text-muted">{t('reports.empty.noActivity')}</td></tr>}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}

        {/* FINANCIAL VIEW */}
        {activeReportType === 'Financial' && (
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-5 text-center">
              {loading && <Spinner animation="border" variant="primary"/>}
              
              {!loading && financial && (
                <div className="py-4">
                    <div className="bg-light rounded-circle p-4 d-inline-block mb-4">
                        <PieChart size={48} className="text-primary"/>
                    </div>
                    <h3 className="fw-bold mb-4">{t('reports.financial.overview')}</h3>
                    
                    <Row className="justify-content-center g-4">
                        <Col md={5}>
                            <div className="p-4 bg-light rounded border border-start border-5 border-success text-start">
                                <small className="text-uppercase text-muted fw-bold">{t('reports.financial.totalCollected')}</small>
                                <h2 className="fw-bold text-success mb-0">₹{financial.totalCollectedAmount.toLocaleString()}</h2>
                            </div>
                        </Col>
                        <Col md={5}>
                            <div className="p-4 bg-light rounded border border-start border-5 border-primary text-start">
                                <small className="text-uppercase text-muted fw-bold">{t('reports.financial.totalCommission')}</small>
                                <h2 className="fw-bold text-primary mb-0">₹{financial.totalCommission.toLocaleString()}</h2>
                            </div>
                        </Col>
                        <Col md={5}>
                            <div className="p-4 bg-light rounded border border-start border-5 border-warning text-start">
                                <small className="text-uppercase text-muted fw-bold">{t('reports.financial.pendingPayments')}</small>
                                <h2 className="fw-bold text-warning mb-0">{financial.pendingPaymentsCount}</h2>
                            </div>
                        </Col>
                        <Col md={5}>
                            <div className="p-4 bg-light rounded border border-start border-5 border-secondary text-start">
                                <small className="text-uppercase text-muted fw-bold">{t('reports.financial.totalTransactions')}</small>
                                <h2 className="fw-bold text-dark mb-0">{financial.totalPayments}</h2>
                            </div>
                        </Col>
                    </Row>
                </div>
              )}
              
              {!loading && !financial && <div className="text-muted py-5">{t('reports.empty.noFinancial')}</div>}
            </Card.Body>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Reports;