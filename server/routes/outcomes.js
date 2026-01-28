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
      appointments: pending // No limit - show all pending
    });
  } catch (error) {
    console.error('Error fetching pending appointments:', error);
    res.status(500).json({ error: 'Failed to fetch pending appointments', details: error.message });
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

module.exports = router;
