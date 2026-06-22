const express = require('express');
const router = express.Router();
const serverStatusService = require('../../services/serverStatusService');
const { isConnected } = require('../../rcon/client');

router.get('/info', async (req, res) => {
  try {
    const status = await serverStatusService.getStatus();
    res.json({
      online: status.isOnline,
      name: status.name,
      version: status.version,
      address: status.address,
      players: {
        current: status.currentPlayers,
        max: status.maxPlayers,
        list: status.playerNames,
      },
      bans: status.bansCount,
      votes: status.votesCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/health', async (req, res) => {
  try {
    const rconOk = await isConnected();
    res.json({ rcon: rconOk, database: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
