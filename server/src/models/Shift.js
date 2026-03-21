const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  startTime: { type: String, required: true }, // e.g. '08:00'
  endTime: { type: String, required: true }, // e.g. '17:00'
  lunchStart: { type: String }, // e.g. '12:00'
  lunchEnd: { type: String }, // e.g. '13:00'
  workDays: [{ type: Number }], // 0=Sun, 1=Mon, ..., 6=Sat
  description: { type: String },
  assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeProfile' }]
}, { timestamps: true });

module.exports = mongoose.model('Shift', shiftSchema);
