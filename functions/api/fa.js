addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const { headers } = request;

  // 📌 Idan request din OPTIONS (CORS preflight) ne
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key"
      }
    });
  }

  const WORKER_API_KEY = headers.get("x-api-key");
  const contentType = headers.get("content-type") || "";

  // 🔐 Duba API key
  if (WORKER_API_KEY !== "@haruna66") {
    return new Response(
      JSON.stringify({ error: true, message: "Invalid API Key" }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }

  // 🔐 Yarda POST + JSON kawai
  if (request.method !== "POST" || !contentType.includes("application/json")) {
    return new Response("Invalid Request Method or Content-Type", {
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    const requestBody = await request.json();
    const { stage } = requestBody;

    // ⚽ Football API
    const FOOTBALL_API_TOKEN = "b75541b8a8cc43719195871aa2bd419e";
    const FACUP_MATCHES_URL = `https://api.football-data.org/v4/competitions/FAC/matches${
      stage ? `?stage=${stage}` : ""
    }`;
    const DED_TABLE_URL =
      "https://api.football-data.org/v4/competitions/DED/standings";
    const FACUP_SCORERS_URL =
      "https://api.football-data.org/v4/competitions/FAC/scorers?limit=10";

    const [matchesResponse, tableResponse, scorersResponse] = await Promise.all([
      fetch(FACUP_MATCHES_URL, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
      fetch(DED_TABLE_URL, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
      fetch(FACUP_SCORERS_URL, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } })
    ]);

    const matchesData = matchesResponse.ok
      ? await matchesResponse.json()
      : null;
    const tableData = tableResponse.ok ? await tableResponse.json() : null;
    const scorersData = scorersResponse.ok ? await scorersResponse.json() : null;

    const finalData = {
      matches: matchesData?.matches || [],
      leagueTable: tableData?.standings?.[0]?.table || [],
      scorers: scorersData?.scorers || []
    };

    return new Response(JSON.stringify(finalData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: true,
        message: "Server error while fetching all data.",
        details: e.message
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
