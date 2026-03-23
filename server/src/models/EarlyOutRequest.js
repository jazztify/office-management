const mongoose = require('mongoose');

const earlyOutRequestSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeProfile', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  requestType: { type: String, enum: ['early_out', 'half_day'], required: true },
  reason: { type: String, required: true },
  requestedClockOut: { type: String }, // e.g. '14:00' — when they want to leave
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeProfile' },
  approvedAt: { type: Date },
  rejectionReason: { type: String },
}, { timestamps: true });

// One request per employee per day per type
earlyOutRequestSchema.index({ employeeId: 1, date: 1, requestType: 1 }, { unique: true });

module.exports = mongoose.model('EarlyOutRequest', earlyOutRequestSchema);
