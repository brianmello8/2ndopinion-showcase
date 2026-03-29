const express = require('express');
const { authenticate } = require('../middleware/auth');
const { createOrder, getUserOrders, updateOrderStatus } = require('../services/orderService');

const router = express.Router();

// POST /api/orders
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    for (const item of items) {
      if (!item.product_id || !item.price || !item.quantity) {
        return res.status(400).json({ error: 'Each item must have product_id, price, and quantity' });
      }
    }

    const order = await createOrder(req.user.id, items);
    res.status(201).json(order);
  } catch (err) {
    if (err.message.startsWith('Insufficient credits')) {
      return res.status(402).json({ error: err.message });
    }
    next(err);
  }
});

// GET /api/orders
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status } = req.query;
    const orders = await getUserOrders(req.user.id, status);
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status, metadata } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const order = await updateOrderStatus(req.params.id, status, metadata);
    res.json(order);
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;
