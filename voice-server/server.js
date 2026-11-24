import 'dotenv/config';
import cors from 'cors';
import express from 'express';

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
// Image attachments are sent as base64 inside the JSON request.
app.use(express.json({ limit: '15mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/realtime/session', async (_req, res) => {
  console.log('Realtime session requested');
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the voice server.' });
  }

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: 'gpt-realtime-2.1-mini',
          instructions:
            'You are Kissan AI, a concise and practical voice assistant for Indian farmers. Give safe, clear agricultural guidance and ask clarifying questions when needed.',
          audio: {
            input: {
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
                create_response: true,
                interrupt_response: true,
              },
            },
            output: { voice: 'alloy' },
          },
        },
      }),
    });

    const data = await openaiResponse.json();
    return res.status(openaiResponse.status).json(data);
  } catch (error) {
    console.error('Realtime session error:', error);
    return res.status(500).json({ error: 'Failed to create Realtime session.' });
  }
});

app.post('/chat', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the voice server.' });
  }

  const { message, imageBase64, imageMimeType = 'image/jpeg' } = req.body || {};
  console.log(`Chat request received (image bytes: ${imageBase64?.length || 0})`);
  if (!message?.trim()) {
    return res.status(400).json({ error: 'A message is required.' });
  }

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are Kissan AI, a helpful assistant dedicated to supporting Indian farmers with accurate, practical guidance on farming practices, government schemes, and Indian agriculture.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: message.trim() },
              ...(imageBase64 ? [{ type: 'image_url', image_url: { url: `data:${imageMimeType};base64,${imageBase64}` } }] : []),
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    const data = await openaiResponse.json();
    if (!openaiResponse.ok) return res.status(openaiResponse.status).json(data);
    return res.json({ reply: data.choices?.[0]?.message?.content?.trim() || 'No response received.' });
  } catch (error) {
    console.error('Chat request error:', error);
    return res.status(500).json({ error: 'Failed to contact OpenAI.' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`KissanSeva voice server listening on http://localhost:${port}`);
});
