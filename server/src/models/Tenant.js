const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subdomain: { type: String, required: true, unique: true, index: true },
  customDomain: { type: String, sparse: true, unique: true },
  logoUrl: { type: String },
  status: { type: String, enum: ['active', 'suspended', 'churned'], default: 'active' },
  activeModules: [{ type: String }],
  subscriptionTier: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  settings: {
    officeHours: {
      start: { type: String, default: '08:00' },       // 8:00 AM
      end: { type: String, default: '17:00' },         // 5:00 PM
      lunchStart: { type: String, default: '12:00' },   // 12:00 PM
      lunchEnd: { type: String, default: '13:00' },     // 1:00 PM
    },
    deductions: {
      latePerMinute: { type: Number, default: 5 },       // ₱ per minute late
      undertimePerMinute: { type: Number, default: 5 },   // ₱ per minute undertime
      absencePerDay: { type: Number, default: 500 },      // ₱ per day absent
      halfDayDeduction: { type: Number, default: 250 },   // ₱ per half day
      lunchOvertime: { type: Number, default: 0 },        // ₱ deduct if lunch exceeds limit
      maxLunchMinutes: { type: Number, default: 60 },     // Max lunch break in minutes
    },
    overtime: {
      requiresApproval: { type: Boolean, default: true },
      rateMultiplier: { type: Number, default: 1.25 },    // 125% regular rate (PH standard)
      restDayMultiplier: { type: Number, default: 1.3 },  // 130% for rest day OT
      holidayMultiplier: { type: Number, default: 2.0 },  // 200% for holiday OT
      maxHoursPerDay: { type: Number, default: 4 },       // Max OT hours per day
    },
    gracePeriod: { type: Number, default: 15 },            // Minutes grace period before counted as late
  }
}, { timestamps: true });

module.exports = mongoose.model('Tenant', tenantSchema);
