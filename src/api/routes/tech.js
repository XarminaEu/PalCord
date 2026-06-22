const express = require('express');
const router = express.Router();
const db = require('../../database/db');

router.get('/', (req, res) => {
  try {
    const tech = db.prepare('SELECT * FROM technologies ORDER BY name').all();
    res.json(tech);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
