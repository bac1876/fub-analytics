import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import OutcomeFunnel from './OutcomeFunnel';
import AgentComparison from './AgentComparison';
import './Dashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// Outcome colors - semantic meaning
const OUTCOME_COLORS = {
  'Met- Signed/Converted': '#10b981',    // Green - Success
  'Met- Writing Offer': '#22c55e',       // Light Green - Near Success
  'Met- Likely Opportunity': '#3b82f6',  // Blue - Positive
  'Met- Showed Homes': '#60a5fa',        // Light Blue - Positive
  'Met- Nurture': '#f59e0b',             // Yellow - Nurture
  'Met- Unlikely Opportunity': '#fb923c', // Orange - Lower priority
  'Agent Incomplete': '#94a3b8',          // Gray - Incomplete
  'Rescheduled': '#a78bfa',               // Purple - Rescheduled
  'Canceled/No Show': '#ef4444',          // Red - Negative
  'Scholarship Accepted': '#06b6d4',      // Cyan - Special
  'No Outcome': '#cbd5e1'                 // Light Gray - No data
};

function Dashboard({ metrics, viewMode, selectedUser, users }) {
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

  // Type colors
  const typeColors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

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

  return (
    <div className="dashboard">
      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card appointments">
          <div className="card-icon">📅</div>
          <div className="card-content">
            <h3>Total Appointments</h3>
            <div className="card-value">{summary.totalAppointments}</div>
          </div>
        </div>
        <div className="summary-card converted">
          <div className="card-icon">✅</div>
          <div className="card-content">
            <h3>Signed/Converted</h3>
            <div className="card-value">{outcomeCategories?.converted || 0}</div>
          </div>
        </div>
        <div className="summary-card positive">
          <div className="card-icon">📈</div>
          <div className="card-content">
            <h3>Positive Outcomes</h3>
            <div className="card-value">{(outcomeCategories?.converted || 0) + (outcomeCategories?.positive || 0)}</div>
          </div>
        </div>
        <div className="summary-card rate">
          <div className="card-icon">🎯</div>
          <div className="card-content">
            <h3>Conversion Rate</h3>
            <div className="card-value">{summary.conversionRate}%</div>
          </div>
        </div>
      </div>

      {/* Outcome Funnel */}
      <OutcomeFunnel
        summary={summary}
        outcomeCategories={outcomeCategories}
        byOutcome={byOutcome}
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
            <div className="no-data">No outcome data available</div>
          )}
        </div>

        {/* Appointment Types */}
        <div className="chart-container">
          <h3>Appointments by Type</h3>
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
            <div className="no-data">No appointment type data available</div>
          )}
        </div>
      </div>

      {/* Outcome Breakdown Cards */}
      <div className="outcome-breakdown">
        <h3>Outcome Categories</h3>
        <div className="outcome-cards">
          <div className="outcome-card success">
            <div className="outcome-header">
              <span className="outcome-icon">🏆</span>
              <span className="outcome-title">Converted</span>
            </div>
            <div className="outcome-value">{outcomeCategories?.converted || 0}</div>
            <div className="outcome-detail">Signed/Converted + Writing Offer</div>
          </div>
          <div className="outcome-card positive">
            <div className="outcome-header">
              <span className="outcome-icon">👍</span>
              <span className="outcome-title">Positive</span>
            </div>
            <div className="outcome-value">{outcomeCategories?.positive || 0}</div>
            <div className="outcome-detail">Likely Opportunity + Showed Homes</div>
          </div>
          <div className="outcome-card nurture">
            <div className="outcome-header">
              <span className="outcome-icon">🌱</span>
              <span className="outcome-title">Nurture</span>
            </div>
            <div className="outcome-value">{outcomeCategories?.nurture || 0}</div>
            <div className="outcome-detail">Nurture + Unlikely Opportunity</div>
          </div>
          <div className="outcome-card incomplete">
            <div className="outcome-header">
              <span className="outcome-icon">⏸️</span>
              <span className="outcome-title">Incomplete</span>
            </div>
            <div className="outcome-value">{outcomeCategories?.incomplete || 0}</div>
            <div className="outcome-detail">Incomplete + Rescheduled + No Show</div>
          </div>
        </div>
      </div>

      {/* Agent Comparison (Team View) */}
      {viewMode === 'team' && Object.keys(byAgent).length > 0 && (
        <AgentComparison byAgent={byAgent} />
      )}

      {/* Date Range Info */}
      <div className="date-range-info">
        <p>Data from {summary.dateRange.start} to {summary.dateRange.end}</p>
        <p className="generated-at">Generated at {new Date(metrics.generatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}

export default Dashboard;
