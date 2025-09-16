export async function onRequest(context) {
    const { request, env } = context;

    const origin = request.headers.get("Origin");
    const ALLOWED_ORIGINS = [
        "https://tauraronwasa.pages.dev",
        "https://leadwaypeace.pages.dev",
        "http://localhost:8080",
    ];

    // Handle preflight OPTIONS request
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

    // Validate API Key
    if (WORKER_API_KEY !== "@haruna66") {
        const response = new Response(
            JSON.stringify({ error: true, message: "Invalid API Key" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            }
        );
        return withCORSHeaders(response, origin);
    }

    // Validate request method and content type
    if (request.method !== "POST" || !contentType.includes("application/json")) {
        const response = new Response(
            JSON.stringify({ error: true, message: "Invalid Request Method or Content-Type" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            }
        );
        return withCORSHeaders(response, origin);
    }

    try {
        const requestBody = await request.json();
        let requestedMatchday = requestBody?.matchday;
        const FOOTBALL_API_TOKEN = "b75541b8a8cc43719195871aa2bd419e";
        const PL_CODE = "PL";

        let targetMatchday;

        // Fetch current matchday if not provided in the request
        if (!requestedMatchday) {
            const leagueResponse = await fetch(`https://api.football-data.org/v4/competitions/${PL_CODE}`, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } });
            
            if (!leagueResponse.ok) {
                const errorText = await leagueResponse.text();
                console.error(`Error fetching league data: ${leagueResponse.status} - ${errorText}`);
                throw new Error(`Kasa loda bayanan gasar: ${leagueResponse.statusText}`);
            }
            
            const leagueData = await leagueResponse.json();
            targetMatchday = leagueData?.currentSeason?.currentMatchday || 1;
        } else {
            targetMatchday = requestedMatchday;
        }

        // Fetch all data concurrently using Promise.all
        const [matchesResponse, standingsResponse, scorersResponse] = await Promise.all([
            fetch(`https://api.football-data.org/v4/competitions/${PL_CODE}/matches?matchday=${targetMatchday}`, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
            fetch(`https://api.football-data.org/v4/competitions/${PL_CODE}/standings`, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
            fetch(`https://api.football-data.org/v4/competitions/${PL_CODE}/scorers?limit=10`, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
        ]);

        // Process all responses
        const matchesData = matchesResponse.ok ? await matchesResponse.json() : { matches: [] };
        const plTableData = standingsResponse.ok ? await standingsResponse.json() : { standings: [] };
        const plScorersData = scorersResponse.ok ? await scorersResponse.json() : { scorers: [] };

        // Construct the final combined data object
        const finalData = {
            currentMatchday: targetMatchday,
            totalMatchdays: matchesData?.resultSet?.last || 38,
            matches: matchesData?.matches || [],
            leagueTable: plTableData?.standings?.[0]?.table || [],
            scorers: plScorersData?.scorers || [],
        };

        const response = new Response(JSON.stringify(finalData), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

        return withCORSHeaders(response, origin);

    } catch (e) {
        console.error("Server error in premier.js:", e.message, e.stack);
        const errorResponse = new Response(
            JSON.stringify({
                error: true,
                message: `Server error while fetching data: ${e.message}`,
                details: e.stack,
            }), {
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
