
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
    const { date, game1Name, game2Name } = await request.json();
    const FOOTBALL_API_TOKEN = "b75541b8a8cc43719195871aa2bd419e";

    
    if (!date || !game1Name || !game2Name) {
      const response = new Response(
        JSON.stringify({ error: true, message: "Missing required parameters: date, game1Name, and game2Name." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
      return withCORSHeaders(response, origin);
    }

   
    const footballApiUrl = `https://api.football-data.org/v4/matches?dateFrom=${date}&dateTo=${date}`;
    const apiResponse = await fetch(footballApiUrl, {
      headers: { 'X-Auth-Token': FOOTBALL_API_TOKEN }
    });

    
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`Error from Football API: ${apiResponse.status} - ${errorText}`);
      const response = new Response(
        JSON.stringify({ error: true, message: `Failed to fetch football data from external API: ${apiResponse.statusText}` }),
        { status: apiResponse.status, headers: { "Content-Type": "application/json" } }
      );
      return withCORSHeaders(response, origin);
    }

    const data = await apiResponse.json();
    const match = data.matches.find(m =>
      (m.homeTeam.name === game1Name && m.awayTeam.name === game2Name) ||
      (m.homeTeam.name === game2Name && m.awayTeam.name === game1Name)
    );

    if (match && match.status === 'FINISHED') {
      const finalData = {
        homeScore: match.score.fullTime.home,
        awayScore: match.score.fullTime.away,
      };
      const response = new Response(JSON.stringify(finalData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      return withCORSHeaders(response, origin);
    }

    const response = new Response(
      JSON.stringify({ error: true, message: "Match not found or not finished." }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
    return withCORSHeaders(response, origin);

  } catch (e) {
   
    console.error("Server error in football.js:", e.message, e.stack);

    const errorResponse = new Response(
      JSON.stringify({
        error: true,
        message: "Internal server error.",
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