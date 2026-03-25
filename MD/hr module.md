1. The Employee Vault (Core Profiles)
   This is where a standard User graduates to an EmployeeProfile.

Digital Onboarding: Secure document uploads for contracts, tax forms, and IDs. No paper filing cabinets allowed. 📄🗑️

Role & Department Assignment: Tagging them as "Pickleball Coach," "Retail Cashier," or "Branch Manager."

Compensation Baselines: Setting their base salary, hourly rate, or tying them strictly to that complex commissionRate you built. 💰

⏱️ 2. IoT Time & Attendance (Big Brother)
Remember those RFID turnstiles we just mapped out for the VIPs? Your staff uses them too. 🚪⚡

Hardware Clock-In/Out: Staff tap their HardwareToken on the back-door scanner. The system logs the exact second they arrive. If they are 15 minutes late, the system flags it automatically. ⏰🚩

Shift Enforcement: If a Cashier's shift starts at 9:00 AM, their POS login credentials literally do not work until 8:50 AM. No unauthorized overtime. 🛑

📅 3. Shift Scheduling & Leave Management
You need to know who is working before the doors open.

Visual Roster Builder: A drag-and-drop calendar for managers to assign shifts across different retail branches or club zones. 🗓️🧩

Automated Leave Approvals: Staff request PTO or Sick Leave via their portal. If approved, the scheduling engine automatically blocks them out so nobody accidentally assigns a shift to a guy in Boracay. 🌴🏖️

💸 4. The Payroll & Commission Engine (The Heavy Lifter)
This is the hardest part of the entire module, Ranzel. Do not mess this up. 🧮💥

The 70/30 Split Generator: When the POS logs a private coaching session, this engine grabs that CommissionLedger, does the math, and stages the payout for the end of the month. ⚖️🤝

Automated Deductions: Auto-calculating unpaid late minutes, absent days, and tax withholdings before generating the final payslip. 📉

One-Click Payslips: Generates a clean, downloadable PDF payslip for the employee so they stop bothering the manager. 🧾💅

🛡️ 5. RBAC & Security Terminals
This ties directly into your mandatory Core Module.

Dynamic UI Rendering: If a coach logs into the React app, they only see "My Schedule" and "My Commissions." If the Super Admin logs in, they see the entire company payroll. 👁️🎭

Override Logs: If a manager manually edits a time-log because an employee "forgot to clock in," the system records which manager made the edit, so nobody can embezzle hours. 🕵️‍♂️📝
