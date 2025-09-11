export async function onRequest(context) {
    const { request } = context;
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
        const requestBody = await request.json();
        let { matchday } = requestBody;
        const FOOTBALL_API_TOKEN = "b75541b8a8cc43719195871aa2bd419e";
        const SERIEA_CODE = "SA";

        // Za mu fara ne da neman standings don samun currentMatchday.
        // Hakanan za mu nemi scorers a lokaci guda.
        const SERIEA_TABLE_URL = `https://api.football-data.org/v4/competitions/${SERIEA_CODE}/standings`;
        const SERIEA_SCORERS_URL = `https://api.football-data.org/v4/competitions/${SERIEA_CODE}/scorers?limit=10`;

        const [tableResponse, scorersResponse] = await Promise.all([
            fetch(SERIEA_TABLE_URL, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
            fetch(SERIEA_SCORERS_URL, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
        ]);

        if (!tableResponse.ok) {
            const errorText = await tableResponse.text();
            console.error(`Error fetching Serie A standings: ${tableResponse.status} - ${errorText}`);
            return withCORSHeaders(new Response(
                JSON.stringify({ error: true, message: `Failed to fetch Serie A standings: ${tableResponse.statusText}` }), {
                    status: tableResponse.status,
                    headers: { "Content-Type": "application/json" },
                }
            ));
        }

        const tableData = await tableResponse.json();
        const currentMatchday = tableData?.season?.currentMatchday;
        const totalMatchdays = tableData?.season?.totalMatchdays;
        
        // Idan matchday bai zo a cikin buƙatar ba, yi amfani da na yanzu.
        if (!matchday) {
            matchday = currentMatchday;
        }

        // Yanzu, za mu nemi matches da amfani da matchday da aka gano.
        const SERIEA_MATCHES_URL = `https://api.football-data.org/v4/competitions/${SERIEA_CODE}/matches?matchday=${matchday}`;
        const matchesResponse = await fetch(SERIEA_MATCHES_URL, {
            headers: { "X-Auth-Token": FOOTBALL_API_TOKEN }
        });

        if (!matchesResponse.ok) {
            const errorText = await matchesResponse.text();
            console.error(`Error fetching Serie A matches: ${matchesResponse.status} - ${errorText}`);
            return withCORSHeaders(new Response(
                JSON.stringify({ error: true, message: `Failed to fetch Serie A matches: ${matchesResponse.statusText}` }), {
                    status: matchesResponse.status,
                    headers: { "Content-Type": "application/json" },
                }
            ));
        }

        const matchesData = await matchesResponse.json();
        const scorersData = scorersResponse.ok ? await scorersResponse.json() : { scorers: [] };

        const finalData = {
            matches: matchesData?.matches || [],
            leagueTable: tableData?.standings?.[0]?.table || [],
            scorers: scorersData?.scorers || [],
            currentMatchday: currentMatchday,
            totalMatchdays: totalMatchdays,
        };

        return withCORSHeaders(new Response(JSON.stringify(finalData), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        }));

    } catch (e) {
        console.error("Server error in siriyaa.js:", e.message, e.stack);
        const errorResponse = new Response(
            JSON.stringify({
                error: true,
                message: "Server error while fetching Serie A data.",
                details: e.message,
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
        return withCORSHeaders(errorResponse);
    }
}
