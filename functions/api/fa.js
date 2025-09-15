export async function onRequest(context) {
    const { request } = context;
    const origin = request.headers.get("Origin");

    const ALLOWED_ORIGINS = [
        "https://tauraronwasa.pages.dev",
        "https://leadwaypeace.pages.dev",
        "http://localhost:8080",
    ];

    // Handle pre-flight OPTIONS request for CORS
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

    // API Key Authentication
    const WORKER_API_KEY = request.headers.get("x-api-key");
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

    // Validate request method and content type
    const contentType = request.headers.get("content-type") || "";
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
        const FACUP_MATCHES_URL = `https://api.football-data.org/v4/competitions/FAC/matches${
            stage ? `?stage=${stage}` : ""
        }`;
        const FACUP_SCORERS_URL = "https://api.football-data.org/v4/competitions/FAC/scorers?limit=10";
        // NOTE: Football-Data.org does not provide a separate endpoint for assists or Man of the Match.
        // We'll use dummy data or process matches to extract this info.
        // For simplicity, we'll return a basic structure.
        
        let matchesData = { matches: [] };
        let scorersData = { scorers: [] };

        // Fetch matches data
        try {
            const matchesResponse = await fetch(FACUP_MATCHES_URL, {
                headers: { "X-Auth-Token": FOOTBALL_API_TOKEN }
            });

            if (matchesResponse.ok) {
                matchesData = await matchesResponse.json();
            } else {
                console.error(`Failed to fetch FA Cup matches: ${matchesResponse.status} - ${matchesResponse.statusText}`);
            }
        } catch (e) {
            console.error(`Error fetching matches data: ${e.message}`);
        }

        // Fetch scorers data
        try {
            const scorersResponse = await fetch(FACUP_SCORERS_URL, {
                headers: { "X-Auth-Token": FOOTBALL_API_TOKEN }
            });

            if (scorersResponse.ok) {
                scorersData = await scorersResponse.json();
            } else {
                console.error(`Failed to fetch FA Cup scorers: ${scorersResponse.status} - ${scorersResponse.statusText}`);
            }
        } catch (e) {
            console.error(`Error fetching scorers data: ${e.message}`);
        }

        const finalData = {
            matches: matchesData.matches || [],
            scorers: scorersData.scorers || [],
            // Since the API doesn't provide assists or Man of the Match, we'll return empty arrays to avoid errors.
            assists: [],
            manOfTheMatch: [],
        };
        
        const response = new Response(JSON.stringify(finalData), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

        return withCORSHeaders(response, origin);

    } catch (e) {
        console.error("Server error in fa.js:", e.message, e.stack);
        const errorResponse = new Response(
            JSON.stringify({
                error: true,
                message: "Server error while fetching FA Cup data.",
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

// Helper function to handle CORS headers
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
