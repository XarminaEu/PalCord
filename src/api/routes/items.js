const express = require('express');
const router = express.Router();
const db = require('../../database/db');

router.get('/', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM items ORDER BY category, name').all();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
