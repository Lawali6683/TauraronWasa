export async function handleLabarinWasa(request) {
  return new Response("Labarin Wasa handler is working!", { status: 200 });
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const { headers } = request;
  const WORKER_API_KEY = headers.get('x-api-key');
  const contentType = headers.get("content-type") || "";

  // ✅ CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    "Content-Type": "application/json"
  };

  // 📌 OPTIONS (preflight)
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // 🔑 Tabbatar da API key
  if (WORKER_API_KEY !== "@haruna66") {
    return new Response(
      JSON.stringify({ error: true, message: "Invalid API Key" }),
      { status: 401, headers: corsHeaders }
    );
  }

  // 🛑 Tabbatar da POST + JSON
  if (request.method !== "POST" || !contentType.includes("application/json")) {
    return new Response(
      JSON.stringify({ error: true, message: "Invalid Request Method or Content-Type" }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const requestBody = await request.json();
    const { matchId, homeTeamName, awayTeamName, date } = requestBody;
    let matchDetails;

    // ⚽ Football API
    const FOOTBALL_API_TOKEN = "b75541b8a8cc43719195871aa2bd419e";

    // Idan an bayar da matchId
    if (matchId) {
      const res = await fetch(`https://api.football-data.org/v4/matches/${matchId}`, {
        headers: { "X-Auth-Token": FOOTBALL_API_TOKEN }
      });
      if (res.ok) matchDetails = await res.json();
    }

    // Idan babu matchId → bincika da sunayen ƙungiya + kwanan wata
    if (!matchDetails && homeTeamName && awayTeamName && date) {
      const res = await fetch(
        `https://api.football-data.org/v4/matches?dateFrom=${date}&dateTo=${date}`,
        { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }
      );
      if (res.ok) {
        const data = await res.json();
        matchDetails = data.matches.find(m =>
          m.homeTeam?.name?.toLowerCase() === homeTeamName.toLowerCase() &&
          m.awayTeam?.name?.toLowerCase() === awayTeamName.toLowerCase()
        );
      }
    }

    // Idan ba’a samu ba
    if (!matchDetails) {
      return new Response(
        JSON.stringify({ error: true, message: "Ba'a samu bayanin wasan ba." }),
        { status: 404, headers: corsHeaders }
      );
    }

    // ✍ Shirya bayani
    const { homeTeam, awayTeam, score, status, venue, competition, matchday } = matchDetails;
    let shortDetails = "";

    if (status === "FINISHED") {
      shortDetails += `Wannan wasa ya kare. Sakamako: ${score.fullTime.home} - ${score.fullTime.away}.`;
    } else if (status === "IN_PLAY") {
      shortDetails += "Wasan yana gudana a yanzu.";
    } else if (status === "SCHEDULED") {
      shortDetails += "Wasan bai fara ba tukuna.";
    }
    shortDetails += ` ${homeTeam.name} da ${awayTeam.name}.`;
    if (venue) shortDetails += ` Wuri: ${venue}.`;
    if (competition?.name) shortDetails += ` Gasar: ${competition.name}.`;
    if (matchday) shortDetails += ` Kwanan wasa: ${matchday}.`;

    // 🌍 Translation (Hausa)
    let hausaTranslation = null;
    try {
      const TRANSLATE_API_KEY = "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";
      const TRANSLATE_API_URL = "https://openrouter.ai/api/v1/chat/completions";

      const translateRes = await fetch(TRANSLATE_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TRANSLATE_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-4o",
          messages: [{ role: "user", content: `Ka fassara wannan zuwa Hausa: ${shortDetails}` }]
        })
      });

      if (translateRes.ok) {
        const out = await translateRes.json();
        hausaTranslation = out.choices?.[0]?.message?.content?.trim() || "";
      }
    } catch (e) {
      console.error("Translation error:", e.message);
    }

    // 📦 Final response
    const finalData = { ...matchDetails, hausaDetails: hausaTranslation };
    return new Response(JSON.stringify(finalData), { status: 200, headers: corsHeaders });

  } catch (e) {
    return new Response(
      JSON.stringify({
        error: true,
        message: "Server error while fetching match details.",
        details: e.message
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}
