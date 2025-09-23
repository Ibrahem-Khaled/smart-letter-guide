import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
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

app.listen(process.env.PORT || 3001, () => {
  console.log(`Server on http://localhost:${process.env.PORT || 3001}`);
});
