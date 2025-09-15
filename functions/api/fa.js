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

        let matchesData = null;
        let scorersData = null;

        try {
            const matchesResponse = await fetch(FACUP_MATCHES_URL, {
                headers: { "X-Auth-Token": FOOTBALL_API_TOKEN }
            });
            if (matchesResponse.ok) {
                matchesData = await matchesResponse.json();
            }
        } catch (e) {
            console.error(`Error fetching matches data: ${e.message}`);
        }

        try {
            const scorersResponse = await fetch(FACUP_SCORERS_URL, {
                headers: { "X-Auth-Token": FOOTBALL_API_TOKEN }
            });
            if (scorersResponse.ok) {
                scorersData = await scorersResponse.json();
            }
        } catch (e) {
            console.error(`Error fetching scorers data: ${e.message}`);
        }
        
        // Check if there are matches to display. If not, return a specific message.
        if (!matchesData || !matchesData.matches || matchesData.matches.length === 0) {
            const noDataResponse = new Response(
                JSON.stringify({
                    error: false,
                    message: "Ba a fara gasar FA Cup ba a halin yanzu.",
                    matches: [],
                    scorers: [],
                    assists: [],
                    manOfTheMatch: [],
                }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }
            );
            return withCORSHeaders(noDataResponse, origin);
        }

        const finalData = {
            matches: matchesData.matches || [],
            scorers: scorersData?.scorers || [],
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
