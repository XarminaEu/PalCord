const express = require('express');
const router = express.Router();
const playerService = require('../../services/playerService');

router.get('/', async (req, res) => {
  try {
    res.json(playerService.getPlayers());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/online', async (req, res) => {
  try {
    const players = await playerService.getOnlinePlayers();
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const player = playerService.getPlayerById(req.params.id);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
