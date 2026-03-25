const express = require('express');
const { Product } = require('../models');
const { checkPermission } = require('../middlewares/checkPermission');
const { requireModule } = require('../middlewares/requireModule');

const router = express.Router();

/**
 * GET /api/products
 * List all products for the current tenant
 */
router.get('/', async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { 
        tenantId: req.tenantId,
        isActive: true 
      },
      order: [['name', 'ASC']]
    });
    res.json(products);
  } catch (err) {
    console.error('GET /products Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * POST /api/products
 * Create a new product
 */
router.post('/', checkPermission('manage_inventory'), async (req, res) => {
  try {
    const { name, description, sku, price, stockLevel, category, imageUrl } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const product = await Product.create({
      tenantId: req.tenantId,
      name,
      description,
      sku,
      price,
      stockLevel: stockLevel || 0,
      category,
      imageUrl,
    });

    res.status(201).json(product);
  } catch (err) {
    console.error('POST /products Error:', err.message);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

/**
 * PATCH /api/products/:id
 */
router.patch('/:id', checkPermission('manage_inventory'), async (req, res) => {
  try {
    const [updatedCount] = await Product.update(req.body, {
      where: { _id: req.params.id, tenantId: req.tenantId }
    });

    if (updatedCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = await Product.findByPk(req.params.id);
    res.json(product);
  } catch (err) {
    console.error('PATCH /products/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

/**
 * DELETE /api/products/:id
 */
router.delete('/:id', checkPermission('manage_inventory'), async (req, res) => {
  try {
    const product = await Product.findOne({ where: { _id: req.params.id, tenantId: req.tenantId } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    await product.destroy();
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('DELETE /products/:id Error:', err.message);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
