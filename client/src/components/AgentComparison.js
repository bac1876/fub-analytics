import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import './AgentComparison.css';

function AgentComparison({ byAgent, dashboardType = 'sales' }) {
  const [sortBy, setSortBy] = useState('total');
  const [expandedAgent, setExpandedAgent] = useState(null);

  const agents = Object.entries(byAgent).map(([name, data]) => {
    // Use pre-calculated outcome categories from the server
    const successful = data.outcomeCategories?.successful || 0;
    const nurture = data.outcomeCategories?.nurture || 0;
    const failed = data.outcomeCategories?.failed || 0;

    const successRate = data.total > 0 ? ((successful / data.total) * 100).toFixed(1) : 0;
    const nurtureRate = data.total > 0 ? ((nurture / data.total) * 100).toFixed(1) : 0;

    return {
      name,
      ...data,
      successful,
      nurture,
      failed,
      successRate,
      nurtureRate
    };
  });

  // Sort agents
  const sortedAgents = [...agents].sort((a, b) => {
    switch (sortBy) {
      case 'total': return b.total - a.total;
      case 'successful': return b.successful - a.successful;
      case 'nurture': return b.nurture - a.nurture;
      case 'successRate': return b.successRate - a.successRate;
      default: return 0;
    }
  });

  // Chart colors - different for ISA vs Sales
  const colors = dashboardType === 'isa' ? {
    primary: 'rgba(139, 92, 246, 0.8)',
    primaryBorder: 'rgba(139, 92, 246, 1)',
  } : {
    primary: 'rgba(14, 165, 233, 0.8)',
    primaryBorder: 'rgba(14, 165, 233, 1)',
  };

  // Chart data for comparison
  const chartData = {
    labels: sortedAgents.map(a => a.name),
    datasets: [
      {
        label: 'Total Appointments',
        data: sortedAgents.map(a => a.total),
        backgroundColor: colors.primary,
        borderColor: colors.primaryBorder,
        borderWidth: 1
      },
      {
        label: 'Successful',
        data: sortedAgents.map(a => a.successful),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1
      },
      {
        label: 'Nurture',
        data: sortedAgents.map(a => a.nurture),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      },
      {
        label: 'Failed/Dead',
        data: sortedAgents.map(a => a.failed),
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
    <div className={`agent-comparison ${dashboardType === 'isa' ? 'isa-theme' : ''}`}>
      <div className="comparison-header">
        <h3>{dashboardType === 'isa' ? 'ISA' : 'Agent'} Performance Comparison</h3>
        <div className="sort-controls">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="total">Total Appointments</option>
            <option value="successful">Successful</option>
            <option value="nurture">Nurture</option>
            <option value="successRate">Success Rate</option>
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
              <th>{dashboardType === 'isa' ? 'ISA' : 'Agent'}</th>
              <th>Appointments</th>
              <th>Successful</th>
              <th>Nurture</th>
              <th>Failed</th>
              <th>Success Rate</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {sortedAgents.map((agent) => (
              <React.Fragment key={agent.name}>
                <tr className={expandedAgent === agent.name ? 'expanded' : ''}>
                  <td className="agent-name">
                    {agent.name}
                    {agent.isIsa && <span className="isa-badge">ISA</span>}
                  </td>
                  <td>{agent.total}</td>
                  <td className="successful-cell">{agent.successful}</td>
                  <td className="nurture-cell">{agent.nurture}</td>
                  <td className="failed-cell">{agent.failed}</td>
                  <td className="rate-cell">{agent.successRate}%</td>
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
                    <td colSpan="7">
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
                              <span>Success Rate</span>
                              <span>{agent.successRate}%</span>
                            </div>
                            <div className="detail-item highlight-blue">
                              <span>Nurture Rate</span>
                              <span>{agent.nurtureRate}%</span>
                            </div>
                            <div className="detail-item">
                              <span>Pipeline (Success + Nurture)</span>
                              <span>{agent.successful + agent.nurture}</span>
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
