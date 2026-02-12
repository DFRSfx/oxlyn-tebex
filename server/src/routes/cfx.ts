import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

router.get('/cfx-user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const response = await axios.get(
      `https://policy-live.fivem.net/api/getUserInfo/${userId}`,
      { timeout: 5000 }
    );

    res.json(response.data);
  } catch (error) {
    console.error('CFX user fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch CFX user info' });
  }
});

export default router;
