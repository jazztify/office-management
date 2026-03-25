const express = require('express');
const { Position, Department, EmployeeProfile, Role } = require('../models');
const { checkPermission } = require('../middlewares/checkPermission');

const router = express.Router();

// GET /api/positions - List all positions in tenant
router.get('/', checkPermission('view_settings'), async (req, res) => {
  try {
    const { departmentId } = req.query;
    const where = { tenantId: req.tenantId };
    if (departmentId) where.departmentId = departmentId;

    const positions = await Position.findAll({
      where,
      include: [
        { model: Department, attributes: ['name', 'color'] },
        { model: Role, attributes: ['name', 'color'] }
      ]
    });
    res.json(positions);
  } catch (err) {
    console.error('GET /positions Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

// POST /api/positions - Create new position
router.post('/', checkPermission('manage_settings'), async (req, res) => {
  try {
    let { name, departmentId, roleId, parentPositionId, permissions, description, salaryRangeMin, salaryRangeMax } = req.body;
    
    // Sanitize optional and numeric fields
    roleId = roleId === '' ? null : roleId;
    parentPositionId = parentPositionId === '' ? null : parentPositionId;
    salaryRangeMin = salaryRangeMin === '' ? 0 : salaryRangeMin;
    salaryRangeMax = salaryRangeMax === '' ? 0 : salaryRangeMax;

    const position = await Position.create({
      tenantId: req.tenantId,
      departmentId,
      roleId,
      parentPositionId,
      permissions: permissions || [],
      name,
      description,
      salaryRangeMin,
      salaryRangeMax
    });
    res.status(201).json(position);
  } catch (err) {
    console.error('POST /positions Error:', err.message);
    res.status(500).json({ error: `Failed to create position: ${err.message}` });
  }
});

// PATCH /api/positions/:id
router.patch('/:id', checkPermission('manage_settings'), async (req, res) => {
  try {
    let { name, departmentId, roleId, parentPositionId, permissions, description, salaryRangeMin, salaryRangeMax } = req.body;

    // Sanitize optional and numeric fields
    roleId = roleId === '' ? null : roleId;
    parentPositionId = parentPositionId === '' ? null : parentPositionId;
    salaryRangeMin = salaryRangeMin === '' ? 0 : salaryRangeMin;
    salaryRangeMax = salaryRangeMax === '' ? 0 : salaryRangeMax;

    const [updated] = await Position.update(
      { name, departmentId, roleId, parentPositionId, permissions, description, salaryRangeMin, salaryRangeMax },
      { where: { _id: req.params.id, tenantId: req.tenantId } }
    );
    if (!updated) return res.status(404).json({ error: 'Position not found' });
    const position = await Position.findByPk(req.params.id);
    res.json(position);
  } catch (err) {
    console.error('PATCH /positions/:id Error:', err.message);
    res.status(500).json({ error: `Failed to update position: ${err.message}` });
  }
});

// DELETE /api/positions/:id
router.delete('/:id', checkPermission('manage_settings'), async (req, res) => {
  try {
    const position = await Position.findOne({ where: { _id: req.params.id, tenantId: req.tenantId } });
    if (!position) return res.status(404).json({ error: 'Position not found' });
    
    // Check if employees occupy this position
    const employees = await EmployeeProfile.count({ where: { positionId: req.params.id } });
    if (employees > 0) return res.status(400).json({ error: 'Cannot delete position occupied by employees' });

    await position.destroy();
    res.json({ message: 'Position removed' });
  } catch (err) {
    console.error('DELETE /positions/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to delete position' });
  }
});

module.exports = router;
