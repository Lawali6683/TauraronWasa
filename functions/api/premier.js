export async function onRequest(context) {

    const { request, env } = context;
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
        const requestBody = await request.json();
        let requestedMatchday = requestBody?.matchday;

        const FOOTBALL_API_TOKEN = "b75541b8a8cc43719195871aa2bd419e";
        const PL_CODE = "PL";
        const DED_CODE = "DED"; // An ajiye shi, amma an yi amfani da PL_CODE don teburin
        
        let targetMatchday = requestedMatchday;
        
        // Idan babu matchday da aka nema, dawo da matchday na yanzu
        if (!targetMatchday) {
            const leagueResponse = await fetch(`https://api.football-data.org/v4/competitions/${PL_CODE}`, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } });
            
            if (!leagueResponse.ok) {
                const errorText = await leagueResponse.text();
                console.error(`Error fetching league data: ${leagueResponse.status} - ${errorText}`);
                throw new Error(`Kasa loda bayanan gasar: ${leagueResponse.statusText}`);
            }
            
            const leagueData = await leagueResponse.json();
            targetMatchday = leagueData?.currentSeason?.currentMatchday || 1;
        }

        // Neman bayanai gaba daya ta amfani da Promise.all
        // An gyara layin na biyu daga DED_CODE zuwa PL_CODE
        const [matchesResponse, plTableResponse, plScorersResponse] = await Promise.all([
            fetch(`https://api.football-data.org/v4/competitions/${PL_CODE}/matches?matchday=${targetMatchday}`, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
            fetch(`https://api.football-data.org/v4/competitions/${PL_CODE}/standings`, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
            fetch(`https://api.football-data.org/v4/competitions/${PL_CODE}/scorers?limit=10`, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } }),
        ]);

        // Sarrafa dukkan martanin da aka samu
        const matchesData = matchesResponse.ok ? await matchesResponse.json() : { matches: [] };
        // An canza sunan variable da kuma data source
        const plTableData = plTableResponse.ok ? await plTableResponse.json() : { standings: [] };
        const plScorersData = plScorersResponse.ok ? await plScorersResponse.json() : { scorers: [] };

        const finalData = {
            currentMatchday: targetMatchday,
            totalMatchdays: matchesData?.resultSet?.last || 38,
            matches: matchesData?.matches || [],
            // An gyara wannan layin domin ya nuna teburin Premier League
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
