export async function onRequest(context) {
    const { request, env } = context;
    const cache = caches.default;
    const cacheKey = new URL(request.url).toString();

    const origin = request.headers.get("Origin");
    const ALLOWED_ORIGINS = [
        "https://tauraronwasa.pages.dev",
        "https://leadwaypeace.pages.dev",
        "http://localhost:8080",
    ];

    function withCORSHeaders(response) {
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

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
        return withCORSHeaders(new Response(null, { status: 204 }));
    }

    const WORKER_API_KEY = request.headers.get("x-api-key");
    const contentType = request.headers.get("content-type") || "";

    // Validate API Key
    if (WORKER_API_KEY !== "@haruna66") {
        return withCORSHeaders(new Response(
            JSON.stringify({ error: true, message: "Invalid API Key" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            }
        ));
    }

    // Validate request method and content type
    if (request.method !== "POST" || !contentType.includes("application/json")) {
        return withCORSHeaders(new Response(
            JSON.stringify({ error: true, message: "Invalid Request Method or Content-Type" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            }
        ));
    }

    try {
        const cachedResponse = await cache.match(cacheKey);
        if (cachedResponse) {
            console.log("Serving from cache:", cacheKey);
            return withCORSHeaders(cachedResponse);
        }

        const requestBody = await request.json();
        let { matchday } = requestBody;
        const FOOTBALL_API_TOKEN = "b75541b8a8cc43719195871aa2bd419e";
        const BUNDESLIGA_CODE = "BL1";

        const BUNDESLIGA_TABLE_URL = `https://api.football-data.org/v4/competitions/${BUNDESLIGA_CODE}/standings`;
        const BUNDESLIGA_SCORERS_URL = `https://api.football-data.org/v4/competitions/${BUNDESLIGA_CODE}/scorers?limit=10`;

        const [tableResponse, scorersResponse] = await Promise.all([
            fetch(BUNDESLIGA_TABLE_URL, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
            fetch(BUNDESLIGA_SCORERS_URL, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
        ]);

        if (!tableResponse.ok || !scorersResponse.ok) {
            const errorText = await (!tableResponse.ok ? tableResponse.text() : scorersResponse.text());
            const status = !tableResponse.ok ? tableResponse.status : scorersResponse.status;
            const statusText = !tableResponse.ok ? tableResponse.statusText : scorersResponse.statusText;
            console.error(`Error fetching Bundesliga data: ${status} - ${errorText}`);
            return withCORSHeaders(new Response(
                JSON.stringify({ error: true, message: `Failed to fetch Bundesliga data: ${statusText}` }), {
                    status: status,
                    headers: { "Content-Type": "application/json" },
                }
            ));
        }

        const tableData = await tableResponse.json();
        const currentMatchday = tableData?.season?.currentMatchday;
        const totalMatchdays = tableData?.season?.totalMatchdays;

        if (!matchday) {
            matchday = currentMatchday;
        }

        const BUNDESLIGA_MATCHES_URL = `https://api.football-data.org/v4/competitions/${BUNDESLIGA_CODE}/matches?matchday=${matchday}`;
        const matchesResponse = await fetch(BUNDESLIGA_MATCHES_URL, {
            headers: { "X-Auth-Token": FOOTBALL_API_TOKEN }
        });

        if (!matchesResponse.ok) {
            const errorText = await matchesResponse.text();
            console.error(`Error fetching Bundesliga matches: ${matchesResponse.status} - ${errorText}`);
            return withCORSHeaders(new Response(
                JSON.stringify({ error: true, message: `Failed to fetch Bundesliga matches: ${matchesResponse.statusText}` }), {
                    status: matchesResponse.status,
                    headers: { "Content-Type": "application/json" },
                }
            ));
        }

        const matchesData = await matchesResponse.json();
        const scorersData = await scorersResponse.json();

        const finalData = {
            matches: matchesData?.matches || [],
            leagueTable: tableData?.standings?.[0]?.table || [],
            scorers: scorersData?.scorers || [],
            currentMatchday: currentMatchday,
            totalMatchdays: totalMatchdays,
        };

        const response = new Response(JSON.stringify(finalData), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, max-age=1800" // Cache for 30 minutes (1800 seconds)
            },
        });

        // Add to cache
        context.waitUntil(cache.put(cacheKey, response.clone()));
        
        return withCORSHeaders(response);

    } catch (e) {
        console.error("Server error in bundesliga.js:", e.message, e.stack);
        const errorResponse = new Response(
            JSON.stringify({
                error: true,
                message: "Server error while fetching Bundesliga data.",
                details: e.message,
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
        return withCORSHeaders(errorResponse);
    }
}
