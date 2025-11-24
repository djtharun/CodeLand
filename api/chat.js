// api/chat.js - AI Conversation Endpoint

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const { message, context, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build conversation prompt
    let prompt = buildConversationPrompt(message, context, history);

    // Call AI API
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.VERCEL_URL || 'http://localhost:3000',
        'X-Title': 'VR Debug Assistant Chat'
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are an expert code debugging assistant in a VR environment. Provide clear, concise, and helpful answers. When suggesting code fixes, format them clearly. Be encouraging and educational.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text();
      console.error('OpenRouter API error:', errorData);
      throw new Error(`AI API returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const response = aiData.choices?.[0]?.message?.content || 'I apologize, but I could not generate a response. Please try rephrasing your question.';

    return res.status(200).json({
      success: true,
      response: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      error: 'Chat failed',
      message: error.message,
      // Provide fallback response
      response: 'I encountered an error processing your request. Please try again or rephrase your question.'
    });
  }
}

function buildConversationPrompt(message, context, history) {
  let prompt = '';

  // Add context if available
  if (context) {
    prompt += 'Current debugging context:\n\n';

    if (context.includes('code')) {
      prompt += 'Code snippet:\n```\n' + context.substring(0, 500) + '\n```\n\n';
    }

    if (context.includes('issues')) {
      prompt += context + '\n\n';
    }
  }

  // Add conversation history for context
  if (history && history.length > 0) {
    prompt += 'Recent conversation:\n';
    history.slice(-3).forEach(msg => {
      prompt += `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.message}\n`;
    });
    prompt += '\n';
  }

  // Add current question
  prompt += `User question: ${message}\n\n`;
  prompt += 'Please provide a helpful, clear, and concise response. If discussing code, use proper formatting.';

  return prompt;
}