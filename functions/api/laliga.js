// Handler don La Liga
export async function handleLaliga(request) {
  return new Response("La Liga handler is working!", { status: 200 });
}

// Worker listener
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const { headers } = request;
  const WORKER_API_KEY = headers.get('x-api-key');
  const contentType = headers.get("content-type") || "";

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Content-Type': 'application/json'
  };

  // Preflight (OPTIONS) request
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // API key validation
  if (WORKER_API_KEY !== '@haruna66') {
    return new Response(JSON.stringify({ error: true, message: 'Invalid API Key' }), {
      status: 401,
      headers: corsHeaders
    });
  }

  // Bincike request method da content type
  if (request.method !== "POST" || !contentType.includes("application/json")) {
    return new Response(JSON.stringify({ error: true, message: 'Invalid Request Method or Content-Type' }), {
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    const requestBody = await request.json();
    const { matchday } = requestBody;

    if (!matchday) {
      return new Response(JSON.stringify({ error: true, message: "matchday ya zama wajibi." }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Football API Token
    const FOOTBALL_API_TOKEN = 'b75541b8a8cc43719195871aa2bd419e';
    const LALIGA_CODE = "PD";

    // API URLs
    const LALIGA_MATCHES_URL = `https://api.football-data.org/v4/competitions/${LALIGA_CODE}/matches?matchday=${matchday}`;
    const LALIGA_TABLE_URL = `https://api.football-data.org/v4/competitions/${LALIGA_CODE}/standings`;
    const LALIGA_SCORERS_URL = `https://api.football-data.org/v4/competitions/${LALIGA_CODE}/scorers?limit=10`;

    // Aika requests lokaci guda
    const [matchesResponse, tableResponse, scorersResponse] = await Promise.all([
      fetch(LALIGA_MATCHES_URL, { headers: { 'X-Auth-Token': FOOTBALL_API_TOKEN } }),
      fetch(LALIGA_TABLE_URL, { headers: { 'X-Auth-Token': FOOTBALL_API_TOKEN } }),
      fetch(LALIGA_SCORERS_URL, { headers: { 'X-Auth-Token': FOOTBALL_API_TOKEN } })
    ]);

    // Karanta responses
    const matchesData = matchesResponse.ok ? await matchesResponse.json() : null;
    const tableData = tableResponse.ok ? await tableResponse.json() : null;
    const scorersData = scorersResponse.ok ? await scorersResponse.json() : null;

    // Haɗa duk bayanai cikin daya
    const finalData = {
      matches: matchesData?.matches || [],
      leagueTable: tableData?.standings?.[0]?.table || [],
      scorers: scorersData?.scorers || []
    };

    return new Response(JSON.stringify(finalData), {
      status: 200,
      headers: corsHeaders
    });

  } catch (e) {
    return new Response(JSON.stringify({
      error: true,
      message: 'Server error while fetching La Liga data.',
      details: e.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
