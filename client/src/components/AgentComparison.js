import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import './AgentComparison.css';

function AgentComparison({ byAgent }) {
  const [sortBy, setSortBy] = useState('total');
  const [expandedAgent, setExpandedAgent] = useState(null);

  const agents = Object.entries(byAgent).map(([name, data]) => {
    // Calculate outcome-based metrics
    const converted = (data.byOutcome?.['Met- Signed/Converted'] || 0) +
                      (data.byOutcome?.['Met- Writing Offer'] || 0);
    const positive = (data.byOutcome?.['Met- Likely Opportunity'] || 0) +
                     (data.byOutcome?.['Met- Showed Homes'] || 0);
    const nurture = (data.byOutcome?.['Met- Nurture'] || 0) +
                    (data.byOutcome?.['Met- Unlikely Opportunity'] || 0);
    const incomplete = (data.byOutcome?.['Agent Incomplete'] || 0) +
                       (data.byOutcome?.['Rescheduled'] || 0) +
                       (data.byOutcome?.['Canceled/No Show'] || 0);

    const conversionRate = data.total > 0 ? ((converted / data.total) * 100).toFixed(1) : 0;
    const positiveRate = data.total > 0 ? (((converted + positive) / data.total) * 100).toFixed(1) : 0;

    return {
      name,
      ...data,
      converted,
      positive,
      nurture,
      incomplete,
      conversionRate,
      positiveRate
    };
  });

  // Sort agents
  const sortedAgents = [...agents].sort((a, b) => {
    switch (sortBy) {
      case 'total': return b.total - a.total;
      case 'converted': return b.converted - a.converted;
      case 'positive': return b.positive - a.positive;
      case 'conversion': return b.conversionRate - a.conversionRate;
      case 'positiveRate': return b.positiveRate - a.positiveRate;
      default: return 0;
    }
  });

  // Chart data for comparison
  const chartData = {
    labels: sortedAgents.map(a => a.name),
    datasets: [
      {
        label: 'Total Appointments',
        data: sortedAgents.map(a => a.total),
        backgroundColor: 'rgba(14, 165, 233, 0.8)',
        borderColor: 'rgba(14, 165, 233, 1)',
        borderWidth: 1
      },
      {
        label: 'Signed/Converted',
        data: sortedAgents.map(a => a.converted),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1
      },
      {
        label: 'Positive Outcomes',
        data: sortedAgents.map(a => a.positive),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      },
      {
        label: 'Nurture',
        data: sortedAgents.map(a => a.nurture),
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: 'rgba(245, 158, 11, 1)',
        borderWidth: 1
      },
      {
        label: 'Incomplete/Canceled',
        data: sortedAgents.map(a => a.incomplete),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 11,
            weight: '500'
          }
        }
      },
      title: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 12,
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 12 },
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 11 }
        }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: {
          font: { size: 11 }
        }
      }
    }
  };

  return (
    <div className="agent-comparison">
      <div className="comparison-header">
        <h3>Agent Performance Comparison</h3>
        <div className="sort-controls">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="total">Total Appointments</option>
            <option value="converted">Signed/Converted</option>
            <option value="positive">Positive Outcomes</option>
            <option value="conversion">Conversion Rate</option>
            <option value="positiveRate">Positive Rate</option>
          </select>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="comparison-chart">
        <Bar data={chartData} options={chartOptions} />
      </div>

      {/* Agent Table */}
      <div className="agent-table">
        <table>
          <thead>
            <tr>
              <th>Agent</th>
              <th>Appointments</th>
              <th>Converted</th>
              <th>Positive</th>
              <th>Nurture</th>
              <th>Incomplete</th>
              <th>Conv. Rate</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {sortedAgents.map((agent) => (
              <React.Fragment key={agent.name}>
                <tr className={expandedAgent === agent.name ? 'expanded' : ''}>
                  <td className="agent-name">{agent.name}</td>
                  <td>{agent.total}</td>
                  <td className="converted-cell">{agent.converted}</td>
                  <td className="positive-cell">{agent.positive}</td>
                  <td className="nurture-cell">{agent.nurture}</td>
                  <td className="incomplete-cell">{agent.incomplete}</td>
                  <td className="rate-cell">{agent.conversionRate}%</td>
                  <td>
                    <button
                      className="expand-btn"
                      onClick={() => setExpandedAgent(
                        expandedAgent === agent.name ? null : agent.name
                      )}
                    >
                      {expandedAgent === agent.name ? '−' : '+'}
                    </button>
                  </td>
                </tr>
                {expandedAgent === agent.name && (
                  <tr className="detail-row">
                    <td colSpan="8">
                      <div className="agent-details">
                        <div className="detail-section">
                          <h4>By Appointment Type</h4>
                          <div className="detail-list">
                            {Object.entries(agent.byType || {}).map(([type, count]) => (
                              <div key={type} className="detail-item">
                                <span>{type}</span>
                                <span>{count}</span>
                              </div>
                            ))}
                            {(!agent.byType || Object.keys(agent.byType).length === 0) && (
                              <span className="no-data">No type data</span>
                            )}
                          </div>
                        </div>
                        <div className="detail-section">
                          <h4>By Outcome</h4>
                          <div className="detail-list">
                            {Object.entries(agent.byOutcome || {}).map(([outcome, count]) => (
                              <div key={outcome} className="detail-item">
                                <span>{outcome}</span>
                                <span>{count}</span>
                              </div>
                            ))}
                            {(!agent.byOutcome || Object.keys(agent.byOutcome).length === 0) && (
                              <span className="no-data">No outcome data</span>
                            )}
                          </div>
                        </div>
                        <div className="detail-section">
                          <h4>Performance Summary</h4>
                          <div className="detail-list">
                            <div className="detail-item highlight-green">
                              <span>Conversion Rate</span>
                              <span>{agent.conversionRate}%</span>
                            </div>
                            <div className="detail-item highlight-blue">
                              <span>Positive Rate</span>
                              <span>{agent.positiveRate}%</span>
                            </div>
                            <div className="detail-item">
                              <span>Total Met with Client</span>
                              <span>{agent.converted + agent.positive + agent.nurture}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AgentComparison;
