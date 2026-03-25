# HR Module Architecture Diagram (Final Refinement)

The following diagram illustrates the complete HR ecosystem, including IoT hardware (RFID/Scanner), RBAC (The Bouncer), and tax-compliant payroll engine.

```mermaid
graph TD
    %% Entities
    User["User Account"]
    Role["Role / Permissions"]
    Emp["Employee Profile"]
    HardToken["Hardware Token (RFID/NFC)"]
    IotDev["IoT Device (Scanner)"]
    Shift["Shift Definition"]
    Sched["Work Schedule (Roster)"]
    Leave["Leave Request"]
    AttLog["Attendance Log"]
    OverLog["Override Log (Audit)"]
    PosTrans["POS Transaction"]
    CommLedger["Commission Ledger"]
    DedProf["Deduction Profile (Tax/SSS)"]
    Payslip["Payslip"]

    %% Relationships
    User -->|assigned| Role
    User -->|owns| HardToken
    User -->|has| Emp
    Emp -->|assigned to| Sched
    Emp -->|configured with| DedProf
    Shift -->|defines| Sched
    Leave -->|blocks| Sched
    
    %% IoT & Attendance Flow
    HardToken -->|tapped on| IotDev
    IotDev -->|triggers| AttLog
    AttLog -->|manually edited by Admin| OverLog
    
    %% Payroll Flow
    Sched -->|enforces| PosTrans
    PosTrans -->|generates| CommLedger
    CommLedger -->|contributes to| Payslip
    AttLog -->|calculates late/absent| Payslip
    DedProf -->|applies recurring| Payslip
    
    %% UI Integration
    subgraph Frontend Pages
        EmpPage["Employees Page (Vault + RBAC)"]
        RostPage["Roster Page (Visual + Leave)"]
        PosPage["POS Page (Shift-Enforced)"]
        PayPage["Payslip Page (PDF + Taxes)"]
    end
    
    Role -->|locks/unlocks| EmpPage
    Role -->|locks/unlocks| RostPage
    EmpPage --> Emp
    RostPage --> Sched
    PosPage --> PosTrans
    PayPage --> Payslip
```

### Key Functional Improvements
- **Hardware Integration**: The system now explicitly validates `HardwareToken` status and logs the specific `IotDevice` (Scanner) for every punch.
- **Deduction Profiles**: Employees can have fixed recurring deductions (Withholding Tax, SSS, PhilHealth, Pag-IBIG) which override or supplement standard calculations.
- **RBAC (The Bouncer)**: Frontend actions like "Add Employee" or "Assign Shift" are gated by `manage_employees` and `manage_schedules` permissions.
- **Payroll Automation**: Deductions for lates and absences are automatically calculated based on `AttendanceLog` and `WorkSchedule` comparison.
