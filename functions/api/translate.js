// ✅ Translate handler
export async function handleTranslate(request) {
  try {
    // ✅ Handle OPTIONS (CORS preflight)
    if (request.method === "OPTIONS") {
      return handleOptions();
    }

    // ✅ Binciken method
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    // ✅ Binciken API key
    const API_KEY = "@haruna66";
    const apiKeyHeader = request.headers.get("x-api-key");
    if (apiKeyHeader !== API_KEY) {
      return jsonResponse({ error: "Invalid API key" }, 403);
    }

    // ✅ Karɓar request body
    const { text, targetLang } = await request.json();
    if (!text || !targetLang) {
      return jsonResponse({ error: "Missing text or targetLang in request body" }, 400);
    }

    // ✅ Aika request zuwa OpenRouter
    const OPENROUTER_API_KEY =
      "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";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://leadwaypeace.pages.dev", // zaka iya maye gurbin da naka domain
        "X-Title": "Leadway App",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a translator. Translate the following text into ${targetLang}. 
            Maintain the original formatting, including line breaks and gaps. 
            If the target language is not supported, do not translate and respond with the original text.`
          },
          {
            role: "user",
            content: text
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return jsonResponse(
        { error: "OpenRouter API error", details: data },
        response.status
      );
    }

    // ✅ Ciro sakon da aka fassara
    const translatedText = data?.choices?.[0]?.message?.content || text;

    return jsonResponse({ translatedText }, 200);
  } catch (error) {
    return jsonResponse(
      { error: "Translation failed", details: error.message },
      500
    );
  }
}

// ✅ Helper don bada JSON response tare da CORS headers
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key"
    }
  });
}

// ✅ Handle OPTIONS (CORS preflight)
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key"
    }
  });
}
