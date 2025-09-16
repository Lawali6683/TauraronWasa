export async function onRequest(context) {
    const { request, env } = context;
    const cache = caches.default;
    
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

    if (request.method === "OPTIONS") {
        return withCORSHeaders(new Response(null, { status: 204 }));
    }

    const WORKER_API_KEY = request.headers.get("x-api-key");
    const contentType = request.headers.get("content-type") || "";

    if (WORKER_API_KEY !== "@haruna66") {
        return withCORSHeaders(new Response(
            JSON.stringify({ error: true, message: "Invalid API Key" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            }
        ));
    }

    if (request.method !== "POST" || !contentType.includes("application/json")) {
        return withCORSHeaders(new Response(
            JSON.stringify({ error: true, message: "Invalid Request Method or Content-Type" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            }
        ));
    }

    try {
        const fixedCacheKey = new URL(request.url).origin + new URL(request.url).pathname;
        const cachedResponse = await cache.match(fixedCacheKey);
        
        if (cachedResponse) {
            console.log("Serving from cache:", fixedCacheKey);
            return withCORSHeaders(cachedResponse);
        }

        const FOOTBALL_API_TOKEN = "b75541b8a8cc43719195871aa2bd419e";
        const BUNDESLIGA_CODE = "BL1";

        const BUNDESLIGA_TABLE_URL = `https://api.football-data.org/v4/competitions/${BUNDESLIGA_CODE}/standings`;
        const BUNDESLIGA_SCORERS_URL = `https://api.football-data.org/v4/competitions/${BUNDESLIGA_CODE}/scorers?limit=10`;
        const BUNDESLIGA_MATCHES_URL = `https://api.football-data.org/v4/competitions/${BUNDESLIGA_CODE}/matches`;

        // Yanzu zamu yi buƙatu daban-daban sannan mu tantance su daya bayan daya
        const [tableRes, matchesRes, scorersRes] = await Promise.allSettled([
            fetch(BUNDESLIGA_TABLE_URL, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
            fetch(BUNDESLIGA_MATCHES_URL, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
            fetch(BUNDESLIGA_SCORERS_URL, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
        ]);

        let finalData = {};
        let errors = [];

        // Tantance aikin Standing (League Table)
        if (tableRes.status === 'fulfilled' && tableRes.value.ok) {
            const data = await tableRes.value.json();
            finalData.leagueTable = data?.standings?.[0]?.table || [];
            finalData.currentMatchday = data?.season?.currentMatchday;
            finalData.totalMatchdays = data?.season?.totalMatchdays;
        } else {
            errors.push("Failed to fetch standings data.");
            console.error("Standings fetch failed:", tableRes.reason ? tableRes.reason.message : `Status: ${tableRes.value?.status}`);
        }

        // Tantance aikin Matches
        if (matchesRes.status === 'fulfilled' && matchesRes.value.ok) {
            const data = await matchesRes.value.json();
            finalData.matches = data?.matches || [];
        } else {
            errors.push("Failed to fetch matches data.");
            console.error("Matches fetch failed:", matchesRes.reason ? matchesRes.reason.message : `Status: ${matchesRes.value?.status}`);
        }

        // Tantance aikin Scorers
        if (scorersRes.status === 'fulfilled' && scorersRes.value.ok) {
            const data = await scorersRes.value.json();
            finalData.scorers = data?.scorers || [];
        } else {
            errors.push("Failed to fetch scorers data.");
            console.error("Scorers fetch failed:", scorersRes.reason ? scorersRes.reason.message : `Status: ${scorersRes.value?.status}`);
        }

        // Idan duk aikin ya kasa, sai mu mayar da kuskure
        if (errors.length === 3) {
            return withCORSHeaders(new Response(
                JSON.stringify({ error: true, message: "All API calls failed. Please check your API key and plan limits." }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }
            ));
        }

        // Idan wasu sunyi aiki, za mu nuna su, kuma mu mayar da kuskure idan an sami matsala.
        const response = new Response(JSON.stringify(finalData), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, max-age=1800" // Cache for 30 minutes (1800 seconds)
            },
        });

        // Add to cache
        context.waitUntil(cache.put(fixedCacheKey, response.clone()));
        
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
