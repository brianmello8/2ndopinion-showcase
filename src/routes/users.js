const express = require('express');
const { pool } = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id/orders
router.get('/:id/orders', authenticate, async (req, res, next) => {
  try {
    const userId = req.params.id;

    if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'SELECT COUNT(*) as total, SUM(amount) as total_spent FROM orders WHERE user_id = $1',
      [userId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/users — admin only
router.get('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT id, email, name, role, created_at FROM users';
    const params = [];

    if (search) {
      query += ' WHERE email ILIKE $1 OR name ILIKE $1';
      params.push(`%${search}%`);
      query += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
      params.push(limit, offset);
    } else {
      query += ' ORDER BY created_at DESC LIMIT $1 OFFSET $2';
      params.push(limit, offset);
    }

    const result = await pool.query(query, params);
    res.json({ users: result.rows, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
