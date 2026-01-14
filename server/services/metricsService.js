const fubApi = require('./fubApi');

// Define outcome categories for analysis
const OUTCOME_CATEGORIES = {
  converted: ['Met- Signed/Converted', 'Met- Writing Offer'],
  positive: ['Met- Likely Opportunity', 'Met- Showed Homes'],
  nurture: ['Met- Nurture', 'Met- Unlikely Opportunity'],
  incomplete: ['Agent Incomplete', 'Rescheduled', 'Canceled/No Show'],
  special: ['Scholarship Accepted'],
  noOutcome: ['No Outcome']
};

// Calculate metrics for a given date range
async function calculateMetrics(startDate, endDate, userId = null) {
  // Fetch all required data in parallel
  const [appointments, users] = await Promise.all([
    fubApi.getAppointments(startDate, endDate, userId),
    fubApi.getUsers()
  ]);

  // Build user lookup
  const userMap = {};
  users.forEach(u => { userMap[u.id] = u; });

  // Calculate by-type breakdown - use 'type' field directly from appointment
  const byType = {};
  appointments.forEach(apt => {
    const typeName = apt.type || 'Unknown';
    byType[typeName] = (byType[typeName] || 0) + 1;
  });

  // Calculate by-outcome breakdown - use 'outcome' field directly from appointment
  const byOutcome = {};
  appointments.forEach(apt => {
    const outcomeName = apt.outcome || 'No Outcome';
    byOutcome[outcomeName] = (byOutcome[outcomeName] || 0) + 1;
  });

  // Calculate by-agent breakdown
  const byAgent = {};
  appointments.forEach(apt => {
    // Get the user ID from invitees or createdById
    let agentId = apt.createdById;
    if (apt.invitees && apt.invitees.length > 0) {
      const userInvitee = apt.invitees.find(i => i.userId);
      if (userInvitee) agentId = userInvitee.userId;
    }

    const agent = userMap[agentId];
    const agentName = agent ? agent.name : 'Unknown Agent';

    if (!byAgent[agentName]) {
      byAgent[agentName] = {
        total: 0,
        byType: {},
        byOutcome: {}
      };
    }

    byAgent[agentName].total++;

    const typeName = apt.type || 'Unknown';
    byAgent[agentName].byType[typeName] = (byAgent[agentName].byType[typeName] || 0) + 1;

    const outcomeName = apt.outcome || 'No Outcome';
    byAgent[agentName].byOutcome[outcomeName] = (byAgent[agentName].byOutcome[outcomeName] || 0) + 1;
  });

  // Calculate outcome percentages
  const totalAppointments = appointments.length;
  const outcomePercentages = {};
  Object.entries(byOutcome).forEach(([outcome, count]) => {
    outcomePercentages[outcome] = totalAppointments > 0 ? ((count / totalAppointments) * 100).toFixed(1) : 0;
  });

  // Calculate type percentages
  const typePercentages = {};
  Object.entries(byType).forEach(([type, count]) => {
    typePercentages[type] = totalAppointments > 0 ? ((count / totalAppointments) * 100).toFixed(1) : 0;
  });

  // Calculate outcome category totals
  const outcomeCategories = {
    converted: 0,
    positive: 0,
    nurture: 0,
    incomplete: 0,
    special: 0,
    noOutcome: 0
  };

  Object.entries(byOutcome).forEach(([outcomeName, count]) => {
    if (OUTCOME_CATEGORIES.converted.includes(outcomeName)) {
      outcomeCategories.converted += count;
    } else if (OUTCOME_CATEGORIES.positive.includes(outcomeName)) {
      outcomeCategories.positive += count;
    } else if (OUTCOME_CATEGORIES.nurture.includes(outcomeName)) {
      outcomeCategories.nurture += count;
    } else if (OUTCOME_CATEGORIES.incomplete.includes(outcomeName)) {
      outcomeCategories.incomplete += count;
    } else if (OUTCOME_CATEGORIES.special.includes(outcomeName)) {
      outcomeCategories.special += count;
    } else {
      outcomeCategories.noOutcome += count;
    }
  });

  // Calculate conversion rate (appointments that resulted in signed/converted or writing offer)
  const conversionRate = totalAppointments > 0
    ? ((outcomeCategories.converted / totalAppointments) * 100).toFixed(1)
    : 0;

  // Calculate "met" rate (all Met- outcomes)
  const metCount = Object.entries(byOutcome)
    .filter(([name]) => name.startsWith('Met-'))
    .reduce((sum, [, count]) => sum + count, 0);
  const metRate = totalAppointments > 0
    ? ((metCount / totalAppointments) * 100).toFixed(1)
    : 0;

  return {
    summary: {
      totalAppointments,
      appointmentsWithOutcome: totalAppointments - (byOutcome['No Outcome'] || 0),
      conversionRate,
      metRate,
      dateRange: { start: startDate, end: endDate }
    },
    outcomeCategories,
    byType: {
      counts: byType,
      percentages: typePercentages
    },
    byOutcome: {
      counts: byOutcome,
      percentages: outcomePercentages
    },
    byAgent,
    metadata: {
      appointmentTypes: Object.keys(byType),
      appointmentOutcomes: Object.keys(byOutcome),
      users: users.map(u => ({ id: u.id, name: u.name, email: u.email })),
      outcomeCategories: OUTCOME_CATEGORIES
    },
    generatedAt: new Date().toISOString()
  };
}

// Compare metrics between two time periods
async function compareMetrics(period1Start, period1End, period2Start, period2End, userId = null) {
  const [period1, period2] = await Promise.all([
    calculateMetrics(period1Start, period1End, userId),
    calculateMetrics(period2Start, period2End, userId)
  ]);

  // Calculate changes
  const changes = {
    appointments: {
      absolute: period2.summary.totalAppointments - period1.summary.totalAppointments,
      percentage: period1.summary.totalAppointments > 0
        ? (((period2.summary.totalAppointments - period1.summary.totalAppointments) / period1.summary.totalAppointments) * 100).toFixed(1)
        : 0
    },
    conversionRate: {
      absolute: (parseFloat(period2.summary.conversionRate) - parseFloat(period1.summary.conversionRate)).toFixed(1),
      period1: period1.summary.conversionRate,
      period2: period2.summary.conversionRate
    },
    metRate: {
      absolute: (parseFloat(period2.summary.metRate) - parseFloat(period1.summary.metRate)).toFixed(1),
      period1: period1.summary.metRate,
      period2: period2.summary.metRate
    }
  };

  return {
    period1,
    period2,
    changes,
    generatedAt: new Date().toISOString()
  };
}

// Get agent-specific metrics
async function getAgentMetrics(userId, startDate, endDate) {
  const metrics = await calculateMetrics(startDate, endDate, userId);

  // Find the specific agent in byAgent
  const users = metrics.metadata.users;
  const user = users.find(u => u.id === parseInt(userId));
  const agentName = user ? user.name : 'Unknown';

  return {
    agent: user,
    ...metrics,
    agentSpecific: metrics.byAgent[agentName] || {
      total: 0,
      byType: {},
      byOutcome: {}
    }
  };
}

module.exports = {
  calculateMetrics,
  compareMetrics,
  getAgentMetrics
};
