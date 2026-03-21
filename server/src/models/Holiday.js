const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['regular', 'special_non_working', 'company', 'optional'], default: 'regular' },
  description: { type: String },
  isPaidUnworked: { type: Boolean, default: true }, // Regular holidays are paid even if unworked
  rateMultiplier: { type: Number, default: 2.0 }, // Double pay if worked on regular holiday
  isRecurring: { type: Boolean, default: false },
}, { timestamps: true });

// Prevent duplicate holidays on the same date within a tenant
holidaySchema.index({ date: 1, tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Holiday', holidaySchema);
