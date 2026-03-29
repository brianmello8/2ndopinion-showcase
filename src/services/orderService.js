const { pool } = require('../db/pool');
const { v4: uuidv4 } = require('uuid');

/**
 * Creates an order after verifying the user has sufficient credit balance.
 * Acquires a row-level lock on the user_credits row to prevent double-spend.
 */
async function createOrder(userId, items) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the user_credits row to prevent concurrent double-spend
    const balanceResult = await client.query(
      'SELECT credits FROM user_credits WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    if (balanceResult.rows.length === 0) {
      throw new Error('Credit account not found');
    }

    const currentCredits = balanceResult.rows[0].credits;
    const totalCost = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (currentCredits < totalCost) {
      throw new Error(`Insufficient credits: have ${currentCredits}, need ${totalCost}`);
    }

    await client.query(
      'UPDATE user_credits SET credits = credits - $1 WHERE user_id = $2',
      [totalCost, userId]
    );

    const orderId = uuidv4();
    const orderResult = await client.query(
      `INSERT INTO orders (id, user_id, items, amount, status, created_at)
       VALUES ($1, $2, $3, $4, 'pending', NOW())
       RETURNING *`,
      [orderId, userId, JSON.stringify(items), totalCost]
    );

    await client.query('COMMIT');
    return orderResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getUserOrders(userId, status = null) {
  let query = 'SELECT * FROM orders WHERE user_id = $1';
  const params = [userId];

  if (status) {
    query += ' AND status = $2';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const result = await pool.query(query, params);
  return result.rows;
}

async function updateOrderStatus(orderId, status, metadata = {}) {
  const validStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded'];

  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const result = await pool.query(
    `UPDATE orders SET status = $1, metadata = $2, updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [status, JSON.stringify(metadata), orderId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Order ${orderId} not found`);
  }

  return result.rows[0];
}

module.exports = { createOrder, getUserOrders, updateOrderStatus };
