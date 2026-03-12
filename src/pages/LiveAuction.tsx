import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Form, ListGroup, Alert, Spinner, Badge, Row, Col } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Gavel, Clock, Trophy, User, X, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import API_BASE_URL from '../config/api';

// --- Interfaces ---
interface LiveAuctionProps {
  auctionId: string;
  initialAmount: number;
  groupName: string;
  chitGroupId: string;
  onClose: () => void;
}

interface BidLog {
  amount: number;
  bidderName: string;
  time: string;
}

const LiveAuction: React.FC<LiveAuctionProps> = ({
  auctionId,
  initialAmount,
  groupName,
  chitGroupId,
  onClose,
}) => {
  const { t } = useTranslation();
  
  // --- State ---
  const [currentBid, setCurrentBid] = useState(initialAmount);
  const [bidAmount, setBidAmount] = useState('');
  const [bidHistory, setBidHistory] = useState<BidLog[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [auctionClosed, setAuctionClosed] = useState(false);
  
  const historyEndRef = useRef<HTMLDivElement>(null);

  // --- Auth & Role Check ---
  const isAdmin = (() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return false;
    try {
      const u = JSON.parse(storedUser);
      const role = u.role || u.userRole;
      return role?.toLowerCase() === "admin";
    } catch { return false; }
  })();

  const [myName] = useState(() => {
    const stored = localStorage.getItem('user');
    if (!stored) return 'Guest';
    try {
      const p = JSON.parse(stored);
      return p.username || p.firstName || 'Member';
    } catch { return 'Member'; }
  });

  // --- Initial Load ---
  useEffect(() => {
    const fetchMemberId = async () => {
      try {
        const token = localStorage.getItem('jwtToken');
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/api/ChitMembers/my-id/${chitGroupId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMyMemberId(data.chitMemberId);
        }
      } catch (err) { console.error(err); }
    };
    if (chitGroupId) fetchMemberId();
  }, [chitGroupId]);

  // --- Polling ---
  useEffect(() => {
    const poll = async () => {
      try {
        const token = localStorage.getItem('jwtToken');
        const res = await fetch(`${API_BASE_URL}/api/Auctions/${auctionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          const displayAmount = data.highestBidAmount ?? data.baseAmount;
          const status = data.status ?? data.Status;
          const bids = data.bids ?? [];

          if (displayAmount !== undefined && Number(displayAmount) !== currentBid) {
             setCurrentBid(Number(displayAmount));
          }

          if (status === 'Completed' || status === 'Closed') setAuctionClosed(true);

          if (Array.isArray(bids)) {
            const mapped: BidLog[] = bids.map((b: any) => ({
              amount: b.amount,
              bidderName: b.bidderName || 'Unknown',
              time: b.bidTime ? new Date(b.bidTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''
            })).sort((a, b) => b.amount - a.amount);
            
            setBidHistory(mapped);
          }
        }
      } catch (err) { console.error(err); }
    };

    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [auctionId, currentBid]);

  // --- Actions ---
  const handlePlaceBid = async (customAmount?: number) => {
    if (auctionClosed) return;
    const amount = customAmount || Number(bidAmount);
    
    if (!amount || amount <= currentBid) {
      setErrorMsg(t('liveAuction.errorHigherBid', { amount: currentBid.toLocaleString() }));
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('jwtToken');
      const res = await fetch(`${API_BASE_URL}/api/Auctions/placebid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ auctionId, chitMemberId: myMemberId, amount })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Bid failed');
      }
      setBidAmount('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAuction = async () => {
    if (!window.confirm(t('liveAuction.confirmClose'))) return;
    try {
      const token = localStorage.getItem('jwtToken');
      await fetch(`${API_BASE_URL}/api/Auctions/${auctionId}/close`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setAuctionClosed(true);
    } catch { setErrorMsg('Error closing auction'); }
  };

  return (
    <Card className="shadow-lg border-0 overflow-hidden" style={{ minHeight: '600px' }}>
      
      {/* 1. Header Section */}
      <div className={`p-4 ${auctionClosed ? 'bg-secondary' : 'bg-primary'} text-white`}>
        <div className="d-flex justify-content-between align-items-start">
            <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                    <h4 className="fw-bold mb-0">{groupName}</h4>
                    {auctionClosed ? (
                        <Badge bg="dark">{t('liveAuction.closed')}</Badge>
                    ) : (
                        <Badge bg="danger" className="animate-pulse">{t('liveAuction.live')}</Badge>
                    )}
                </div>
                <div className="small opacity-75 d-flex align-items-center gap-1">
                    <User size={14}/> {myName}
                </div>
            </div>
            
            <Button variant="white" size="sm" className="bg-white bg-opacity-25 border-0 text-white" onClick={onClose}>
                <X size={20}/>
            </Button>
        </div>

        {/* Big Ticker */}
        <div className="text-center mt-4 mb-2">
            <div className="text-uppercase small fw-bold opacity-75 mb-1">{t('liveAuction.currentHighestBid')}</div>
            <div className="display-3 fw-bold">
                ₹{currentBid.toLocaleString()}
            </div>
            {bidHistory.length > 0 && (
                <div className="small opacity-75 mt-1">
                    {t('liveAuction.heldBy')} <span className="fw-bold border-bottom border-white">{bidHistory[0].bidderName}</span>
                </div>
            )}
        </div>
      </div>

      <Card.Body className="p-0 d-flex flex-column" style={{height: '400px'}}>
        
        {errorMsg && (
            <div className="p-3 pb-0">
                <Alert variant="danger" className="mb-0 d-flex align-items-center shadow-sm">
                    <AlertCircle size={18} className="me-2"/> {errorMsg}
                </Alert>
            </div>
        )}

        {/* 2. Main Layout */}
        <Row className="g-0 flex-grow-1 h-100">
            
            {/* Left: Feed */}
            <Col md={7} className="d-flex flex-column border-end bg-light">
                <div className="p-2 border-bottom bg-white d-flex align-items-center justify-content-between small text-muted">
                    <span className="fw-bold"><Clock size={14} className="me-1"/> {t('liveAuction.activityLog')}</span>
                    <span>{bidHistory.length} {t('liveAuction.bids')}</span>
                </div>
                
                <div className="flex-grow-1 overflow-auto p-3" style={{maxHeight: '400px'}}>
                    {bidHistory.length === 0 ? (
                        <div className="text-center text-muted mt-5 pt-5 opacity-50">
                            <Gavel size={48} className="mb-3"/>
                            <p>{t('liveAuction.noBidsTitle')}<br/>{t('liveAuction.noBidsSub')}</p>
                        </div>
                    ) : (
                        bidHistory.map((bid, i) => (
                            <div key={i} className="d-flex align-items-center mb-3">
                                <div className={`rounded-circle p-2 me-3 ${i === 0 ? 'bg-success text-white' : 'bg-white border text-muted'}`}>
                                    {i === 0 ? <Trophy size={18}/> : <Gavel size={16}/>}
                                </div>
                                <div className="flex-grow-1">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className={`fw-bold ${i === 0 ? 'text-success' : 'text-dark'}`}>{bid.bidderName}</span>
                                        <span className="small text-muted">{bid.time}</span>
                                    </div>
                                    <div className="small">
                                        {t('liveAuction.placedBidText')} <strong className="font-monospace">₹{bid.amount.toLocaleString()}</strong>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Col>

            {/* Right: Controls */}
            <Col md={5} className="bg-white p-4 d-flex flex-column justify-content-center">
                
                {!auctionClosed ? (
                    <>
                        <div className="text-center mb-4">
                            <h6 className="fw-bold text-dark mb-3">{t('liveAuction.placeYourBid')}</h6>
                            
                            <div className="d-flex gap-2 justify-content-center mb-3">
                                <Button variant="outline-primary" size="sm" onClick={() => handlePlaceBid(currentBid + 100)}>+ ₹100</Button>
                                <Button variant="outline-primary" size="sm" onClick={() => handlePlaceBid(currentBid + 500)}>+ ₹500</Button>
                            </div>

                            <Form.Group className="mb-3">
                                <Form.Control 
                                    size="lg" 
                                    type="number" 
                                    placeholder={t('liveAuction.customAmount')} 
                                    className="text-center fw-bold"
                                    value={bidAmount}
                                    onChange={e => setBidAmount(e.target.value)}
                                    disabled={loading || !myMemberId}
                                />
                            </Form.Group>

                            <Button variant="primary" size="lg" className="w-100 py-3 fw-bold" onClick={() => handlePlaceBid()} disabled={loading || !myMemberId}>
                                {loading ? <Spinner size="sm" className="me-2"/> : <TrendingUp size={20} className="me-2"/>}
                                {t('liveAuction.placeBidBtn')}
                            </Button>
                            
                            {!myMemberId && !isAdmin && (
                                <div className="text-danger small mt-2">{t('liveAuction.memberOnlyError')}</div>
                            )}
                        </div>

                        {isAdmin && (
                            <div className="mt-auto pt-3 border-top text-center">
                                <small className="text-muted d-block mb-2">{t('liveAuction.adminControls')}</small>
                                <Button variant="outline-danger" size="sm" className="w-100" onClick={handleCloseAuction}>
                                    <X size={16} className="me-1"/> {t('liveAuction.forceClose')}
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center">
                        <div className="bg-success bg-opacity-10 text-success p-4 rounded-circle d-inline-block mb-3">
                            <CheckCircle size={48} />
                        </div>
                        <h4 className="fw-bold text-success">{t('liveAuction.auctionClosedTitle')}</h4>
                        <p className="text-muted">{t('liveAuction.winnerDeclared')}</p>
                        <div className="p-3 bg-light rounded border mt-3">
                            <div className="small text-muted text-uppercase fw-bold">{t('liveAuction.winningBid')}</div>
                            <div className="fs-3 fw-bold text-dark">₹{currentBid.toLocaleString()}</div>
                            <div className="small text-primary mt-1">{bidHistory[0]?.bidderName}</div>
                        </div>
                    </div>
                )}

            </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default LiveAuction;