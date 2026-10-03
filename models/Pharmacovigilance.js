import mongoose from 'mongoose';

/**
 * ============================================================================
 * PHARMACOVIGILANCE (ADVERSE EVENT) SCHEMA
 * ============================================================================
 * Regulatory Standards:
 * - New Drugs and Clinical Trials Rules (NDCT 2019), Rule 42 (Reporting of Serious Adverse Event)
 * - Pharmacovigilance Programme of India (PvPI) for ASU Drugs (Ayurveda, Siddha, Unani)
 * - WHO-UMC Causality Assessment System
 * - CDSCO Medical Device & Clinical Trials Portal Guidelines
 */
const pharmacovigilanceSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      // e.g., "AE-2024-001"
    },
    trialId: {
      type: String,
      required: true,
      ref: 'Trial',
      index: true,
    },
    subjectId: {
      type: String,
      required: true,
      ref: 'Subject',
      index: true,
    },
    severityLevel: {
      type: String,
      required: true,
      enum: [
        'Mild (Grade 1)',
        'Moderate (Grade 2)',
        'Severe (Grade 3 - SAE)',
        'Life-Threatening (Grade 4)',
        'Death (Grade 5)',
      ],
      default: 'Mild (Grade 1)',
    },
    reportedSymptoms: {
      type: [String],
      required: true,
      // e.g. ["Amlapitta (Hyperacidity)", "Twak Raktata (Mild Erythema)"]
    },
    suspectedFormulation: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      batchNumber: { type: String, default: 'AYU-BCH-2024-09' },
      dosage: { type: String, default: '500 mg BD (Twice Daily) with warm water' },
      manufacturer: { type: String, default: 'AIIA Pharmacy & Research Labs' },
      herboMineralCategory: {
        type: String,
        enum: [
          'Kashtoushadhi (Pure Plant-based / Herbal)',
          'Rasaushadhi (Herbo-Mineral / Bhasma formulation)',
          'Ghrita / Taila (Medicated Lipid / Oil)',
          'Asava / Arishta (Hydro-alcoholic Fermentation)',
          'Guggulu Kalpana (Resin-bound formulation)',
        ],
        default: 'Kashtoushadhi (Pure Plant-based / Herbal)',
      },
    },
    causalityAssessment: {
      type: String,
      enum: [
        'Certain',
        'Probable / Likely',
        'Possible',
        'Unlikely',
        'Conditional / Unclassified',
        'Unassessable / Unclassifiable',
      ],
      default: 'Possible',
    },
    // NDCT 2019 Regulatory Compliance Tracking
    ndctComplianceStatus: {
      type: String,
      enum: [
        'NDCT 2019 Rule 42 Compliant (Expedited 24h SAE Notice)',
        'Under Central Ethics Committee (IEC) Review',
        'Submitted to CDSCO & PvPI (ASU Cell)',
        'Investigator Assessment Complete',
        'Resolved / Case Closed',
      ],
      default: 'Investigator Assessment Complete',
    },
    isExpeditedReportRequired: {
      type: Boolean,
      default: false,
      // True if Severe (Grade 3+ SAE) - Triggering NDCT 2019 Rule 42 mandate to notify CDSCO within 24 hours
    },
    expeditedNotificationTimestamp: {
      type: Date,
    },
    actionTaken: {
      type: String,
      enum: [
        'Dose Maintained with Monitoring',
        'Dose Reduced',
        'Formulation Temporarily Suspended',
        'Formulation Permanently Withdrawn',
        'Concomitant Antidote / Shamana Therapy Administered',
      ],
      default: 'Dose Maintained with Monitoring',
    },
    outcome: {
      type: String,
      enum: [
        'Recovered / Resolved completely',
        'Recovering / Resolving',
        'Ongoing / Not Recovered',
        'Recovered with Sequelae',
        'Fatal',
      ],
      default: 'Recovering / Resolving',
    },
    reportedBy: {
      name: { type: String, default: 'Dr. Rajeshwari Nair, MD (Ayu)' },
      role: { type: String, default: 'Clinical Research Coordinator & Safety Officer' },
    },
    dateOfOnset: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: Enforce NDCT 2019 Rule 42 (Auto-flag SAE for expedited reporting)
pharmacovigilanceSchema.pre('save', async function () {
  if (
    this.severityLevel.includes('Severe') ||
    this.severityLevel.includes('Life-Threatening') ||
    this.severityLevel.includes('Death')
  ) {
    this.isExpeditedReportRequired = true;
    if (!this.expeditedNotificationTimestamp) {
      this.expeditedNotificationTimestamp = new Date();
    }
    if (this.ndctComplianceStatus === 'Investigator Assessment Complete') {
      this.ndctComplianceStatus = 'NDCT 2019 Rule 42 Compliant (Expedited 24h SAE Notice)';
    }
  }
});

const Pharmacovigilance = mongoose.model('Pharmacovigilance', pharmacovigilanceSchema);
export default Pharmacovigilance;
