import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Row, Col, Badge, ProgressBar, InputGroup, Spinner, Alert, Dropdown, OverlayTrigger, Tooltip } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import API_BASE_URL from '../config/api';
import { 
  Search, Plus, ArrowLeft, FileText, UserPlus, 
  Layers, Phone, User as UserIcon, Trash2, Info, CheckCircle, 
  AlertCircle, Clock, Filter, MapPin, Edit2, Power, MoreVertical
} from 'lucide-react';

const API_BASE = `${API_BASE_URL}/api`;

// --- Interfaces ---
interface ChitGroup {
  chitGroupId: string; groupName: string; groupCode: string; totalAmount: number; monthlyAmount: number;
  durationMonths: number; commissionPercentage: number; startDate: string; endDate: string; status: string;
  description?: string; memberCount: number; completedInstallments: number; isArchived: boolean;
}

interface Member {
  chitMemberId: string; chitGroupId: string; userId: string; joinDate: string; isActive: boolean;
  userName: string; groupName: string; userPhoneNumber?: string; userEmail?: string;
  isactive?: boolean; 
}

interface UserOption {
  userId: string; firstName: string; lastName: string; email: string;
}

const ChitManagement: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  
  // --- View & Data State ---
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedGroup, setSelectedGroup] = useState<ChitGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  
  const [showInactiveMembers, setShowInactiveMembers] = useState(true); 
  const [showInactiveGroups, setShowInactiveGroups] = useState(true);

  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);
  const [groupErrors, setGroupErrors] = useState<Record<string, string>>({});

  // --- Modal States ---
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ChitGroup | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  
  const [groupFormData, setGroupFormData] = useState({
    groupName: '', groupCode: '', totalAmount: '', monthlyAmount: '',
    durationMonths: '', commissionPercentage: '', startDate: '', description: ''
  });
  const [memberFormData, setMemberFormData] = useState({ userId: '' });

  // --- Init ---
  useEffect(() => {
    fetchGroups();
    fetchPendingCount();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (location.state && location.state.openCreateModal) {
      setViewMode('list');
      setEditingGroup(null);
      setGroupFormData({
        groupName: '', groupCode: '', totalAmount: '', monthlyAmount: '',
        durationMonths: '', commissionPercentage: '', startDate: '', description: ''
      });
      setShowGroupModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (selectedGroup && viewMode === 'detail') {
      fetchGroupMembers(selectedGroup.chitGroupId);
    }
  }, [selectedGroup, viewMode]);

  // --- API Calls ---
  const fetchGroups = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("jwtToken");
      const res = await axios.get(`${API_BASE}/ChitGroups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(res.data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const res = await axios.get(`${API_BASE}/chitmembers/group/${groupId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("jwtToken")}` }
      });
      setMembers(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/Users`);
      setAvailableUsers(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchPendingCount = async () => {
    try {
      const res = await axios.get(`${API_BASE}/GroupRequests/admin/pending`);
      setPendingCount(res.data.length);
    } catch (e) { console.error(e); }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Active': return 'primary';
      case 'Suspended': return 'warning';
      case 'Cancelled': return 'danger';
      case 'Completed': return 'success';
      default: return 'secondary';
    }
  };

  const handleCardClick = (group: ChitGroup) => {
    setSelectedGroup(group);
    setViewMode('detail');
    setSearchTerm('');
  };

  const toggleMemberStatus = async (memberId: string) => {
    try {
        await axios.put(`${API_BASE}/chitmembers/${memberId}/toggle-status`, {}, {
            headers: { Authorization: `Bearer ${localStorage.getItem("jwtToken")}` }
        });
        fetchGroupMembers(selectedGroup!.chitGroupId);
    } catch { setAlert({ type: 'danger', message: t('chitManagement.alerts.failed') }); }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm(t('chitManagement.alerts.removeMember'))) return;
    try {
        await axios.delete(`${API_BASE}/chitmembers/${memberId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("jwtToken")}` }
        });
        setAlert({ type: 'success', message: t('chitManagement.alerts.memberRemoved') });
        fetchGroupMembers(selectedGroup!.chitGroupId);
    } catch { setAlert({ type: 'danger', message: t('chitManagement.alerts.failed') }); }
  };

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("jwtToken");
    const payload = { ...groupFormData, 
        totalAmount: Number(groupFormData.totalAmount), monthlyAmount: Number(groupFormData.monthlyAmount),
        durationMonths: Number(groupFormData.durationMonths), commissionPercentage: Number(groupFormData.commissionPercentage)
    };

    try {
        if (editingGroup) {
            await axios.put(`${API_BASE}/ChitGroups/${editingGroup.chitGroupId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
            setAlert({ type: 'success', message: t('chitManagement.alerts.groupUpdated') });
        } else {
            const decoded = JSON.parse(atob(token!.split(".")[1]));
            await axios.post(`${API_BASE}/ChitGroups`, { createChitGroupDto: payload, creatorId: decoded.userId }, { headers: { Authorization: `Bearer ${token}` } });
            setAlert({ type: 'success', message: t('chitManagement.alerts.groupCreated') });
        }
        setShowGroupModal(false);
        fetchGroups();
    } catch { setAlert({ type: 'danger', message: t('chitManagement.alerts.failed') }); }
  };

  const openCreateGroupModal = () => {
    setEditingGroup(null);
    setGroupFormData({
        groupName: '', groupCode: '', totalAmount: '', monthlyAmount: '',
        durationMonths: '', commissionPercentage: '', startDate: '', description: ''
    });
    setShowGroupModal(true);
  };

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    try {
        await axios.delete(`${API_BASE}/ChitGroups/${groupToDelete}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("jwtToken")}` }
        });
        setAlert({ type: 'success', message: t('chitManagement.alerts.groupDeleted') });
        setShowDeleteGroupModal(false);
        fetchGroups();
    } catch { setAlert({ type: 'danger', message: t('chitManagement.alerts.failed') }); }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await axios.post(`${API_BASE}/chitmembers`, { chitGroupId: selectedGroup?.chitGroupId, userId: memberFormData.userId });
        setAlert({ type: 'success', message: t('chitManagement.alerts.memberEnrolled') });
        setShowMemberModal(false);
        fetchGroupMembers(selectedGroup!.chitGroupId);
    } catch { setAlert({ type: 'danger', message: t('chitManagement.alerts.failed') }); }
  };

  const getProgressDetails = (start: string, duration: number) => {
    if (!start) return { percentage: 0, elapsed: 0 };
    const startDate = new Date(start);
    const today = new Date();
    let months = (today.getFullYear() - startDate.getFullYear()) * 12 + (today.getMonth() - startDate.getMonth());
    const elapsed = Math.max(0, Math.min(months, duration));
    const percentage = Math.round((elapsed / duration) * 100);
    return { percentage, elapsed };
  };

  const displayedGroups = groups.filter(g => {
    const matchesSearch = g.groupName.toLowerCase().includes(searchTerm.toLowerCase()) || g.groupCode.toLowerCase().includes(searchTerm.toLowerCase());
    const isInactive = g.status === 'Cancelled' || g.status === 'Suspended';
    return matchesSearch && (showInactiveGroups || !isInactive);
  });

  const displayedMembers = members.filter(m => {
    const matchesSearch = m.userName?.toLowerCase().includes(searchTerm.toLowerCase());
    const statusValue = m.isActive !== undefined ? m.isActive : m.isactive;
    return matchesSearch && (showInactiveMembers || statusValue !== false);
  });

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
      
      {/* --- HEADER --- */}
      <div className="mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
            <div className="d-flex align-items-center gap-3">
                {viewMode === 'detail' && (
                    <Button variant="light" className="rounded-circle p-2 shadow-sm border" onClick={() => setViewMode('list')}>
                    <ArrowLeft size={20} />
                    </Button>
                )}
                <h2 className="fw-bold text-dark mb-0">{viewMode === 'list' ? t('chitManagement.title') : selectedGroup?.groupName}</h2>
            </div>

            <div className="d-flex gap-2 align-items-center flex-wrap">
                <Button variant="white" className="border shadow-sm position-relative bg-white text-nowrap px-3" onClick={() => navigate('/AdminRequestsPage')}>
                    <FileText size={18} className="me-2 text-primary"/> {t('chitManagement.requests')}
                    {pendingCount > 0 && <Badge bg="danger" className="position-absolute top-0 start-100 translate-middle rounded-circle p-1">{pendingCount}</Badge>}
                </Button>

                {viewMode === 'list' ? (
                    <>
                        <Form.Check type="switch" label={t('chitManagement.inactive')} checked={showInactiveGroups} onChange={() => setShowInactiveGroups(!showInactiveGroups)} className="ms-2 fw-bold text-secondary small" />
                        <Button variant="primary" className="shadow-sm px-4 text-nowrap fw-bold" onClick={openCreateGroupModal}><Plus size={18} className="me-1"/> {t('chitManagement.newGroup')}</Button>
                    </>
                ) : (
                    <>
                        <Form.Check type="switch" label={t('chitManagement.deactivated')} checked={showInactiveMembers} onChange={() => setShowInactiveMembers(!showInactiveMembers)} className="ms-2 fw-bold text-secondary small" />
                        <Button variant="success" className="shadow-sm px-4 text-nowrap fw-bold" onClick={() => setShowMemberModal(true)}><UserPlus size={18} className="me-1"/> {t('chitManagement.addMember')}</Button>
                    </>
                )}
            </div>
        </div>

        <InputGroup style={{ maxWidth: '400px' }}>
            <InputGroup.Text className="bg-white border-end-0 text-muted"><Search size={16}/></InputGroup.Text>
            <Form.Control placeholder={viewMode === 'list' ? t('chitManagement.searchGroups') : t('chitManagement.searchMembers')} className="border-x-0 shadow-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </InputGroup>
      </div>

      {alert && <Alert variant={alert.type} dismissible onClose={() => setAlert(null)} className="shadow-sm border-0">{alert.message}</Alert>}

      {/* --- CONTENT --- */}
      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
      ) : (
        <>
          {viewMode === 'list' ? (
            <Row className="g-4">
              {displayedGroups.map((group) => {
                const { percentage, elapsed } = getProgressDetails(group.startDate, group.durationMonths);
                const isGreyed = group.status === 'Cancelled' || group.status === 'Suspended';
                return (
                  <Col key={group.chitGroupId} xl={3} lg={4} md={6}>
                    <Card className={`chit-card h-100 ${isGreyed ? 'inactive-style' : ''}`} onClick={() => handleCardClick(group)}>
                      <Card.Body className="p-4">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div className="d-flex flex-column">
                            <h6 className="fw-bold mb-1 text-dark">{group.groupName}</h6>
                            <Badge bg={getStatusVariant(group.status)} className="rounded-pill px-2 py-1 fw-bold align-self-start" style={{fontSize: '0.6rem'}}>{group.status.toUpperCase()}</Badge>
                          </div>
                        </div>
                        <div className="chit-value mb-3">₹ {group.totalAmount.toLocaleString('en-IN')}</div>
                        
                        <Row className="mb-4">
                          <Col xs={6}><div className="label-text mb-1">{t('chitManagement.monthly')}</div><div className="data-text">₹ {group.monthlyAmount.toLocaleString('en-IN')}</div></Col>
                          <Col xs={6} className="text-end"><div className="label-text mb-1">{t('chitManagement.duration')}</div><div className="data-text">{group.durationMonths} Months</div></Col>
                        </Row>

                        <div className="mt-2">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="label-text" style={{fontSize: '0.6rem'}}>{t('chitManagement.timelineProgress')}</span>
                                <span className="small fw-bold text-primary">{percentage}%</span>
                            </div>
                            <ProgressBar now={percentage} variant={isGreyed ? "secondary" : "primary"} style={{height: '6px'}} className="rounded-pill bg-light" />
                            <div className="text-end mt-1" style={{fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8'}}>{elapsed} / {group.durationMonths} {t('chitManagement.monthsPassed')}</div>
                        </div>
                      </Card.Body>
                      <div className="bg-light p-2 text-center border-top small fw-bold text-secondary">{group.memberCount} {t('chitManagement.membersEnrolled')}</div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          ) : (
            <Card className="border-0 shadow-sm overflow-hidden" style={{ borderRadius: '15px' }}>
                <Table responsive hover className="align-middle mb-0">
                  <thead className="bg-light text-muted small text-uppercase">
                    <tr><th className="ps-4 py-3 border-0">{t('chitManagement.table.memberInfo')}</th><th className="py-3 border-0 text-center">{t('chitManagement.table.status')}</th><th className="py-3 border-0 text-end pe-4">{t('chitManagement.table.actions')}</th></tr>
                  </thead>
                  <tbody>
                    {displayedMembers.map(m => {
                      const isActive = m.isActive !== undefined ? m.isActive : m.isactive;
                      return (
                        <tr key={m.chitMemberId} className={!isActive ? 'inactive-style' : ''}>
                          <td className="ps-4">
                            <div className="d-flex align-items-center gap-3">
                              <div className={`rounded-circle p-2 ${isActive ? 'bg-primary bg-opacity-10 text-primary' : 'bg-secondary bg-opacity-10 text-secondary'}`} style={{width:40, height:40, textAlign:'center'}}>{m.userName.charAt(0)}</div>
                              <div><div className={`fw-bold ${isActive ? 'text-dark' : 'text-muted'}`}>{m.userName}</div><small className="text-muted">{m.userEmail}</small></div>
                            </div>
                          </td>
                          <td className="text-center">
                              <Badge bg={isActive ? 'success' : 'danger'} className="bg-opacity-10 text-reset fw-bold px-3 py-2 rounded-pill">
                                  {isActive ? t('chitManagement.table.active') : t('chitManagement.table.inactive')}
                              </Badge>
                          </td>
                          <td className="text-end pe-4">
                              <Button variant="light" size="sm" onClick={() => toggleMemberStatus(m.chitMemberId)} className={`border-0 me-2 ${isActive ? "text-warning" : "text-success"}`}><Power size={18} /></Button>
                              <Button variant="light" size="sm" onClick={() => handleDeleteMember(m.chitMemberId)} className="text-danger border-0"><Trash2 size={18} /></Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
            </Card>
          )}
        </>
      )}

      {/* --- GROUP MODAL --- */}
      <Modal show={showGroupModal} onHide={() => setShowGroupModal(false)} size="lg" centered backdrop="static">
        <Modal.Header closeButton className="border-0 px-4 pt-4"><Modal.Title className="fw-bold">{editingGroup ? t('chitManagement.modal.editGroup') : t('chitManagement.modal.createGroup')}</Modal.Title></Modal.Header>
        <Form onSubmit={handleGroupSubmit}>
          <Modal.Body className="px-4 pb-4">
            <Row className="g-4">
                <Col md={6}><Form.Label className="fw-bold">{t('chitManagement.modal.name')}</Form.Label><Form.Control value={groupFormData.groupName} maxLength={15} onChange={e => setGroupFormData({ ...groupFormData, groupName: e.target.value })} /></Col>
                <Col md={6}><Form.Label className="fw-bold">{t('chitManagement.modal.code')}</Form.Label><Form.Control value={groupFormData.groupCode} maxLength={15} onChange={e => setGroupFormData({ ...groupFormData, groupCode: e.target.value })} /></Col>
                <Col md={4}><Form.Label className="fw-bold">{t('chitManagement.modal.value')}</Form.Label><Form.Control type="number" value={groupFormData.totalAmount} onChange={e => setGroupFormData({ ...groupFormData, totalAmount: e.target.value })} /></Col>
                <Col md={4}><Form.Label className="fw-bold">{t('chitManagement.modal.monthly')}</Form.Label><Form.Control type="number" value={groupFormData.monthlyAmount} onChange={e => setGroupFormData({ ...groupFormData, monthlyAmount: e.target.value })} /></Col>
                <Col md={4}><Form.Label className="fw-bold">{t('chitManagement.modal.duration')}</Form.Label><Form.Control type="number" value={groupFormData.durationMonths} onChange={e => setGroupFormData({ ...groupFormData, durationMonths: e.target.value })} /></Col>
                <Col md={6}><Form.Label className="fw-bold">{t('chitManagement.modal.commission')}</Form.Label><Form.Control type="number" value={groupFormData.commissionPercentage} onChange={e => setGroupFormData({ ...groupFormData, commissionPercentage: e.target.value })} /></Col>
                <Col md={6}><Form.Label className="fw-bold">{t('chitManagement.modal.startDate')}</Form.Label><Form.Control type="date" value={groupFormData.startDate} onChange={e => setGroupFormData({ ...groupFormData, startDate: e.target.value })} /></Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-0 px-4 pb-4"><Button variant="light" onClick={() => setShowGroupModal(false)}>{t('chitManagement.modal.cancel')}</Button><Button variant="primary" type="submit">{t('chitManagement.modal.save')}</Button></Modal.Footer>
        </Form>
      </Modal>

      {/* --- ADD MEMBER MODAL --- */}
      <Modal show={showMemberModal} onHide={() => setShowMemberModal(false)} centered>
        <Modal.Header closeButton className="border-0 px-4 pt-4"><Modal.Title className="fw-bold">{t('chitManagement.modal.enrollMember')}</Modal.Title></Modal.Header>
        <Form onSubmit={handleAddMember}>
          <Modal.Body className="px-4 pb-4">
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">{t('chitManagement.modal.selectUser')}</Form.Label>
              <Form.Select value={memberFormData.userId} onChange={e => setMemberFormData({userId: e.target.value})} required>
                <option value="">{t('chitManagement.modal.chooseUser')}</option>
                {availableUsers.map(u => (<option key={u.userId} value={u.userId}>{u.firstName} {u.lastName}</option>))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="light" onClick={() => setShowMemberModal(false)}>{t('chitManagement.modal.cancel')}</Button>
            <Button variant="success" type="submit">{t('chitManagement.modal.addToGroup')}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default ChitManagement;