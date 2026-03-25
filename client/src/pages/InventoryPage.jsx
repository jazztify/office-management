import React from 'react';
import ModulePlaceholder from '../components/shared/ModulePlaceholder';

export default function InventoryPage() {
  return (
    <ModulePlaceholder 
      title="Advanced Inventory" 
      icon="📦"
      headline="Stop Losing Stock. Master Your Supply Chain."
      features={[
        'Multi-Branch Tracking',
        'Barcode Generation',
        'Low Stock Alerts'
      ]}
    />
  );
}
