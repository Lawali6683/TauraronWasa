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
        const { query } = requestBody;

        if (!query) {
            const response = new Response(
                JSON.stringify({ error: true, message: "Query parameter is missing." }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
            return withCORSHeaders(response, origin);
        }

        const FOOTBALL_API_TOKEN = env.FOOTBALL_API_TOKEN || "b75541b8a8cc43719195871aa2bd419e";
        const TRANSLATE_API_KEY = env.TRANSLATE_API_KEY || "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";
        const TRANSLATE_API_URL = "https://openrouter.ai/api/v1/chat/completions";

        const translateText = async (text) => {
            if (!text) return "";
            try {
                const translateRes = await fetch(TRANSLATE_API_URL, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${TRANSLATE_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: "openai/gpt-4o-mini",
                        messages: [{
                            role: "user",
                            content: `Ka fassara wannan zuwa Hausa kai tsaye: ${text}`
                        }],
                    }),
                });
                if (!translateRes.ok) {
                    const errorText = await translateRes.text();
                    console.error(`Translation API Error: ${translateRes.status} - ${errorText}`);
                    return text;
                }
                const translateData = await translateRes.json();
                return translateData?.choices?.[0]?.message?.content || text;
            } catch (e) {
                console.error("Translation error:", e.message, e.stack);
                return text;
            }
        };

        const getChatAnswer = async (userQuery) => {
            const date = new Date().getFullYear();
            const fullQuery = `Bani amsa kai tsaye (da hausa ko english) game da: ${userQuery}. Ka bayar da amsa mai ma'ana ta tarihi ko ta yanzu. Ka duba lokacin yanzu ${date}.`;
            try {
                const chatRes = await fetch(TRANSLATE_API_URL, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${TRANSLATE_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: "openai/gpt-4o-mini",
                        messages: [{
                            role: "user",
                            content: fullQuery
                        }],
                    }),
                });
                const chatData = await chatRes.json();
                return chatData?.choices?.[0]?.message?.content || null;
            } catch (e) {
                console.error("Chat API error:", e.message, e.stack);
                return null;
            }
        };
        
        // Sabon aikin bincike wanda zai yi amfani da API na The Sports DB
        const searchTheSportsDB = async (query) => {
            const TEAM_API = "https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=";
            const PLAYER_API = "https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=";
        
            const [teamRes, playerRes] = await Promise.all([
                fetch(TEAM_API + encodeURIComponent(query)),
                fetch(PLAYER_API + encodeURIComponent(query))
            ]);
        
            const teamData = teamRes.ok ? await teamRes.json() : null;
            const playerData = playerRes.ok ? await playerRes.json() : null;
        
            if (teamData && teamData.teams && teamData.teams.length > 0) {
                const teamsWithTranslations = await Promise.all(
                    teamData.teams.map(async (team) => {
                        if (team.strDescriptionEN) {
                            team.strDescriptionHA = await translateText(team.strDescriptionEN);
                        }
                        return team;
                    })
                );
                return { type: "team_info", teams: teamsWithTranslations };
            }
        
            if (playerData && playerData.player && playerData.player.length > 0) {
                const playersWithTranslations = await Promise.all(
                    playerData.player.map(async (player) => {
                        if (player.strDescriptionEN) {
                            player.strDescriptionHA = await translateText(player.strDescriptionEN);
                        }
                        return player;
                    })
                );
                return { type: "player_info", players: playersWithTranslations };
            }
        
            return null;
        };

        const searchFootballData = async (query) => {
            const normalizedQuery = query.toLowerCase();
            const knownComps = {
                "fac": "FAC", "dfb": "DFB", "cdr": "CDR", "cli": "CLI", "knvb": "KNVB",
                "ecl": "ECL", "afcon": "AFCON", "wc": "WC", "ec": "EC", "unl": "UNL",
            };
            
            const compCode = knownComps[normalizedQuery];
            if (compCode) {
                const url = `https://api.football-data.org/v4/competitions/${compCode}/matches`;
                const res = await fetch(url, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } });
                if (res.ok) {
                    const data = await res.json();
                    let standingsData = null;
                    let scorersData = null;

                    // Fetch standings for the competition
                    try {
                        const standingsRes = await fetch(`https://api.football-data.org/v4/competitions/${compCode}/standings`, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } });
                        if (standingsRes.ok) standingsData = await standingsRes.json();
                    } catch (e) {
                        console.error("Failed to fetch standings:", e);
                    }

                    // Fetch top scorers for the competition
                    try {
                        const scorersRes = await fetch(`https://api.football-data.org/v4/competitions/${compCode}/scorers?limit=10`, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } });
                        if (scorersRes.ok) scorersData = await scorersRes.json();
                    } catch (e) {
                        console.error("Failed to fetch scorers:", e);
                    }
                    
                    return { 
                        type: "competition_matches", 
                        data: {
                            matches: data.matches,
                            standings: standingsData?.standings,
                            scorers: scorersData?.scorers,
                        },
                        query: compCode,
                        name: query
                    };
                }
            }

            return null;
        };

        let result = await searchFootballData(query);

        if (!result) {
            result = await searchTheSportsDB(query);
        }

        if (!result) {
            const chatAnswer = await getChatAnswer(query);
            if (chatAnswer) {
                const translatedAnswer = await translateText(chatAnswer);
                const response = new Response(
                    JSON.stringify({ type: "general_info", message: translatedAnswer }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
                return withCORSHeaders(response, origin);
            }
        }
        
        // Idan babu sakamako daga kowane API
        if (!result) {
            const notFoundResponse = new Response(
                JSON.stringify({ type: "not_found", message: "Ba a samu sakamako ba." }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
            return withCORSHeaders(notFoundResponse, origin);
        }

        const response = new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

        return withCORSHeaders(response, origin);
    } catch (e) {
        console.error("Server error in search.js:", e.message, e.stack);
        const errorResponse = new Response(
            JSON.stringify({
                error: true,
                message: "Server error while processing search.",
                details: e.message,
            }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
        return withCORSHeaders(errorResponse, origin);
    }
}
