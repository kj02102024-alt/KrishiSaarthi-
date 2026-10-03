import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * ============================================================================
 * CTMS CLINICAL STAFF SCHEMA (Secure RBAC Authentication)
 * ============================================================================
 * Replaces the insecure UI role-switcher dropdown.
 * Roles align with Ministry of Ayush & ICMR stakeholder hierarchy.
 * Passwords are bcrypt-hashed (cost factor: 12) — never stored in plaintext.
 */
const ctmsUserSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      // e.g. "INV-AIIA-001"
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      default: 'Clinical Investigator',
    },
    institution: {
      type: String,
      default: 'All India Institute of Ayurveda (AIIA), New Delhi',
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    // bcrypt-hashed password stored here — plain passwords NEVER persisted
    passwordHash: {
      type: String,
      required: true,
      select: false, // excluded from all queries by default
    },
    role: {
      type: String,
      required: true,
      enum: [
        'Principal Investigator',
        'Ethics Committee',
        'NPvCC Pharmacovigilance',
        'Regulator (Read-Only)',
        'Data Manager',
      ],
      default: 'Data Manager',
    },
    // Fine-grained permissions per role
    permissions: {
      canEnrollSubjects: { type: Boolean, default: false },
      canReportAdverseEvents: { type: Boolean, default: false },
      canViewAuditLogs: { type: Boolean, default: true },
      canExportData: { type: Boolean, default: false },
      canManageTrials: { type: Boolean, default: false },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  { timestamps: true }
);

/**
 * Set role-based permissions automatically before saving.
 * This ensures the role drives capabilities, not manual flags.
 */
ctmsUserSchema.pre('save', async function () {
  // Hash the password if it has been modified (or is new)
  if (this.isModified('passwordHash')) {
    // Caller passes plaintext — we hash it here before persistence
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }

  // Assign permissions based on role
  const permMap = {
    'Principal Investigator': {
      canEnrollSubjects: true,
      canReportAdverseEvents: true,
      canViewAuditLogs: true,
      canExportData: true,
      canManageTrials: true,
    },
    'Ethics Committee': {
      canEnrollSubjects: false,
      canReportAdverseEvents: false,
      canViewAuditLogs: true,
      canExportData: true,
      canManageTrials: false,
    },
    'NPvCC Pharmacovigilance': {
      canEnrollSubjects: false,
      canReportAdverseEvents: true,
      canViewAuditLogs: true,
      canExportData: true,
      canManageTrials: false,
    },
    'Regulator (Read-Only)': {
      canEnrollSubjects: false,
      canReportAdverseEvents: false,
      canViewAuditLogs: true,
      canExportData: false,
      canManageTrials: false,
    },
    'Data Manager': {
      canEnrollSubjects: false,
      canReportAdverseEvents: false,
      canViewAuditLogs: true,
      canExportData: true,
      canManageTrials: false,
    },
  };

  if (permMap[this.role]) {
    this.permissions = permMap[this.role];
  }
});

/**
 * Instance method: Verify a plaintext password against the stored bcrypt hash.
 * Used during login — returns true/false.
 */
ctmsUserSchema.methods.verifyPassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

/**
 * Safe public profile (strip sensitive fields before sending to client)
 */
ctmsUserSchema.methods.toPublicProfile = function () {
  return {
    userId: this.userId,
    name: this.name,
    designation: this.designation,
    institution: this.institution,
    email: this.email,
    role: this.role,
    permissions: this.permissions,
    lastLogin: this.lastLogin,
  };
};

const CtmsUser = mongoose.model('CtmsUser', ctmsUserSchema);
export default CtmsUser;
