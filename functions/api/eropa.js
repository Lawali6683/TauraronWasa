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
            JSON.stringify({ error: true, message: "Invalid API Key" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            }
        );
        return withCORSHeaders(response, origin);
    }

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
        const FOOTBALL_API_TOKEN = "b75541b8a8cc43719195871aa2bd419e";
        const EL_CODE = "ELC"; // Code don Europa League
        const BASE_API_URL = "https://api.football-data.org/v4";
        const apiHeaders = { "X-Auth-Token": FOOTBALL_API_TOKEN };

        const matchesUrl = `${BASE_API_URL}/competitions/${EL_CODE}/matches`;
        const standingsUrl = `${BASE_API_URL}/competitions/${EL_CODE}/standings`;
        const scorersUrl = `${BASE_API_URL}/competitions/${EL_CODE}/scorers?limit=10`;

        const [matchesRes, standingsRes, scorersRes] = await Promise.all([
            fetch(matchesUrl, { headers: apiHeaders }),
            fetch(standingsUrl, { headers: apiHeaders }),
            fetch(scorersUrl, { headers: apiHeaders }),
        ]);

        const matchesData = matchesRes.ok ? await matchesRes.json() : { matches: [] };
        const standingsData = standingsRes.ok ? await standingsRes.json() : { standings: [] };
        const scorersData = scorersRes.ok ? await scorersRes.json() : { scorers: [] };

        const groupedStandings = {};
        if (standingsData.standings && standingsData.standings.length > 0) {
            standingsData.standings.forEach(group => {
                groupedStandings[group.group] = group.table;
            });
        }

        const finalData = {
            matches: matchesData.matches || [],
            standings: groupedStandings,
            scorers: scorersData.scorers || [],
            assists: [], // API baya samar da bayanan assists, don haka an barshi a matsayin fanko
            manOfTheMatch: [], // API baya samar da bayanan Man of the Match, don haka an barshi a matsayin fanko
        };

        const response = new Response(JSON.stringify(finalData), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

        return withCORSHeaders(response, origin);

    } catch (e) {
        console.error("Server error in eropa.js:", e.message, e.stack);
        const errorResponse = new Response(
            JSON.stringify({
                error: true,
                message: `Kuskure a wajen dauko bayanan Europa League: ${e.message}`,
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
