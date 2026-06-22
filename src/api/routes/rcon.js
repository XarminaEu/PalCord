const express = require('express');
const router = express.Router();
const { exec } = require('../../rcon/commands');

router.post('/command', async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: 'command is required' });
    const result = await exec(command);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
