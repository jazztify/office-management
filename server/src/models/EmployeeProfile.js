const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  department: { type: String },
  position: { type: String },
  salary: { type: Number, default: 0 },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeProfile' }, // Self-referential hierarchy
  dateOfBirth: { type: Date }, // For birthday calendar feature
  hireDate: { type: Date, default: Date.now }, // When the employee started
  employmentStatus: {
    type: String,
    enum: ['training', 'probationary', 'regular'],
    default: 'training',
  },
  leaveCredits: {
    vacation: { type: Number, default: 14 },
    sick: { type: Number, default: 7 },
    bereavement: { type: Number, default: 3 }
  }
}, { timestamps: true });

/**
 * Virtual: compute employment status based on hireDate
 * Training: 0-1 months | Probationary: 1-6 months | Regular: 6+ months
 */
employeeSchema.methods.computeEmploymentStatus = function () {
  if (!this.hireDate) return this.employmentStatus;

  const now = new Date();
  const hire = new Date(this.hireDate);
  const diffMs = now - hire;
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44); // Average month

  if (diffMonths < 1) return 'training';
  if (diffMonths < 6) return 'probationary';
  return 'regular';
};

/**
 * Pre-save hook: auto-update employmentStatus based on hireDate
 */
employeeSchema.pre('save', function (next) {
  if (this.hireDate) {
    this.employmentStatus = this.computeEmploymentStatus();
  }
  next();
});

module.exports = mongoose.model('EmployeeProfile', employeeSchema);
