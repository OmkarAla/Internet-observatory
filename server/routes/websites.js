import express from 'express';
import Website from '../models/Website.js';

const router = express.Router();

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

router.get('/', async (req, res) => {
  try {
    const websites = await Website.find().sort({ createdAt: -1 });
    res.json(websites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { url, name } = req.body;
    
    if (!url || !name) {
      return res.status(400).json({ error: 'URL and name are required' });
    }
    
    if (!isValidUrl(url)) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    const website = new Website({ url, name });
    await website.save();
    res.status(201).json(website);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const website = await Website.findByIdAndDelete(req.params.id);
    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }
    res.json({ message: 'Website deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/interval', async (req, res) => {
  try {
    const { checkInterval } = req.body;
    
    if (checkInterval !== null && (typeof checkInterval !== 'number' || checkInterval < 10000)) {
      return res.status(400).json({ error: 'Interval must be null or >= 10000ms' });
    }
    
    const website = await Website.findByIdAndUpdate(
      req.params.id,
      { checkInterval },
      { new: true }
    );
    
    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }
    
    res.json(website);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;