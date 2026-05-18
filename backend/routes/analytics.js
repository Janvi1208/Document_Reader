const express = require('express');
const router = express.Router();
const { getDbSync } = require('../db/init');

router.get('/', (req, res) => {
  try {
    // Totals
    const totalUploads = getDbSync().prepare(`SELECT COUNT(*) as c FROM uploads`).get().c;
    const totalRecords = getDbSync().prepare(`SELECT COUNT(*) as c FROM records`).get().c;
    const approvedRecords = getDbSync().prepare(`SELECT COUNT(*) as c FROM records WHERE status='approved'`).get().c;
    const needsReview = getDbSync().prepare(`SELECT COUNT(*) as c FROM records WHERE status='needs_review'`).get().c;
    const pendingReview = getDbSync().prepare(`SELECT COUNT(*) as c FROM records WHERE status='pending_review'`).get().c;
    const rejectedRecords = getDbSync().prepare(`SELECT COUNT(*) as c FROM records WHERE status='rejected'`).get().c;

    // Validation failures count
    const validationFailures = getDbSync().prepare(`
      SELECT COUNT(*) as c FROM records WHERE validation_errors IS NOT NULL AND validation_errors != '[]'
    `).get().c;

    // Shift-wise summary
    const shiftSummary = getDbSync().prepare(`
      SELECT shift, COUNT(*) as count, COALESCE(SUM(quantity_produced),0) as total_qty,
        COALESCE(AVG(quantity_produced),0) as avg_qty, COALESCE(SUM(time_taken),0) as total_hours
      FROM records WHERE shift IS NOT NULL AND shift != ''
      GROUP BY shift ORDER BY count DESC
    `).all();

    // Machine-wise summary
    const machineSummary = getDbSync().prepare(`
      SELECT machine_number, COUNT(*) as count,
        COALESCE(SUM(quantity_produced),0) as total_qty,
        COALESCE(AVG(time_taken),0) as avg_time
      FROM records WHERE machine_number IS NOT NULL AND machine_number != ''
      GROUP BY machine_number ORDER BY count DESC LIMIT 10
    `).all();

    // Daily production trend (last 30 days)
    const dailyTrend = getDbSync().prepare(`
      SELECT date, COUNT(*) as record_count, COALESCE(SUM(quantity_produced),0) as total_qty
      FROM records WHERE date IS NOT NULL AND date >= date('now', '-30 days')
      GROUP BY date ORDER BY date ASC
    `).all();

    // Total quantity
    const totalQty = getDbSync().prepare(`SELECT COALESCE(SUM(quantity_produced),0) as total FROM records`).get().total;
    const avgQty = getDbSync().prepare(`SELECT COALESCE(AVG(quantity_produced),0) as avg FROM records WHERE quantity_produced IS NOT NULL`).get().avg;

    // Recent uploads
    const recentUploads = getDbSync().prepare(`
      SELECT u.*, r.status as record_status, r.work_order_number
      FROM uploads u LEFT JOIN records r ON u.id = r.upload_id
      ORDER BY u.created_at DESC LIMIT 5
    `).all();

    // Status distribution
    const statusDist = getDbSync().prepare(`
      SELECT status, COUNT(*) as count FROM records GROUP BY status
    `).all();

    // Top work orders by quantity
    const topWorkOrders = getDbSync().prepare(`
      SELECT work_order_number, machine_number, shift, quantity_produced, date
      FROM records WHERE work_order_number IS NOT NULL AND quantity_produced IS NOT NULL
      ORDER BY quantity_produced DESC LIMIT 10
    `).all();

    res.json({
      summary: {
        totalUploads, totalRecords, approvedRecords, needsReview,
        pendingReview, rejectedRecords, validationFailures, totalQty,
        avgQty: Math.round(avgQty * 100) / 100
      },
      shiftSummary,
      machineSummary,
      dailyTrend,
      recentUploads,
      statusDist,
      topWorkOrders
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
