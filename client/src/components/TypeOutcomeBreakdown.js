import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import './TypeOutcomeBreakdown.css';

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

// Fallback colors
const FALLBACK_COLORS = [
  '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1'
];

function TypeOutcomeBreakdown({ byTypeOutcome, dashboardType = 'sales' }) {
  if (!byTypeOutcome || Object.keys(byTypeOutcome).length === 0) {
    return (
      <div className="type-outcome-breakdown">
        <h3>Outcomes by Appointment Type</h3>
        <div className="no-data">No appointment data available</div>
      </div>
    );
  }

  const getOutcomeColor = (outcomeName, index) => {
    return OUTCOME_COLORS[outcomeName] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
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
    },
    cutout: '60%'
  };

  // Sort types by total appointments descending
  const sortedTypes = Object.entries(byTypeOutcome)
    .sort(([, a], [, b]) => b.total - a.total);

  return (
    <div className={`type-outcome-breakdown ${dashboardType === 'isa' ? 'isa-theme' : ''}`}>
      <h3>Outcomes by Appointment Type</h3>
      <div className="type-cards-grid">
        {sortedTypes.map(([typeName, data]) => {
          // Sort outcomes by count descending
          const sortedOutcomes = Object.entries(data.counts)
            .sort(([, a], [, b]) => b - a);

          const chartData = {
            labels: sortedOutcomes.map(([name]) => name),
            datasets: [{
              data: sortedOutcomes.map(([, count]) => count),
              backgroundColor: sortedOutcomes.map(([name], i) => getOutcomeColor(name, i)),
              borderWidth: 0
            }]
          };

          // Calculate success rate for this type
          const successRate = data.total > 0
            ? ((data.outcomeCategories.successful / data.total) * 100).toFixed(0)
            : 0;

          return (
            <div key={typeName} className="type-card">
              <div className="type-card-header">
                <h4 className="type-name">{typeName}</h4>
                <div className="type-stats">
                  <span className="type-total">{data.total} appointments</span>
                  <span className="type-success-rate">{successRate}% success</span>
                </div>
              </div>

              <div className="type-card-content">
                <div className="mini-chart-wrapper">
                  <Doughnut data={chartData} options={chartOptions} />
                  <div className="chart-center-label">
                    <span className="center-value">{data.total}</span>
                    <span className="center-text">total</span>
                  </div>
                </div>

                <div className="outcome-legend">
                  {sortedOutcomes.map(([outcome, count], i) => (
                    <div key={outcome} className="legend-row">
                      <span
                        className="legend-dot"
                        style={{ backgroundColor: getOutcomeColor(outcome, i) }}
                      ></span>
                      <span className="legend-name">{outcome}</span>
                      <span className="legend-stats">
                        <span className="legend-count">{count}</span>
                        <span className="legend-pct">{data.percentages[outcome]}%</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category summary bar */}
              <div className="category-bar">
                <div
                  className="category-segment successful"
                  style={{ width: `${data.total > 0 ? (data.outcomeCategories.successful / data.total) * 100 : 0}%` }}
                  title={`Successful: ${data.outcomeCategories.successful}`}
                ></div>
                <div
                  className="category-segment nurture"
                  style={{ width: `${data.total > 0 ? (data.outcomeCategories.nurture / data.total) * 100 : 0}%` }}
                  title={`Nurture: ${data.outcomeCategories.nurture}`}
                ></div>
                <div
                  className="category-segment failed"
                  style={{ width: `${data.total > 0 ? (data.outcomeCategories.failed / data.total) * 100 : 0}%` }}
                  title={`Failed: ${data.outcomeCategories.failed}`}
                ></div>
              </div>
              <div className="category-labels">
                <span className="cat-label successful">✓ {data.outcomeCategories.successful}</span>
                <span className="cat-label nurture">↻ {data.outcomeCategories.nurture}</span>
                <span className="cat-label failed">✗ {data.outcomeCategories.failed}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TypeOutcomeBreakdown;
