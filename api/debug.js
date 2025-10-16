export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { code } = await req.json();

  const prompt = `
You are an expert developer. Analyze this code:

${code}

Tasks:
1. Identify bugs or mistakes.
2. Suggest improvements.
3. Provide a brief explanation.
`;

  const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://your-site-name.vercel.app", // Change this to your real domain
      "X-Title": "VR Debug Assistant"
    },
    body: JSON.stringify({
      model: "mistralai/mistral-7b-instruct",
      messages: [
        { role: "user", content: prompt }
      ]
    })
  });

  const aiData = await aiRes.json();
  const reply = aiData.choices?.[0]?.message?.content || "No suggestion from AI.";

  res.status(200).json({ suggestions: reply });
}
