import mongoose from 'mongoose';

/**
 * ============================================================================
 * TRIAL SCHEMA (All India Institute of Ayurveda - Clinical Trials Management)
 * ============================================================================
 * CDISC / CTRI (Clinical Trials Registry - India) Compliant Model
 * 
 * Complies with Good Clinical Practice (GCP E6(R2)) and ICMR Ethical Guidelines
 * for Biomedical and Health Research Involving Human Participants.
 */
const trialSchema = new mongoose.Schema(
  {
    trialId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      // e.g., "CTRI/2024/09/071201" or "AIIA-CT-2024-001"
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    phase: {
      type: String,
      required: true,
      enum: ['Phase I', 'Phase II', 'Phase III', 'Phase IV', 'Pilot Study'],
      default: 'Phase II',
    },
    ayushSpecialization: {
      type: String,
      required: true,
      enum: [
        'Kayachikitsa (Internal Medicine)',
        'Panchakarma (Detoxification/Bio-cleansing)',
        'Shalya Tantra (Surgery & Wound Care)',
        'Dravyaguna (Herbal Pharmacology)',
        'Rasayana & Vajikarana (Rejuvenation & Geriatrics)',
        'Kaumarbhritya (Pediatrics)',
        'Shalakya Tantra (ENT & Ophthalmology)',
        'Prasuti & Stri Roga (Obstetrics & Gynecology)',
      ],
      default: 'Kayachikitsa (Internal Medicine)',
    },
    principalInvestigator: {
      name: { type: String, required: true },
      designation: { type: String, default: 'Professor & Head of Department' },
      institution: {
        type: String,
        default: 'All India Institute of Ayurveda (AIIA), New Delhi',
      },
      email: { type: String, trim: true },
      contact: { type: String },
    },
    status: {
      type: String,
      enum: ['Recruiting', 'Active', 'Suspended', 'Completed', 'Under Review'],
      default: 'Recruiting',
    },
    enrolledCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    targetEnrollment: {
      type: Number,
      required: true,
      default: 60,
    },
    formulationTested: {
      type: String,
      required: true,
      // e.g. "Ashwagandha (Withania somnifera) 500mg Standardized Extract"
    },
    dosageForm: {
      type: String,
      enum: ['Vati (Tablet)', 'Churna (Powder)', 'Kashaya (Decoction)', 'Ghrita (Medicated Ghee)', 'Taila (Medicated Oil)', 'Asava/Arishta', 'Capsule'],
      default: 'Vati (Tablet)',
    },
    ctriNumber: {
      type: String,
      trim: true,
    },
    ethicsApprovalNumber: {
      type: String,
      default: 'IEC/AIIA/2024/EXP-104',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual index for fast dashboard analytics
trialSchema.index({ status: 1, ayushSpecialization: 1 });

const Trial = mongoose.model('Trial', trialSchema);
export default Trial;
