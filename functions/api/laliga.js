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

    if (request.method === "OPTIONS") {
        return withCORSHeaders(new Response(null, { status: 204 }));
    }

    const WORKER_API_KEY = request.headers.get("x-api-key");
    if (WORKER_API_KEY !== "@haruna66") {
        return withCORSHeaders(new Response(
            JSON.stringify({ error: true, message: "Invalid API Key" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            }
        ));
    }

    const contentType = request.headers.get("content-type") || "";
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
        const FOOTBALL_API_TOKEN = "b75541b8a8cc43719195871aa2bd419e";
        const LALIGA_CODE = "PD";

        // Tabbatar an samar da matchday kafin a ci gaba
        let { matchday } = requestBody;
        if (!matchday) {
            const leagueTableResponse = await fetch(`https://api.football-data.org/v4/competitions/${LALIGA_CODE}/standings`, {
                headers: { "X-Auth-Token": FOOTBALL_API_TOKEN }
            });
            if (!leagueTableResponse.ok) {
                const errorText = await leagueTableResponse.text();
                console.error(`Error fetching league standings to get matchday: ${leagueTableResponse.status} - ${errorText}`);
                throw new Error(`Failed to determine current matchday: ${leagueTableResponse.statusText}`);
            }
            const leagueTableData = await leagueTableResponse.json();
            matchday = leagueTableData?.season?.currentMatchday;
        }

        // Haɗa buƙatu guda uku a lokaci ɗaya
        const [matchesResponse, tableResponse, scorersResponse] = await Promise.all([
            fetch(`https://api.football-data.org/v4/competitions/${LALIGA_CODE}/matches?matchday=${matchday}`, {
                headers: { "X-Auth-Token": FOOTBALL_API_TOKEN }
            }),
            fetch(`https://api.football-data.org/v4/competitions/${LALIGA_CODE}/standings`, {
                headers: { "X-Auth-Token": FOOTBALL_API_TOKEN }
            }),
            fetch(`https://api.football-data.org/v4/competitions/${LALIGA_CODE}/scorers?limit=10`, {
                headers: { "X-Auth-Token": FOOTBALL_API_TOKEN }
            })
        ]);

        if (!matchesResponse.ok) {
            const errorText = await matchesResponse.text();
            console.error(`Error fetching La Liga matches: ${matchesResponse.status} - ${errorText}`);
            throw new Error(`Failed to fetch La Liga matches: ${matchesResponse.statusText}`);
        }
        if (!tableResponse.ok) {
            const errorText = await tableResponse.text();
            console.error(`Error fetching La Liga standings: ${tableResponse.status} - ${errorText}`);
            throw new Error(`Failed to fetch La Liga standings: ${tableResponse.statusText}`);
        }

        const matchesData = await matchesResponse.json();
        const tableData = await tableResponse.json();
        const scorersData = scorersResponse.ok ? await scorersResponse.json() : { scorers: [] };

        const finalData = {
            matches: matchesData?.matches || [],
            leagueTable: tableData?.standings?.[0]?.table || [],
            scorers: scorersData?.scorers || [],
            currentMatchday: tableData?.season?.currentMatchday || matchday,
            totalMatchdays: tableData?.season?.totalMatchdays,
            leagueCode: LALIGA_CODE
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
                message: `Server error while fetching La Liga data: ${e.message}`,
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
        return withCORSHeaders(errorResponse);
    }
}
