const express = require('express');
const router = express.Router();
const metricsService = require('../services/metricsService');
const fubApi = require('../services/fubApi');

// Helper to get default date range (last 30 days)
function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}

// Get all metrics for a date range
router.get('/metrics', async (req, res) => {
  try {
    const { start, end, userId } = req.query;
    const dateRange = start && end ? { start, end } : getDefaultDateRange();

    const metrics = await metricsService.calculateMetrics(
      dateRange.start,
      dateRange.end,
      userId || null
    );

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics', details: error.message });
  }
});

// Compare two time periods
router.get('/compare', async (req, res) => {
  try {
    const { period1Start, period1End, period2Start, period2End, userId } = req.query;

    if (!period1Start || !period1End || !period2Start || !period2End) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['period1Start', 'period1End', 'period2Start', 'period2End']
      });
    }

    const comparison = await metricsService.compareMetrics(
      period1Start,
      period1End,
      period2Start,
      period2End,
      userId || null
    );

    res.json(comparison);
  } catch (error) {
    console.error('Error comparing metrics:', error);
    res.status(500).json({ error: 'Failed to compare metrics', details: error.message });
  }
});

// Get agent-specific metrics
router.get('/agent/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { start, end } = req.query;
    const dateRange = start && end ? { start, end } : getDefaultDateRange();

    const metrics = await metricsService.getAgentMetrics(
      userId,
      dateRange.start,
      dateRange.end
    );

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching agent metrics:', error);
    res.status(500).json({ error: 'Failed to fetch agent metrics', details: error.message });
  }
});

// Get list of all users/agents
router.get('/users', async (req, res) => {
  try {
    const users = await fubApi.getUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// Get appointment types
router.get('/appointment-types', async (req, res) => {
  try {
    const types = await fubApi.getAppointmentTypes();
    res.json(types);
  } catch (error) {
    console.error('Error fetching appointment types:', error);
    res.status(500).json({ error: 'Failed to fetch appointment types', details: error.message });
  }
});

// Get appointment outcomes
router.get('/appointment-outcomes', async (req, res) => {
  try {
    const outcomes = await fubApi.getAppointmentOutcomes();
    res.json(outcomes);
  } catch (error) {
    console.error('Error fetching appointment outcomes:', error);
    res.status(500).json({ error: 'Failed to fetch appointment outcomes', details: error.message });
  }
});

// Get pipelines and stages
router.get('/pipelines', async (req, res) => {
  try {
    const pipelines = await fubApi.getPipelines();

    // Get stages for each pipeline
    const pipelinesWithStages = await Promise.all(
      pipelines.map(async (pipeline) => {
        const stages = await fubApi.getStages(pipeline.id);
        return { ...pipeline, stages };
      })
    );

    res.json(pipelinesWithStages);
  } catch (error) {
    console.error('Error fetching pipelines:', error);
    res.status(500).json({ error: 'Failed to fetch pipelines', details: error.message });
  }
});

// Quick stats endpoint for real-time dashboard updates
router.get('/quick-stats', async (req, res) => {
  try {
    const dateRange = getDefaultDateRange();
    const { userId } = req.query;

    const [appointments, calls, deals] = await Promise.all([
      fubApi.getAppointments(dateRange.start, dateRange.end, userId || null),
      fubApi.getCalls(dateRange.start, dateRange.end, userId || null),
      fubApi.getDeals(null, userId || null)
    ]);

    res.json({
      appointments: appointments.length,
      calls: calls.length,
      deals: deals.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching quick stats:', error);
    res.status(500).json({ error: 'Failed to fetch quick stats', details: error.message });
  }
});

// Debug endpoint - raw appointments with full details
router.get('/debug/appointments', async (req, res) => {
  try {
    const { start, end } = req.query;
    const dateRange = start && end ? { start, end } : getDefaultDateRange();

    const [appointments, outcomes, types, users] = await Promise.all([
      fubApi.getAppointments(dateRange.start, dateRange.end),
      fubApi.getAppointmentOutcomes(),
      fubApi.getAppointmentTypes(),
      fubApi.getUsers()
    ]);

    // Build lookups
    const outcomeMap = {};
    outcomes.forEach(o => { outcomeMap[o.id] = o.name; });

    const typeMap = {};
    types.forEach(t => { typeMap[t.id] = t.name; });

    const userMap = {};
    users.forEach(u => { userMap[u.id] = u.name; });

    // Sample of appointments with resolved names
    const sampleAppointments = appointments.slice(0, 20).map(apt => ({
      id: apt.id,
      title: apt.title,
      start: apt.start,
      end: apt.end,
      typeId: apt.typeId,
      typeName: typeMap[apt.typeId] || 'Unknown',
      outcomeId: apt.outcomeId,
      outcomeName: outcomeMap[apt.outcomeId] || 'No Outcome',
      createdById: apt.createdById,
      createdByName: userMap[apt.createdById] || 'Unknown',
      invitees: apt.invitees,
      // Include raw data for debugging
      raw: apt
    }));

    res.json({
      totalAppointments: appointments.length,
      totalUsers: users.length,
      totalOutcomes: outcomes.length,
      totalTypes: types.length,
      outcomes: outcomes,
      types: types,
      users: users.map(u => ({ id: u.id, name: u.name, email: u.email })),
      sampleAppointments,
      dateRange
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: 'Debug failed', details: error.message });
  }
});

module.exports = router;
