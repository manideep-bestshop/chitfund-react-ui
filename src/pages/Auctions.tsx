import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Row, Col, Badge, Alert, Spinner, InputGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { 
  Search, Plus, Download, Filter, Gavel, Calendar, 
  IndianRupee, Edit2, Trash2, Power, 
  PlayCircle, CheckCircle, Clock, XCircle 
} from 'lucide-react';

import LiveAuction from './LiveAuction';
import API_BASE_URL from '../config/api';

// --- Interfaces ---
interface Auction {
  auctionId: string;
  chitGroupId: string;
  installmentId: string;
  auctionDate: string;
  baseAmount: number;
  highestBidAmount?: number;
  winnerChitMemberId?: string;
  status: string;
  groupName: string;
  installmentNumber: number;
  winnerName?: string;
}

interface ChitGroup {
  chitGroupId: string;
  groupName: string;
  groupCode: string;
}

interface Installment {
  installmentId: string;
  installmentNumber: number;
  amount: number;
}

const Auctions: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const BASE_URL = `${API_BASE_URL}/api`;

  // --- State ---
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [filteredAuctions, setFilteredAuctions] = useState<Auction[]>([]);
  const [chitGroups, setChitGroups] = useState<ChitGroup[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAuction, setEditingAuction] = useState<Auction | null>(null);
  const [activeAuctionId, setActiveAuctionId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Form Data
  const [formData, setFormData] = useState({
    chitGroupId: '', installmentId: '', auctionDate: '', baseAmount: '', 
    highestBidAmount: '', status: 'Scheduled'
  });

  const userRole = (() => {
    try { return JSON.parse(localStorage.getItem("user") || '{}').userRole; } 
    catch { return null; }
  })();
  const isAdminOrAgent = userRole === "Admin" || userRole === "Agent";

  useEffect(() => {
    if (location.state && location.state.openScheduleAuctionModal) {
        handleShowModal(); 
        window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    fetchAuctions();
    fetchChitGroups();
  }, []);

  useEffect(() => {
    let result = auctions;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.groupName.toLowerCase().includes(query) ||
        (a.winnerName && a.winnerName.toLowerCase().includes(query)) ||
        a.status.toLowerCase().includes(query) ||
        a.installmentNumber.toString().includes(query)
      );
    }
    if (fromDate) result = result.filter(a => a.auctionDate.slice(0, 10) >= fromDate);
    if (toDate) result = result.filter(a => a.auctionDate.slice(0, 10) <= toDate);
    setFilteredAuctions(result);
  }, [auctions, searchQuery, fromDate, toDate]);

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/Auctions`);
      if (!response.ok) throw new Error("Failed");
      setAuctions(await response.json());
    } catch { setAlert({ type: 'danger', message: 'Error loading auctions' }); } 
    finally { setLoading(false); }
  };

  const fetchChitGroups = async () => {
    try {
      const response = await fetch(`${BASE_URL}/ChitGroups`);
      if (response.ok) setChitGroups(await response.json());
    } catch (e) { console.error(e); }
  };

  const handleGroupChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const groupId = e.target.value;
    setFormData(prev => ({ ...prev, chitGroupId: groupId, installmentId: '', baseAmount: '' }));
    if (!groupId) { setInstallments([]); return; }

    try {
        const response = await fetch(`${BASE_URL}/MonthlyInstallments/group/${groupId}`);
        if (response.ok) {
            const data: Installment[] = await response.json();
            setInstallments(data);
            const usedIds = auctions.filter(a => a.chitGroupId === groupId && a.status !== 'Cancelled').map(a => a.installmentId);
            const available = data.filter(inst => !usedIds.includes(inst.installmentId)).sort((a, b) => a.installmentNumber - b.installmentNumber);

            if (available.length > 0) {
                setFormData(prev => ({
                    ...prev, chitGroupId: groupId, installmentId: available[0].installmentId, baseAmount: available[0].amount.toString()
                }));
            }
        }
    } catch { setInstallments([]); }
  };

  const handleCloseModal = () => { 
    setShowModal(false); 
    setEditingAuction(null); 
    setFormData({ chitGroupId: '', installmentId: '', auctionDate: new Date().toISOString().slice(0, 16), baseAmount: '', highestBidAmount: '', status: 'Scheduled' });
    setInstallments([]);
  };

  const handleShowModal = (auction?: Auction) => {
    setAlert(null);
    if (auction) {
      setEditingAuction(auction);
      setFormData({
        chitGroupId: auction.chitGroupId,
        installmentId: auction.installmentId,
        auctionDate: new Date().toISOString().slice(0, 16),
        baseAmount: auction.baseAmount.toString(),
        highestBidAmount: auction.highestBidAmount?.toString() || '',
        status: auction.status
      });
      fetch(`${BASE_URL}/MonthlyInstallments/group/${auction.chitGroupId}`)
        .then(res => res.json()).then(setInstallments).catch(() => setInstallments([]));
    } else {
      setEditingAuction(null);
      setFormData({ chitGroupId: '', installmentId: '', auctionDate: new Date().toISOString().slice(0, 16), baseAmount: '', highestBidAmount: '', status: 'Scheduled' });
      setInstallments([]);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { "Content-Type": "application/json" };
      if (editingAuction) {
        await fetch(`${BASE_URL}/Auctions/${editingAuction.auctionId}`, {
          method: 'PUT', headers,
          body: JSON.stringify({ auctionDate: formData.auctionDate, highestBidAmount: formData.highestBidAmount ? Number(formData.highestBidAmount) : null, status: formData.status })
        });
      } else {
        await fetch(`${BASE_URL}/Auctions`, {
          method: 'POST', headers,
          body: JSON.stringify({ chitGroupId: formData.chitGroupId, installmentId: formData.installmentId, auctionDate: formData.auctionDate, baseAmount: Number(formData.baseAmount) })
        });
      }
      handleCloseModal();
      fetchAuctions();
    } catch { setAlert({ type: 'danger', message: 'Operation failed' }); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this auction?")) return;
    try {
      const res = await fetch(`${BASE_URL}/Auctions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed");
      fetchAuctions();
    } catch { setAlert({ type: 'danger', message: 'Delete failed' }); }
  };

  const handleExportExcel = () => {
    if (filteredAuctions.length === 0) return;
    const data = filteredAuctions.map(a => ({
      "Group": a.groupName, "Installment": a.installmentNumber, "Date": new Date(a.auctionDate).toLocaleString(),
      "Base": a.baseAmount, "Highest": a.highestBidAmount || 0, "Winner": a.winnerName || "N/A", "Status": a.status
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Auctions");
    XLSX.writeFile(workbook, `Auctions_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    let bgColor = '#1580ec'; 
    let label = status;
    let icon = null;

    if (s === 'scheduled' || s.includes('pending')) {
      bgColor = '#facc15';
      label = t('auctions.status.scheduled');
      icon = <Clock size={12} className="me-1" />;
    } else if (s === 'inprogress' || s.includes('progress')) {
      bgColor = '#f57004'; 
      label = t('auctions.status.inProgress');
      icon = <PlayCircle size={12} className="me-1" />;
    } else if (s === 'completed') {
      bgColor = '#15803d'; 
      label = t('auctions.status.completed');
      icon = <CheckCircle size={12} className="me-1" />;
    } else if (s === 'active') {
      bgColor = '#1580ec'; 
      label = t('auctions.status.active');
      icon = <PlayCircle size={12} className="me-1" />;
    } else if (s === 'cancelled') {
      bgColor = '#ef4444'; 
      label = t('auctions.status.cancelled');
      icon = <XCircle size={12} className="me-1" />;
    }

    return (
      <span className="rounded-pill px-3 py-2 d-inline-flex align-items-center fw-semibold" style={{ backgroundColor: bgColor, color: '#ffffff', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
        {icon} {label}
      </span>
    );
  };

  const getCurrentInstallmentInfo = () => {
    if(!formData.installmentId) return t('auctions.modal.waitingGroup');
    const inst = installments.find(i => i.installmentId === formData.installmentId);
    return inst ? `${t('auctions.table.installment')}${inst.installmentNumber} (₹${inst.amount})` : "...";
  };

  if (activeAuctionId) {
    const activeAuction = auctions.find(a => a.auctionId === activeAuctionId);
    return (
      <div className="container mt-4">
        <LiveAuction
          auctionId={activeAuctionId}
          chitGroupId={activeAuction?.chitGroupId || ''}
          initialAmount={activeAuction?.highestBidAmount || activeAuction?.baseAmount || 0}
          groupName={activeAuction?.groupName || 'Unknown Group'}
          onClose={() => { setActiveAuctionId(null); fetchAuctions(); }}
        />
      </div>
    );
  }

  if (loading) return <div className="text-center p-5"><Spinner animation="border" variant="primary"/></div>;

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
      
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
        <h2 className="fw-bold text-dark mb-1">{t('auctions.title')}</h2>
        {isAdminOrAgent && (
          <div className="d-flex gap-2">
            <Button variant="white" className="border shadow-sm d-flex align-items-center" onClick={handleExportExcel}>
              <Download size={18} className="me-2 text-success"/> {t('auctions.export')}
            </Button>
            <Button variant="primary" className="shadow-sm d-flex align-items-center px-4" onClick={() => handleShowModal()}>
              <Plus size={18} className="me-2"/> {t('auctions.schedule')}
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-3">
          <Row className="g-2">
            <Col md={5}>
              <InputGroup>
                <InputGroup.Text className="bg-white border-end-0 text-muted"><Search size={18}/></InputGroup.Text>
                <Form.Control 
                  placeholder={t('auctions.searchPlaceholder')}
                  className="border-start-0 shadow-none"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}><Form.Control type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></Col>
            <Col md={3}><Form.Control type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></Col>
            <Col md={1} className="d-grid">
                <Button variant="light" className="border" onClick={() => {setFromDate(''); setToDate(''); setSearchQuery('')}}>{t('auctions.clear')}</Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="align-middle mb-0">
            <thead className="bg-light text-muted small text-uppercase">
              <tr>
                <th className="ps-4 py-3 border-0 fw-bold">{t('auctions.table.groupDetails')}</th>
                <th className="py-3 border-0 fw-bold">{t('auctions.table.schedule')}</th>
                <th className="py-3 border-0 fw-bold">{t('auctions.table.financials')}</th>
                <th className="py-3 border-0 fw-bold">{t('auctions.table.winner')}</th>
                <th className="py-3 border-0 text-center fw-bold">{t('auctions.table.status')}</th>
                <th className="py-3 border-0 text-end pe-4 fw-bold">{t('auctions.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAuctions.length > 0 ? filteredAuctions.map(auction => (
                <tr key={auction.auctionId}>
                  <td className="ps-4">
                    <div className="fw-bold text-dark">{auction.groupName}</div>
                    <Badge bg="light" text="dark" className="border fw-normal mt-1">{t('auctions.table.installment')}{auction.installmentNumber}</Badge>
                  </td>
                  <td>{new Date(auction.auctionDate).toLocaleDateString()}</td>
                  <td>
                    <div className="small text-muted">{t('auctions.table.base')}: ₹{auction.baseAmount.toLocaleString()}</div>
                    {auction.highestBidAmount && <div className="text-success fw-bold">{t('auctions.table.high')}: ₹{auction.highestBidAmount.toLocaleString()}</div>}
                  </td>
                  <td>{auction.winnerName || "-"}</td>
                  <td className="text-center">{getStatusBadge(auction.status)}</td>
                  <td className="text-end pe-4">
                    <div className="d-flex justify-content-end align-items-center gap-1">
                        {auction.status === 'InProgress' && (
                          <OverlayTrigger placement="top" overlay={<Tooltip>{t('auctions.tooltips.join')}</Tooltip>}>
                              <Button variant="success" size="sm" onClick={() => setActiveAuctionId(auction.auctionId)}><Gavel size={16} /></Button>
                          </OverlayTrigger>
                        )}
                        {isAdminOrAgent && (
                          <>
                            <OverlayTrigger placement="top" overlay={<Tooltip>{t('auctions.tooltips.edit')}</Tooltip>}>
                                <Button variant="light" size="sm" onClick={() => handleShowModal(auction)} disabled={auction.status === 'Completed'}><Edit2 size={18}/></Button>
                            </OverlayTrigger>
                            <OverlayTrigger placement="top" overlay={<Tooltip>{t('auctions.tooltips.delete')}</Tooltip>}>
                                <Button variant="light" size="sm" className="text-danger" onClick={() => handleDelete(auction.auctionId)}><Trash2 size={18}/></Button>
                            </OverlayTrigger>
                          </>
                        )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="text-center py-5 text-muted">{t('auctions.table.noAuctions')}</td></tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered backdrop="static">
        <Modal.Header closeButton><Modal.Title className="h5 fw-bold">{editingAuction ? t('auctions.modal.editTitle') : t('auctions.modal.scheduleTitle')}</Modal.Title></Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {!editingAuction && (
                <Row className="g-3 mb-3">
                    <Col md={12}>
                        <Form.Label className="small fw-bold">{t('auctions.modal.chitGroup')}</Form.Label>
                        <Form.Select value={formData.chitGroupId} onChange={handleGroupChange} required>
                            <option value="">{t('auctions.modal.selectGroup')}</option>
                            {chitGroups.map(g => <option key={g.chitGroupId} value={g.chitGroupId}>{g.groupName}</option>)}
                        </Form.Select>
                    </Col>
                    <Col md={6}><Form.Label className="small fw-bold">{t('auctions.modal.installment')}</Form.Label><Form.Control type="text" value={getCurrentInstallmentInfo()} readOnly disabled className="bg-light"/></Col>
                    <Col md={6}><Form.Label className="small fw-bold">{t('auctions.modal.baseAmount')}</Form.Label><Form.Control type="number" value={formData.baseAmount} onChange={e => setFormData({...formData, baseAmount: e.target.value})} required/></Col>
                </Row>
            )}
            <Row className="g-3">
                <Col md={6}><Form.Label className="small fw-bold">{t('auctions.modal.auctionDate')}</Form.Label><Form.Control type="datetime-local" value={formData.auctionDate} onChange={e => setFormData({...formData, auctionDate: e.target.value})} required/></Col>
                <Col md={6}>
                    <Form.Label className="small fw-bold">{t('auctions.modal.status')}</Form.Label>
                    <Form.Select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} disabled={!editingAuction}>
                        <option value="Scheduled">{t('auctions.status.scheduled')}</option>
                        <option value="InProgress">{t('auctions.status.inProgress')}</option>
                        <option value="Completed">{t('auctions.status.completed')}</option>
                        <option value="Cancelled">{t('auctions.status.cancelled')}</option>
                    </Form.Select>
                </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={handleCloseModal}>{t('auctions.modal.cancel')}</Button>
            <Button variant="primary" type="submit">{t('auctions.modal.save')}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Auctions;