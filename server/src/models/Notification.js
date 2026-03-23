const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: [
      'leave_request', 'leave_approved', 'leave_rejected',
      'overtime_request', 'overtime_approved', 'overtime_rejected',
      'early_out_request', 'early_out_approved', 'early_out_rejected',
      'half_day_request', 'half_day_approved', 'half_day_rejected',
      'general',
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId }, // ID of the related request
  referenceModel: { type: String }, // 'LeaveRequest', 'OvertimeRequest', 'EarlyOutRequest'
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
