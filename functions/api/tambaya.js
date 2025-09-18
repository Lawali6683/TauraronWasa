export async function onRequest(context) {
    const { request, env } = context;
    const origin = request.headers.get("Origin");

    const ALLOWED_ORIGINS = [
        "https://tauraronwasa.pages.dev",
        "https://leadwaypeace.pages.dev",
        "http://localhost:8080",
    ];

    function withCORSHeaders(response, origin) {
        response.headers.set(
            "Access-Control-Allow-Origin",
            ALLOWED_ORIGINS.includes(origin) ? origin : "https://tauraronwasa.pages.dev"
        );
        response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        response.headers.set("Access-Control-Allow-Headers", "*");
        response.headers.set("Access-Control-Max-Age", "86400");
        return response;
    }

    if (request.method === "OPTIONS") {
        return withCORSHeaders(new Response(null, { status: 204 }), origin);
    }

    const WORKER_API_KEY = request.headers.get("x-api-key");
    const contentType = request.headers.get("content-type") || "";

    if (WORKER_API_KEY !== "@haruna66") {
        return withCORSHeaders(
            new Response(JSON.stringify({ error: true, message: "Invalid API Key" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            }),
            origin
        );
    }

    if (request.method !== "POST" || !contentType.includes("application/json")) {
        return withCORSHeaders(
            new Response(JSON.stringify({ error: true, message: "Invalid Request Method or Content-Type" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            }),
            origin
        );
    }

    try {
        const { query } = await request.json();
        if (!query) {
            return withCORSHeaders(
                new Response(JSON.stringify({ error: true, message: "Query parameter is missing." }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }),
                origin
            );
        }

        const TRANSLATE_API_KEY =
            env.TRANSLATE_API_KEY ||
            "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";
        const TRANSLATE_API_URL = "https://openrouter.ai/api/v1/chat/completions";

        const systemPrompt = `Kai mai ba da labari ne na wasanni... (duk prompt ɗinka nan)`;

        const getChatAnswer = async (userQuery) => {
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
                            { role: "user", content: userQuery },
                        ],
                    }),
                });

                const chatData = await chatRes.json();

                if (!chatRes.ok) {
                    console.error("Chat API Error:", chatData);
                    return { error: true, message: "An samu kuskure wajen neman labari." };
                }

                const content = chatData?.choices?.[0]?.message?.content;
                if (!content) return { error: true, message: "Ba a samu amsa daga API ba." };

                const entityMatch = content.match(/<entity_name>(.*?)<\/entity_name>/);
                const responseMatch = content.match(/<response>(.*?)<\/response>/);

                return {
                    query_type: entityMatch ? "entity_search" : "general_question",
                    entity_name: entityMatch ? entityMatch[1].trim() : "general",
                    response_text: responseMatch ? responseMatch[1].trim() : content.trim(),
                };
            } catch (e) {
                console.error("Chat API error:", e.message);
                return { error: true, message: "Matsala wajen haɗawa da API." };
            }
        };

        const searchTheSportsDB = async (entityName) => {
            const TEAM_API = "https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=";
            const PLAYER_API = "https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=";

            try {
                const [teamRes, playerRes] = await Promise.all([
                    fetch(TEAM_API + encodeURIComponent(entityName)),
                    fetch(PLAYER_API + encodeURIComponent(entityName)),
                ]);

                const teamData = teamRes.ok ? await teamRes.json() : null;
                const playerData = playerRes.ok ? await playerRes.json() : null;

                if (teamData?.teams?.length > 0) {
                    return teamData.teams[0].strTeamBadge || null;
                }
                if (playerData?.player?.length > 0) {
                    return playerData.player[0].strThumb || null;
                }
            } catch (e) {
                console.error("TheSportsDB search error:", e.message);
            }
            return null;
        };

        const gptResult = await getChatAnswer(query);
        if (gptResult.error) {
            return withCORSHeaders(
                new Response(JSON.stringify(gptResult), {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }),
                origin
            );
        }

        const image =
            gptResult.query_type === "entity_search" && gptResult.entity_name !== "general"
                ? await searchTheSportsDB(gptResult.entity_name)
                : null;

        return withCORSHeaders(
            new Response(JSON.stringify({ message: gptResult.response_text, image }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }),
            origin
        );
    } catch (e) {
        console.error("Server error in tambaya.js:", e);
        return withCORSHeaders(
            new Response(
                JSON.stringify({ error: true, message: "An samu matsala yayin aikin bincike.", details: e.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            ),
            origin
        );
    }
}
