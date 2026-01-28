import React, { useState, useEffect, useCallback } from 'react';
import './OutcomeManager.css';

const API_BASE = '';

function OutcomeManager() {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [completedOutcomes, setCompletedOutcomes] = useState([]);
  const [filteredCompleted, setFilteredCompleted] = useState([]);
  const [outcomeTypes, setOutcomeTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [days, setDays] = useState(30);
  const [saving, setSaving] = useState({});
  const [activeTab, setActiveTab] = useState('pending');
  const [editing, setEditing] = useState({});

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

  // Fetch completed outcomes (appointments with outcomes already set)
  const fetchCompletedOutcomes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/outcomes/appointments/completed?days=${days}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setCompletedOutcomes(data.appointments || []);
    } catch (err) {
      console.error('Error fetching completed outcomes:', err);
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

  const fetchAll = useCallback(() => {
    fetchPendingAppointments();
    fetchCompletedOutcomes();
    fetchStats();
  }, [fetchPendingAppointments, fetchCompletedOutcomes, fetchStats]);

  useEffect(() => {
    fetchOutcomeTypes();
    fetchAll();
    fetchUsers();
  }, [fetchOutcomeTypes, fetchAll, fetchUsers]);

  // Filter pending appointments when user selection changes
  useEffect(() => {
    if (selectedUser === 'all') {
      setFilteredAppointments(appointments);
    } else {
      const userId = parseInt(selectedUser);
      const filtered = appointments.filter(apt => {
        if (apt.createdById === userId) return true;
        if (apt.invitees && apt.invitees.some(inv => inv.userId === userId)) return true;
        return false;
      });
      setFilteredAppointments(filtered);
    }
  }, [appointments, selectedUser]);

  // Filter completed appointments when user selection changes
  useEffect(() => {
    if (selectedUser === 'all') {
      setFilteredCompleted(completedOutcomes);
    } else {
      const userId = parseInt(selectedUser);
      const filtered = completedOutcomes.filter(apt => {
        if (apt.createdById === userId) return true;
        if (apt.invitees && apt.invitees.some(inv => inv.userId === userId)) return true;
        return false;
      });
      setFilteredCompleted(filtered);
    }
  }, [completedOutcomes, selectedUser]);

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
        const data = await res.json();
        // Show sync status
        if (data.fubSynced) {
          console.log(`✅ Synced to FUB: appointment ${appointmentId}`);
        } else {
          console.warn(`⚠️ FUB sync failed: ${data.fubError}`);
          alert(`Outcome saved locally but FUB sync failed: ${data.fubError}`);
        }
        // Refresh both lists
        fetchAll();
        setEditing(prev => ({ ...prev, [appointmentId]: false }));
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
    if (apt.invitees && apt.invitees.length > 0) {
      const userInvitee = apt.invitees.find(i => i.userId);
      if (userInvitee) {
        const user = users.find(u => u.id === userInvitee.userId);
        return user ? user.name : 'Unknown';
      }
    }
    const user = users.find(u => u.id === apt.createdById);
    return user ? user.name : 'Unknown';
  };

  const renderOutcomeSelect = (apt, isCompleted = false) => {
    if (saving[apt.id]) {
      return <span className="saving">Saving...</span>;
    }

    if (isCompleted && !editing[apt.id]) {
      return (
        <div className="outcome-display">
          <span className={`outcome-badge ${getOutcomeClass(apt.outcomeName)}`}>
            {apt.outcomeName || apt.outcome || 'Unknown'}
          </span>
          <button
            className="edit-btn"
            onClick={() => setEditing(prev => ({ ...prev, [apt.id]: true }))}
            title="Change outcome"
          >
            ✏️
          </button>
        </div>
      );
    }

    return (
      <select
        defaultValue={isCompleted ? (apt.outcomeId || '') : ''}
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
    );
  };

  const getOutcomeClass = (outcomeName) => {
    if (!outcomeName) return '';
    const name = outcomeName.toLowerCase();
    if (name.includes('signed') || name.includes('converted')) return 'outcome-success';
    if (name.includes('likely') || name.includes('showed') || name.includes('rescheduled')) return 'outcome-nurture';
    if (name.includes('cancel') || name.includes('no show') || name.includes('no outcome') || name.includes('not signed') || name.includes('unlikely')) return 'outcome-failed';
    return '';
  };

  return (
    <div className="outcome-manager">
      <div className="outcome-manager-header">
        <h2>📋 Outcome Tracker</h2>
        <p className="subtitle">
          Update appointment outcomes — <strong>syncs directly to FUB</strong>
        </p>
      </div>

      {/* Stats Card */}
      {stats && (
        <div className="stats-card">
          <div className="stat">
            <span className="stat-value">{stats.total || 0}</span>
            <span className="stat-label">Outcomes Tracked</span>
          </div>
          <div className="stat">
            <span className="stat-value">{filteredAppointments.length}</span>
            <span className="stat-label">{selectedUser === 'all' ? 'Pending' : 'Your Pending'}</span>
          </div>
          <div className="stat">
            <span className="stat-value">{filteredCompleted.length}</span>
            <span className="stat-label">Completed</span>
          </div>
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
        <button onClick={fetchAll} disabled={loading}>
          {loading ? 'Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          ⏳ Pending ({filteredAppointments.length})
        </button>
        <button
          className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          ✅ Completed ({filteredCompleted.length})
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Pending Tab */}
      {activeTab === 'pending' && (
        loading ? (
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
                    <td className="date-cell">{formatDate(apt.start)}</td>
                    <td className="type-cell">{apt.type || 'General'}</td>
                    <td className="client-cell">{getPersonName(apt)}</td>
                    <td className="agent-cell">{getAgentName(apt)}</td>
                    <td className="outcome-cell">{renderOutcomeSelect(apt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Completed Tab */}
      {activeTab === 'completed' && (
        filteredCompleted.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <p>No completed outcomes in this time period.</p>
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
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompleted.map(apt => (
                  <tr key={apt.id}>
                    <td className="date-cell">{formatDate(apt.start)}</td>
                    <td className="type-cell">{apt.type || 'General'}</td>
                    <td className="client-cell">{getPersonName(apt)}</td>
                    <td className="agent-cell">{getAgentName(apt)}</td>
                    <td className="outcome-cell">{renderOutcomeSelect(apt, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <div className="info-footer">
        <p>
          💡 <strong>How it works:</strong> Outcomes set here sync directly to Follow Up Boss
          and are reflected in your dashboard analytics.
        </p>
      </div>
    </div>
  );
}

export default OutcomeManager;
