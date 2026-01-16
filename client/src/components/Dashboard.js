import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import OutcomeFunnel from './OutcomeFunnel';
import TypeOutcomeBreakdown from './TypeOutcomeBreakdown';
import AgentComparison from './AgentComparison';
import './Dashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

function Dashboard({ metrics, viewMode, selectedUser, users, dashboardType = 'sales' }) {
  if (!metrics) return null;

  const { summary, outcomeCategories, byOutcome, byTypeOutcome, byAgent } = metrics;

  // Dashboard theme based on type
  const dashboardTheme = dashboardType === 'isa' ? 'isa-theme' : 'sales-theme';

  return (
    <div className={`dashboard ${dashboardTheme}`}>
      {/* Summary Cards - Updated for new categories */}
      <div className="summary-cards">
        <div className="summary-card appointments">
          <div className="card-icon">📅</div>
          <div className="card-content">
            <h3>Total Appointments</h3>
            <div className="card-value">{summary.totalAppointments}</div>
          </div>
        </div>
        <div className="summary-card successful">
          <div className="card-icon">✅</div>
          <div className="card-content">
            <h3>Successful</h3>
            <div className="card-value">{outcomeCategories?.successful || 0}</div>
            <div className="card-subtitle">
              {summary.successRate}% rate
            </div>
          </div>
        </div>
        <div className="summary-card nurture">
          <div className="card-icon">🌱</div>
          <div className="card-content">
            <h3>Nurture</h3>
            <div className="card-value">{outcomeCategories?.nurture || 0}</div>
            <div className="card-subtitle">
              {summary.nurtureRate}% rate
            </div>
          </div>
        </div>
        <div className="summary-card failed">
          <div className="card-icon">❌</div>
          <div className="card-content">
            <h3>Failed/Dead</h3>
            <div className="card-value">{outcomeCategories?.failed || 0}</div>
            <div className="card-subtitle">
              {summary.failedRate}% rate
            </div>
          </div>
        </div>
      </div>

      {/* Outcome Funnel */}
      <OutcomeFunnel
        summary={summary}
        outcomeCategories={outcomeCategories}
        byOutcome={byOutcome}
        dashboardType={dashboardType}
      />

      {/* Outcomes by Appointment Type */}
      <TypeOutcomeBreakdown
        byTypeOutcome={byTypeOutcome}
        dashboardType={dashboardType}
      />

      {/* Outcome Breakdown Cards - Updated categories */}
      <div className="outcome-breakdown">
        <h3>Outcome Categories</h3>
        <div className="outcome-cards">
          <div className="outcome-card success">
            <div className="outcome-header">
              <span className="outcome-icon">🏆</span>
              <span className="outcome-title">Successful</span>
            </div>
            <div className="outcome-value">{outcomeCategories?.successful || 0}</div>
            <div className="outcome-detail">Signed/Converted, Writing Offer, Scholarship Accepted</div>
          </div>
          <div className="outcome-card nurture-card">
            <div className="outcome-header">
              <span className="outcome-icon">🌱</span>
              <span className="outcome-title">Nurture</span>
            </div>
            <div className="outcome-value">{outcomeCategories?.nurture || 0}</div>
            <div className="outcome-detail">Likely Opportunity, Showed Homes, Rescheduled</div>
          </div>
          <div className="outcome-card failed-card">
            <div className="outcome-header">
              <span className="outcome-icon">❌</span>
              <span className="outcome-title">Failed/Dead</span>
            </div>
            <div className="outcome-value">{outcomeCategories?.failed || 0}</div>
            <div className="outcome-detail">No Outcome, Unlikely Opportunity, Canceled/No Show</div>
          </div>
        </div>
      </div>

      {/* Agent Comparison (Team View) */}
      {viewMode === 'team' && Object.keys(byAgent).length > 0 && (
        <AgentComparison byAgent={byAgent} dashboardType={dashboardType} />
      )}

      {/* Date Range Info */}
      <div className="date-range-info">
        <p>
          {dashboardType === 'isa' ? 'ISA' : 'Sales'} data from {summary.dateRange.start} to {summary.dateRange.end}
        </p>
        <p className="generated-at">Generated at {new Date(metrics.generatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}

export default Dashboard;
