import mongoose from 'mongoose';

/**
 * ============================================================================
 * SUBJECT (PATIENT) SCHEMA - AYURVEDA CLINICAL RESEARCH
 * ============================================================================
 * Implements:
 * 1. Standard Clinical Demographics & Baseline Vitals (CDISC SDTM / DM & VS)
 * 2. Ayurveda Phenotypic Parameters (Prakriti Tridosha, Agni, Ama, Koshta)
 * 3. HL7 FHIR R4 Patient Resource representation with Ayush Ontology extensions
 * 4. Good Clinical Practice (GCP) informed consent audit flags
 */
const subjectSchema = new mongoose.Schema(
  {
    subjectId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      // e.g. "SUB-2024-001"
    },
    trialId: {
      type: String,
      required: true,
      ref: 'Trial',
      index: true,
    },
    // Standard Demographics (CDISC DM Domain)
    demographics: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      age: { type: Number, required: true, min: 1, max: 120 },
      gender: {
        type: String,
        required: true,
        enum: ['Male', 'Female', 'Other'],
      },
      contact: { type: String, trim: true },
      consentSigned: { type: Boolean, default: true },
      consentDate: { type: Date, default: Date.now },
      siteLocation: {
        type: String,
        default: 'AIIA Main Hospital, Sarita Vihar, New Delhi',
      },
    },
    // Standard Clinical Vitals (CDISC VS Domain)
    vitals: {
      systolicBP: { type: Number, required: true, default: 120 }, // mmHg
      diastolicBP: { type: Number, required: true, default: 80 }, // mmHg
      fastingBloodSugar: { type: Number, default: 95 }, // mg/dL
      heartRate: { type: Number, required: true, default: 72 }, // bpm
      respiratoryRate: { type: Number, default: 16 }, // breaths/min
      temperature: { type: Number, default: 98.4 }, // °F
      spO2: { type: Number, default: 98 }, // %
      bmi: { type: Number, default: 23.5 }, // kg/m2
    },
    // Specialized Ayurveda Diagnostic Parameters
    ayurvedaParameters: {
      // Prakriti (Constitutional assessment - scores out of 100)
      prakriti: {
        vata: { type: Number, required: true, min: 0, max: 100, default: 33 },
        pitta: { type: Number, required: true, min: 0, max: 100, default: 33 },
        kapha: { type: Number, required: true, min: 0, max: 100, default: 34 },
        dominantDosha: {
          type: String,
          default: 'Sama-Tridosha',
        },
      },
      // Post-Intervention / Follow-up Dosha assessment (for Spider/Radar chart progression)
      postTrialPrakriti: {
        vata: { type: Number, min: 0, max: 100 },
        pitta: { type: Number, min: 0, max: 100 },
        kapha: { type: Number, min: 0, max: 100 },
        assessmentDate: { type: Date },
      },
      // Digestive & Metabolic Fire (Agni)
      agni_status: {
        type: String,
        required: true,
        enum: [
          'Sama Agni (Balanced Metabolism)',
          'Tikshna Agni (Hyper-metabolism / Acidic)',
          'Manda Agni (Hypo-metabolism / Sluggish)',
          'Vishama Agni (Irregular / Fluctuating Metabolism)',
        ],
        default: 'Sama Agni (Balanced Metabolism)',
      },
      // Metabolic Endotoxins (Ama)
      ama_level: {
        type: String,
        required: true,
        enum: [
          'Nirama (No Endotoxins / Clear)',
          'Alpa Ama (Mild Metabolic Endotoxins)',
          'Madhyama Ama (Moderate Endotoxins)',
          'Bahu Ama (Severe Endotoxin Accumulation)',
        ],
        default: 'Nirama (No Endotoxins / Clear)',
      },
      // Bowel / Elimination Pattern (Koshta)
      koshta: {
        type: String,
        enum: [
          'Mridu Koshta (Soft / Rapid Elimination)',
          'Madhyama Koshta (Regular / Moderate)',
          'Krura Koshta (Hard / Constipated)',
        ],
        default: 'Madhyama Koshta (Regular / Moderate)',
      },
    },
    // HL7 FHIR R4 Interoperability Block
    // Pre-computed FHIR R4 Patient Resource conformant with ABDM & Ayush Ontology extensions
    fhirResource: {
      type: Object,
      default: null,
    },
    status: {
      type: String,
      enum: ['Screened', 'Enrolled', 'Active', 'Completed', 'Withdrawn', 'Adverse Event Discontinued'],
      default: 'Enrolled',
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Helper to compute dominant dosha phenotype
 */
function calculateDominantDosha(vata, pitta, kapha) {
  const scores = [
    { name: 'Vata', val: vata },
    { name: 'Pitta', val: pitta },
    { name: 'Kapha', val: kapha },
  ].sort((a, b) => b.val - a.val);

  if (Math.abs(scores[0].val - scores[1].val) <= 5) {
    return `${scores[0].name}-${scores[1].name} (Dwandwaja)`;
  }
  return `${scores[0].name} Dominant (Ekadoshaja)`;
}

/**
 * Generate HL7 FHIR R4 Patient representation with Ayush Extensions
 * Conforms with Ayushman Bharat Digital Mission (ABDM) and Ministry of Ayush specifications.
 */
subjectSchema.methods.generateFhirR4Resource = function () {
  const vata = this.ayurvedaParameters.prakriti.vata;
  const pitta = this.ayurvedaParameters.prakriti.pitta;
  const kapha = this.ayurvedaParameters.prakriti.kapha;
  const dominant = calculateDominantDosha(vata, pitta, kapha);

  return {
    resourceType: 'Patient',
    id: this.subjectId,
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
      profile: [
        'https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient',
        'https://ayush.gov.in/fhir/StructureDefinition/AyurvedaClinicalSubject',
      ],
    },
    identifier: [
      {
        use: 'official',
        system: 'https://aiia.gov.in/clinical-trials/subjects',
        value: this.subjectId,
      },
      {
        use: 'secondary',
        system: 'https://ctri.nic.in/trials',
        value: this.trialId,
      },
    ],
    active: this.status === 'Enrolled' || this.status === 'Active',
    name: [
      {
        use: 'official',
        family: this.demographics.lastName,
        given: [this.demographics.firstName],
      },
    ],
    gender: (this.demographics.gender || 'other').toLowerCase(),
    birthDate: new Date(Date.now() - this.demographics.age * 365.25 * 24 * 3600 * 1000)
      .toISOString()
      .split('T')[0],
    extension: [
      {
        url: 'https://ayush.gov.in/fhir/StructureDefinition/ayurveda-prakriti',
        extension: [
          { url: 'vata-score', valueInteger: vata },
          { url: 'pitta-score', valueInteger: pitta },
          { url: 'kapha-score', valueInteger: kapha },
          { url: 'dominant-dosha', valueString: dominant },
        ],
      },
      {
        url: 'https://ayush.gov.in/fhir/StructureDefinition/agni-status',
        valueString: this.ayurvedaParameters.agni_status,
      },
      {
        url: 'https://ayush.gov.in/fhir/StructureDefinition/ama-level',
        valueString: this.ayurvedaParameters.ama_level,
      },
      {
        url: 'https://ayush.gov.in/fhir/StructureDefinition/gcp-consent-verified',
        valueBoolean: this.demographics.consentSigned,
      },
    ],
  };
};

// Automatically calculate dominant dosha and update FHIR resource before saving
subjectSchema.pre('save', async function () {
  if (this.ayurvedaParameters?.prakriti) {
    const { vata, pitta, kapha } = this.ayurvedaParameters.prakriti;
    this.ayurvedaParameters.prakriti.dominantDosha = calculateDominantDosha(vata, pitta, kapha);
  }
  this.fhirResource = this.generateFhirR4Resource();
});

const Subject = mongoose.model('Subject', subjectSchema);
export default Subject;
