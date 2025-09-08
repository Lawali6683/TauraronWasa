// ✅ Site6 handler
export async function handleSite6(request) {
  try {
    const { headers } = request;
    const WORKER_API_KEY = headers.get("x-api-key");
    const contentType = headers.get("content-type") || "";

    // ✅ CORS preflight
    if (request.method === "OPTIONS") {
      return handleOptions();
    }

    // ✅ Binciken API key
    if (WORKER_API_KEY !== "@haruna66") {
      return jsonResponse({ error: true, message: "Invalid API Key" }, 401);
    }

    // ✅ Binciken request type
    if (request.method !== "POST" || !contentType.includes("application/json")) {
      return new Response("Invalid Request Method or Content-Type", { status: 400 });
    }

    // ✅ Karɓar request body
    const requestBody = await request.json();
    const { dateFrom, dateTo } = requestBody;

    if (!dateFrom || !dateTo) {
      return jsonResponse({ error: true, message: "Missing date parameters" }, 400);
    }

    // ✅ Football API setup
    const FOOTBALL_API_TOKEN = "b75541b8a8cc43719195871aa2bd419e";
    const API_URL = `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;

    // ✅ API request
    const apiResponse = await fetch(API_URL, {
      headers: { "X-Auth-Token": FOOTBALL_API_TOKEN }
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return jsonResponse(
        {
          error: true,
          message: "Failed to fetch data from Football API.",
          details: data.message
        },
        apiResponse.status
      );
    }

    // ✅ Success
    return jsonResponse(data, 200);

  } catch (e) {
    return jsonResponse(
      {
        error: true,
        message: "Server error.",
        details: e.message
      },
      500
    );
  }
}

// ✅ Helper don bada response tare da CORS headers
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key"
    }
  });
}

// ✅ Handle CORS preflight (OPTIONS)
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key"
    }
  });
}
