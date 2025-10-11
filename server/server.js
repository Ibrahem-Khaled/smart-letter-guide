import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();

// Configure CORS for production
const allowedOrigins = [
  'http://localhost:5173',
  'https://ibrahem-khaled.github.io',
  'https://smart-letter-guide.vercel.app'
];

app.use(cors({ 
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());

app.get('/api/ephemeral', async (_req, res) => {
  try {
    const resp = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: 'gpt-realtime'   // موديل الصوت الفوري
        }
      })
    });
    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json(data);
    // data.value: المفتاح المؤقت ek_...
    return res.json({ apiKey: data.value });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'failed_to_generate_ephemeral_key' });
  }
});

// Export for Vercel
export default app;

// Start server only if not in Vercel environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(process.env.PORT || 3001, () => {
    console.log(`Server on http://localhost:${process.env.PORT || 3001}`);
  });
}
