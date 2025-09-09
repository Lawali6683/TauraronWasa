
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
    const requestBody = await request.json();
    const { matchId, homeTeamName, awayTeamName, date } = requestBody;
    const FOOTBALL_API_TOKEN = "b75541b8a8cc43719195871aa2bd419e";
    const TRANSLATE_API_KEY = "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";
    const TRANSLATE_API_URL = "https://openrouter.ai/api/v1/chat/completions";

    let matchDetails;

   
    if (matchId) {
      const res = await fetch(`https://api.football-data.org/v4/matches/${matchId}`, {
        headers: { "X-Auth-Token": FOOTBALL_API_TOKEN },
      });
      if (res.ok) {
        matchDetails = await res.json();
      } else {
        const errorText = await res.text();
        console.error(`Football API Error (by matchId): ${res.status} - ${errorText}`);
      }
    }

 
    if (!matchDetails && homeTeamName && awayTeamName && date) {
      const res = await fetch(
        `https://api.football-data.org/v4/matches?dateFrom=${date}&dateTo=${date}`,
        { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }
      );
      if (res.ok) {
        const data = await res.json();
        matchDetails = data.matches.find(
          (m) =>
            m.homeTeam?.name?.toLowerCase() === homeTeamName.toLowerCase() &&
            m.awayTeam?.name?.toLowerCase() === awayTeamName.toLowerCase()
        );
      } else {
        const errorText = await res.text();
        console.error(`Football API Error (by teams/date): ${res.status} - ${errorText}`);
      }
    }

    
    if (!matchDetails) {
      const response = new Response(
        JSON.stringify({ error: true, message: "Ba'a samu bayanin wasan ba. Duba lambobin ID ko sunayen kungiyoyi." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
      return withCORSHeaders(response, origin);
    }

   
    const { homeTeam, awayTeam, score, status, venue, competition, matchday } = matchDetails;
    let shortDetails = "";

    switch (status) {
      case "FINISHED":
        shortDetails += `Wasan ya kare. Sakamako: ${score.fullTime.home} - ${score.fullTime.away}.`;
        break;
      case "IN_PLAY":
        shortDetails += "Wasan yana gudana a yanzu.";
        break;
      case "SCHEDULED":
        shortDetails += "Wasan bai fara ba tukuna.";
        break;
      default:
        shortDetails += "Ba'a san halin da wasan yake ciki ba.";
    }

    shortDetails += ` Wasa tsakanin ${homeTeam.name} da ${awayTeam.name}.`;
    if (venue) shortDetails += ` An buga wasan a: ${venue}.`;
    if (competition?.name) shortDetails += ` Daga gasar: ${competition.name}.`;
    if (matchday) shortDetails += ` Kwana na wasa: ${matchday}.`;

    let hausaTranslation = shortDetails; 
    try {
      const translateRes = await fetch(TRANSLATE_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TRANSLATE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [{ role: "user", content: `Ka fassara wannan zuwa Hausa kawai: ${shortDetails}` }],
        }),
      });
      if (translateRes.ok) {
        const out = await translateRes.json();
        hausaTranslation = out.choices?.[0]?.message?.content?.trim() || shortDetails;
      } else {
        const errorText = await translateRes.text();
        console.error(`Translation API Error: ${translateRes.status} - ${errorText}`);
      }
    } catch (e) {
      console.error("Translation error:", e.message, e.stack);
    }

   
    const finalData = { ...matchDetails, hausaDetails: hausaTranslation };
    const response = new Response(JSON.stringify(finalData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    return withCORSHeaders(response, origin);
  } catch (e) {
   
    console.error("Server error in labarinWasa.js:", e.message, e.stack);

    const errorResponse = new Response(
      JSON.stringify({
        error: true,
        message: "Server error while fetching match details.",
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