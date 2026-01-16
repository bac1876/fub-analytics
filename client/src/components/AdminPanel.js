import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.css';

const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api/analytics' : 'http://localhost:5000/api/analytics');

function AdminPanel({ isOpen, onClose, users, onIsaUsersUpdated }) {
  const [isaUserIds, setIsaUserIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch current ISA users on mount
  useEffect(() => {
    if (isOpen) {
      fetchIsaUsers();
    }
  }, [isOpen]);

  const fetchIsaUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/isa-users`);
      setIsaUserIds(response.data.isaUserIds || []);
    } catch (err) {
      setError('Failed to load ISA users');
      console.error('Error fetching ISA users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUser = (userId) => {
    setIsaUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await axios.post(`${API_BASE}/isa-users`, { isaUserIds });
      setSuccessMessage('ISA users saved successfully!');
      if (onIsaUsersUpdated) {
        onIsaUsersUpdated(isaUserIds);
      }
    } catch (err) {
      setError('Failed to save ISA users');
      console.error('Error saving ISA users:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="admin-panel-overlay" onClick={onClose}>
      <div className="admin-panel" onClick={e => e.stopPropagation()}>
        <div className="admin-panel-header">
          <h2>Admin Settings</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="admin-panel-content">
          <section className="admin-section">
            <h3>ISA User Designation</h3>
            <p className="section-description">
              Select which users are Inside Sales Associates (ISA). ISA users will have their appointments tracked separately in the ISA Dashboard.
            </p>

            {error && <div className="admin-error">{error}</div>}
            {successMessage && <div className="admin-success">{successMessage}</div>}

            {loading ? (
              <div className="admin-loading">Loading users...</div>
            ) : (
              <div className="user-list">
                {users.map(user => (
                  <label key={user.id} className="user-checkbox">
                    <input
                      type="checkbox"
                      checked={isaUserIds.includes(user.id)}
                      onChange={() => handleToggleUser(user.id)}
                    />
                    <span className="user-info">
                      <span className="user-name">{user.name}</span>
                      {user.email && <span className="user-email">{user.email}</span>}
                    </span>
                    {isaUserIds.includes(user.id) && (
                      <span className="isa-badge">ISA</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="admin-panel-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
