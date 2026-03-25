const express = require('express');
const { Department, Position } = require('../models');
const { checkPermission } = require('../middlewares/checkPermission');

const router = express.Router();

// GET /api/departments - List all departments in tenant
router.get('/', checkPermission('view_settings'), async (req, res) => {
  try {
    const { Role } = require('../models');
    const departments = await Department.findAll({
      where: { tenantId: req.tenantId },
      include: [{ 
        model: Position,
        include: [{ model: Role, attributes: ['name', 'color'] }]
      }]
    });
    res.json(departments);
  } catch (err) {
    console.error('GET /departments Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// POST /api/departments - Create new department
router.post('/', checkPermission('manage_settings'), async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const department = await Department.create({
      tenantId: req.tenantId,
      name,
      description,
      color: color || '#4f46e5'
    });
    res.status(201).json(department);
  } catch (err) {
    console.error('POST /departments Error:', err.message);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// PATCH /api/departments/:id
router.patch('/:id', checkPermission('manage_settings'), async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const [updated] = await Department.update(
      { name, description, color },
      { where: { _id: req.params.id, tenantId: req.tenantId } }
    );
    if (!updated) return res.status(404).json({ error: 'Department not found' });
    const department = await Department.findByPk(req.params.id);
    res.json(department);
  } catch (err) {
    console.error('PATCH /departments/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// DELETE /api/departments/:id
router.delete('/:id', checkPermission('manage_settings'), async (req, res) => {
  try {
    const department = await Department.findOne({ where: { _id: req.params.id, tenantId: req.tenantId } });
    if (!department) return res.status(404).json({ error: 'Department not found' });
    
    // Check if positions exist
    const positions = await Position.count({ where: { departmentId: req.params.id } });
    if (positions > 0) return res.status(400).json({ error: 'Cannot delete department with active positions' });

    await department.destroy();
    res.json({ message: 'Department removed' });
  } catch (err) {
    console.error('DELETE /departments/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

module.exports = router;
