import React from 'react';
import { useTenant } from '../contexts/TenantContext';

const MODULES = [
  {
    id: 0,
    name: 'Identity & Multi-Tenancy',
    icon: '🏢',
    category: 'The Mandatory Core',
    description: 'Super Admin billing, Workspace generation, Role-Based Access Control (RBAC), and JSON module toggles.',
    value: 'The foundation of the entire app. Essential for security and isolation.'
  },
  {
    id: 1,
    name: 'Universal POS & Shift Management',
    icon: '🛒',
    category: 'Commerce & Finance',
    description: 'Tablet cash register handling transactions, cash drawer floats, end-of-day Z-Out reports, and auto-discounts.',
    value: 'Drives daily revenue and tracks shift-based cash flow.'
  },
  {
    id: 2,
    name: 'Digital Wallet & Ledger',
    icon: '💳',
    category: 'Commerce & Finance',
    description: 'Cashless ecosystem tracking member top-ups, deducts balances, and prevents negative spending.',
    value: 'Perfect for VIP clubs and prepaid membership models.'
  },
  {
    id: 3,
    name: 'Returns, Refunds & RMA',
    icon: '🔄',
    category: 'Commerce & Finance',
    description: 'Processes returned items, issues store credit, and fixes financial ledgers automatically.',
    value: 'Reduces manual bookkeeping errors during retail returns.'
  },
  {
    id: 4,
    name: 'HR, Payroll & Commissions',
    icon: '👔',
    category: 'Operations & Supply Chain',
    description: 'Employee profiles, attendance logs, and automatic Coach Commission Matrix (e.g., 70/30 splits).',
    value: 'Saves hours of manual payroll calculation for staff and coaches.'
  },
  {
    id: 5,
    name: 'Advanced Inventory & Multi-Warehouse',
    icon: '📦',
    category: 'Operations & Supply Chain',
    description: 'Tracks SKUs, size/color variants, barcodes, low-stock alerts, and branch-to-branch transfers.',
    value: 'Prevents stockouts and enables multi-branch retail operations.'
  },
  {
    id: 6,
    name: 'Club Memberships & Subscriptions',
    icon: '🏸',
    category: 'Gym & Service Specific',
    description: 'Tier management (Silver/Gold/Platinum), recurring billing, and RFID/NFC card integration.',
    value: 'Automates membership renewals and access eligibility.'
  },
  {
    id: 7,
    name: 'Booking & Scheduling',
    icon: '📅',
    category: 'Gym & Service Specific',
    description: 'Calendar engine preventing double-bookings. Handles private coach time slots and court reservations.',
    value: 'Optimizes facility utilization and prevents scheduling conflicts.'
  },
  {
    id: 8,
    name: 'Access Control & Hardware (IoT)',
    icon: '🚪',
    category: 'Gym & Service Specific',
    description: 'Integrates with smart locks and turnstiles. Checks database for active subscriptions in real-time.',
    value: 'Provides physical security and automated entry without reception staff.'
  },
  {
    id: 9,
    name: 'CRM & Marketing Automation',
    icon: '📧',
    category: 'Customer Engagement',
    description: 'Automated SMS/Email alerts for expiring subscriptions or low wallet balances.',
    value: 'Boosts customer retention with zero manual effort.'
  },
  {
    id: 10,
    name: 'Loyalty & Rewards Program',
    icon: '🎁',
    category: 'Customer Engagement',
    description: 'Points-per-spend tracking, lifetime value metrics, and automated discount code generation.',
    value: 'Turns one-time customers into lifetime brand advocates.'
  },
  {
    id: 11,
    name: 'The End-User Portal',
    icon: '📱',
    category: 'Customer Engagement',
    description: 'Mobile web app for members to check balances, book courts, and view membership stats.',
    value: 'Increases member satisfaction by providing 24/7 self-service.'
  },
  {
    id: 12,
    name: 'Multi-Social Marketing Automation',
    icon: '🚀',
    category: 'Customer Engagement',
    description: 'Instantly broadcast promotions to TikTok, Facebook, YouTube, and Instagram with one click.',
    value: 'Dramatically scales marketing reach for tenants.'
  }
];

export default function ModulesGuidePage() {
  const { tenant } = useTenant();

  if (tenant?.subdomain !== 'admin') {
    return (
      <div className="page-container">
        <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>🚫 Access Denied</h2>
          <p>Only the System Owner can view the platform module guide.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>📚 Platform Module Guide</h1>
          <p className="page-subtitle">A comprehensive breakdown of every tool in your SaaS empire.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {MODULES.map((mod) => (
          <div key={mod.id} className="panel module-card" style={{ 
            transition: 'transform 0.2s',
            cursor: 'default'
          }}>
            <div className="panel-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
              <span style={{ fontSize: '2rem' }}>{mod.icon}</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{mod.name}</h3>
                <span style={{ 
                  fontSize: '0.65rem', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.05em',
                  color: 'var(--color-primary)',
                  fontWeight: 700
                }}>
                  {mod.category}
                </span>
              </div>
            </div>
            <div className="panel-body" style={{ marginTop: '1rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {mod.description}
              </p>
              <div style={{ 
                marginTop: '1rem', 
                padding: '0.75rem', 
                background: '#f1f5f9', 
                borderRadius: '8px',
                borderLeft: '4px solid var(--color-primary)'
              }}>
                <strong style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Target Value</strong>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 500 }}>{mod.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
