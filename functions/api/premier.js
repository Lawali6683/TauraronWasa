// Handler don Premier League
export async function handlePremier(request) {
  return new Response("Premier League handler is working!", { status: 200 });
}

// Worker listener
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const { headers } = request;
  const WORKER_API_KEY = headers.get('x-api-key');
  const contentType = headers.get("content-type") || "";

  // ✅ Preflight (OPTIONS) request domin CORS
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  // ✅ Tabbatar da API Key
  if (WORKER_API_KEY !== '@haruna66') {
    return new Response(
      JSON.stringify({ error: true, message: 'Invalid API Key' }),
      { status: 401, headers: corsHeaders() }
    );
  }

  // ✅ Tabbatar da POST + JSON request
  if (request.method !== "POST" || !contentType.includes("application/json")) {
    return new Response(
      JSON.stringify({ error: true, message: 'Invalid Request Method or Content-Type' }),
      { status: 400, headers: corsHeaders() }
    );
  }

  try {
    const requestBody = await request.json();
    const { matchday } = requestBody;

    // ✅ Football API Token
    const FOOTBALL_API_TOKEN = 'b75541b8a8cc43719195871aa2bd419e';
    const PL_CODE = "PL";

    // ✅ URLs na API guda 3
    const PL_MATCHES_URL = `https://api.football-data.org/v4/competitions/${PL_CODE}/matches?matchday=${matchday}`;
    const PL_TABLE_URL = `https://api.football-data.org/v4/competitions/${PL_CODE}/standings`;
    const PL_SCORERS_URL = `https://api.football-data.org/v4/competitions/${PL_CODE}/scorers?limit=10`;

    // ✅ Yi fetch dukansu lokaci guda
    const [matchesResponse, tableResponse, scorersResponse] = await Promise.all([
      fetch(PL_MATCHES_URL, { headers: { 'X-Auth-Token': FOOTBALL_API_TOKEN } }),
      fetch(PL_TABLE_URL, { headers: { 'X-Auth-Token': FOOTBALL_API_TOKEN } }),
      fetch(PL_SCORERS_URL, { headers: { 'X-Auth-Token': FOOTBALL_API_TOKEN } })
    ]);

    // ✅ Juya zuwa JSON idan response yayi daidai
    const matchesData = matchesResponse.ok ? await matchesResponse.json() : null;
    const tableData = tableResponse.ok ? await tableResponse.json() : null;
    const scorersData = scorersResponse.ok ? await scorersResponse.json() : null;

    // ✅ Haɗa su duka cikin result guda
    const finalData = {
      matches: matchesData?.matches || [],
      leagueTable: tableData?.standings?.[0]?.table || [],
      scorers: scorersData?.scorers || []
    };

    return new Response(JSON.stringify(finalData), {
      status: 200,
      headers: corsHeaders()
    });

  } catch (e) {
    return new Response(
      JSON.stringify({
        error: true,
        message: 'Server error while fetching Premier League data.',
        details: e.message
      }),
      { status: 500, headers: corsHeaders() }
    );
  }
}

// ✅ Headers domin ya yi aiki a duk domain (CORS fix)
function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
  };
}
