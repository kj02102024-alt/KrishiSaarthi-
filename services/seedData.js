import Trial from '../models/Trial.js';
import Subject from '../models/Subject.js';
import Pharmacovigilance from '../models/Pharmacovigilance.js';
import AuditLog from '../models/AuditLog.js';

export async function seedInitialData(force = false) {
  try {
    const trialCount = await Trial.countDocuments();
    if (trialCount > 0 && !force) {
      console.log(`[CTMS Database] Already initialized with ${trialCount} trials. Skipping seed.`);
      return;
    }

    console.log('[CTMS Database] Initializing AIIA Clinical Trials, Subjects & Pharmacovigilance registry...');

    if (force) {
      await Trial.deleteMany({});
      await Subject.deleteMany({});
      await Pharmacovigilance.deleteMany({});
      await AuditLog.deleteMany({});
    }

    // 1. SEED CLINICAL TRIALS
    const trials = [
      {
        trialId: 'AIIA-CT-2024-001',
        title: 'Clinical Evaluation of Ashwagandha Rasayana (Withania somnifera) in Post-Viral Fatigue & Neuro-Immune Recovery',
        phase: 'Phase III',
        ayushSpecialization: 'Kayachikitsa (Internal Medicine)',
        principalInvestigator: {
          name: 'Prof. (Dr.) Tanuja Nesari, MD (Ayu), PhD',
          designation: 'Director & HOD Dravyaguna',
          institution: 'All India Institute of Ayurveda (AIIA), New Delhi',
          email: 'director@aiia.gov.in',
          contact: '+91-11-26950401',
        },
        status: 'Active',
        enrolledCount: 42,
        targetEnrollment: 60,
        formulationTested: 'Ashwagandha (Withania somnifera) 500mg Standardized Extract (5% Withanolides)',
        dosageForm: 'Capsule',
        ctriNumber: 'CTRI/2024/04/065120',
        ethicsApprovalNumber: 'IEC/AIIA/2024/EXP-104',
        startDate: new Date('2024-04-15'),
        endDate: new Date('2025-04-15'),
        description: 'Randomized, Double-Blind, Placebo-Controlled Trial evaluating neuro-cognitive fatigue scores and immunomodulatory markers (IL-6, TNF-alpha).',
      },
      {
        trialId: 'AIIA-CT-2024-002',
        title: 'Efficacy of Vamana & Virechana Panchakarma in Metabolic Syndrome & Dyslipidemia: A Comparative Study',
        phase: 'Phase II',
        ayushSpecialization: 'Panchakarma (Detoxification/Bio-cleansing)',
        principalInvestigator: {
          name: 'Dr. Santosh Kumar, MD (Ayu)',
          designation: 'Associate Professor, Dept of Panchakarma',
          institution: 'All India Institute of Ayurveda (AIIA), New Delhi',
          email: 'skumar.panchakarma@aiia.gov.in',
          contact: '+91-11-26950402',
        },
        status: 'Recruiting',
        enrolledCount: 28,
        targetEnrollment: 50,
        formulationTested: 'Murchita Tila Taila Snehapana followed by Madanaphala Yoga (Vamana) & Trivrit Leha (Virechana)',
        dosageForm: 'Ghrita (Medicated Ghee)',
        ctriNumber: 'CTRI/2024/06/068940',
        ethicsApprovalNumber: 'IEC/AIIA/2024/PK-042',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2025-05-30'),
        description: 'Assessing reduction in HOMA-IR, waist-to-hip ratio, and lipid clearance post classical shodhana protocols.',
      },
      {
        trialId: 'AIIA-CT-2024-003',
        title: 'Safety & Efficacy of Guduchi (Tinospora cordifolia) Ghanavati in Mild-to-Moderate Osteoarthritis (Sandhivata)',
        phase: 'Phase II',
        ayushSpecialization: 'Dravyaguna (Herbal Pharmacology)',
        principalInvestigator: {
          name: 'Dr. Rama Kant Sharma, MD (Ayu)',
          designation: 'Professor, Dept of Dravyaguna',
          institution: 'All India Institute of Ayurveda (AIIA), New Delhi',
          email: 'rksharma.dg@aiia.gov.in',
        },
        status: 'Active',
        enrolledCount: 35,
        targetEnrollment: 45,
        formulationTested: 'Guduchi Ghanavati (Aq. extract of Tinospora cordifolia stem 500mg)',
        dosageForm: 'Vati (Tablet)',
        ctriNumber: 'CTRI/2024/07/070112',
        ethicsApprovalNumber: 'IEC/AIIA/2024/DG-089',
        startDate: new Date('2024-07-10'),
        endDate: new Date('2025-07-09'),
        description: 'Evaluation of WOMAC Pain Index and serum inflammatory markers (hs-CRP) in degenerative joint disorders.',
      },
      {
        trialId: 'AIIA-CT-2024-004',
        title: 'Standardized Ksharasutra Therapy vs Laser Ablation in High Complex Fistula-in-Ano (Bhagandara)',
        phase: 'Phase III',
        ayushSpecialization: 'Shalya Tantra (Surgery & Wound Care)',
        principalInvestigator: {
          name: 'Prof. (Dr.) Yogesh Badwe, MS (Ayu)',
          designation: 'HOD, Dept of Shalya Tantra',
          institution: 'All India Institute of Ayurveda (AIIA), New Delhi',
          email: 'ybadwe.shalya@aiia.gov.in',
        },
        status: 'Active',
        enrolledCount: 19,
        targetEnrollment: 30,
        formulationTested: 'Apamarga Ksharasutra (Curcuma longa, Euphorbia neriifolia, Achyranthes aspera coated surgical linen)',
        dosageForm: 'Vati (Tablet)',
        ctriNumber: 'CTRI/2024/08/071982',
        ethicsApprovalNumber: 'IEC/AIIA/2024/ST-015',
        startDate: new Date('2024-08-01'),
        endDate: new Date('2025-11-30'),
        description: 'Comparative clinical trial assessing sphincter preservation and recurrence rates.',
      },
    ];

    const savedTrials = await Trial.insertMany(trials);
    console.log(`[CTMS Database] Seeded ${savedTrials.length} clinical trials.`);

    // 2. SEED SUBJECTS (With Baseline and Post-Trial Prakriti Scores for Tridosha Radar Chart)
    const subjectsData = [
      {
        subjectId: 'SUB-2024-001',
        trialId: 'AIIA-CT-2024-001',
        demographics: {
          firstName: 'Aarav',
          lastName: 'Sharma',
          age: 38,
          gender: 'Male',
          contact: '+91-98112-34012',
          consentSigned: true,
          siteLocation: 'AIIA OPD Unit 3, New Delhi',
        },
        vitals: {
          systolicBP: 122,
          diastolicBP: 80,
          heartRate: 74,
          respiratoryRate: 16,
          temperature: 98.4,
          spO2: 99,
          bmi: 24.1,
        },
        ayurvedaParameters: {
          prakriti: { vata: 65, pitta: 22, kapha: 13, dominantDosha: 'Vata Dominant (Ekadoshaja)' },
          postTrialPrakriti: { vata: 38, pitta: 32, kapha: 30, assessmentDate: new Date('2024-08-20') },
          agni_status: 'Vishama Agni (Irregular / Fluctuating Metabolism)',
          ama_level: 'Alpa Ama (Mild Metabolic Endotoxins)',
          koshta: 'Krura Koshta (Hard / Constipated)',
        },
        status: 'Active',
      },
      {
        subjectId: 'SUB-2024-002',
        trialId: 'AIIA-CT-2024-001',
        demographics: {
          firstName: 'Sunita',
          lastName: 'Verma',
          age: 46,
          gender: 'Female',
          contact: '+91-98765-43210',
          consentSigned: true,
          siteLocation: 'AIIA OPD Unit 3, New Delhi',
        },
        vitals: {
          systolicBP: 130,
          diastolicBP: 84,
          heartRate: 78,
          respiratoryRate: 18,
          temperature: 98.6,
          spO2: 98,
          bmi: 26.8,
        },
        ayurvedaParameters: {
          prakriti: { vata: 20, pitta: 68, kapha: 12, dominantDosha: 'Pitta Dominant (Ekadoshaja)' },
          postTrialPrakriti: { vata: 28, pitta: 42, kapha: 30, assessmentDate: new Date('2024-08-22') },
          agni_status: 'Tikshna Agni (Hyper-metabolism / Acidic)',
          ama_level: 'Alpa Ama (Mild Metabolic Endotoxins)',
          koshta: 'Mridu Koshta (Soft / Rapid Elimination)',
        },
        status: 'Active',
      },
      {
        subjectId: 'SUB-2024-003',
        trialId: 'AIIA-CT-2024-002',
        demographics: {
          firstName: 'Devendra',
          lastName: 'Mishra',
          age: 52,
          gender: 'Male',
          contact: '+91-94520-11223',
          consentSigned: true,
          siteLocation: 'AIIA Panchakarma IPD Ward A',
        },
        vitals: {
          systolicBP: 138,
          diastolicBP: 88,
          heartRate: 72,
          respiratoryRate: 15,
          temperature: 98.2,
          spO2: 97,
          bmi: 31.2,
        },
        ayurvedaParameters: {
          prakriti: { vata: 15, pitta: 25, kapha: 60, dominantDosha: 'Kapha Dominant (Ekadoshaja)' },
          postTrialPrakriti: { vata: 26, pitta: 36, kapha: 38, assessmentDate: new Date('2024-08-25') },
          agni_status: 'Manda Agni (Hypo-metabolism / Sluggish)',
          ama_level: 'Madhyama Ama (Moderate Endotoxins)',
          koshta: 'Madhyama Koshta (Regular / Moderate)',
        },
        status: 'Active',
      },
      {
        subjectId: 'SUB-2024-004',
        trialId: 'AIIA-CT-2024-003',
        demographics: {
          firstName: 'Pooja',
          lastName: 'Kaur',
          age: 41,
          gender: 'Female',
          contact: '+91-99881-22334',
          consentSigned: true,
          siteLocation: 'AIIA Dravyaguna Clinical Lab',
        },
        vitals: {
          systolicBP: 118,
          diastolicBP: 76,
          heartRate: 70,
          respiratoryRate: 16,
          temperature: 98.5,
          spO2: 99,
          bmi: 22.4,
        },
        ayurvedaParameters: {
          prakriti: { vata: 44, pitta: 42, kapha: 14, dominantDosha: 'Vata-Pitta (Dwandwaja)' },
          postTrialPrakriti: { vata: 35, pitta: 35, kapha: 30, assessmentDate: new Date('2024-08-26') },
          agni_status: 'Sama Agni (Balanced Metabolism)',
          ama_level: 'Nirama (No Endotoxins / Clear)',
          koshta: 'Madhyama Koshta (Regular / Moderate)',
        },
        status: 'Active',
      },
      {
        subjectId: 'SUB-2024-005',
        trialId: 'AIIA-CT-2024-003',
        demographics: {
          firstName: 'Rajesh',
          lastName: 'Gupta',
          age: 59,
          gender: 'Male',
          contact: '+91-91234-56789',
          consentSigned: true,
          siteLocation: 'AIIA Dravyaguna Clinical Lab',
        },
        vitals: {
          systolicBP: 126,
          diastolicBP: 82,
          heartRate: 76,
          respiratoryRate: 17,
          temperature: 98.6,
          spO2: 98,
          bmi: 25.4,
        },
        ayurvedaParameters: {
          prakriti: { vata: 58, pitta: 24, kapha: 18, dominantDosha: 'Vata Dominant (Ekadoshaja)' },
          postTrialPrakriti: { vata: 36, pitta: 33, kapha: 31, assessmentDate: new Date('2024-08-28') },
          agni_status: 'Vishama Agni (Irregular / Fluctuating Metabolism)',
          ama_level: 'Alpa Ama (Mild Metabolic Endotoxins)',
          koshta: 'Krura Koshta (Hard / Constipated)',
        },
        status: 'Active',
      },
      {
        subjectId: 'SUB-2024-006',
        trialId: 'AIIA-CT-2024-004',
        demographics: {
          firstName: 'Meenakshi',
          lastName: 'Iyer',
          age: 33,
          gender: 'Female',
          contact: '+91-94441-23456',
          consentSigned: true,
          siteLocation: 'AIIA Shalya Tantra Surgical Wing',
        },
        vitals: {
          systolicBP: 114,
          diastolicBP: 74,
          heartRate: 68,
          respiratoryRate: 15,
          temperature: 98.3,
          spO2: 100,
          bmi: 21.8,
        },
        ayurvedaParameters: {
          prakriti: { vata: 25, pitta: 55, kapha: 20, dominantDosha: 'Pitta Dominant (Ekadoshaja)' },
          postTrialPrakriti: { vata: 30, pitta: 38, kapha: 32, assessmentDate: new Date('2024-08-29') },
          agni_status: 'Tikshna Agni (Hyper-metabolism / Acidic)',
          ama_level: 'Nirama (No Endotoxins / Clear)',
          koshta: 'Mridu Koshta (Soft / Rapid Elimination)',
        },
        status: 'Completed',
      },
    ];

    for (const subData of subjectsData) {
      const subject = new Subject(subData);
      await subject.save();
    }
    console.log(`[CTMS Database] Seeded ${subjectsData.length} subjects with FHIR R4 blocks.`);

    // 3. SEED PHARMACOVIGILANCE / ADVERSE EVENTS (Triggering the "2 Mild Adverse Events" in Live Alert Pill!)
    const adverseEventsData = [
      {
        eventId: 'AE-2024-001',
        trialId: 'AIIA-CT-2024-001',
        subjectId: 'SUB-2024-002',
        severityLevel: 'Mild (Grade 1)',
        reportedSymptoms: [
          'Mild Pyrosis (Amlapitta / Epigastric Burning)',
          'Transient Nausea',
        ],
        suspectedFormulation: {
          name: 'Ashwagandha Rasayana Capsule 500mg',
          batchNumber: 'ASH-AIIA-2024-B1',
          dosage: '500 mg BD with Luke Warm Milk',
          manufacturer: 'AIIA Good Manufacturing Practice (GMP) Facility',
          herboMineralCategory: 'Kashtoushadhi (Pure Plant-based / Herbal)',
        },
        causalityAssessment: 'Probable / Likely',
        ndctComplianceStatus: 'Investigator Assessment Complete',
        isExpeditedReportRequired: false,
        actionTaken: 'Dose Maintained with Monitoring',
        outcome: 'Recovering / Resolving',
        reportedBy: {
          name: 'Dr. Ananya Sharma, MD (Ayu)',
          role: 'PvPI Center Coordinator, AIIA',
        },
        dateOfOnset: new Date('2024-08-14'),
      },
      {
        eventId: 'AE-2024-002',
        trialId: 'AIIA-CT-2024-003',
        subjectId: 'SUB-2024-005',
        severityLevel: 'Mild (Grade 1)',
        reportedSymptoms: [
          'Mild Twak Kandu (Pruritus / Generalized Itching)',
          'Dry mouth (Mukhashosha)',
        ],
        suspectedFormulation: {
          name: 'Guduchi Ghanavati 500mg',
          batchNumber: 'GUD-2024-08X',
          dosage: '1000 mg daily post meals',
          manufacturer: 'Indian Medicines Pharmaceutical Corp Ltd (IMPCL)',
          herboMineralCategory: 'Kashtoushadhi (Pure Plant-based / Herbal)',
        },
        causalityAssessment: 'Possible',
        ndctComplianceStatus: 'Under Central Ethics Committee (IEC) Review',
        isExpeditedReportRequired: false,
        actionTaken: 'Dose Reduced',
        outcome: 'Recovering / Resolving',
        reportedBy: {
          name: 'Dr. Rajeshwari Nair, MD (Ayu)',
          role: 'Pharmacovigilance Officer',
        },
        dateOfOnset: new Date('2024-08-20'),
      },
    ];

    for (const aeData of adverseEventsData) {
      const ae = new Pharmacovigilance(aeData);
      await ae.save();
    }
    console.log(`[CTMS Database] Seeded ${adverseEventsData.length} adverse event safety records.`);

    // 4. SEED GCP AUDIT TRAIL LOGS
    await AuditLog.logAction({
      user: {
        userId: 'INV-AIIA-001',
        name: 'Prof. (Dr.) Tanuja Nesari',
        role: 'Principal Investigator',
      },
      action: 'CREATE_TRIAL',
      entityType: 'Trial',
      entityId: 'AIIA-CT-2024-001',
      modifiedField: 'New Protocol Registered',
      newValue: { trialId: 'AIIA-CT-2024-001', ctriNumber: 'CTRI/2024/04/065120' },
    });

    await AuditLog.logAction({
      user: {
        userId: 'CRC-004',
        name: 'Dr. Ananya Sharma',
        role: 'Clinical Research Coordinator',
      },
      action: 'ENROLL_SUBJECT',
      entityType: 'Subject',
      entityId: 'SUB-2024-001',
      modifiedField: 'Informed Consent & Baseline Tridosha Phenotype Assessed',
      newValue: { vata: 65, pitta: 22, kapha: 13, agni: 'Vishama' },
    });

    await AuditLog.logAction({
      user: {
        userId: 'PVO-009',
        name: 'Dr. Rajeshwari Nair',
        role: 'Pharmacovigilance Safety Officer',
      },
      action: 'LOG_ADVERSE_EVENT',
      entityType: 'Pharmacovigilance',
      entityId: 'AE-2024-001',
      modifiedField: 'Adverse Event Filed under NDCT 2019 Rules',
      newValue: { severity: 'Mild (Grade 1)', symptoms: ['Mild Pyrosis'] },
    });

    console.log('[CTMS Database] AIIA Clinical Trials Management System initialized successfully.');
  } catch (err) {
    console.error('[CTMS Database Seed Error]:', err);
  }
}
