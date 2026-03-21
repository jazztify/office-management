const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  passwordHash: { type: String, required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Compound index ensures email is unique only within a specific tenant workspace
userSchema.index({ email: 1, tenantId: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
