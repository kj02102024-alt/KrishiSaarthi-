import CtmsUser from '../models/CtmsUser.js';
import bcrypt from 'bcryptjs';

/**
 * Seed the four canonical CTMS stakeholder accounts on first run.
 * All accounts use bcrypt-hashed passwords (cost 12).
 * Credentials are printed to console on first seed for operator reference.
 */
export async function seedCtmsUsers() {
  try {
    const count = await CtmsUser.countDocuments();
    if (count > 0) {
      console.log(`[CTMS Auth] ${count} user accounts already exist. Skipping seed.`);
      return;
    }

    console.log('[CTMS Auth] Seeding initial clinical staff accounts...');

    const users = [
      {
        userId: 'INV-AIIA-001',
        name: 'Dr. Tanuja Nesari',
        designation: 'Director & Principal Investigator',
        institution: 'All India Institute of Ayurveda (AIIA), New Delhi',
        email: 'pi.nesari@aiia.gov.in',
        passwordHash: 'Investigator@AIIA2024',   // will be hashed by pre-save hook
        role: 'Principal Investigator',
      },
      {
        userId: 'IEC-AIIA-002',
        name: 'Dr. Priya Menon',
        designation: 'Chairperson, Institutional Ethics Committee',
        institution: 'AIIA Ethics Review Board',
        email: 'ethics@aiia.gov.in',
        passwordHash: 'Ethics@IEC2024',
        role: 'Ethics Committee',
      },
      {
        userId: 'PVO-AIIA-003',
        name: 'Dr. Rajeshwari Nair',
        designation: 'NPvCC Drug Safety Officer',
        institution: 'National PvCC / CDSCO',
        email: 'pvcc.safety@aiia.gov.in',
        passwordHash: 'PvCC@Safety2024',
        role: 'NPvCC Pharmacovigilance',
      },
      {
        userId: 'REG-CDSCO-004',
        name: 'Mr. Arun Sinha',
        designation: 'Drug Inspector, CDSCO (Central Licensing Authority)',
        institution: 'Central Drugs Standard Control Organisation',
        email: 'regulator@cdsco.gov.in',
        passwordHash: 'Regulator@CDSCO24',
        role: 'Regulator (Read-Only)',
      },
    ];

    await CtmsUser.insertMany(users);

    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│  CTMS Staff Accounts Created (Change passwords immediately!) │');
    console.log('├─────────────────┬──────────────────────────┬────────────────┤');
    console.log('│ Email                        │ Password               │ Role             │');
    console.log('├─────────────────────────────┼────────────────────────┼──────────────────┤');
    users.forEach(u => {
      console.log(`│ ${u.email.padEnd(29)} │ ${u.passwordHash.padEnd(22)} │ ${u.role.substring(0,16).padEnd(16)} │`);
    });
    console.log('└─────────────────────────────────────────────────────────────┘');
  } catch (err) {
    console.error('[CTMS Auth Seed Error]:', err.message);
  }
}
