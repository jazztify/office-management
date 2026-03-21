const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeProfile', required: true },
  period: {
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
  },
  basicSalary: { type: Number, required: true },
  allowances: {
    housing: { type: Number, default: 0 },
    transport: { type: Number, default: 0 },
    meal: { type: Number, default: 0 },
    holidayPay: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
  },
  deductions: {
    tax: { type: Number, default: 0 },
    insurance: { type: Number, default: 0 },
    sss: { type: Number, default: 0 },
    pagibig: { type: Number, default: 0 },
    philhealth: { type: Number, default: 0 },
    holidayDeduction: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
  },
  attendanceSummary: {
    totalWorkHours: { type: Number, default: 0 },
    totalLateHours: { type: Number, default: 0 },
    totalAbsentDays: { type: Number, default: 0 },
  },
  grossPay: { type: Number, required: true },
  totalDeductions: { type: Number, required: true },
  netPay: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'generated', 'paid'], default: 'generated' },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
}, { timestamps: true });

// Ensure one payslip per employee per period
payslipSchema.index({ employeeId: 1, 'period.month': 1, 'period.year': 1, tenantId: 1 }, { unique: true });

module.exports = mongoose.model('Payslip', payslipSchema);
