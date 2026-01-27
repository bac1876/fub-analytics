import React, { useState, useEffect, useCallback } from 'react';
import './OutcomeManager.css';

// Don't use REACT_APP_API_URL - outcomes API is at /api/outcomes, not /api/analytics
const API_BASE = '';

function OutcomeManager() {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [outcomeTypes, setOutcomeTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [days, setDays] = useState(30);
  const [saving, setSaving] = useState({});

  // Fetch outcome types from FUB
  const fetchOutcomeTypes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/outcomes/types`);
      const data = await res.json();
      setOutcomeTypes(data);
    } catch (err) {
      console.error('Error fetching outcome types:', err);
    }
  }, []);

  // Fetch users for filter dropdown
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/analytics/users`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, []);

  // Fetch appointments needing outcomes
  const fetchPendingAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/api/outcomes/appointments/pending?days=${days}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setAppointments(data.appointments || []);
    } catch (err) {
      setError(`Failed to fetch appointments: ${err.message}`);
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/outcomes/stats`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchOutcomeTypes();
    fetchPendingAppointments();
    fetchStats();
    fetchUsers();
  }, [fetchOutcomeTypes, fetchPendingAppointments, fetchStats, fetchUsers]);

  // Filter appointments when user selection changes
  useEffect(() => {
    if (selectedUser === 'all') {
      setFilteredAppointments(appointments);
    } else {
      const userId = parseInt(selectedUser);
      const filtered = appointments.filter(apt => {
        // Check createdById
        if (apt.createdById === userId) return true;
        // Check invitees for userId
        if (apt.invitees && apt.invitees.some(inv => inv.userId === userId)) return true;
        return false;
      });
      setFilteredAppointments(filtered);
    }
  }, [appointments, selectedUser]);

  // Save outcome for an appointment
  const saveOutcome = async (appointmentId, outcomeId, outcomeName) => {
    setSaving(prev => ({ ...prev, [appointmentId]: true }));
    
    try {
      const res = await fetch(`${API_BASE}/api/outcomes/${appointmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcomeId, outcomeName })
      });

      if (res.ok) {
        // Remove from pending list
        setAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
        fetchStats();
      } else {
        alert('Failed to save outcome');
      }
    } catch (err) {
      console.error('Error saving outcome:', err);
      alert('Error saving outcome');
    } finally {
      setSaving(prev => ({ ...prev, [appointmentId]: false }));
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getPersonName = (apt) => {
    if (apt.invitees && apt.invitees.length > 0) {
      const person = apt.invitees.find(i => i.personId);
      if (person) return person.name || 'Unknown';
    }
    return apt.title || 'Unknown';
  };

  const getAgentName = (apt) => {
    // First check invitees for a user
    if (apt.invitees && apt.invitees.length > 0) {
      const userInvitee = apt.invitees.find(i => i.userId);
      if (userInvitee) {
        const user = users.find(u => u.id === userInvitee.userId);
        return user ? user.name : 'Unknown';
      }
    }
    // Fall back to createdById
    const user = users.find(u => u.id === apt.createdById);
    return user ? user.name : 'Unknown';
  };

  return (
    <div className="outcome-manager">
      <div className="outcome-manager-header">
        <h2>📋 Outcome Tracker</h2>
        <p className="subtitle">
          Update appointment outcomes here — <strong>no emails sent to clients!</strong>
        </p>
      </div>

      {/* Stats Card */}
      {stats && (
        <div className="stats-card">
          <div className="stat">
            <span className="stat-value">{stats.total || 0}</span>
            <span className="stat-label">Outcomes Tracked Locally</span>
          </div>
          <div className="stat">
            <span className="stat-value">{filteredAppointments.length}</span>
            <span className="stat-label">{selectedUser === 'all' ? 'Total Pending' : 'Your Pending'}</span>
          </div>
          {selectedUser !== 'all' && (
            <div className="stat">
              <span className="stat-value">{appointments.length}</span>
              <span className="stat-label">Team Total</span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <label>
          Agent:
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
            <option value="all">All Users</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Time period:
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        </label>
        <button onClick={fetchPendingAppointments} disabled={loading}>
          {loading ? 'Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Appointments List */}
      {loading ? (
        <div className="loading">Loading appointments...</div>
      ) : filteredAppointments.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">✅</span>
          <p>{selectedUser === 'all' ? 'All caught up! No pending appointments need outcomes.' : 'No pending appointments for this user.'}</p>
        </div>
      ) : (
        <div className="appointments-list">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Client</th>
                <th>Agent</th>
                <th>Set Outcome</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map(apt => (
                <tr key={apt.id}>
                  <td className="date-cell">
                    {formatDate(apt.start)}
                  </td>
                  <td className="type-cell">
                    {apt.type || 'Unknown'}
                  </td>
                  <td className="client-cell">
                    {getPersonName(apt)}
                  </td>
                  <td className="agent-cell">
                    {getAgentName(apt)}
                  </td>
                  <td className="outcome-cell">
                    {saving[apt.id] ? (
                      <span className="saving">Saving...</span>
                    ) : (
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const selected = outcomeTypes.find(o => o.id === Number(e.target.value));
                          if (selected) {
                            saveOutcome(apt.id, selected.id, selected.name);
                          }
                        }}
                      >
                        <option value="" disabled>Select outcome...</option>
                        {outcomeTypes.map(outcome => (
                          <option key={outcome.id} value={outcome.id}>
                            {outcome.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="info-footer">
        <p>
          💡 <strong>How it works:</strong> Outcomes set here are stored locally and used in your dashboard.
          FUB is never updated, so no confusing emails are sent to clients.
        </p>
      </div>
    </div>
  );
}

export default OutcomeManager;
