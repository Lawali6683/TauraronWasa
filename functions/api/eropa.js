
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
    const { stage } = requestBody;

    
    const FOOTBALL_API_TOKEN = "b75541b8a8cc43719195871aa2bd419e";
    const EUROPA_MATCHES_URL = `https://api.football-data.org/v4/competitions/EL/matches${
      stage ? `?stage=${stage}` : ""
    }`;
    const DED_TABLE_URL = "https://api.football-data.org/v4/competitions/DED/standings";
    const EUROPA_SCORERS_URL = "https://api.football-data.org/v4/competitions/EL/scorers?limit=10";

   
    const [matchesResponse, tableResponse, scorersResponse] = await Promise.all([
      fetch(EUROPA_MATCHES_URL, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
      fetch(DED_TABLE_URL, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
      fetch(EUROPA_SCORERS_URL, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
    ]);

    
    if (!matchesResponse.ok) {
      const errorText = await matchesResponse.text();
      console.error(`Error fetching Europa League matches: ${matchesResponse.status} - ${errorText}`);
      const response = new Response(
        JSON.stringify({ error: true, message: `Failed to fetch Europa League matches: ${matchesResponse.statusText}` }),
        { status: matchesResponse.status, headers: { "Content-Type": "application/json" } }
      );
      return withCORSHeaders(response, origin);
    }
   

    const matchesData = await matchesResponse.json();
    const tableData = tableResponse.ok ? await tableResponse.json() : null;
    const scorersData = scorersResponse.ok ? await scorersResponse.json() : null;

    const finalData = {
      matches: matchesData?.matches || [],
      leagueTable: tableData?.standings?.[0]?.table || [],
      scorers: scorersData?.scorers || [],
    };

    const response = new Response(JSON.stringify(finalData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    return withCORSHeaders(response, origin);
  } catch (e) {
   
    console.error("Server error in eropa.js:", e.message, e.stack);

    const errorResponse = new Response(
      JSON.stringify({
        error: true,
        message: "Server error while fetching Europa League data.",
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