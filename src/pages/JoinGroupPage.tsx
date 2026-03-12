import React, { useState, useEffect } from 'react';
import { Search, Filter, Clock, Users, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { useTranslation } from 'react-i18next';
import API_CONFIG from '../config/api';

const API_BASE_URL = `${API_CONFIG}/api/GroupRequests`;

interface JwtPayload {
  exp: number;
  email?: string;
  userId?: string;
  sub?: string;
}

interface GroupAvailability {
  chitGroupId: string;
  groupName: string;
  totalAmount: number;
  monthlyAmount: number;
  durationMonths: number;
  startDate: string;
  status: string;
  currentMembers: number;
}

interface UserRequest {
  requestId: string;
  groupName: string;
  monthlyAmount: number;
  requestDate: string;
  status: string;
}

const JoinGroupPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'available' | 'requests'>('available');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupAvailability | null>(null);
  
  const [availableGroups, setAvailableGroups] = useState<GroupAvailability[]>([]);
  const [myRequests, setMyRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      alert(t('joinGroup.alerts.loginRequired'));
      navigate("/login");
      return;
    }
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const extractedId = decoded.userId || decoded.sub;
      if (extractedId) setUserId(extractedId);
    } catch (error) {
      navigate("/login");
    }
  }, [navigate, t]);

  useEffect(() => {
    if (userId) {
      fetchAvailableGroups();
      fetchMyRequests();
    }
  }, [userId]);

  const fetchAvailableGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/available?userId=${userId}`);
      setAvailableGroups(response.data);
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRequests = async () => {
    if (!userId) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/my-requests?userId=${userId}`);
      setMyRequests(response.data);
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  };

  const handleConfirmJoin = async () => {
    if (!selectedGroup || !userId) return;
    try {
      await axios.post(API_BASE_URL, {
        chitGroupId: selectedGroup.chitGroupId,
        userId: userId
      });
      alert(t('joinGroup.alerts.success'));
      setShowModal(false);
      setActiveTab('requests');
      fetchMyRequests();
      fetchAvailableGroups();
    } catch (error: any) {
      const msg = error.response?.data?.message || t('joinGroup.alerts.failed');
      alert(msg);
    }
  };

  const filteredGroups = availableGroups.filter(group => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return group.groupName.toLowerCase().includes(term) || 
           group.totalAmount.toString().includes(term) || 
           group.monthlyAmount.toString().includes(term);
  });

  return (
    <div style={styles.pageWrapper}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.headerTitle}>{t('joinGroup.title')}</h1>
          <div style={styles.iconButton}>
            <Filter size={20} color="#475569" />
          </div>
        </div>
      </header>

      <main style={styles.mainContainer}>
        <div style={styles.tabContainer}>
          <button 
            onClick={() => setActiveTab('available')}
            style={activeTab === 'available' ? styles.tabActive : styles.tabInactive}
          >
            {t('joinGroup.availableTab')}
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            style={activeTab === 'requests' ? styles.tabActive : styles.tabInactive}
          >
            {t('joinGroup.requestsTab')}
          </button>
        </div>

        {loading && <div style={{textAlign: 'center', padding: '20px'}}>{t('joinGroup.loading')}</div>}

        {!loading && activeTab === 'available' && (
          <div style={styles.listContainer}>
            <div style={styles.searchWrapper}>
              <Search style={styles.searchIcon} size={18} />
              <input 
                type="text" 
                placeholder={t('joinGroup.searchPlaceholder')}
                style={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {filteredGroups.length > 0 ? (
              filteredGroups.map((group) => (
                <div key={group.chitGroupId} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.groupName}>{group.groupName}</h3>
                      <span style={styles.badge}>{t('joinGroup.starts')} {new Date(group.startDate).toLocaleDateString()}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={styles.label}>{t('joinGroup.totalValue')}</div>
                      <div style={styles.highlightValue}>₹{group.totalAmount.toLocaleString()}</div>
                    </div>
                  </div>

                  <div style={styles.infoGrid}>
                    <div style={styles.infoBox}>
                      <div style={styles.label}>{t('joinGroup.monthly')}</div>
                      <div style={styles.infoValue}>₹{group.monthlyAmount.toLocaleString()}</div>
                    </div>
                    <div style={styles.infoBox}>
                      <div style={styles.label}>{t('joinGroup.duration')}</div>
                      <div style={styles.infoValue}>{group.durationMonths} {t('joinGroup.months')}</div>
                    </div>
                  </div>

                  <div style={styles.cardFooter}>
                    <div style={styles.memberCount}>
                      <Users size={16} style={{ marginRight: '4px' }} />
                      <span>{group.currentMembers} / {group.durationMonths} {t('joinGroup.filled')}</span>
                    </div>
                    
                    {group.currentMembers >= group.durationMonths ? (
                        <button disabled style={styles.buttonDisabled}>
                          {t('joinGroup.groupFull')}
                        </button>
                    ) : (
                      <button 
                        onClick={() => { setSelectedGroup(group); setShowModal(true); }}
                        style={styles.buttonPrimary}
                      >
                        {t('joinGroup.requestBtn')} <ChevronRight size={16} style={{ marginLeft: '4px' }} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={styles.emptyState}>{t('joinGroup.noGroupsFound', { term: searchTerm })}</div>
            )}
          </div>
        )}

        {!loading && activeTab === 'requests' && (
          <div style={styles.listContainer}>
            {myRequests.map((req) => (
              <div key={req.requestId} style={{ ...styles.card, ...styles.flexBetween }}>
                <div>
                  <h3 style={styles.groupName}>{req.groupName}</h3>
                  <div style={styles.subText}>₹{req.monthlyAmount.toLocaleString()} / {t('joinGroup.monthShort')}</div>
                  <div style={styles.tinyText}>{t('joinGroup.requestedOn')} {new Date(req.requestDate).toLocaleDateString()}</div>
                </div>
                <div>
                  {req.status === 'Pending' && (
                    <span style={{ ...styles.statusBadge, backgroundColor: '#FEF9C3', color: '#854D0E' }}>
                      <Clock size={12} style={{ marginRight: '4px' }} /> {t('joinGroup.status.pending')}
                    </span>
                  )}
                  {req.status === 'Rejected' && (
                    <span style={{ ...styles.statusBadge, backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                      <AlertCircle size={12} style={{ marginRight: '4px' }} /> {t('joinGroup.status.rejected')}
                    </span>
                  )}
                  {req.status === 'Approved' && (
                    <span style={{ ...styles.statusBadge, backgroundColor: '#DCFCE7', color: '#166534' }}>
                      <CheckCircle size={12} style={{ marginRight: '4px' }} /> {t('joinGroup.status.approved')}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {myRequests.length === 0 && <div style={styles.emptyState}>{t('joinGroup.noRequests')}</div>}
          </div>
        )}
      </main>

      {showModal && selectedGroup && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>{t('joinGroup.modal.title')}</h3>
            <p style={styles.modalText}>
              {t('joinGroup.modal.body')} <strong>{selectedGroup.groupName}</strong>.
            </p>
            <div style={styles.modalSummaryBox}>
              <div style={styles.flexBetween}>
                <span style={styles.label}>{t('joinGroup.modal.commitment')}</span>
                <span style={styles.boldText}>₹{selectedGroup.monthlyAmount}/{t('joinGroup.monthShort')}</span>
              </div>
              <div style={{...styles.flexBetween, marginTop: '8px'}}>
                <span style={styles.label}>{t('joinGroup.modal.duration')}</span>
                <span style={styles.boldText}>{selectedGroup.durationMonths} {t('joinGroup.months')}</span>
              </div>
            </div>
            <p style={styles.disclaimerText}>{t('joinGroup.modal.disclaimer')}</p>
            <div style={styles.modalActions}>
              <button onClick={() => setShowModal(false)} style={styles.buttonOutline}>{t('joinGroup.modal.cancel')}</button>
              <button onClick={handleConfirmJoin} style={styles.buttonPrimaryFull}>{t('joinGroup.modal.confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  pageWrapper: { backgroundColor: '#f9fafb', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', color: '#1e293b' },
  header: { backgroundColor: '#ffffff', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', position: 'sticky', top: 0, zIndex: 10, padding: '16px' },
  headerContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '672px', margin: '0 auto' },
  headerTitle: { fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: 0 },
  iconButton: { backgroundColor: '#f1f5f9', padding: '8px', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  mainContainer: { maxWidth: '672px', margin: '0 auto', padding: '16px', paddingBottom: '80px' },
  tabContainer: { display: 'flex', backgroundColor: '#ffffff', padding: '4px', borderRadius: '8px', marginBottom: '24px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
  tabActive: { flex: 1, padding: '8px 16px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 500, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' },
  tabInactive: { flex: 1, padding: '8px 16px', backgroundColor: 'transparent', color: '#64748b', border: 'none', borderRadius: '6px', fontWeight: 500, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' },
  listContainer: { display: 'flex', flexDirection: 'column', gap: '16px' },
  searchWrapper: { position: 'relative', marginBottom: '16px' },
  searchIcon: { position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' },
  searchInput: { width: '100%', padding: '10px 16px 10px 40px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  card: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
  groupName: { fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' },
  badge: { fontSize: '12px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', display: 'inline-block' },
  label: { fontSize: '12px', color: '#64748b', marginBottom: '4px' },
  highlightValue: { fontSize: '18px', fontWeight: 'bold', color: '#2563eb' },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  infoBox: { backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px' },
  infoValue: { fontWeight: 600, color: '#1e293b' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f1f5f9' },
  memberCount: { display: 'flex', alignItems: 'center', fontSize: '14px', color: '#475569' },
  buttonPrimary: { display: 'flex', alignItems: 'center', padding: '8px 16px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 500, fontSize: '14px', cursor: 'pointer' },
  buttonPrimaryFull: { width: '100%', padding: '10px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 500, fontSize: '14px', cursor: 'pointer' },
  buttonDisabled: { padding: '8px 16px', backgroundColor: '#e2e8f0', color: '#94a3b8', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'not-allowed' },
  flexBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  subText: { fontSize: '14px', color: '#64748b', marginTop: '4px' },
  tinyText: { fontSize: '12px', color: '#94a3b8', marginTop: '4px' },
  statusBadge: { display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 500 },
  emptyState: { textAlign: 'center', padding: '40px', color: '#94a3b8' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' },
  modalContent: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '350px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' },
  modalTitle: { fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', marginTop: 0 },
  modalText: { color: '#475569', fontSize: '14px', marginBottom: '16px' },
  modalSummaryBox: { backgroundColor: '#eff6ff', padding: '16px', borderRadius: '8px', marginBottom: '16px' },
  boldText: { fontWeight: 'bold' },
  disclaimerText: { fontSize: '12px', color: '#94a3b8', marginBottom: '24px' },
  modalActions: { display: 'flex', gap: '12px' },
  buttonOutline: { flex: 1, padding: '10px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' },
};

export default JoinGroupPage;