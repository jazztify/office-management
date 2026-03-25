import { useState, useEffect } from 'react';
import api from '../services/api';
import ProfessionalHierarchy from '../components/hr/ProfessionalHierarchy';
import DeductionSettings from '../components/hr/DeductionSettings';

const TABS = [
  { id: 'hierarchy', label: '🛡️ Professional Hierarchy', component: ProfessionalHierarchy, description: 'Manage permissions, functional units, and job titles in one unified flow.' },
  { id: 'deductions', label: '💸 Deduction Settings', component: DeductionSettings, description: 'Manage employee statutory & fixed deductions.' },
  { id: 'policies', label: '📜 Policies', component: () => <div className="p-8 text-center text-muted">Leave & Punch-in policies coming soon...</div>, description: 'Configure organizational HR rules.' },
  { id: 'templates', label: '📅 Shift Templates', component: () => <div className="p-8 text-center text-muted">Weekly shift schedule templates coming soon...</div>, description: 'Standardize working hours.' },
];


export default function HRSettingsPage() {
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activeTab, setActiveTab] = useState('hierarchy');

  useEffect(() => {
    fetchRoles();
    fetchDepartments();
    fetchPositions();
    fetchEmployees();
  }, []);

  const fetchRoles = async () => {
    try {
      const { data } = await api.get('/api/roles');
      setRoles(data);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data } = await api.get('/api/departments');
      setDepartments(data);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const fetchPositions = async () => {
    try {
      const { data } = await api.get('/api/positions');
      setPositions(data);
    } catch (err) {
      console.error('Failed to fetch positions:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get('/api/employees');
      setEmployees(data);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || (() => null);

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 0.5rem 0', background: 'linear-gradient(135deg, var(--color-primary), #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            HR Configuration
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Centralized hub for managing your organization's HR infrastructure.
          </p>
        </div>
      </div>

      <div className="settings-layout" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2rem' }}>
        {/* Sidebar Tabs */}
        <aside className="tabs-sidebar">
          <div className="glass-panel" style={{ padding: '0.75rem', borderRadius: '16px', background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.5rem',
                  borderRadius: '10px',
                  background: activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
                  color: activeTab === tab.id ? 'white' : 'var(--color-text)',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{tab.label}</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '2px' }}>{tab.description}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Content Area */}
        <main className="settings-content">
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '20px', minHeight: '600px', background: 'white', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)', border: '1px solid #eef2f6' }}>
            <ActiveComponent 
              roles={roles} 
              departments={departments} 
              positions={positions} 
              employees={employees}
              onUpdate={() => { fetchRoles(); fetchDepartments(); fetchPositions(); fetchEmployees(); }}
              fetchRoles={fetchRoles}
              fetchDepartments={fetchDepartments}
              fetchPositions={fetchPositions}
              fetchEmployees={fetchEmployees}
            />
          </div>
        </main>
      </div>

      <style>{`
        .tab-btn:hover {
          background: rgba(79, 70, 229, 0.1);
        }
        .tab-btn.active:hover {
          background: var(--color-primary);
        }
        .settings-content .settings-section {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
