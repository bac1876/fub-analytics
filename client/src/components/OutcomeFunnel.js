import React from 'react';
import './OutcomeFunnel.css';

function OutcomeFunnel({ summary, outcomeCategories, byOutcome, dashboardType = 'sales' }) {
  const total = summary.totalAppointments;

  // Calculate cumulative values for funnel visualization (updated categories)
  const stages = [
    {
      label: 'Total Appointments',
      value: total,
      color: dashboardType === 'isa' ? '#8b5cf6' : '#64748b',
      description: `All ${dashboardType === 'isa' ? 'ISA' : 'sales'} appointments`
    },
    {
      label: 'Active Pipeline',
      value: (outcomeCategories?.successful || 0) + (outcomeCategories?.nurture || 0),
      color: '#3b82f6',
      description: `${outcomeCategories?.successful || 0} successful + ${outcomeCategories?.nurture || 0} nurture`
    },
    {
      label: 'Successful',
      value: outcomeCategories?.successful || 0,
      color: '#10b981',
      description: 'Signed/Converted, Writing Offer, Scholarship'
    }
  ];

  const maxValue = Math.max(...stages.map(s => s.value), 1);

  // Keywords for flexible outcome categorization (handles "Met- " prefix)
  const OUTCOME_KEYWORDS = {
    successful: ['signed', 'converted', 'writing offer', 'scholarship'],
    nurture: ['likely opportunity', 'showed homes', 'rescheduled'],
    failed: ['no outcome', 'unlikely opportunity', 'canceled', 'no show']
  };

  const getOutcomeCategory = (outcome) => {
    if (!outcome) return 'failed';
    const normalized = outcome.toLowerCase().trim();

    if (OUTCOME_KEYWORDS.successful.some(kw => normalized.includes(kw))) {
      return 'successful';
    }
    if (OUTCOME_KEYWORDS.nurture.some(kw => normalized.includes(kw))) {
      return 'nurture';
    }
    return 'failed';
  };

  return (
    <div className={`outcome-funnel ${dashboardType === 'isa' ? 'isa-theme' : ''}`}>
      <div className="funnel-header">
        <h3>{dashboardType === 'isa' ? 'ISA' : 'Sales'} Outcome Funnel</h3>
        <div className="funnel-stats">
          <div className="stat success-stat">
            <span className="stat-label">Success Rate</span>
            <span className="stat-value">{summary.successRate}%</span>
          </div>
          <div className="stat nurture-stat">
            <span className="stat-label">Nurture Rate</span>
            <span className="stat-value">{summary.nurtureRate}%</span>
          </div>
          <div className="stat failed-stat">
            <span className="stat-label">Failed Rate</span>
            <span className="stat-value">{summary.failedRate}%</span>
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

      {/* Outcome Detail List - Grouped by category */}
      <div className="outcome-detail-list">
        <h4>Individual Outcomes</h4>
        <div className="outcome-items">
          {Object.entries(byOutcome.counts)
            .sort(([a], [b]) => {
              // Sort by category, then by count
              const catA = getOutcomeCategory(a);
              const catB = getOutcomeCategory(b);
              const catOrder = { successful: 0, nurture: 1, failed: 2, other: 3 };
              if (catOrder[catA] !== catOrder[catB]) {
                return catOrder[catA] - catOrder[catB];
              }
              return byOutcome.counts[b] - byOutcome.counts[a];
            })
            .map(([outcome, count]) => {
              const pct = byOutcome.percentages[outcome];
              const category = getOutcomeCategory(outcome);

              return (
                <div
                  key={outcome}
                  className={`outcome-item ${category}`}
                >
                  <span className="outcome-name">{outcome}</span>
                  <div className="outcome-stats">
                    <span className="outcome-count">{count}</span>
                    <span className="outcome-pct">{pct}%</span>
                  </div>
                  <div className="outcome-bar">
                    <div
                      className={`outcome-bar-fill ${category}`}
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
