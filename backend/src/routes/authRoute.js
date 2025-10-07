import express from 'express';

const router = express.Router();

// Just creating a minimal implementation to make the test pass
router.post('/login', (req, res) => {
  res.json({ message: 'Auth route placeholder' });
});

export default router;