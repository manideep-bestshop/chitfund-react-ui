import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Form, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import API_BASE_URL from '../config/api';

export interface NotificationPreferences {
  MonthlyReminder: boolean;
  OverdueReminder: boolean;
  PaymentReceipt: boolean;
  AuctionStart: boolean;
  AuctionWinner: boolean;
}

interface NotificationSettingsProps {
  userId: string;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ userId }) => {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    MonthlyReminder: true,
    OverdueReminder: true,
    PaymentReceipt: true,
    AuctionStart: true,
    AuctionWinner: true,
  });
  
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const response = await axios.get<NotificationPreferences>(
          `${API_BASE_URL}/api/Users/${userId}/preferences`
        );
        if (response.data) {
          setPreferences(response.data);
        }
      } catch (error) {
        console.error("Failed to load preferences", error);
      }
    };
    if (userId) {
      fetchPrefs();
    }
  }, [userId]);

  const handleToggle = async (key: keyof NotificationPreferences) => {
    const updatedPrefs: NotificationPreferences = { ...preferences, [key]: !preferences[key] };
    setPreferences(updatedPrefs);
    
    setIsSaving(true);
    try {
     await axios.patch(
        `${API_BASE_URL}/api/Users/${userId}/preferences`, 
        updatedPrefs
      );
    } catch (error) {
      console.error("Failed to save preference", error);
      setPreferences(preferences); // Revert on failure
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mt-4">
      <Card className="shadow-sm mx-auto" style={{ maxWidth: '600px' }}>
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <Card.Title className="mb-0 fs-4 fw-bold">{t('notificationSettings.title')}</Card.Title>
            {isSaving && <Spinner animation="border" variant="primary" size="sm" />}
          </div>
          <Card.Text className="text-muted mb-4 pb-3 border-bottom">
            {t('notificationSettings.description')}
          </Card.Text>

          <div className="d-flex flex-column gap-4">
            <ToggleRow 
              id="MonthlyReminder"
              label={t('notificationSettings.monthly.label')} 
              description={t('notificationSettings.monthly.desc')}
              isChecked={preferences.MonthlyReminder} 
              onChange={() => handleToggle('MonthlyReminder')} 
            />
            <ToggleRow 
              id="OverdueReminder"
              label={t('notificationSettings.overdue.label')} 
              description={t('notificationSettings.overdue.desc')}
              isChecked={preferences.OverdueReminder} 
              onChange={() => handleToggle('OverdueReminder')} 
            />
            <ToggleRow 
              id="PaymentReceipt"
              label={t('notificationSettings.receipt.label')} 
              description={t('notificationSettings.receipt.desc')}
              isChecked={preferences.PaymentReceipt} 
              onChange={() => handleToggle('PaymentReceipt')} 
            />
            <ToggleRow 
              id="AuctionStart"
              label={t('notificationSettings.auctionStart.label')} 
              description={t('notificationSettings.auctionStart.desc')}
              isChecked={preferences.AuctionStart} 
              onChange={() => handleToggle('AuctionStart')} 
            />
            <ToggleRow 
              id="AuctionWinner"
              label={t('notificationSettings.auctionWinner.label')} 
              description={t('notificationSettings.auctionWinner.desc')}
              isChecked={preferences.AuctionWinner} 
              onChange={() => handleToggle('AuctionWinner')} 
            />
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

// Reusable Bootstrap Toggle Row
interface ToggleRowProps {
  id: string;
  label: string;
  description: string;
  isChecked: boolean;
  onChange: () => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ id, label, description, isChecked, onChange }) => (
  <div className="d-flex justify-content-between align-items-center">
    <div className="pe-3">
      <h6 className="mb-1 fw-semibold">{label}</h6>
      <small className="text-muted d-block" style={{ fontSize: '0.85rem' }}>{description}</small>
    </div>
    <div>
      <Form.Check 
        type="switch"
        id={`custom-switch-${id}`}
        checked={isChecked}
        onChange={onChange}
        style={{ transform: 'scale(1.3)' }} 
        className="m-0"
      />
    </div>
  </div>
);

export default NotificationSettings;