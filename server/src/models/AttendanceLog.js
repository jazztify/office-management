const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeProfile', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD format for daily grouping
  clockIn: { type: Date },
  lunchOut: { type: Date },
  lunchIn: { type: Date },
  clockOut: { type: Date },
  // Computed fields (updated on each punch)
  totalWorkHours: { type: Number, default: 0 },     // Total hours worked (minus lunch)
  lunchBreakMinutes: { type: Number, default: 0 },   // Actual lunch break duration
  lateMinutes: { type: Number, default: 0 },          // Minutes late from expected start
  undertimeMinutes: { type: Number, default: 0 },     // Minutes short from expected end
  overtimeMinutes: { type: Number, default: 0 },      // Approved OT minutes
  status: { type: String, enum: ['incomplete', 'complete', 'absent', 'half_day', 'on_leave'], default: 'incomplete' },
  remarks: { type: String },
  ipAddress: { type: String },
}, { timestamps: true });

// One record per employee per day
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ tenantId: 1, date: 1 });

module.exports = mongoose.model('AttendanceLog', attendanceSchema);
