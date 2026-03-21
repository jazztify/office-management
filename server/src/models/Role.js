const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true }, // e.g., 'Senior HR Manager'
  description: String,
  isSystemDefault: { type: Boolean, default: false }, // Prevents accidental deletion of core roles
  permissions: [{ type: String }] // Array of allowed actions: ['view_payroll', 'edit_attendance']
}, { timestamps: true });

// Ensure role names are unique within a tenant workspace
roleSchema.index({ name: 1, tenantId: 1 }, { unique: true });

module.exports = mongoose.model('Role', roleSchema);
