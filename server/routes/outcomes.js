/**
 * Outcome Tracking Routes
 * 
 * These endpoints manage appointment outcomes. When an outcome is set,
 * it updates FUB via the API AND saves locally as a cache/backup.
 */

const express = require('express');
const router = express.Router();
const outcomeDb = require('../services/outcomeDb');
const fubApi = require('../services/fubApi');

/**
 * GET /api/outcomes
 * Get all locally tracked outcomes
 */
router.get('/', (req, res) => {
  try {
    const outcomes = outcomeDb.getAllOutcomes();
    res.json({ outcomes, count: outcomes.length });
  } catch (error) {
    console.error('Error fetching outcomes:', error);
    res.status(500).json({ error: 'Failed to fetch outcomes', details: error.message });
  }
});

/**
 * GET /api/outcomes/stats
 * Get outcome tracking statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = outcomeDb.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});

/**
 * GET /api/outcomes/types
 * Get available outcome types from FUB (for dropdown options)
 */
router.get('/types', async (req, res) => {
  try {
    const outcomes = await fubApi.getAppointmentOutcomes();
    res.json(outcomes);
  } catch (error) {
    console.error('Error fetching outcome types:', error);
    res.status(500).json({ error: 'Failed to fetch outcome types', details: error.message });
  }
});

/**
 * POST /api/outcomes/bulk
 * Set multiple outcomes at once — updates both FUB and local DB
 * Body: { outcomes: [{ fubAppointmentId, outcomeId, outcomeName, notes?, updatedBy? }] }
 */
router.post('/bulk', express.json(), async (req, res) => {
  try {
    const { outcomes } = req.body;

    if (!Array.isArray(outcomes) || outcomes.length === 0) {
      return res.status(400).json({ error: 'outcomes array is required' });
    }

    // Update FUB for each outcome
    const fubResults = [];
    for (const o of outcomes) {
      try {
        await fubApi.updateAppointment(o.fubAppointmentId, { outcomeId: parseInt(o.outcomeId) });
        fubResults.push({ id: o.fubAppointmentId, synced: true });
      } catch (err) {
        fubResults.push({ id: o.fubAppointmentId, synced: false, error: err.response?.data?.errorMessage || err.message });
      }
    }

    // Always save locally too
    const count = outcomeDb.setOutcomesBulk(outcomes);
    const fubSynced = fubResults.filter(r => r.synced).length;

    res.json({ success: true, updated: count, fubSynced, fubTotal: outcomes.length, fubResults });
  } catch (error) {
    console.error('Error bulk updating outcomes:', error);
    res.status(500).json({ error: 'Failed to bulk update outcomes', details: error.message });
  }
});

/**
 * GET /api/outcomes/appointments/pending
 * Get appointments that need outcome updates (past appointments with no local outcome)
 * NOTE: This MUST come before /:appointmentId routes to avoid path collision
 */
router.get('/appointments/pending', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // Get appointments from last N days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - parseInt(days));
    
    const appointments = await fubApi.getAppointments(
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );

    // Filter to past appointments only
    const now = new Date();
    const pastAppointments = appointments.filter(apt => new Date(apt.end || apt.start) < now);

    // Get local outcomes for these appointments
    const appointmentIds = pastAppointments.map(apt => apt.id);
    const localOutcomes = outcomeDb.getOutcomesForAppointments(appointmentIds);
    const localOutcomeMap = {};
    localOutcomes.forEach(o => { localOutcomeMap[o.fub_appointment_id] = o; });

    // Find appointments without outcomes (neither in FUB nor locally)
    const pending = pastAppointments.filter(apt => {
      const hasLocalOutcome = localOutcomeMap[apt.id];
      const hasFubOutcome = apt.outcomeId && apt.outcomeId !== null;
      return !hasLocalOutcome && !hasFubOutcome;
    });

    res.json({
      total: pastAppointments.length,
      pending: pending.length,
      appointments: pending
    });
  } catch (error) {
    console.error('Error fetching pending appointments:', error);
    res.status(500).json({ error: 'Failed to fetch pending appointments', details: error.message });
  }
});

/**
 * GET /api/outcomes/appointments/completed
 * Get appointments that have outcomes set (either in FUB or locally)
 */
router.get('/appointments/completed', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - parseInt(days));
    
    const appointments = await fubApi.getAppointments(
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );

    // Get FUB outcome names
    let fubOutcomes = [];
    try {
      fubOutcomes = await fubApi.getAppointmentOutcomes();
    } catch (e) { /* ignore */ }
    const outcomeNameMap = {};
    fubOutcomes.forEach(o => { outcomeNameMap[o.id] = o.name; });

    // Filter to past appointments only
    const now = new Date();
    const pastAppointments = appointments.filter(apt => new Date(apt.end || apt.start) < now);

    // Get local outcomes
    const appointmentIds = pastAppointments.map(apt => apt.id);
    const localOutcomes = outcomeDb.getOutcomesForAppointments(appointmentIds);
    const localOutcomeMap = {};
    localOutcomes.forEach(o => { localOutcomeMap[o.fub_appointment_id] = o; });

    // Find appointments WITH outcomes (local or FUB)
    const completed = pastAppointments.filter(apt => {
      const hasLocalOutcome = localOutcomeMap[apt.id];
      const hasFubOutcome = apt.outcomeId && apt.outcomeId !== null;
      return hasLocalOutcome || hasFubOutcome;
    }).map(apt => {
      const local = localOutcomeMap[apt.id];
      // Prefer local outcome, fall back to FUB
      const outcomeName = local ? local.outcome_name : (outcomeNameMap[apt.outcomeId] || 'Unknown');
      const outcomeId = local ? local.outcome_id : apt.outcomeId;
      return {
        ...apt,
        outcomeName,
        outcomeId,
        outcomeSource: local ? 'local' : 'fub'
      };
    });

    res.json({
      total: completed.length,
      appointments: completed
    });
  } catch (error) {
    console.error('Error fetching completed appointments:', error);
    res.status(500).json({ error: 'Failed to fetch completed appointments', details: error.message });
  }
});

/**
 * GET /api/outcomes/:appointmentId
 * Get local outcome for a specific appointment
 */
router.get('/:appointmentId', (req, res) => {
  try {
    const { appointmentId } = req.params;
    const outcome = outcomeDb.getOutcome(parseInt(appointmentId));
    
    if (outcome) {
      res.json(outcome);
    } else {
      res.json({ fub_appointment_id: parseInt(appointmentId), outcome_id: null, outcome_name: null });
    }
  } catch (error) {
    console.error('Error fetching outcome:', error);
    res.status(500).json({ error: 'Failed to fetch outcome', details: error.message });
  }
});

/**
 * PUT /api/outcomes/:appointmentId
 * Set outcome for an appointment — updates BOTH FUB and local DB
 * Body: { outcomeId, outcomeName, notes?, updatedBy? }
 */
router.put('/:appointmentId', express.json(), async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { outcomeId, outcomeName, notes, updatedBy } = req.body;

    if (!outcomeId || !outcomeName) {
      return res.status(400).json({ error: 'outcomeId and outcomeName are required' });
    }

    const aptId = parseInt(appointmentId);

    // 1. Update FUB first (source of truth)
    let fubUpdated = false;
    let fubError = null;
    try {
      await fubApi.updateAppointment(aptId, { outcomeId: parseInt(outcomeId) });
      fubUpdated = true;
      console.log(`✅ FUB updated: appointment ${aptId} → outcome ${outcomeName} (${outcomeId})`);
    } catch (err) {
      fubError = err.response?.data?.errorMessage || err.message;
      console.error(`⚠️ FUB update failed for appointment ${aptId}:`, fubError);
    }

    // 2. Always save locally too (serves as cache + backup)
    const success = outcomeDb.setOutcome(
      aptId,
      outcomeId,
      outcomeName,
      notes || null,
      updatedBy || null
    );

    if (success) {
      const updated = outcomeDb.getOutcome(aptId);
      res.json({
        success: true,
        outcome: updated,
        fubSynced: fubUpdated,
        fubError: fubError
      });
    } else {
      res.status(500).json({ error: 'Failed to update local outcome' });
    }
  } catch (error) {
    console.error('Error updating outcome:', error);
    res.status(500).json({ error: 'Failed to update outcome', details: error.message });
  }
});

/**
 * DELETE /api/outcomes/:appointmentId
 * Remove local outcome (revert to FUB's outcome)
 */
router.delete('/:appointmentId', (req, res) => {
  try {
    const { appointmentId } = req.params;
    const success = outcomeDb.deleteOutcome(parseInt(appointmentId));
    
    res.json({ success, message: success ? 'Outcome removed' : 'No local outcome found' });
  } catch (error) {
    console.error('Error deleting outcome:', error);
    res.status(500).json({ error: 'Failed to delete outcome', details: error.message });
  }
});

/**
 * POST /api/outcomes/sync-to-fub
 * One-time sync: push all local outcomes to FUB
 */
router.post('/sync-to-fub', express.json(), async (req, res) => {
  try {
    const allOutcomes = outcomeDb.getAllOutcomes();
    const results = [];

    for (const o of allOutcomes) {
      try {
        await fubApi.updateAppointment(o.fub_appointment_id, { outcomeId: parseInt(o.outcome_id) });
        results.push({ id: o.fub_appointment_id, synced: true, outcome: o.outcome_name });
      } catch (err) {
        results.push({ id: o.fub_appointment_id, synced: false, error: err.response?.data?.errorMessage || err.message });
      }
    }

    const synced = results.filter(r => r.synced).length;
    console.log(`🔄 Sync to FUB: ${synced}/${results.length} outcomes synced`);

    res.json({ total: results.length, synced, failed: results.length - synced, results });
  } catch (error) {
    console.error('Error syncing to FUB:', error);
    res.status(500).json({ error: 'Failed to sync', details: error.message });
  }
});

module.exports = router;
