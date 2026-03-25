const { Booking, Resource, User } = require('../models');
const { Op } = require('sequelize');

exports.getAllResources = async (req, res) => {
  try {
    const resources = await Resource.findAll({
      where: { tenantId: req.tenantId, isActive: true }
    });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createResource = async (req, res) => {
  try {
    const resource = await Resource.create({
      ...req.body,
      tenantId: req.tenantId
    });
    res.status(201).json(resource);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const { resourceId, startTime, endTime, userId, notes } = req.body;

    const resource = await Resource.findOne({
      where: { _id: resourceId, tenantId: req.tenantId }
    });
    if (!resource) return res.status(404).json({ error: 'Resource not found' });

    const overlap = await Booking.findOne({
      where: {
        resourceId,
        status: 'CONFIRMED',
        [Op.or]: [
          {
            startTime: { [Op.lt]: endTime },
            endTime: { [Op.gt]: startTime }
          }
        ]
      }
    });

    if (overlap) {
      return res.status(409).json({ 
        error: 'Time slot already booked',
        conflict: { start: overlap.startTime, end: overlap.endTime }
      });
    }

    const durationHours = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60);
    const totalPrice = durationHours * resource.hourlyRate;

    const booking = await Booking.create({
      tenantId: req.tenantId,
      resourceId,
      userId: userId || req.user._id,
      startTime,
      endTime,
      totalPrice,
      notes
    });

    res.status(201).json(booking);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getTenantBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      where: { tenantId: req.tenantId },
      include: [
        { model: Resource, attributes: ['name', 'type'] },
        { model: User, attributes: ['email'] }
      ],
      order: [['startTime', 'ASC']]
    });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
