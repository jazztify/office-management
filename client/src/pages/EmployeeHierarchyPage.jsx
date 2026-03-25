import EmployeeHierarchy from '../components/hr/EmployeeHierarchy';

export default function EmployeeHierarchyPage() {
  return (
    <div className="page-container animate-fade-in">
      <div className="page-header" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1 className="page-title">Employee Reporting Tree</h1>
          <p className="page-subtitle">Visualize personnel reporting lines and internal chain of command.</p>
        </div>
      </div>

      <EmployeeHierarchy />
    </div>
  );
}
