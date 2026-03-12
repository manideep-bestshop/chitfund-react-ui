import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Button, Modal, Form, Badge, Alert, Spinner, Tabs, Tab } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Edit2, MessageSquare, Info } from 'lucide-react';
import API_BASE_URL from '../config/api';

interface NotificationTemplate {
  templateId: string;
  templateName: string;
  messageContent: string;
  availableVariables: string;
}

const NotificationTemplates: React.FC = () => {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/NotificationTemplates`);
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      setAlert({ type: 'danger', message: t('notificationTemplates.alerts.loadError') });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setEditedContent(template.messageContent);
    setShowModal(true);
  };

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = editedContent.substring(0, start) + variable + editedContent.substring(end);
    setEditedContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/NotificationTemplates/${editingTemplate.templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageContent: editedContent })
      });
      if (!response.ok) throw new Error("Failed to save");
      setAlert({ type: 'success', message: t('notificationTemplates.alerts.saveSuccess', { name: editingTemplate.templateName }) });
      setShowModal(false);
      fetchTemplates(); 
    } catch (error) {
      setAlert({ type: 'danger', message: t('notificationTemplates.alerts.saveError') });
    } finally {
      setIsSaving(false);
    }
  };

  const getCategory = (name: string) => {
    if (name.includes('Payment') || name.includes('Reminder')) return 'payments';
    if (name.includes('Auction')) return 'auctions';
    if (name.includes('Request') || name.includes('Group')) return 'groups';
    if (name.includes('Member')) return 'members';
    return 'other';
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    const cat = getCategory(template.templateName);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(template);
    return acc;
  }, {} as Record<string, NotificationTemplate[]>);

  const categories = ['payments', 'auctions', 'groups', 'members', 'other'];

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '24px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">{t('notificationTemplates.title')}</h2>
          <p className="text-muted small mb-0">{t('notificationTemplates.subtitle')}</p>
        </div>
      </div>

      {alert && <Alert variant={alert.type} dismissible onClose={() => setAlert(null)} className="shadow-sm">{alert.message}</Alert>}

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-3">
          {loading ? (
            <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
          ) : (
            <Tabs defaultActiveKey="payments" className="mb-3 custom-tabs">
              {categories.map((category) => {
                const categoryTemplates = groupedTemplates[category] || [];
                if (categoryTemplates.length === 0) return null;
                return (
                  <Tab eventKey={category} title={t(`notificationTemplates.tabs.${category}`)} key={category}>
                    <Table responsive hover className="align-middle mb-0 mt-2 border">
                      <thead className="bg-light text-uppercase small text-muted">
                        <tr>
                          <th className="ps-4 py-3 border-0 fw-bold" style={{ width: '25%' }}>{t('notificationTemplates.table.name')}</th>
                          <th className="py-3 border-0 fw-bold" style={{ width: '60%' }}>{t('notificationTemplates.table.message')}</th>
                          <th className="py-3 border-0 fw-bold text-end pe-4" style={{ width: '15%' }}>{t('notificationTemplates.table.action')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryTemplates.map((template) => (
                          <tr key={template.templateId}>
                            <td className="ps-4 py-3 fw-semibold text-dark">
                              <div className="d-flex align-items-center">
                                <MessageSquare size={16} className="me-2 text-primary" />
                                {template.templateName.replace(/([A-Z])/g, ' $1').trim()}
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="text-muted small" style={{ whiteSpace: 'pre-wrap' }}>{template.messageContent}</div>
                            </td>
                            <td className="text-end pe-4 py-3">
                              <Button variant="outline-primary" size="sm" onClick={() => handleEditClick(template)}>
                                <Edit2 size={14} className="me-1" /> {t('notificationTemplates.table.edit')}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Tab>
                );
              })}
            </Tabs>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" backdrop="static" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold fs-5">{t('notificationTemplates.modal.editTitle')} <span className="text-primary">{editingTemplate?.templateName}</span></Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          <Alert variant="info" className="d-flex align-items-start py-2 px-3 small border-0 bg-light text-dark">
            <Info size={18} className="me-2 text-info mt-1 flex-shrink-0" />
            <div>
              <strong>{t('notificationTemplates.modal.proTip')}</strong> {t('notificationTemplates.modal.proTipDesc')}
            </div>
          </Alert>

          <Form.Group className="mb-3">
            <div className="mb-2 d-flex flex-wrap gap-1">
              <span className="text-muted small fw-bold me-2 mt-1">{t('notificationTemplates.modal.tags')}</span>
              {editingTemplate?.availableVariables.split(',').map((variable) => {
                const cleanVar = variable.trim();
                const tag = `{${cleanVar.replace(/[{}]/g, '')}}`;
                return (
                  <Badge key={cleanVar} bg="primary" className="text-white px-2 py-1 shadow-sm" style={{ cursor: 'pointer' }} onClick={() => insertVariable(tag)}>
                    + {cleanVar.replace(/[{}]/g, '')}
                  </Badge>
                );
              })}
            </div>

            <Form.Control as="textarea" ref={textareaRef} rows={8} value={editedContent} onChange={(e) => setEditedContent(e.target.value)} className="font-monospace shadow-none bg-white border" style={{ fontSize: '0.9rem' }} />
          </Form.Group>

          <div className="p-3 bg-light rounded border">
            <span className="text-muted small fw-bold text-uppercase mb-1 d-block">{t('notificationTemplates.modal.preview')}</span>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }} className="text-dark">{editedContent}</div>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 bg-white">
          <Button variant="light" onClick={() => setShowModal(false)}>{t('notificationTemplates.modal.cancel')}</Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Spinner size="sm" /> : t('notificationTemplates.modal.save')}
          </Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .custom-tabs .nav-link { color: #6c757d; font-weight: 500; border: none; border-bottom: 2px solid transparent; padding-bottom: 10px; }
        .custom-tabs .nav-link.active { color: #0d6efd; background-color: transparent; border-bottom: 2px solid #0d6efd; }
        .custom-tabs .nav-link:hover:not(.active) { border-bottom: 2px solid #dee2e6; }
      `}</style>
    </div>
  );
};

export default NotificationTemplates;