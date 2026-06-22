const express = require('express');
const router = express.Router();
const db = require('../../database/db');

router.get('/', (req, res) => {
  try {
    const pals = db.prepare('SELECT * FROM pals ORDER BY is_boss, name').all();
    res.json(pals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
