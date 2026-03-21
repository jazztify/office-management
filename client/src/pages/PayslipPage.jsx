import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PayslipPage() {
  const { hasPermission } = useAuth();
  const [payslips, setPayslips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [formData, setFormData] = useState({
    employeeId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    basicSalary: '',
    housing: '',
    transport: '',
    meal: '',
    tax: '',
    insurance: '',
    sss: '',
    pagibig: '',
    philhealth: '',
    notes: '',
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const canGenerate = hasPermission('generate_payslip') || hasPermission('view_payroll') || hasPermission('*');

  useEffect(() => {
    fetchPayslips();
    if (canGenerate) fetchEmployees();
  }, [filterMonth, filterYear]);

  const fetchPayslips = async () => {
    try {
      let params = '';
      const parts = [];
      if (filterMonth) parts.push(`month=${filterMonth}`);
      if (filterYear) parts.push(`year=${filterYear}`);
      if (parts.length) params = '?' + parts.join('&');

      const { data } = await api.get(`/api/payslips${params}`);
      setPayslips(data.payslips || []);
    } catch (err) {
      console.error('Failed to load payslips:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get('/api/employees');
      setEmployees(data);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  const handleEmployeeSelect = (empId) => {
    const emp = employees.find(e => e._id === empId);
    setFormData(prev => ({
      ...prev,
      employeeId: empId,
      basicSalary: emp?.salary || '',
      tax: emp?.salary ? Math.round(emp.salary * 0.12) : '',
      sss: '1350',
      pagibig: '200',
      philhealth: '450',
    }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setGenerating(true);
    try {
      await api.post('/api/payslips/generate', {
        employeeId: formData.employeeId,
        month: formData.month,
        year: formData.year,
        basicSalary: Number(formData.basicSalary),
        allowances: {
          housing: Number(formData.housing) || 0,
          transport: Number(formData.transport) || 0,
          meal: Number(formData.meal) || 0,
        },
        deductions: {
          tax: Number(formData.tax) || 0,
          insurance: Number(formData.insurance) || 0,
          sss: Number(formData.sss) || 0,
          pagibig: Number(formData.pagibig) || 0,
          philhealth: Number(formData.philhealth) || 0,
        },
        notes: formData.notes,
      });
      setShowForm(false);
      setFormData({
        employeeId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(),
        basicSalary: '', housing: '', transport: '', meal: '',
        tax: '', insurance: '', sss: '', pagibig: '', philhealth: '', notes: '',
      });
      fetchPayslips();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate payslip');
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      await api.patch(`/api/payslips/${id}/status`, { status: 'paid' });
      fetchPayslips();
    } catch (err) {
      setError('Failed to update payslip status');
    }
  };

  const formatCurrency = (val) => {
    return '₱' + Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
  };

  const getStatusBadge = (status) => {
    const map = { draft: 'badge-muted', generated: 'badge-warning', paid: 'badge-success' };
    return map[status] || 'badge-muted';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Payslips</h1>
          <p className="page-subtitle">Generate and manage employee payslips</p>
        </div>
        <div className="header-actions">
          <div className="filter-group">
            <select
              className="select-input"
              value={filterMonth}
              onChange={(e) => { setFilterMonth(e.target.value); setIsLoading(true); }}
            >
              <option value="">All Months</option>
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              className="select-input"
              value={filterYear}
              onChange={(e) => { setFilterYear(e.target.value); setIsLoading(true); }}
            >
              {[2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {canGenerate && (
            <button className="btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ Generate Payslip'}
            </button>
          )}
        </div>
      </div>

      {/* Generate Form */}
      {showForm && (
        <form className="payslip-form" onSubmit={handleGenerate}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 className="form-section-title">Generate New Payslip</h3>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="payslip-form-grid">
            <div className="form-group">
              <label>Employee</label>
              <select
                className="select-input"
                value={formData.employeeId}
                onChange={(e) => handleEmployeeSelect(e.target.value)}
                required
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName} — {emp.department || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Month</label>
              <select className="select-input" value={formData.month} onChange={(e) => setFormData({ ...formData, month: e.target.value })}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Year</label>
              <input type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Basic Salary (₱)</label>
              <input type="number" placeholder="0.00" value={formData.basicSalary} onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })} required />
            </div>
          </div>

          <div className="payslip-form-split">
            <div>
              <h4 className="form-subsection">Allowances</h4>
              <div className="form-group"><label>Housing</label><input type="number" placeholder="0" value={formData.housing} onChange={(e) => setFormData({ ...formData, housing: e.target.value })} /></div>
              <div className="form-group"><label>Transport</label><input type="number" placeholder="0" value={formData.transport} onChange={(e) => setFormData({ ...formData, transport: e.target.value })} /></div>
              <div className="form-group"><label>Meal</label><input type="number" placeholder="0" value={formData.meal} onChange={(e) => setFormData({ ...formData, meal: e.target.value })} /></div>
            </div>
            <div>
              <h4 className="form-subsection">Deductions</h4>
              <div className="form-group"><label>Tax</label><input type="number" placeholder="0" value={formData.tax} onChange={(e) => setFormData({ ...formData, tax: e.target.value })} /></div>
              <div className="form-group"><label>SSS</label><input type="number" placeholder="0" value={formData.sss} onChange={(e) => setFormData({ ...formData, sss: e.target.value })} /></div>
              <div className="form-group"><label>PhilHealth</label><input type="number" placeholder="0" value={formData.philhealth} onChange={(e) => setFormData({ ...formData, philhealth: e.target.value })} /></div>
              <div className="form-group"><label>Pag-IBIG</label><input type="number" placeholder="0" value={formData.pagibig} onChange={(e) => setFormData({ ...formData, pagibig: e.target.value })} /></div>
              <div className="form-group"><label>Insurance</label><input type="number" placeholder="0" value={formData.insurance} onChange={(e) => setFormData({ ...formData, insurance: e.target.value })} /></div>
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <input type="text" placeholder="Optional notes..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={generating}>
              {generating ? 'Generating...' : '💰 Generate Payslip'}
            </button>
          </div>
        </form>
      )}

      {/* Payslip Detail Modal */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="payslip-detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="payslip-detail-header">
              <h2>Payslip</h2>
              <span className={`badge ${getStatusBadge(showDetail.status)}`}>{showDetail.status}</span>
            </div>
            <div className="payslip-detail-info">
              <div className="detail-row">
                <span>Employee</span>
                <strong>{showDetail.employeeId?.firstName} {showDetail.employeeId?.lastName}</strong>
              </div>
              <div className="detail-row">
                <span>Department</span>
                <strong>{showDetail.employeeId?.department || '—'}</strong>
              </div>
              <div className="detail-row">
                <span>Period</span>
                <strong>{MONTHS[showDetail.period.month - 1]} {showDetail.period.year}</strong>
              </div>
            </div>
            {showDetail.attendanceSummary && (
              <div className="payslip-detail-info" style={{ marginTop: '1rem', borderTop: 'none' }}>
                <div className="detail-row">
                  <span>Work Hours</span>
                  <strong>{showDetail.attendanceSummary.totalWorkHours || 0} hrs</strong>
                </div>
                <div className="detail-row">
                  <span>Late Hours</span>
                  <strong style={{ color: 'var(--color-danger)' }}>{showDetail.attendanceSummary.totalLateHours || 0} hrs</strong>
                </div>
                <div className="detail-row">
                  <span>Absent</span>
                  <strong style={{ color: 'var(--color-danger)' }}>{showDetail.attendanceSummary.totalAbsentDays || 0} days</strong>
                </div>
              </div>
            )}
            <div className="payslip-breakdown">
              <div className="breakdown-section">
                <h4>Earnings</h4>
                <div className="breakdown-row"><span>Basic Salary</span><span>{formatCurrency(showDetail.basicSalary)}</span></div>
                <div className="breakdown-row"><span>Housing</span><span>{formatCurrency(showDetail.allowances?.housing)}</span></div>
                <div className="breakdown-row"><span>Transport</span><span>{formatCurrency(showDetail.allowances?.transport)}</span></div>
                <div className="breakdown-row"><span>Meal</span><span>{formatCurrency(showDetail.allowances?.meal)}</span></div>
                {showDetail.allowances?.holidayPay > 0 && <div className="breakdown-row"><span>Holiday Pay</span><span>{formatCurrency(showDetail.allowances?.holidayPay)}</span></div>}
                <div className="breakdown-row total"><span>Gross Pay</span><span>{formatCurrency(showDetail.grossPay)}</span></div>
              </div>
              <div className="breakdown-section">
                <h4>Deductions</h4>
                <div className="breakdown-row"><span>Tax</span><span>-{formatCurrency(showDetail.deductions?.tax)}</span></div>
                <div className="breakdown-row"><span>SSS</span><span>-{formatCurrency(showDetail.deductions?.sss)}</span></div>
                <div className="breakdown-row"><span>PhilHealth</span><span>-{formatCurrency(showDetail.deductions?.philhealth)}</span></div>
                <div className="breakdown-row"><span>Pag-IBIG</span><span>-{formatCurrency(showDetail.deductions?.pagibig)}</span></div>
                <div className="breakdown-row"><span>Insurance</span><span>-{formatCurrency(showDetail.deductions?.insurance)}</span></div>
                {showDetail.deductions?.holidayDeduction > 0 && <div className="breakdown-row"><span>Holiday Deduction</span><span>-{formatCurrency(showDetail.deductions?.holidayDeduction)}</span></div>}
                <div className="breakdown-row total"><span>Total Deductions</span><span>-{formatCurrency(showDetail.totalDeductions)}</span></div>
              </div>
            </div>
            <div className="payslip-net">
              <span>Net Pay</span>
              <span className="net-amount">{formatCurrency(showDetail.netPay)}</span>
            </div>
            <div className="payslip-detail-actions">
              {showDetail.status === 'generated' && canGenerate && (
                <button className="btn-success btn-sm" onClick={() => { handleMarkPaid(showDetail._id); setShowDetail(null); }}>
                  ✓ Mark as Paid
                </button>
              )}
              <button className="btn-filter" onClick={() => setShowDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Payslips Table */}
      {isLoading ? (
        <div className="loading-state">Loading payslips...</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Period</th>
                <th>Gross Pay</th>
                <th>Deductions</th>
                <th>Net Pay</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payslips.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-state">No payslips found for this period.</td>
                </tr>
              ) : (
                payslips.map((slip) => (
                  <tr key={slip._id}>
                    <td className="cell-primary">
                      {slip.employeeId?.firstName} {slip.employeeId?.lastName}
                    </td>
                    <td><span className="badge badge-muted">{slip.employeeId?.department || '—'}</span></td>
                    <td>{MONTHS[(slip.period?.month || 1) - 1]} {slip.period?.year}</td>
                    <td className="cell-money">{formatCurrency(slip.grossPay)}</td>
                    <td className="cell-money cell-deduction">-{formatCurrency(slip.totalDeductions)}</td>
                    <td className="cell-money cell-net">{formatCurrency(slip.netPay)}</td>
                    <td><span className={`badge ${getStatusBadge(slip.status)}`}>{slip.status}</span></td>
                    <td>
                      <div className="action-group">
                        <button className="btn-sm btn-view" onClick={() => setShowDetail(slip)}>View</button>
                        {slip.status === 'generated' && canGenerate && (
                          <button className="btn-sm btn-success" onClick={() => handleMarkPaid(slip._id)}>Paid</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
