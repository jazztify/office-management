const { LeaveRequest, EmployeeProfile } = require('../models');

const approveLeaveRequest = async (leaveRequestId, managerId) => {
  // 1. Fetch and update the pending request
  const [updatedCount, updatedRows] = await LeaveRequest.update(
    { status: 'approved', approvedBy: managerId, updatedAt: new Date() },
    { 
      where: { _id: leaveRequestId, status: 'pending' },
      returning: true 
    }
  );

  if (updatedCount === 0) {
    throw new Error('Leave request not found, already processed, or invalid state.');
  }

  const request = updatedRows[0];

  // 2. Calculate the operational magnitude (days requested)
  const durationMs = new Date(request.endDate) - new Date(request.startDate);
  const daysRequested = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

  // 3. Decrement the employee's leave credits
  const employee = await EmployeeProfile.findByPk(request.employeeId);

  if (!employee) {
    // Rollback the status change
    await LeaveRequest.update(
      { status: 'pending', approvedBy: null },
      { where: { _id: leaveRequestId } }
    );
    throw new Error('Employee not found');
  }

  // Handle leaveCredits (JSONB)
  const leaveCredits = { ...(employee.leaveCredits || {}) };
  if (leaveCredits[request.leaveType] === undefined) {
    leaveCredits[request.leaveType] = 0;
  }
  const availableCredits = leaveCredits[request.leaveType];
  let creditStatusNote = '';
  if (daysRequested > availableCredits) {
    creditStatusNote = ` Warning: Employee has insufficient credits (${availableCredits}). Approval will result in negative balance.`;
  }

  leaveCredits[request.leaveType] -= daysRequested;
  
  // Set the modified leaveCredits back to the model
  employee.leaveCredits = leaveCredits;
  await employee.save();

  return { 
    success: true, 
    message: `Leave approved and credits updated.${creditStatusNote}`
  };
};

module.exports = { approveLeaveRequest };
