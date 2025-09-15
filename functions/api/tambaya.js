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
        const { query } = requestBody;

        if (!query) {
            const response = new Response(
                JSON.stringify({ error: true, message: "Query parameter is missing." }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
            return withCORSHeaders(response, origin);
        }

        const TRANSLATE_API_KEY = env.TRANSLATE_API_KEY || "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";
        const TRANSLATE_API_URL = "https://openrouter.ai/api/v1/chat/completions";

        const getChatAnswer = async (userQuery, targetLanguage = 'Hausa') => {
            const systemPrompt = `Kai mai ba da labari ne na wasanni da ya kware. Amsa tambayoyi da ${targetLanguage}. Idan mai amfani ya haɗa tambaya da harshen Hausa da Turanci, ka ba da amsa da Hausa. Ka ba da amsa mai gamsarwa kuma gajeriya.`;
            
            try {
                const chatRes = await fetch(TRANSLATE_API_URL, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${TRANSLATE_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: "openai/gpt-4o-mini",
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userQuery }
                        ],
                    }),
                });

                if (!chatRes.ok) {
                    const errorData = await chatRes.json();
                    console.error(`Chat API Error: ${chatRes.status}, Details: ${JSON.stringify(errorData)}`);
                    return { message: "An samu kuskure wajen neman labari. Da fatan za a gwada daga baya." };
                }

                const chatData = await chatRes.json();
                return { message: chatData?.choices?.[0]?.message?.content || "Ba a samu labarin da ake nema ba." };

            } catch (e) {
                console.error("Chat API error:", e.message);
                return { message: "An samu matsala wajen haɗawa da API. Da fatan za a gwada daga baya." };
            }
        };

        const searchTheSportsDB = async (query) => {
            const TEAM_API = "https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=";
            const PLAYER_API = "https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=";

            try {
                const [teamRes, playerRes] = await Promise.all([
                    fetch(TEAM_API + encodeURIComponent(query)),
                    fetch(PLAYER_API + encodeURIComponent(query))
                ]);
                
                const teamData = teamRes.ok ? await teamRes.json() : null;
                const playerData = playerRes.ok ? await playerRes.json() : null;

                if (teamData?.teams?.length > 0) {
                    const team = teamData.teams[0];
                    if (team.strDescriptionEN && team.strDescriptionEN.length > 50) {
                         const message = team.strDescriptionEN;
                         const image = team.strTeamBadge || team.strTeamJersey || team.strStadiumThumb || null;
                         return { message, image };
                    }
                }
                
                if (playerData?.player?.length > 0) {
                    const player = playerData.player[0];
                    if (player.strDescriptionEN && player.strDescriptionEN.length > 50) {
                        const message = player.strDescriptionEN;
                        const image = player.strThumb || player.strCutout || null;
                        return { message, image };
                    }
                }

            } catch (e) {
                console.error("TheSportsDB search error:", e.message);
            }
            return null;
        };

        let result = null;
        const hausaKeywords = ["wasanni", "kulob", "wasan", "wanene", "ina", "shekara", "koci", "yayi", "buga", "da"];
        const isHausaQuery = hausaKeywords.some(keyword => query.toLowerCase().includes(keyword));

        if (!isHausaQuery) {
            result = await searchTheSportsDB(query);
        }

        if (!result) {
            const gptLanguage = isHausaQuery ? 'Hausa' : 'Turanci';
            result = await getChatAnswer(query, gptLanguage);
        }

        const finalResponse = new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

        return withCORSHeaders(finalResponse, origin);

    } catch (e) {
        console.error("Server error in tambaya.js:", e.message);
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
