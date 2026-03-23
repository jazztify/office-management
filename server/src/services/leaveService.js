const mongoose = require('mongoose');
const LeaveRequest = require('../models/LeaveRequest');
const EmployeeProfile = require('../models/EmployeeProfile');

const approveLeaveRequest = async (leaveRequestId, managerId) => {
  // 1. Fetch and update the pending request
  const request = await LeaveRequest.findOneAndUpdate(
    { _id: leaveRequestId, status: 'pending' },
    { status: 'approved', approvedBy: managerId, updatedAt: new Date() },
    { new: true }
  );

  if (!request) {
    throw new Error('Leave request not found, already processed, or invalid state.');
  }

  // 2. Calculate the operational magnitude (days requested)
  const durationMs = request.endDate - request.startDate;
  const daysRequested = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

  // 3. Decrement the employee's leave credits
  const employee = await EmployeeProfile.findById(request.employeeId);

  if (!employee) {
    // Rollback the status change
    await LeaveRequest.findByIdAndUpdate(leaveRequestId, { status: 'pending', approvedBy: null });
    throw new Error('Employee not found');
  }

  if (employee.leaveCredits[request.leaveType] === undefined) {
    employee.leaveCredits[request.leaveType] = 0;
  }
  const availableCredits = employee.leaveCredits[request.leaveType];
  let creditStatusNote = '';
  if (daysRequested > availableCredits) {
    creditStatusNote = ` Warning: Employee has insufficient credits (${availableCredits}). Approval will result in negative balance.`;
  }

  employee.leaveCredits[request.leaveType] -= daysRequested;
  await employee.save();

  return { 
    success: true, 
    message: `Leave approved and credits updated.${creditStatusNote}`
  };
};

module.exports = { approveLeaveRequest };
