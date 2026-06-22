const express = require('express');
const router = express.Router();
const shopService = require('../../services/shopService');

router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    res.json(shopService.getTransactions(limit, offset));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
