import React from 'react';
import './ConversionFunnel.css';

function ConversionFunnel({ summary, conversions }) {
  const stages = [
    { label: 'Calls', value: summary.totalCalls, color: '#4F46E5' },
    { label: 'Appointments', value: summary.totalAppointments, color: '#10B981' },
    { label: 'Contracts', value: summary.totalContracts, color: '#F59E0B' },
    { label: 'Closings', value: summary.totalClosings, color: '#EF4444' }
  ];

  const maxValue = Math.max(...stages.map(s => s.value), 1);

  return (
    <div className="conversion-funnel">
      <h3>Conversion Funnel</h3>
      <div className="funnel-container">
        {stages.map((stage, index) => {
          const widthPercent = Math.max((stage.value / maxValue) * 100, 10);
          const conversionRate = index > 0 && stages[index - 1].value > 0
            ? ((stage.value / stages[index - 1].value) * 100).toFixed(1)
            : null;

          return (
            <div key={stage.label} className="funnel-stage">
              <div className="stage-label">
                <span className="stage-name">{stage.label}</span>
                <span className="stage-value">{stage.value}</span>
              </div>
              <div className="stage-bar-container">
                <div
                  className="stage-bar"
                  style={{
                    width: `${widthPercent}%`,
                    backgroundColor: stage.color
                  }}
                >
                  {stage.value > 0 && (
                    <span className="bar-label">{stage.value}</span>
                  )}
                </div>
              </div>
              {conversionRate && (
                <div className="conversion-arrow">
                  <span className="arrow">↓</span>
                  <span className="conversion-rate">{conversionRate}%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="funnel-summary">
        <div className="summary-item">
          <span className="summary-label">Overall Conversion</span>
          <span className="summary-value">{conversions.overallConversion}%</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Calls to Appointments</span>
          <span className="summary-value">{conversions.callsToAppointments}%</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Appointments to Contracts</span>
          <span className="summary-value">{conversions.appointmentsToContracts}%</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Contracts to Closings</span>
          <span className="summary-value">{conversions.contractsToClosings}%</span>
        </div>
      </div>
    </div>
  );
}

export default ConversionFunnel;
