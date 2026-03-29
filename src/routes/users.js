const express = require('express');
const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
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

router.get('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const countResult = await db.query('SELECT COUNT(*) FROM users');
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await db.query(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json({ users: result.rows, total, page, limit });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/orders', authenticate, async (req, res, next) => {
  try {
    const userId = req.params.id;
    if (req.user.role !== 'admin' && req.user.id !== parseInt(userId, 10)) {
      return res.status(403).json({ error: 'Cannot view other users\x27 orders' });
    }

    const result = await db.query(
      'SELECT id, status, total, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
