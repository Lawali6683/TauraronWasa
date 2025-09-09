
export async function handleSiriyaa(request) {
  return handleRequest(request);
}


// ✅ Babban request handler
async function handleRequest(request) {
  const { headers } = request;
  const WORKER_API_KEY = headers.get("x-api-key");
  const contentType = headers.get("content-type") || "";

  // ✅ Handle OPTIONS (CORS preflight)
  if (request.method === "OPTIONS") {
    return handleOptions();
  }

  // ✅ API key check
  if (WORKER_API_KEY !== "@haruna66") {
    return jsonResponse({ error: true, message: "Invalid API Key" }, 401);
  }

  // ✅ Ensure POST + JSON kawai
  if (request.method !== "POST" || !contentType.includes("application/json")) {
    return jsonResponse(
      { error: true, message: "Invalid Request Method or Content-Type" },
      400
    );
  }

  try {
    const requestBody = await request.json();
    const { matchday } = requestBody;

    const FOOTBALL_API_TOKEN = "b75541b8a8cc43719195871aa2bd419e";
    const SERIEA_CODE = "SA";

    // ✅ API URLs
    const SERIEA_MATCHES_URL = `https://api.football-data.org/v4/competitions/${SERIEA_CODE}/matches?matchday=${matchday}`;
    const SERIEA_TABLE_URL = `https://api.football-data.org/v4/competitions/${SERIEA_CODE}/standings`;
    const SERIEA_SCORERS_URL = `https://api.football-data.org/v4/competitions/${SERIEA_CODE}/scorers?limit=10`;

    // ✅ Fetch dukkan bayanai lokaci guda
    const [matchesResponse, tableResponse, scorersResponse] = await Promise.all([
      fetch(SERIEA_MATCHES_URL, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
      fetch(SERIEA_TABLE_URL, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
      fetch(SERIEA_SCORERS_URL, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
    ]);

    const matchesData = matchesResponse.ok ? await matchesResponse.json() : null;
    const tableData = tableResponse.ok ? await tableResponse.json() : null;
    const scorersData = scorersResponse.ok ? await scorersResponse.json() : null;

    // ✅ Tara cikin daya object
    const finalData = {
      matches: matchesData?.matches || [],
      leagueTable: tableData?.standings?.[0]?.table || [],
      scorers: scorersData?.scorers || [],
    };

    return jsonResponse(finalData, 200);
  } catch (e) {
    return jsonResponse(
      {
        error: true,
        message: "Server error while fetching Serie A data.",
        details: e.message,
      },
      500
    );
  }
}

// ✅ Helper functions
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(),
  });
}

function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  };
}
