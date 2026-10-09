import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPPORTED_GROQ_MODELS = [
  {
    id: 'qwen/qwen3.8-27b',
    label: 'Qwen 3.8 27B (Ultra-Fast Grounded)',
  },
  {
    id: 'openai/gpt-oss-120b',
    label: 'GPT-OSS 120B (Deep Reasoning)',
  },
  {
    id: 'openai/gpt-oss-20b',
    label: 'GPT-OSS 20B (Balanced Reasoning)',
  },
];

const DEFAULT_GROQ_MODEL = 'qwen/qwen3.8-27b';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '2mb' }));

  // 1. Check Groq API configuration & optional live connectivity test
  app.get('/api/groq/status', async (req, res) => {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      res.json({
        configured: false,
        verified: false,
        defaultModel: DEFAULT_GROQ_MODEL,
        models: SUPPORTED_GROQ_MODELS,
        message: 'GROQ_API_KEY is not set in server environment secrets.',
      });
      return;
    }

    if (req.query.verify === 'true') {
      const startTime = Date.now();
      try {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });
        if (!response.ok) {
          const errText = await response.text();
          res.status(200).json({
            configured: true,
            verified: false,
            defaultModel: DEFAULT_GROQ_MODEL,
            models: SUPPORTED_GROQ_MODELS,
            message: `Groq API returned HTTP ${response.status}: ${errText.slice(0, 140)}`,
          });
          return;
        }
        const data = (await response.json()) as { data?: { id: string }[] };
        const latencyMs = Date.now() - startTime;
        res.json({
          configured: true,
          verified: true,
          latencyMs,
          availableCount: data.data?.length || 0,
          defaultModel: DEFAULT_GROQ_MODEL,
          models: SUPPORTED_GROQ_MODELS,
          message: `Connected to Groq API (${data.data?.length || 0} models available, ${latencyMs}ms).`,
        });
        return;
      } catch (err) {
        res.status(200).json({
          configured: true,
          verified: false,
          defaultModel: DEFAULT_GROQ_MODEL,
          models: SUPPORTED_GROQ_MODELS,
          message: err instanceof Error ? err.message : 'Failed to reach Groq API.',
        });
        return;
      }
    }

    res.json({
      configured: true,
      verified: true,
      defaultModel: DEFAULT_GROQ_MODEL,
      models: SUPPORTED_GROQ_MODELS,
      message: 'GROQ_API_KEY is configured on server.',
    });
  });

  // 2. Grounded Conversation Question Answering via Groq LLM
  app.post('/api/groq/qa', async (req, res) => {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      res.status(400).json({ error: 'GROQ_API_KEY is not configured on the server.' });
      return;
    }

    const { question, conversationName, userName, messagesContext, model } = req.body as {
      question?: string;
      conversationName?: string;
      userName?: string;
      messagesContext?: string;
      model?: string;
    };

    if (!question || !messagesContext) {
      res.status(400).json({ error: 'Missing question or messagesContext.' });
      return;
    }

    const selectedModel =
      SUPPORTED_GROQ_MODELS.find((m) => m.id === model)?.id || DEFAULT_GROQ_MODEL;
    const startTime = Date.now();

    try {
      const systemPrompt = `You are the grounded analytical AI engine for "What Did I Miss?", an intelligent chat catch-up assistant.
Your job is to answer the user's question strictly using ONLY the provided chat transcript from "${conversationName || 'Group Chat'}".
${userName ? `The current user's name in the chat is "${userName}".` : ''}

CRITICAL GROUNDING RULES:
1. NEVER invent, guess, or fabricate facts, dates, deadlines, or task owners that are not in the messages.
2. Cite the original message number in the format #N (e.g., #6, #12) along with the sender name and timestamp whenever available so the user can click to verify the source.
3. If a later message revises or supersedes an earlier plan or schedule, clearly state the final updated decision/schedule and mention which earlier message (#N) was superseded.
4. Distinguish between explicitly stated dates and relative dates ("tomorrow", "next Friday").
5. If the answer cannot be found in the provided messages, state clearly that the imported conversation does not contain that information.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Imported Chat Messages:\n${messagesContext}\n\nUser Question: ${question}\n\nProvide a clear, concise, grounded answer with #message citations:`,
            },
          ],
          temperature: 0.15,
          max_tokens: 900,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        res.status(response.status).json({
          error: `Groq API error (${response.status}): ${errBody.slice(0, 200)}`,
        });
        return;
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const rawContent = data.choices?.[0]?.message?.content?.trim() || '';
      const cleanAnswer = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

      res.json({
        answer: cleanAnswer,
        modelUsed: selectedModel,
        latencyMs: Date.now() - startTime,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Groq Q&A request failed.',
      });
    }
  });

  // 3. Grounded Multi-Length Conversation Summary via Groq LLM
  app.post('/api/groq/summarize', async (req, res) => {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      res.status(400).json({ error: 'GROQ_API_KEY is not configured on the server.' });
      return;
    }

    const { conversationName, userName, messagesContext, model } = req.body as {
      conversationName?: string;
      userName?: string;
      messagesContext?: string;
      model?: string;
    };

    if (!messagesContext) {
      res.status(400).json({ error: 'Missing messagesContext.' });
      return;
    }

    const selectedModel =
      SUPPORTED_GROQ_MODELS.find((m) => m.id === model)?.id || DEFAULT_GROQ_MODEL;
    const startTime = Date.now();

    try {
      const systemPrompt = `You are the grounded summarization engine for "What Did I Miss?".
Analyze the provided chat messages from "${conversationName || 'Group Chat'}"${
        userName ? ` (User: "${userName}")` : ''
      } and return a JSON object with four keys:
- "overallBrief": A concise 2-to-3 sentence executive summary highlighting the most urgent updates, active decisions/revisions, deadlines, and open questions. Include inline message references like (#6) or (#12).
- "veryShort": An array of 3 concise bullet strings covering only the highest-priority announcements, deadlines, and assigned tasks, each citing (#N), sender, and timestamp.
- "standard": An array of 5 bullet strings covering urgent announcements, decisions (and any superseded plans), deadlines, assigned tasks, and unanswered questions, each citing (#N).
- "detailed": An array of 7 to 10 comprehensive bullet strings detailing every important announcement, schedule/decision revision, explicit vs uncertain task owner, deadline resolution, and unanswered question, each citing (#N).

STRICT RULES:
1. Never invent facts, dates, or task owners.
2. Ignore jokes, sarcasm (e.g. "jk", "imagine if"), and duplicate messages.
3. Explicitly note when a later message supersedes or changes an earlier plan/date.
4. Always include message references in the exact format #N (e.g., #6, #14) so the UI can link them to the source message.
5. Output valid JSON only.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Chat Transcript:\n${messagesContext}\n\nReturn the grounded JSON summary object:`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.15,
          max_tokens: 1400,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        res.status(response.status).json({
          error: `Groq API error (${response.status}): ${errBody.slice(0, 200)}`,
        });
        return;
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const rawJson = data.choices?.[0]?.message?.content?.trim() || '{}';
      const parsed = JSON.parse(rawJson) as {
        overallBrief?: string;
        veryShort?: string[];
        standard?: string[];
        detailed?: string[];
      };

      res.json({
        summary: {
          overallBrief: typeof parsed.overallBrief === 'string' ? parsed.overallBrief : '',
          veryShort: Array.isArray(parsed.veryShort) ? parsed.veryShort : [],
          standard: Array.isArray(parsed.standard) ? parsed.standard : [],
          detailed: Array.isArray(parsed.detailed) ? parsed.detailed : [],
        },
        modelUsed: selectedModel,
        latencyMs: Date.now() - startTime,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Groq summarization request failed.',
      });
    }
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
