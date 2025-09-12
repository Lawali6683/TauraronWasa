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
                headers: { "Content-Type": "application/json"
                },
            }
        );
        return withCORSHeaders(response, origin);
    }

    if (request.method !== "POST" || !contentType.includes("application/json")) {
        const response = new Response(
            JSON.stringify({ error: true, message: "Invalid Request Method or Content-Type" }), {
                status: 400,
                headers: { "Content-Type": "application/json"
                },
            }
        );
        return withCORSHeaders(response, origin);
    }

    try {
        const requestBody = await request.json();
        const { stage } = requestBody;

        // An inganta API tokens da URLs don aiki daidai da Champions League
        const FOOTBALL_API_TOKEN = "b75541b8a8cc43719195871aa2bd419e";
        const CL_CODE = "CL";
        const BASE_API_URL = "https://api.football-data.org/v4";

        const apiHeaders = { "X-Auth-Token": FOOTBALL_API_TOKEN };

        // An ƙara buƙatun API don dukkan bayanan da ake buƙata
        const matchesUrl = `${BASE_API_URL}/competitions/${CL_CODE}/matches${stage ? `?stage=${stage}` : ""}`;
        const standingsUrl = `${BASE_API_URL}/competitions/${CL_CODE}/standings`;
        const scorersUrl = `${BASE_API_URL}/competitions/${CL_CODE}/scorers?limit=10`;

        // An tattara dukkan buƙatun tare don saurin aiki
        const [matchesRes, standingsRes, scorersRes] = await Promise.all([
            fetch(matchesUrl, { headers: apiHeaders }),
            fetch(standingsUrl, { headers: apiHeaders }),
            fetch(scorersUrl, { headers: apiHeaders }),
        ]);

        const matchesData = matchesRes.ok ? await matchesRes.json() : { matches: [] };
        const standingsData = standingsRes.ok ? await standingsRes.json() : { standings: [] };
        const scorersData = scorersRes.ok ? await scorersRes.json() : { scorers: [] };

        // Zato (Simulated) bayanan Assists da Man of the Match
        // Domin API na Football-Data baya samar da waɗannan bayanan
        const assistsData = {
            assists: [
                // Misali data na masu taimakawa
                { player: { name: 'Kevin De Bruyne', photo: 'https://i.imgur.com/gTf7kH2.png' }, team: { name: 'Manchester City', crest: 'https://i.imgur.com/G5d0lJ2.png' }, assists: 8 },
                { player: { name: 'Lionel Messi', photo: 'https://i.imgur.com/712W7pX.png' }, team: { name: 'Paris Saint-Germain', crest: 'https://i.imgur.com/rP65uRk.png' }, assists: 7 },
                { player: { name: 'Kylian Mbappé', photo: 'https://i.imgur.com/oA6r5Xw.png' }, team: { name: 'Paris Saint-Germain', crest: 'https://i.imgur.com/rP65uRk.png' }, assists: 6 },
            ]
        };
        
        const motmData = {
            manOfTheMatch: [
                // Misali data na Man of the Match
                { player: { name: 'Vinícius Júnior', photo: 'https://i.imgur.com/6Zp7N6V.png' }, team: { name: 'Real Madrid', crest: 'https://i.imgur.com/2Xy0U3L.png' } },
                { player: { name: 'Erling Haaland', photo: 'https://i.imgur.com/jM8V9bT.png' }, team: { name: 'Manchester City', crest: 'https://i.imgur.com/G5d0lJ2.png' } },
            ]
        };

        const finalData = {
            matches: matchesData.matches || [],
            standings: standingsData.standings || [],
            scorers: scorersData.scorers || [],
            assists: assistsData.assists,
            manOfTheMatch: motmData.manOfTheMatch,
            // Ƙara stages da currentStage don amfani a frontend
            stages: [
                { code: '', name: 'Duk Wasanni' },
                { code: 'GROUP_STAGE', name: 'Matakin Groups' },
                { code: 'LAST_16', name: 'Round of 16' },
                { code: 'QUARTER_FINALS', name: 'Quarter Finals' },
                { code: 'SEMI_FINALS', name: 'Semi Finals' },
                { code: 'FINAL', name: 'Final' }
            ],
            currentStage: stage || (matchesData.matches[0]?.stage || 'GROUP_STAGE')
        };

        const response = new Response(JSON.stringify(finalData), {
            status: 200,
            headers: { "Content-Type": "application/json"
            },
        });
        return withCORSHeaders(response, origin);

    } catch (e) {
        console.error("Server error in champions.js:", e.message, e.stack);
        const errorResponse = new Response(
            JSON.stringify({
                error: true,
                message: "Kuskure a wajen dauko bayanan Champions League.",
                details: e.message,
            }), {
                status: 500,
                headers: { "Content-Type": "application/json"
                },
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
