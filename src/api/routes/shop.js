const express = require('express');
const router = express.Router();
const shopService = require('../../services/shopService');

router.get('/', async (req, res) => {
  try {
    res.json(shopService.getShopItems());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { item_id, item_type, price, amount, level, egg_id } = req.body;
    const id = shopService.addShopItem(item_id, item_type, price, amount, level, egg_id);
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const ok = shopService.updateShopItem(req.params.id, req.body);
    if (!ok) return res.status(404).json({ error: 'Shop item not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const ok = shopService.deleteShopItem(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Shop item not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/buy', async (req, res) => {
  try {
    const { player_id, shop_item_id } = req.body;
    const result = await shopService.buyItem(player_id, shop_item_id);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
