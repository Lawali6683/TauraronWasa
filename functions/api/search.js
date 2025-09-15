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

    if (WORKER_API_KEY !== "@haruna66") {
        const response = new Response(
            JSON.stringify({ error: true, message: "Invalid API Key" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
        return withCORSHeaders(response, origin);
    }

    if (request.method !== "POST" || !contentType.includes("application/json")) {
        const response = new Response(
            JSON.stringify({ error: true, message: "Invalid Request Method or Content-Type" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
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
            });
            return withCORSHeaders(response, origin);
        }

        const FOOTBALL_API_TOKEN = env.FOOTBALL_API_TOKEN || "b75541b8a8cc43719195871aa2bd419e";
        const compCode = competition.toUpperCase();

        let matchesData = null;
        let standingsData = null;
        let scorersData = null;

        const fetchWithStatusCheck = async (url) => {
            try {
                const response = await fetch(url, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } });
                if (response.status === 404) {
                    return { status: 404, data: null };
                }
                return response.ok ? { status: response.status, data: await response.json() } : null;
            } catch (e) {
                console.error(`Failed to fetch from ${url}:`, e);
                return null;
            }
        };

        const [matchesRes, standingsRes, scorersRes] = await Promise.all([
            fetchWithStatusCheck(`https://api.football-data.org/v4/competitions/${compCode}/matches`),
            fetchWithStatusCheck(`https://api.football-data.org/v4/competitions/${compCode}/standings`),
            fetchWithStatusCheck(`https://api.football-data.org/v4/competitions/${compCode}/scorers?limit=10`)
        ]);

        if (matchesRes && matchesRes.status === 404) {
            const response = new Response(JSON.stringify({
                error: true,
                message: "Ba a fara gasar ba a halin yanzu",
                matches: [],
                standings: [],
                scorers: [],
            }), {
                status: 200, // Dawo da 200 OK don gane shi a shafin mai amfani
                headers: { "Content-Type": "application/json" },
            });
            return withCORSHeaders(response, origin);
        }

        const result = {
            matches: matchesRes?.data?.matches || [],
            standings: standingsRes?.data?.standings || [],
            scorers: scorersRes?.data?.scorers || [],
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
        });
        return withCORSHeaders(errorResponse, origin);
    }
}
