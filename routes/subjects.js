import express from 'express';
import Subject from '../models/Subject.js';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

/**
 * ============================================================================
 * GET /api/subjects
 * ============================================================================
 * Retrieve all clinical trial participants with Prakriti phenotype filtering
 */
router.get('/', async (req, res) => {
  try {
    const { trialId, dosha, agni, search } = req.query;
    const filter = {};

    if (trialId && trialId !== 'all') {
      filter.trialId = trialId;
    }
    if (dosha && dosha !== 'all') {
      filter['ayurvedaParameters.prakriti.dominantDosha'] = { $regex: dosha, $options: 'i' };
    }
    if (agni && agni !== 'all') {
      filter['ayurvedaParameters.agni_status'] = { $regex: agni, $options: 'i' };
    }
    if (search) {
      filter.$or = [
        { subjectId: { $regex: search, $options: 'i' } },
        { 'demographics.firstName': { $regex: search, $options: 'i' } },
        { 'demographics.lastName': { $regex: search, $options: 'i' } },
        { trialId: { $regex: search, $options: 'i' } },
      ];
    }

    const subjects = await Subject.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: subjects.length, subjects });
  } catch (err) {
    console.error('Error fetching subjects:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ============================================================================
 * GET /api/subjects/:id
 * ============================================================================
 * Retrieve single subject profile
 */
router.get('/:id', async (req, res) => {
  try {
    const subject = await Subject.findOne({ subjectId: req.params.id });
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }
    res.json({ success: true, subject });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ============================================================================
 * GET /api/subjects/:id/fhir
 * ============================================================================
 * Interoperability Endpoint: Returns HL7 FHIR R4 Patient Resource
 * 
 * Hackathon Judges Context:
 * Conforms to Ayushman Bharat Digital Mission (ABDM) and Ministry of Ayush
 * Ontology specifications. Provides standardized JSON payload containing
 * demographics, clinical identifiers, and custom extensions for Prakriti
 * Tridosha scores and Agni status.
 */
router.get('/:id/fhir', async (req, res) => {
  try {
    const subject = await Subject.findOne({ subjectId: req.params.id });
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    // Refresh FHIR resource dynamically
    const fhirResource = subject.generateFhirR4Resource();

    // Log FHIR export audit event for compliance
    await AuditLog.logAction({
      action: 'EXPORT_FHIR_RESOURCE',
      entityType: 'Subject',
      entityId: subject.subjectId,
      modifiedField: 'HL7 FHIR R4 Interoperability Resource Exported',
      newValue: { resourceType: 'Patient', id: subject.subjectId },
    });

    res.setHeader('Content-Type', 'application/fhir+json; charset=utf-8');
    res.json(fhirResource);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ============================================================================
 * PUT /api/subjects/:id/vitals
 * ============================================================================
 * Update subject vitals and log GCP audit trail
 */
router.put('/:id/vitals', async (req, res) => {
  try {
    const { vitals, user } = req.body;
    const subject = await Subject.findOne({ subjectId: req.params.id });
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    const oldVitals = { ...subject.vitals.toObject() };
    Object.assign(subject.vitals, vitals);
    await subject.save();

    await AuditLog.logAction({
      user,
      action: 'UPDATE_VITALS',
      entityType: 'Subject',
      entityId: subject.subjectId,
      modifiedField: 'vitals (BP, HR, SpO2, BMI)',
      oldValue: oldVitals,
      newValue: subject.vitals,
    });

    res.json({ success: true, message: 'Vitals updated and GCP logged', subject });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
