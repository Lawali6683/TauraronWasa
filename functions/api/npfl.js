// Handler don NPFL
export async function handleNpfl(request) {
  return new Response("NPFL handler is working!", { status: 200 });
}

// Worker listener
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const { headers } = request;
  const WORKER_API_KEY = headers.get('x-api-key');
  const contentType = headers.get("content-type") || "";

  // ✅ Preflight (OPTIONS) request
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
    // API URLs guda 3 daga GitHub
    const NPFL_FIXTURES_API = "https://raw.githubusercontent.com/abubakarmuhd/npfl-json/main/fixtures.json";
    const NPFL_TABLE_API = "https://raw.githubusercontent.com/abubakarmuhd/npfl-json/main/table.json";
    const NPFL_SCORERS_API = "https://raw.githubusercontent.com/abubakarmuhd/npfl-json/main/scorers.json";

    // ✅ Yi fetch dukansu lokaci guda
    const [fixturesResponse, tableResponse, scorersResponse] = await Promise.all([
      fetch(NPFL_FIXTURES_API),
      fetch(NPFL_TABLE_API),
      fetch(NPFL_SCORERS_API)
    ]);

    // ✅ Juya zuwa JSON idan response yayi daidai
    const fixturesData = fixturesResponse.ok ? await fixturesResponse.json() : null;
    const tableData = tableResponse.ok ? await tableResponse.json() : null;
    const scorersData = scorersResponse.ok ? await scorersResponse.json() : null;

    // ✅ Haɗa su duka
    const finalData = {
      fixtures: fixturesData?.fixtures || fixturesData || [],
      table: tableData?.table || tableData || [],
      scorers: scorersData?.scorers || scorersData || []
    };

    return new Response(JSON.stringify(finalData), {
      status: 200,
      headers: corsHeaders()
    });

  } catch (e) {
    return new Response(
      JSON.stringify({
        error: true,
        message: 'Server error while fetching NPFL data.',
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
