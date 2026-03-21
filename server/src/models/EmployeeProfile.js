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
  leaveCredits: {
    vacation: { type: Number, default: 14 },
    sick: { type: Number, default: 7 },
    bereavement: { type: Number, default: 3 }
  }
}, { timestamps: true });

module.exports = mongoose.model('EmployeeProfile', employeeSchema);
