
export async function onRequest(context) {
  const { request } = context;

 
  const origin = request.headers.get("Origin");
  const ALLOWED_ORIGINS = [
    "https://tauraronwasa.pages.dev",
    "https://leadwaypeace.pages.dev",
    "http://localhost:8080",
  ];

 
  if (request.method === "OPTIONS") {
    if (ALLOWED_ORIGINS.includes(origin)) {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-api-key",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    return new Response(null, { status: 403 }); 
  }


  const WORKER_API_KEY = request.headers.get("x-api-key");
  const contentType = request.headers.get("content-type") || "";

 
  if (WORKER_API_KEY !== "@haruna66") {
    const response = new Response(
      JSON.stringify({ error: true, message: "Invalid API Key" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
    return withCORSHeaders(response, origin);
  }

 
  if (request.method !== "POST" || !contentType.includes("application/json")) {
    const response = new Response(
      JSON.stringify({ error: true, message: "Invalid Request Method or Content-Type" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
    return withCORSHeaders(response, origin);
  }

  try {
    const { text, targetLang } = await request.json();
    const OPENROUTER_API_KEY = "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";

  
    if (!text || !targetLang) {
      const response = new Response(
        JSON.stringify({ error: true, message: "Required parameters 'text' or 'targetLang' are missing." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
      return withCORSHeaders(response, origin);
    }

   
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://leadwaypeace.pages.dev",
        "X-Title": "Leadway App",
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
      console.error("OpenRouter API error:", data);
      const errorResponse = new Response(
        JSON.stringify({
          error: true,
          message: "OpenRouter API error.",
          details: data.error || data,
        }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
      return withCORSHeaders(errorResponse, origin);
    }

    
    const translatedText = data?.choices?.[0]?.message?.content || text;

    const finalResponse = new Response(JSON.stringify({ translatedText }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    return withCORSHeaders(finalResponse, origin);

  } catch (e) {
    
    console.error("Server error in translate.js:", e.message, e.stack);

    const errorResponse = new Response(
      JSON.stringify({
        error: true,
        message: "Translation failed.",
        details: e.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
    return withCORSHeaders(errorResponse, origin);
  }
}


function withCORSHeaders(response, origin) {
  const ALLOWED_ORIGINS = [
    "https://tauraronwasa.pages.dev",
    "https://leadwaypeace.pages.dev",
    "http://localhost:8080",
  ];

  if (ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else {
    response.headers.set("Access-Control-Allow-Origin", "https://tauraronwasa.pages.dev");
  }
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, x-api-key");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}