import React from 'react';
import './OutcomeFunnel.css';

function OutcomeFunnel({ summary, outcomeCategories, byOutcome }) {
  const total = summary.totalAppointments;

  // Calculate cumulative values for funnel visualization
  const stages = [
    {
      label: 'Total Appointments',
      value: total,
      color: '#64748b',
      description: 'All appointments in period'
    },
    {
      label: 'Met with Client',
      value: total - (outcomeCategories?.incomplete || 0) - (outcomeCategories?.noOutcome || 0),
      color: '#3b82f6',
      description: 'Completed appointments'
    },
    {
      label: 'Positive Outcome',
      value: (outcomeCategories?.converted || 0) + (outcomeCategories?.positive || 0),
      color: '#10b981',
      description: 'Likely + Showed Homes + Converted'
    },
    {
      label: 'Signed/Converted',
      value: outcomeCategories?.converted || 0,
      color: '#059669',
      description: 'Writing Offer + Signed'
    }
  ];

  const maxValue = Math.max(...stages.map(s => s.value), 1);

  return (
    <div className="outcome-funnel">
      <div className="funnel-header">
        <h3>Appointment Outcome Funnel</h3>
        <div className="funnel-stats">
          <div className="stat">
            <span className="stat-label">Met Rate</span>
            <span className="stat-value">{summary.metRate}%</span>
          </div>
          <div className="stat">
            <span className="stat-label">Conversion Rate</span>
            <span className="stat-value">{summary.conversionRate}%</span>
          </div>
        </div>
      </div>

      <div className="funnel-container">
        {stages.map((stage, index) => {
          const widthPercent = Math.max((stage.value / maxValue) * 100, 15);
          const conversionFromPrev = index > 0 && stages[index - 1].value > 0
            ? ((stage.value / stages[index - 1].value) * 100).toFixed(0)
            : null;

          return (
            <div key={stage.label} className="funnel-stage">
              <div className="stage-info">
                <span className="stage-name">{stage.label}</span>
                <span className="stage-description">{stage.description}</span>
              </div>
              <div className="stage-bar-wrapper">
                <div
                  className="stage-bar"
                  style={{
                    width: `${widthPercent}%`,
                    backgroundColor: stage.color
                  }}
                >
                  <span className="bar-value">{stage.value}</span>
                </div>
                {conversionFromPrev && (
                  <div className="conversion-badge">
                    {conversionFromPrev}%
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Outcome Detail List */}
      <div className="outcome-detail-list">
        <h4>Individual Outcomes</h4>
        <div className="outcome-items">
          {Object.entries(byOutcome.counts)
            .sort(([, a], [, b]) => b - a)
            .map(([outcome, count]) => {
              const pct = byOutcome.percentages[outcome];
              const isPositive = outcome.includes('Signed') || outcome.includes('Writing') ||
                outcome.includes('Likely') || outcome.includes('Showed');
              const isNegative = outcome.includes('Canceled') || outcome.includes('No Show') ||
                outcome.includes('Unlikely');

              return (
                <div
                  key={outcome}
                  className={`outcome-item ${isPositive ? 'positive' : ''} ${isNegative ? 'negative' : ''}`}
                >
                  <span className="outcome-name">{outcome}</span>
                  <div className="outcome-stats">
                    <span className="outcome-count">{count}</span>
                    <span className="outcome-pct">{pct}%</span>
                  </div>
                  <div className="outcome-bar">
                    <div
                      className="outcome-bar-fill"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

export default OutcomeFunnel;
