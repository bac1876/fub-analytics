/**
 * Local Outcome Tracking Database
 * 
 * Stores appointment outcomes locally to avoid FUB's email notification glitch.
 * Uses SQLite for simplicity and portability.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'outcomes.db');
const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS appointment_outcomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fub_appointment_id INTEGER UNIQUE NOT NULL,
    outcome_id INTEGER,
    outcome_name TEXT,
    notes TEXT,
    updated_by TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_fub_appointment_id ON appointment_outcomes(fub_appointment_id);
  CREATE INDEX IF NOT EXISTS idx_outcome_id ON appointment_outcomes(outcome_id);
`);

console.log('📦 Outcome database initialized at:', dbPath);

/**
 * Get local outcome for an appointment
 */
function getOutcome(fubAppointmentId) {
  const stmt = db.prepare(`
    SELECT * FROM appointment_outcomes 
    WHERE fub_appointment_id = ?
  `);
  return stmt.get(fubAppointmentId);
}

/**
 * Get all local outcomes
 */
function getAllOutcomes() {
  const stmt = db.prepare(`SELECT * FROM appointment_outcomes`);
  return stmt.all();
}

/**
 * Get outcomes for multiple appointment IDs
 */
function getOutcomesForAppointments(fubAppointmentIds) {
  if (!fubAppointmentIds || fubAppointmentIds.length === 0) return [];
  
  const placeholders = fubAppointmentIds.map(() => '?').join(',');
  const stmt = db.prepare(`
    SELECT * FROM appointment_outcomes 
    WHERE fub_appointment_id IN (${placeholders})
  `);
  return stmt.all(...fubAppointmentIds);
}

/**
 * Set/update local outcome for an appointment
 */
function setOutcome(fubAppointmentId, outcomeId, outcomeName, notes = null, updatedBy = null) {
  const stmt = db.prepare(`
    INSERT INTO appointment_outcomes (fub_appointment_id, outcome_id, outcome_name, notes, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(fub_appointment_id) DO UPDATE SET
      outcome_id = excluded.outcome_id,
      outcome_name = excluded.outcome_name,
      notes = COALESCE(excluded.notes, notes),
      updated_by = excluded.updated_by,
      updated_at = CURRENT_TIMESTAMP
  `);
  
  const result = stmt.run(fubAppointmentId, outcomeId, outcomeName, notes, updatedBy);
  return result.changes > 0;
}

/**
 * Delete local outcome (revert to FUB's outcome)
 */
function deleteOutcome(fubAppointmentId) {
  const stmt = db.prepare(`
    DELETE FROM appointment_outcomes 
    WHERE fub_appointment_id = ?
  `);
  const result = stmt.run(fubAppointmentId);
  return result.changes > 0;
}

/**
 * Bulk set outcomes
 */
function setOutcomesBulk(outcomes) {
  const stmt = db.prepare(`
    INSERT INTO appointment_outcomes (fub_appointment_id, outcome_id, outcome_name, notes, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(fub_appointment_id) DO UPDATE SET
      outcome_id = excluded.outcome_id,
      outcome_name = excluded.outcome_name,
      notes = COALESCE(excluded.notes, notes),
      updated_by = excluded.updated_by,
      updated_at = CURRENT_TIMESTAMP
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      stmt.run(item.fubAppointmentId, item.outcomeId, item.outcomeName, item.notes || null, item.updatedBy || null);
    }
  });

  insertMany(outcomes);
  return outcomes.length;
}

/**
 * Get outcome stats
 */
function getStats() {
  const stmt = db.prepare(`
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT outcome_id) as unique_outcomes,
      MIN(created_at) as first_entry,
      MAX(updated_at) as last_update
    FROM appointment_outcomes
  `);
  return stmt.get();
}

module.exports = {
  getOutcome,
  getAllOutcomes,
  getOutcomesForAppointments,
  setOutcome,
  deleteOutcome,
  setOutcomesBulk,
  getStats,
  db // Export db for advanced queries if needed
};
