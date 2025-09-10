
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
   
    const NPFL_FIXTURES_API = "https://raw.githubusercontent.com/abubakarmuhd/npfl-json/main/fixtures.json";
    const NPFL_TABLE_API = "https://raw.githubusercontent.com/abubakarmuhd/npfl-json/main/table.json";
    const NPFL_SCORERS_API = "https://raw.githubusercontent.com/abubakarmuhd/npfl-json/main/scorers.json";

    
    const [fixturesResponse, tableResponse, scorersResponse] = await Promise.all([
      fetch(NPFL_FIXTURES_API),
      fetch(NPFL_TABLE_API),
      fetch(NPFL_SCORERS_API),
    ]);

  
    if (!fixturesResponse.ok) {
      const errorText = await fixturesResponse.text();
      console.error(`Error fetching NPFL fixtures: ${fixturesResponse.status} - ${errorText}`);
      const response = new Response(
        JSON.stringify({ error: true, message: `Failed to fetch NPFL fixtures: ${fixturesResponse.statusText}` }),
        { status: fixturesResponse.status, headers: { "Content-Type": "application/json" } }
      );
      return withCORSHeaders(response, origin);
    }

    
    const fixturesData = await fixturesResponse.json();
    const tableData = tableResponse.ok ? await tableResponse.json() : null;
    const scorersData = scorersResponse.ok ? await scorersResponse.json() : null;

    
    const finalData = {
      fixtures: fixturesData?.fixtures || fixturesData || [],
      table: tableData?.table || tableData || [],
      scorers: scorersData?.scorers || scorersData || [],
    };

    const response = new Response(JSON.stringify(finalData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    return withCORSHeaders(response, origin);
  } catch (e) {
   
    console.error("Server error in npfl.js:", e.message, e.stack);

    const errorResponse = new Response(
      JSON.stringify({
        error: true,
        message: "Server error while fetching NPFL data.",
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