import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

export default function EmployeeHierarchy() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.9 });
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setLastPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPosition.x;
    const dy = e.clientY - lastPosition.y;
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    setLastPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    const delta = -e.deltaY;
    const newScale = Math.min(Math.max(transform.scale + delta * zoomSpeed, 0.2), 2);
    setTransform(prev => ({ ...prev, scale: newScale }));
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get('/api/employees');
      // Prune offboarded individuals from the Active Reporting Tree
      const activeOnly = data.filter(emp => !emp.offboardingStatus || emp.offboardingStatus === 'none');
      setEmployees(activeOnly);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (list) => {
    const map = {};
    const roots = [];
    list.forEach(emp => {
      map[emp._id] = { ...emp, subordinates: [] };
    });
    list.forEach(emp => {
      if (emp.managerId && map[emp.managerId]) {
        map[emp.managerId].subordinates.push(map[emp._id]);
      } else {
        roots.push(map[emp._id]);
      }
    });
    return roots;
  };

  const hierarchy = buildTree(employees);

  if (loading) return <div className="loading">Loading Employee Tree...</div>;

  return (
    <div 
      className="hierarchy-canvas-container" 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <div className="canvas-controls">
         <span className="control-hint">🖱️ Scroll to Zoom • Drag to Pan</span>
         <button className="control-reset" onClick={() => setTransform({ x: 0, y: 0, scale: 0.9 })}>Reset View</button>
      </div>

      <div 
        className="hierarchy-canvas animate-fade-in"
        style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
      >
        <ul className="tree-root">
          <li>
             <div className="category-label">PERSONNEL REPORTING LINES</div>
             <ul className="employee-level">
                {hierarchy.map(emp => (
                  <RecursiveEmployee key={emp._id} employee={emp} />
                ))}
             </ul>
          </li>
        </ul>
      </div>

      <style>{`
        .hierarchy-canvas-container { width: 100%; height: 80vh; background: #f1f5f9; border-radius: 20px; overflow: hidden; position: relative; cursor: grab; }
        .canvas-controls { position: absolute; top: 1.5rem; left: 1.5rem; z-index: 10; display: flex; align-items: center; gap: 1rem; }
        .control-hint { font-size: 0.75rem; color: #64748b; font-weight: 600; background: white; padding: 6px 12px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .control-reset { background: white; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; color: #1e293b; cursor: pointer; }

        .hierarchy-canvas { transform-origin: top center; transition: transform 0.1s ease-out; padding: 4rem; width: max-content; margin: 0 auto; }
        
        .tree-root, .employee-level { list-style: none; padding: 0; margin: 0; display: flex; justify-content: center; gap: 2rem; position: relative; }
        .employee-level { margin-top: 3rem; }
        .employee-level::before { content: ''; position: absolute; top: -1.5rem; left: 50%; width: 2px; height: 1.5rem; background: #cbd5e1; }

        .category-label { text-align: center; font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 2rem; }

        .staff-card {
          background: white;
          border-radius: 16px;
          padding: 1.25rem;
          min-width: 220px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
          border: 1px solid rgba(255,255,255,0.3);
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          text-align: center;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .staff-avatar-large {
           width: 48px;
           height: 48px;
           background: var(--color-primary);
           color: white;
           border-radius: 50%;
           display: flex;
           align-items: center;
           justify-content: center;
           font-size: 1.2rem;
           font-weight: 800;
           margin: 0 auto;
           border: 3px solid #f8fafc;
           box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
        }

        .staff-name-title {
           margin-top: 0.25rem;
        }
        .staff-name-title h4 { margin: 0; font-size: 0.95rem; color: #1e293b; font-weight: 700; }
        .staff-name-title p { margin: 2px 0 0; font-size: 0.75rem; color: #64748b; font-weight: 600; }

        .staff-dept-badge {
           font-size: 0.65rem;
           color: #6366f1;
           background: #e0e7ff;
           padding: 2px 8px;
           border-radius: 4px;
           width: fit-content;
           margin: 0 auto;
           font-weight: 700;
        }

        /* Connectors */
        ul.employee-level li { position: relative; padding-top: 2rem; }
        ul.employee-level li::before { content: ''; position: absolute; top: 0; left: 50%; width: 2px; height: 2rem; background: #cbd5e1; }
        ul.employee-level li::after { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: #cbd5e1; }
        ul.employee-level li:first-child::after { width: 50%; left: 50%; }
        ul.employee-level li:last-child::after { width: 50%; }
        ul.employee-level li:only-child::after { display: none; }
      `}</style>
    </div>
  );
}

function RecursiveEmployee({ employee }) {
  const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase();
  
  return (
    <li>
      <div className="staff-card animate-scale-in">
        <div className="staff-avatar-large">{initials}</div>
        <div className="staff-name-title">
           <h4>{employee.firstName} {employee.lastName}</h4>
           <p>{employee.Position?.name || 'No Position Assigned'}</p>
        </div>
        <div className="staff-dept-badge">{employee.Department?.name || 'Floating Staff'}</div>
      </div>
      
      {employee.subordinates && employee.subordinates.length > 0 && (
        <ul className="employee-level">
          {employee.subordinates.map(sub => (
            <RecursiveEmployee key={sub._id} employee={sub} />
          ))}
        </ul>
      )}
    </li>
  );
}
