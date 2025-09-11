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
        return new Response(null, {
            status: 204,
            headers: withCORSHeaders(new Headers()).headers, // Use the new function to set headers
        });
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
        const LALIGA_CODE = "PD";

        // Maimakon aikawa da buƙatun ɗaya bayan ɗaya, za mu haɗa su gabaɗaya.
        // Aika buƙatun 3 a lokaci ɗaya don inganta aiki.
        const LALIGA_TABLE_URL = `https://api.football-data.org/v4/competitions/${LALIGA_CODE}/standings`;
        const LALIGA_SCORERS_URL = `https://api.football-data.org/v4/competitions/${LALIGA_CODE}/scorers?limit=10`;

        // Za mu yi amfani da Promise.all don jira dukkan buƙatun su kammala
        const [tableResponse, scorersResponse] = await Promise.all([
            fetch(LALIGA_TABLE_URL, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
            fetch(LALIGA_SCORERS_URL, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
        ]);

        // Duba idan buƙatun farko, watau na teburin gasar, ya yi nasara
        if (!tableResponse.ok) {
            const errorText = await tableResponse.text();
            console.error(`Error fetching La Liga standings: ${tableResponse.status} - ${errorText}`);
            return withCORSHeaders(new Response(
                JSON.stringify({ error: true, message: `Failed to fetch La Liga standings: ${tableResponse.statusText}` }), {
                    status: tableResponse.status,
                    headers: { "Content-Type": "application/json" },
                }
            ));
        }

        const tableData = await tableResponse.json();
        const currentMatchday = tableData?.season?.currentMatchday;

        // Idan matchday bai zo a cikin buƙatun ba, yi amfani da na yanzu
        if (!matchday) {
            matchday = currentMatchday;
        }

        // Yanzu, za mu aika buƙatar matches bayan mun san matchday ɗin da za mu nema
        const LALIGA_MATCHES_URL = `https://api.football-data.org/v4/competitions/${LALIGA_CODE}/matches?matchday=${matchday}`;
        const matchesResponse = await fetch(LALIGA_MATCHES_URL, {
            headers: { "X-Auth-Token": FOOTBALL_API_TOKEN }
        });

        if (!matchesResponse.ok) {
            const errorText = await matchesResponse.text();
            console.error(`Error fetching La Liga matches: ${matchesResponse.status} - ${errorText}`);
            return withCORSHeaders(new Response(
                JSON.stringify({ error: true, message: `Failed to fetch La Liga matches: ${matchesResponse.statusText}` }), {
                    status: matchesResponse.status,
                    headers: { "Content-Type": "application/json" },
                }
            ));
        }

        const matchesData = await matchesResponse.json();
        const scorersData = scorersResponse.ok ? await scorersResponse.json() : { scorers: [] }; // Karbi data idan ba a samu matsala ba

        const finalData = {
            matches: matchesData?.matches || [],
            leagueTable: tableData?.standings?.[0]?.table || [],
            scorers: scorersData?.scorers || [],
            currentMatchday: currentMatchday,
            totalMatchdays: tableData?.season?.totalMatchdays,
        };

        return withCORSHeaders(new Response(JSON.stringify(finalData), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        }));

    } catch (e) {
        console.error("Server error in laliga.js:", e.message, e.stack);
        const errorResponse = new Response(
            JSON.stringify({
                error: true,
                message: "Server error while fetching La Liga data.",
                details: e.message,
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
        return withCORSHeaders(errorResponse);
    }
}
