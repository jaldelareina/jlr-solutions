import type { APIRoute } from 'astro';
import { config } from '../../lib/env';

const SYSTEM_PROMPT = `Eres un asistente de JLR Solutions, empresa especializada en:
- Automatización de procesos empresariales
- Chatbots impulsados por IA
- Integración de sistemas (ERPs, CRMs, bases de datos)
- IA aplicada al negocio (modelos de predicción, análisis inteligente)
- Consultoría tecnológica para transformación digital

Responde de manera profesional, amable y concisa. Si el usuario pregunta algo fuera de tu ámbito, sugiere contactar directamente.
Siempre mantén el tono cercano pero técnico. Puedes hacer bromas ligeras si encaja.`;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Mensaje vacío' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const openaiKey = config.openai.apiKey;
    const anthropicKey = config.anthropic.apiKey;

    if (!openaiKey && !anthropicKey) {
      console.log('Debug - OpenAI Key:', openaiKey ? 'SET' : 'MISSING');
      console.log('Debug - Anthropic Key:', anthropicKey ? 'SET' : 'MISSING');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'API no configurada. Contacta directamente.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let response;

    if (openaiKey) {
      response = await callOpenAI(message, openaiKey);
    } else {
      response = await callAnthropic(message, anthropicKey!);
    }

    return new Response(
      JSON.stringify({ success: true, reply: response }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en chat API:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error procesando tu mensaje',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

async function callOpenAI(message: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI error: ${response.statusText} - ${error}`);
  }

  const data = await response.json() as any;
  return data.choices[0].message.content;
}

async function callAnthropic(message: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: message },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic error: ${response.statusText} - ${error}`);
  }

  const data = await response.json() as any;
  return data.content[0].text;
}
