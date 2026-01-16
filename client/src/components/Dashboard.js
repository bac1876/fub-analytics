import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import OutcomeFunnel from './OutcomeFunnel';
import AgentComparison from './AgentComparison';
import './Dashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// Outcome colors - semantic meaning (handles both with and without "Met- " prefix)
const OUTCOME_COLORS = {
  // Successful outcomes (green shades)
  'Signed/Converted': '#10b981',
  'Met- Signed/Converted': '#10b981',
  'Writing Offer': '#22c55e',
  'Met- Writing Offer': '#22c55e',
  'Scholarship Accepted': '#06b6d4',
  'Met- Scholarship Accepted': '#06b6d4',
  // Nurture outcomes (blue/purple shades)
  'Likely Opportunity': '#3b82f6',
  'Met- Likely Opportunity': '#3b82f6',
  'Showed Homes': '#60a5fa',
  'Met- Showed Homes': '#60a5fa',
  'Rescheduled': '#a78bfa',
  // Failed outcomes (red/gray shades)
  'No Outcome': '#cbd5e1',
  'Unlikely Opportunity': '#fb923c',
  'Met- Unlikely Opportunity': '#fb923c',
  'Canceled/No Show': '#ef4444'
};

function Dashboard({ metrics, viewMode, selectedUser, users, dashboardType = 'sales' }) {
  if (!metrics) return null;

  const { summary, outcomeCategories, byType, byOutcome, byAgent } = metrics;

  // Get color for outcome
  const getOutcomeColor = (outcomeName, index) => {
    return OUTCOME_COLORS[outcomeName] || [
      '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1'
    ][index % 10];
  };

  // Sort outcomes by count descending
  const sortedOutcomes = Object.entries(byOutcome.counts)
    .sort(([, a], [, b]) => b - a);

  // Outcome Chart Data
  const outcomeChartData = {
    labels: sortedOutcomes.map(([name]) => name),
    datasets: [{
      data: sortedOutcomes.map(([, count]) => count),
      backgroundColor: sortedOutcomes.map(([name], i) => getOutcomeColor(name, i)),
      borderWidth: 0
    }]
  };

  // Type colors - different for ISA vs Sales
  const typeColors = dashboardType === 'isa'
    ? ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'] // Purple shades for ISA
    : ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']; // Original for Sales

  // Appointment Types Chart Data
  const typeChartData = {
    labels: Object.keys(byType.counts),
    datasets: [{
      data: Object.values(byType.counts),
      backgroundColor: typeColors.slice(0, Object.keys(byType.counts).length),
      borderWidth: 0
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

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

      {/* Charts Row */}
      <div className="charts-row">
        {/* Appointment Outcomes - Main Focus */}
        <div className="chart-container outcomes-chart">
          <h3>Appointment Outcomes</h3>
          {Object.keys(byOutcome.counts).length > 0 ? (
            <>
              <div className="chart-wrapper">
                <Doughnut data={outcomeChartData} options={chartOptions} />
              </div>
              <div className="chart-legend">
                {sortedOutcomes.map(([outcome, count], i) => (
                  <div key={outcome} className="legend-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: getOutcomeColor(outcome, i) }}
                    ></span>
                    <span className="legend-label">{outcome}</span>
                    <span className="legend-count">{count}</span>
                    <span className="legend-value">{byOutcome.percentages[outcome]}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="no-data">No outcome data available for {dashboardType === 'isa' ? 'ISA' : 'Sales'} appointments</div>
          )}
        </div>

        {/* Appointment Types */}
        <div className="chart-container">
          <h3>{dashboardType === 'isa' ? 'ISA Appointment Types' : 'Appointment Types'}</h3>
          {Object.keys(byType.counts).length > 0 ? (
            <>
              <div className="chart-wrapper">
                <Doughnut data={typeChartData} options={chartOptions} />
              </div>
              <div className="chart-legend">
                {Object.entries(byType.counts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count], i) => (
                    <div key={type} className="legend-item">
                      <span
                        className="legend-color"
                        style={{ backgroundColor: typeColors[i % typeColors.length] }}
                      ></span>
                      <span className="legend-label">{type}</span>
                      <span className="legend-count">{count}</span>
                      <span className="legend-value">{byType.percentages[type]}%</span>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div className="no-data">No {dashboardType === 'isa' ? 'ISA' : 'Sales'} appointment types found</div>
          )}
        </div>
      </div>

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
