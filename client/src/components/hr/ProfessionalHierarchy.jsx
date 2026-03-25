import { useState, useMemo, useEffect } from 'react';
import api from '../../services/api';
import RoleSettings from './RoleSettings';
import DepartmentSettings from './DepartmentSettings';
import PositionSettings from './PositionSettings';

export default function ProfessionalHierarchy({ roles, departments, positions, employees, onUpdate }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [addContext, setAddContext] = useState(null); // { type, parentId }

  // Graph Data Construction
  const hierarchyGraph = useMemo(() => {
    const buildPositionTree = (parentId, deptId) => {
      return positions
        .filter(pos => pos.parentPositionId === parentId && pos.departmentId === deptId)
        .map(pos => ({
          ...pos,
          type: 'position',
          role: pos.roleId ? roles.find(r => r._id === pos.roleId) : null,
          staff: employees.filter(emp => emp.positionId === pos._id),
          children: buildPositionTree(pos._id, deptId)
        }));
    };

    return departments.map(dept => ({
      ...dept,
      type: 'department',
      positions: buildPositionTree(null, dept._id)
    }));
  }, [departments, positions, roles, employees]);

  const handleEditNode = (type, data) => {
    setSelectedNode({ type, data });
    setAddContext(null);
    setShowModal(true);
  };

  const startAddNode = (type, parentId = null, extraData = {}) => {
    setAddContext({ type, parentId, ...extraData });
    setSelectedNode(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedNode(null);
    setAddContext(null);
  };

  // Recursive Position Renderer
  const RecursivePosition = ({ position }) => {
    return (
      <li key={position._id}>
        <NodeCard 
          type="position" 
          data={position} 
          onEdit={handleEditNode}
          onAddChild={() => startAddNode('position', position.departmentId, { parentPositionId: position._id })}
        />
        {position.children.length > 0 && (
          <ul>
            {position.children.map(child => (
              <RecursivePosition key={child._id} position={child} />
            ))}
          </ul>
        )}
      </li>
    );
  };

  // Node Component
  const NodeCard = ({ type, data, onEdit, onAddChild }) => {
    const isDept = type === 'department';
    const isPos = type === 'position';
    const isRole = type === 'role';

    return (
      <div className={`hierarchy-node ${type} animate-fade-in`}>
        <div className="node-card glass-panel" style={{ borderTop: `4px solid ${data.color || (isPos ? '#6366f1' : '#cbd5e1')}` }}>
          <div className="node-content">
            <div className="node-icon">
              {isDept ? '🏢' : isPos ? '💼' : '🛡️'}
            </div>
            <div className="node-info" style={{ overflow: 'hidden' }}>
              <span className="node-type-label">{type.toUpperCase()}</span>
              <h4 className="node-title" title={data.name}>{data.name}</h4>
              
              {isPos && (
                <div className="node-details">
                   {data.role && (
                     <div className="node-role-tag">
                        🛡️ {data.role.name}
                     </div>
                   )}
                   {/* Removed staff rendering and vacant position text */}
                </div>
              )}
            </div>
          </div>
          <div className="node-actions">
            <button className="node-btn edit" onClick={() => onEdit(type, data)}>✏️ Edit</button>
            {onAddChild && <button className="node-btn add" onClick={() => onAddChild()}>+</button>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="professional-hierarchy-canvas">
      {/* Visual Header */}
      <div className="hierarchy-header">
         <div className="root-node glass-panel">
            <span className="icon">🏛️</span>
            <div>
              <h3 style={{ margin: 0 }}>GLOBAL TECH INC.</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.7 }}>Organization Master Hierarchy</p>
            </div>
         </div>
      </div>

      {/* Graphical Tree */}
      <div className="hierarchy-tree-container">
        <ul className="tree">
          <li>
            <div className="category-label">DEPARTMENTS</div>
            <ul className="department-level">
              {hierarchyGraph.map(dept => (
                <li key={dept._id}>
                  <NodeCard 
                    type="department" 
                    data={dept} 
                    onEdit={handleEditNode}
                    onAddChild={() => startAddNode('position', dept._id)}
                  />
                  {dept.positions.length > 0 && (
                    <ul>
                      {dept.positions.map(pos => (
                        <RecursivePosition key={pos._id} position={pos} />
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              <li>
                <button className="add-node-placeholder" onClick={() => startAddNode('department')}>
                  <span>+</span> Add Department
                </button>
              </li>
            </ul>
          </li>
        </ul>
      </div>

      {/* Modal Overlay */}
      {showModal && (
        <div className="modal-overlay animate-fade-in" onClick={closeModal}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {addContext ? `Add ${addContext.type}` : `Edit ${selectedNode.type}`}
              </h3>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>
            <div className="modal-body">
               {(selectedNode?.type === 'department' || addContext?.type === 'department') && (
                 <DepartmentSettings 
                   departments={departments} 
                   onUpdate={() => { onUpdate(); closeModal(); }} 
                   initialData={selectedNode?.data} 
                 />
               )}
               {(selectedNode?.type === 'position' || addContext?.type === 'position') && (
                 <PositionSettings 
                   positions={positions} 
                   departments={departments} 
                   onUpdate={() => { onUpdate(); closeModal(); }} 
                   initialData={selectedNode?.data || { 
                     departmentId: addContext?.parentId,
                     parentPositionId: addContext?.parentPositionId 
                   }}
                 />
               )}
               {(selectedNode?.type === 'role' || addContext?.type === 'role') && (
                 <RoleSettings 
                   roles={roles} 
                   onUpdate={() => { onUpdate(); closeModal(); }} 
                   initialData={selectedNode?.data}
                 />
               )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .professional-hierarchy-canvas {
          padding: 2rem;
          min-height: 100%;
          overflow-x: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #f1f5f9;
        }

        .hierarchy-header { margin-bottom: 4rem; position: relative; }
        .hierarchy-header::after {
          content: '';
          position: absolute;
          bottom: -4rem;
          left: 50%;
          width: 2px;
          height: 4rem;
          background: #cbd5e1;
        }

        .root-node {
          padding: 1.5rem 2.5rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
        }

        /* Tree Flowchart Styles */
        .tree, .tree ul { margin: 0; padding: 0; list-style: none; display: flex; justify-content: center; }
        .tree ul { padding-top: 2rem; position: relative; }
        .tree li { 
          position: relative; 
          padding: 2rem 1rem 0 1rem; 
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* Connecting Lines */
        .tree li::before, .tree li::after {
          content: '';
          position: absolute;
          top: 0;
          right: 50%;
          border-top: 2px solid #cbd5e1;
          width: 50%;
          height: 2rem;
        }
        .tree li::after { left: 50%; border-left: 2px solid #cbd5e1; }
        .tree li:only-child::after, .tree li:only-child::before { display: none; }
        .tree li:only-child { padding-top: 0; }
        .tree li:first-child::before, .tree li:last-child::after { border: 0 none; }
        .tree li:last-child::before { border-right: 2px solid #cbd5e1; border-radius: 0 5px 0 0; }
        .tree li:first-child::after { border-radius: 5px 0 0 0; }

        .tree ul::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          border-left: 2px solid #cbd5e1;
          width: 0;
          height: 2rem;
        }

        .category-label {
          background: #94a3b8;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          margin-bottom: 1rem;
          z-index: 2;
        }

        /* Node Card Styles */
        .node-card {
          width: 260px;
          padding: 1rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
          z-index: 10;
        }
        .node-card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }

        .node-content { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 1rem; }
        .node-icon { font-size: 1.5rem; }
        .node-info { flex: 1; }
        .node-type-label { font-size: 0.6rem; font-weight: 700; color: #64748b; }
        .node-title { margin: 2px 0; font-size: 1rem; color: #1e293b; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .node-meta { font-size: 0.75rem; color: #94a3b8; }

        .node-details { margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
        
        .node-perm-badge {
          font-size: 0.65rem;
          font-weight: 700;
          color: #6366f1;
          background: #e0e7ff;
          padding: 2px 8px;
          border-radius: 4px;
          width: fit-content;
        }
        .node-perm-badge.empty {
          color: #94a3b8;
          background: #f1f5f9;
        }

        .node-actions { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 0.75rem; margin-top: auto; }
        .node-btn { background: transparent; border: none; cursor: pointer; font-size: 0.8rem; font-weight: 600; color: var(--color-primary); padding: 4px 8px; border-radius: 4px; transition: background 0.2s; }
        .node-btn:hover { background: #f8fafc; }
        .node-btn.add { font-size: 1.2rem; color: #10b981; }

        .add-node-placeholder {
          width: 260px;
          padding: 1.5rem;
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          background: transparent;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .add-node-placeholder:hover { border-color: var(--color-primary); color: var(--color-primary); background: white; }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          width: 90%;
          max-width: 900px;
          max-height: 90vh;
          background: white;
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }
        .modal-header {
          padding: 1.5rem 2rem;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .close-btn { background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 1.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
        .close-btn:hover { background: #e2e8f0; }
        .modal-body { padding: 2rem; overflow-y: auto; }
      `}</style>
    </div>
  );
}
