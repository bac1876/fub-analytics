const fubApi = require('./fubApi');
const outcomeDb = require('./outcomeDb');
const fs = require('fs');
const path = require('path');

// Config file path for ISA users
const ISA_CONFIG_PATH = path.join(__dirname, '../config/isa-users.json');

// Outcome keywords for flexible matching (handles "Met- " prefix and case variations)
const OUTCOME_KEYWORDS = {
  successful: ['signed', 'converted', 'writing offer', 'scholarship'],
  nurture: ['likely opportunity', 'showed homes', 'rescheduled'],
  failed: ['no outcome', 'unlikely opportunity', 'canceled', 'no show']
};

// Helper function for flexible outcome matching
function getOutcomeCategory(outcomeName) {
  if (!outcomeName) return 'failed';
  const normalized = outcomeName.toLowerCase().trim();

  // Check successful first (most specific)
  if (OUTCOME_KEYWORDS.successful.some(kw => normalized.includes(kw))) {
    return 'successful';
  }
  // Check nurture
  if (OUTCOME_KEYWORDS.nurture.some(kw => normalized.includes(kw))) {
    return 'nurture';
  }
  // Default to failed (includes no outcome, unlikely, canceled, etc.)
  return 'failed';
}

// Legacy OUTCOME_CATEGORIES for backward compatibility (export)
const OUTCOME_CATEGORIES = {
  successful: ['Signed/Converted', 'Writing Offer', 'Scholarship Accepted', 'Met- Signed/Converted', 'Met- Writing Offer', 'Met- Scholarship Accepted'],
  nurture: ['Likely Opportunity', 'Showed Homes', 'Rescheduled', 'Met- Likely Opportunity', 'Met- Showed Homes'],
  failed: ['No Outcome', 'Unlikely Opportunity', 'Canceled/No Show', 'Met- Unlikely Opportunity']
};

// Sales team appointment types (non-ISA)
const SALES_APPOINTMENT_TYPES = [
  'First Showing/Buyer Consultation',
  'Listing Appointment',
  'Recruiting'
];

// ISA appointment types
const ISA_APPOINTMENT_TYPES = [
  'ISA Buyer- Showing Appt',
  'ISA Buyer- Consultation',
  'ISA Seller- Consultation',
  'ISA- Zoom/Phone Call Appt'
];

// Load ISA users from config file
function loadIsaUsers() {
  try {
    if (fs.existsSync(ISA_CONFIG_PATH)) {
      const data = fs.readFileSync(ISA_CONFIG_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading ISA users config:', error);
  }
  return { isaUserIds: [] };
}

// Save ISA users to config file
function saveIsaUsers(isaUserIds) {
  try {
    const configDir = path.dirname(ISA_CONFIG_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(ISA_CONFIG_PATH, JSON.stringify({ isaUserIds }, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving ISA users config:', error);
    return false;
  }
}

// Get ISA user IDs
function getIsaUserIds() {
  return loadIsaUsers().isaUserIds;
}

// Set ISA user IDs
function setIsaUserIds(userIds) {
  return saveIsaUsers(userIds);
}

// Calculate metrics for a given date range
// dashboardType: 'sales' (default) or 'isa'
async function calculateMetrics(startDate, endDate, userId = null, dashboardType = 'sales') {
  // Fetch all required data in parallel
  const [appointments, users] = await Promise.all([
    fubApi.getAppointments(startDate, endDate, userId),
    fubApi.getUsers()
  ]);

  // Get local outcomes and merge with appointments
  // This is the shadow tracking - local outcomes override FUB outcomes
  const appointmentIds = appointments.map(apt => apt.id);
  const localOutcomes = outcomeDb.getOutcomesForAppointments(appointmentIds);
  const localOutcomeMap = {};
  localOutcomes.forEach(o => { 
    localOutcomeMap[o.fub_appointment_id] = o; 
  });

  // Merge local outcomes into appointments
  appointments.forEach(apt => {
    const localOutcome = localOutcomeMap[apt.id];
    if (localOutcome && localOutcome.outcome_name) {
      // Override FUB outcome with local outcome
      apt.outcome = localOutcome.outcome_name;
      apt.outcomeId = localOutcome.outcome_id;
      apt._localOutcome = true; // Flag for debugging
    }
  });

  // Get ISA user IDs
  const isaUserIds = getIsaUserIds();

  // Build user lookup with ISA flag
  const userMap = {};
  users.forEach(u => {
    userMap[u.id] = {
      ...u,
      isIsa: isaUserIds.includes(u.id)
    };
  });

  // Filter appointments by type based on dashboard
  const allowedTypes = dashboardType === 'isa' ? ISA_APPOINTMENT_TYPES : SALES_APPOINTMENT_TYPES;
  const filteredAppointments = appointments.filter(apt => {
    const typeName = apt.type || 'Unknown';

    // Must match the appointment type for this dashboard
    if (!allowedTypes.includes(typeName)) {
      return false;
    }

    // For ISA dashboard, also require the agent to be marked as ISA
    if (dashboardType === 'isa') {
      // Get the user ID from invitees or createdById
      let agentId = apt.createdById;
      if (apt.invitees && apt.invitees.length > 0) {
        const userInvitee = apt.invitees.find(i => i.userId);
        if (userInvitee) agentId = userInvitee.userId;
      }

      // Only include if the agent is marked as ISA
      if (!isaUserIds.includes(agentId)) {
        return false;
      }
    }

    return true;
  });

  // Calculate by-type breakdown - use 'type' field directly from appointment
  const byType = {};
  filteredAppointments.forEach(apt => {
    const typeName = apt.type || 'Unknown';
    byType[typeName] = (byType[typeName] || 0) + 1;
  });

  // Calculate by-outcome breakdown - use 'outcome' field directly from appointment
  const byOutcome = {};
  filteredAppointments.forEach(apt => {
    const outcomeName = apt.outcome || 'No Outcome';
    byOutcome[outcomeName] = (byOutcome[outcomeName] || 0) + 1;
  });

  // Calculate by-type-outcome breakdown (outcomes per appointment type)
  const byTypeOutcome = {};
  filteredAppointments.forEach(apt => {
    const typeName = apt.type || 'Unknown';
    const outcomeName = apt.outcome || 'No Outcome';

    if (!byTypeOutcome[typeName]) {
      byTypeOutcome[typeName] = {
        counts: {},
        total: 0,
        outcomeCategories: { successful: 0, nurture: 0, failed: 0 }
      };
    }

    byTypeOutcome[typeName].counts[outcomeName] = (byTypeOutcome[typeName].counts[outcomeName] || 0) + 1;
    byTypeOutcome[typeName].total++;
    byTypeOutcome[typeName].outcomeCategories[getOutcomeCategory(outcomeName)]++;
  });

  // Add percentages for each type's outcomes
  Object.keys(byTypeOutcome).forEach(typeName => {
    const type = byTypeOutcome[typeName];
    type.percentages = {};
    Object.entries(type.counts).forEach(([outcome, count]) => {
      type.percentages[outcome] = type.total > 0 ? ((count / type.total) * 100).toFixed(1) : '0';
    });
  });

  // Calculate by-agent breakdown
  const byAgent = {};
  filteredAppointments.forEach(apt => {
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
        userId: agentId,
        isIsa: agent ? agent.isIsa : false,
        byType: {},
        byOutcome: {},
        outcomeCategories: { successful: 0, nurture: 0, failed: 0 }
      };
    }

    byAgent[agentName].total++;

    const typeName = apt.type || 'Unknown';
    byAgent[agentName].byType[typeName] = (byAgent[agentName].byType[typeName] || 0) + 1;

    const outcomeName = apt.outcome || 'No Outcome';
    byAgent[agentName].byOutcome[outcomeName] = (byAgent[agentName].byOutcome[outcomeName] || 0) + 1;

    // Update outcome categories for agent using flexible matching
    const category = getOutcomeCategory(outcomeName);
    byAgent[agentName].outcomeCategories[category]++;
  });

  // Calculate outcome percentages
  const totalAppointments = filteredAppointments.length;
  const outcomePercentages = {};
  Object.entries(byOutcome).forEach(([outcome, count]) => {
    outcomePercentages[outcome] = totalAppointments > 0 ? ((count / totalAppointments) * 100).toFixed(1) : 0;
  });

  // Calculate type percentages
  const typePercentages = {};
  Object.entries(byType).forEach(([type, count]) => {
    typePercentages[type] = totalAppointments > 0 ? ((count / totalAppointments) * 100).toFixed(1) : 0;
  });

  // Calculate outcome category totals using flexible matching
  const outcomeCategories = {
    successful: 0,
    nurture: 0,
    failed: 0
  };

  Object.entries(byOutcome).forEach(([outcomeName, count]) => {
    const category = getOutcomeCategory(outcomeName);
    outcomeCategories[category] += count;
  });

  // Calculate success rate (successful outcomes / total)
  const successRate = totalAppointments > 0
    ? ((outcomeCategories.successful / totalAppointments) * 100).toFixed(1)
    : 0;

  // Calculate nurture rate
  const nurtureRate = totalAppointments > 0
    ? ((outcomeCategories.nurture / totalAppointments) * 100).toFixed(1)
    : 0;

  // Calculate failed rate
  const failedRate = totalAppointments > 0
    ? ((outcomeCategories.failed / totalAppointments) * 100).toFixed(1)
    : 0;

  return {
    summary: {
      totalAppointments,
      appointmentsWithOutcome: totalAppointments - (byOutcome['No Outcome'] || 0),
      successRate,
      nurtureRate,
      failedRate,
      dateRange: { start: startDate, end: endDate },
      dashboardType
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
    byTypeOutcome,
    byAgent,
    metadata: {
      appointmentTypes: Object.keys(byType),
      appointmentOutcomes: Object.keys(byOutcome),
      users: users.map(u => ({ id: u.id, name: u.name, email: u.email, isIsa: isaUserIds.includes(u.id) })),
      outcomeCategories: OUTCOME_CATEGORIES,
      salesAppointmentTypes: SALES_APPOINTMENT_TYPES,
      isaAppointmentTypes: ISA_APPOINTMENT_TYPES,
      isaUserIds
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
  getAgentMetrics,
  getIsaUserIds,
  setIsaUserIds,
  OUTCOME_CATEGORIES,
  SALES_APPOINTMENT_TYPES,
  ISA_APPOINTMENT_TYPES
};
