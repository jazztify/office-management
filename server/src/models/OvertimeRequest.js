const mongoose = require('mongoose');

const overtimeRequestSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeProfile', required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },         // e.g. '17:00' (after regular hours)
  endTime: { type: String, required: true },            // e.g. '21:00'
  hoursRequested: { type: Number, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeProfile' },
  approvedAt: { type: Date },
  rejectionReason: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('OvertimeRequest', overtimeRequestSchema);
