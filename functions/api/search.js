export async function onRequest(context) {
    const { request, env } = context;
    const origin = request.headers.get("Origin");
    const ALLOWED_ORIGINS = [
        "https://tauraronwasa.pages.dev",
        "https://leadwaypeace.pages.dev",
        "http://localhost:8080",
    ];
    function withCORSHeaders(response, origin) {
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
        return withCORSHeaders(new Response(null, { status: 204 }), origin);
    }
    const WORKER_API_KEY = request.headers.get("x-api-key");
    const contentType = request.headers.get("content-type") || "";
    if (WORKER_API_KEY !== env.API_AUTH_KEY) {
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
        const requestBody = await request.json();
        const { competition } = requestBody;
        if (!competition) {
            const response = new Response(
                JSON.stringify({ error: true, message: "Competition parameter is missing." }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                }
            );
            return withCORSHeaders(response, origin);
        }
        const FOOTBALL_API_TOKEN = env.FOOTBALL_API_TOKEN4;
        const compCode = competition.toUpperCase();
        let matchesData = null;
        let standingsData = null;
        let scorersData = null;
        const fetchMatches = async () => {
            try {
                const matchesRes = await fetch(`https://api.football-data.org/v4/competitions/${compCode}/matches`, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } });
                return matchesRes.ok ? await matchesRes.json() : null;
            } catch (e) {
                console.error("Failed to fetch matches:", e);
                return null;
            }
        };
        const fetchStandings = async () => {
            try {
                const standingsRes = await fetch(`https://api.football-data.org/v4/competitions/${compCode}/standings`, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } });
                return standingsRes.ok ? await standingsRes.json() : null;
            } catch (e) {
                console.error("Failed to fetch standings:", e);
                return null;
            }
        };
        const fetchScorers = async () => {
            try {
                const scorersRes = await fetch(`https://api.football-data.org/v4/competitions/${compCode}/scorers?limit=10`, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } });
                return scorersRes.ok ? await scorersRes.json() : null;
            } catch (e) {
                console.error("Failed to fetch scorers:", e);
                return null;
            }
        };
        [matchesData, standingsData, scorersData] = await Promise.all([
            fetchMatches(),
            fetchStandings(),
            fetchScorers()
        ]);
        const result = {
            matches: matchesData?.matches || [],
            standings: standingsData?.standings || [],
            scorers: scorersData?.scorers || [],
        };
        const response = new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
        return withCORSHeaders(response, origin);
    } catch (e) {
        console.error("Server error in search.js:", e.message);
        const errorResponse = new Response(
            JSON.stringify({
                error: true,
                message: "An samu matsala yayin aikin bincike. Da fatan za a gwada daga baya.",
                details: e.message,
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
        return withCORSHeaders(errorResponse, origin);
    }
}
