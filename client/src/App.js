import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import DateRangePicker from './components/DateRangePicker';
import AgentSelector from './components/AgentSelector';
import AdminPanel from './components/AdminPanel';
import './App.css';

const API_BASE = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api/analytics' : 'http://localhost:5000/api/analytics');

function App() {
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [isToggling, setIsToggling] = useState(false);
  const toggleRef = useRef(null);
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [viewMode, setViewMode] = useState('team'); // 'team' or 'personal'
  const [dashboardType, setDashboardType] = useState('sales'); // 'sales' or 'isa'
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        start: dateRange.start,
        end: dateRange.end,
        dashboardType: dashboardType
      });
      if (selectedUser) {
        params.append('userId', selectedUser);
      }
      const response = await axios.get(`${API_BASE}/metrics?${params}`);
      setMetrics(response.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch metrics');
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedUser, dashboardType]);

  // Fetch users on mount
  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await axios.get(`${API_BASE}/users`);
        setUsers(response.data);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    }
    fetchUsers();
  }, []);

  // Fetch metrics when date range, user, or dashboard type changes
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  // Handle date range change
  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
  };

  // Handle user selection
  const handleUserSelect = (userId) => {
    setSelectedUser(userId);
    setViewMode(userId ? 'personal' : 'team');
  };

  // Toggle view mode
  const toggleViewMode = () => {
    if (viewMode === 'team') {
      // If no user selected, select first user
      if (users.length > 0 && !selectedUser) {
        setSelectedUser(users[0].id);
      }
      setViewMode('personal');
    } else {
      setSelectedUser(null);
      setViewMode('team');
    }
  };

  // Toggle dashboard type
  const toggleDashboardType = () => {
    setDashboardType(prev => prev === 'sales' ? 'isa' : 'sales');
    setSelectedUser(null);
    setViewMode('team');
  };

  // Toggle dark mode with animation
  const toggleDarkMode = () => {
    if (isToggling) return;

    setIsToggling(true);

    // Create ripple effect from toggle button
    if (toggleRef.current) {
      const rect = toggleRef.current.getBoundingClientRect();
      const ripple = document.createElement('div');
      ripple.className = 'theme-ripple';
      ripple.style.left = `${rect.left + rect.width / 2}px`;
      ripple.style.top = `${rect.top + rect.height / 2}px`;
      ripple.style.background = darkMode
        ? 'radial-gradient(circle, rgba(248,250,252,0.3) 0%, transparent 70%)'
        : 'radial-gradient(circle, rgba(15,23,42,0.3) 0%, transparent 70%)';
      document.body.appendChild(ripple);

      setTimeout(() => ripple.remove(), 800);
    }

    setTimeout(() => {
      setDarkMode(prev => {
        const newValue = !prev;
        localStorage.setItem('darkMode', JSON.stringify(newValue));
        return newValue;
      });
      setIsToggling(false);
    }, 150);
  };

  // Apply dark mode class to body
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  // Handle ISA users updated
  const handleIsaUsersUpdated = () => {
    fetchMetrics();
  };

  return (
    <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
      <header className="app-header">
        <div className="header-left">
          <h1>FUB Analytics</h1>
          <span className="subtitle">
            {dashboardType === 'sales' ? 'Sales Team Dashboard' : 'ISA Dashboard'}
          </span>
        </div>
        <div className="header-right">
          <div className="dashboard-switcher">
            <button
              className={`dashboard-tab ${dashboardType === 'sales' ? 'active' : ''}`}
              onClick={() => dashboardType !== 'sales' && toggleDashboardType()}
            >
              Sales
            </button>
            <button
              className={`dashboard-tab ${dashboardType === 'isa' ? 'active' : ''}`}
              onClick={() => dashboardType !== 'isa' && toggleDashboardType()}
            >
              ISA
            </button>
          </div>
          <button
            className={`view-toggle ${viewMode}`}
            onClick={toggleViewMode}
          >
            {viewMode === 'team' ? 'Team View' : 'Personal View'}
          </button>
          <button
            className="admin-btn"
            onClick={() => setAdminPanelOpen(true)}
            title="Admin Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
          </button>
          <button
            ref={toggleRef}
            className={`dark-mode-toggle ${isToggling ? 'toggling' : ''} ${darkMode ? 'dark' : 'light'}`}
            onClick={toggleDarkMode}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <span className="toggle-icon sun">☀️</span>
            <span className="toggle-icon moon">🌙</span>
            <span className="toggle-glow"></span>
          </button>
          {lastUpdated && (
            <span className="last-updated">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button className="refresh-btn" onClick={fetchMetrics} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </header>

      <div className="controls">
        <DateRangePicker
          dateRange={dateRange}
          onChange={handleDateRangeChange}
        />
        <AgentSelector
          users={users}
          selectedUser={selectedUser}
          onSelect={handleUserSelect}
        />
      </div>

      {error && (
        <div className="error-banner">
          <span>Error: {error}</span>
          <button onClick={fetchMetrics}>Retry</button>
        </div>
      )}

      {loading && !metrics ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading metrics from Follow Up Boss...</p>
        </div>
      ) : metrics ? (
        <Dashboard
          metrics={metrics}
          viewMode={viewMode}
          selectedUser={selectedUser}
          users={users}
          dashboardType={dashboardType}
        />
      ) : null}

      <AdminPanel
        isOpen={adminPanelOpen}
        onClose={() => setAdminPanelOpen(false)}
        users={users}
        onIsaUsersUpdated={handleIsaUsersUpdated}
      />
    </div>
  );
}

export default App;
