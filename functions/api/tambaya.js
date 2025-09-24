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
            JSON.stringify({ error: true, message: "Maɓallin API bai daidaita ba." }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            }
        );
        return withCORSHeaders(response, origin);
    }

  
    if (request.method !== "POST" || !contentType.includes("application/json")) {
        const response = new Response(
            JSON.stringify({ error: true, message: "Hanyar buƙata ko nau'in abun ciki bai daidaita ba." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            }
        );
        return withCORSHeaders(response, origin);
    }

   
    const TRANSLATE_API_KEY = env.TRANSLATE_API_KEY || "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";
    const TRANSLATE_API_URL = "https://openrouter.ai/api/v1/chat/completions";
    
   
    const SITE_URL = "https://tauraronwasa.pages.dev";
    const SITE_TITLE = "Tauraron Wasa";

    
    const systemPrompt = `Kai mai ba da labari ne na wasanni. Za ka amsa tambayoyi cikin harshen da aka yi maka tambaya, ko dai Hausa ko Turanci. Idan aka haɗa Hausa da Turanci, ka ba da amsa da Hausa.
    
Kafin ka ba da amsa, bincika ko tambayar tana neman bayani game da wani kulob ko mutum (ɗan wasa). Idan haka ne, fito da sunan mutumin ko kulob din a Turanci a cikin alamar <entity_name>. Idan ba tambayar ba ce ta mutum ko kulob, ka sa <entity_name>general</entity_name>.
    
Ka bayar da amsar ka a cikin alamar <response>.
    
Misali na amsa:
<response_data>
    <entity_name>Cristiano Ronaldo</entity_name>
    <response>Cristiano Ronaldo (CR7) an haife shi ne a ranar 5 ga Fabrairu, 1985, a Funchal, Madeira, Portugal. Shi ɗan wasan ƙwallon ƙafa ne na ƙasar Portugal...</response>
</response_data>
    
<response_data>
    <entity_name>Barcelona</entity_name>
    <response>FC Barcelona, wanda aka fi sani da Barça, kulob ne na ƙwallon ƙafa da ke Barcelona, Spain. An kafa shi a shekara ta 1899...</response>
</response_data>
    
<response_data>
    <entity_name>general</entity_name>
    <response>Ƙa'idodin wasan ƙwallon ƙafa sun haɗa da: yawan 'yan wasa, tsawon lokacin wasa, buɗaɗɗen bugun kyauta, da kuma yadda ake zura ƙwallo a raga...</response>
</response_data>
    
Ka tabbata amsarka tana cikin tsarin <response_data> da kuma <entity_name> da <response>.`;

  
    const getChatAnswer = async (userQuery) => {
        try {
            const chatRes = await fetch(TRANSLATE_API_URL, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${TRANSLATE_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": SITE_URL, // Anan ne aka kara wannan shugaban
                    "X-Title": SITE_TITLE,    // Anan ne kuma aka kara wannan
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
                return { error: true, message: "An samu kuskure wajen neman labari. Da fatan za a gwada daga baya." };
            }

            const chatData = await chatRes.json();
            const content = chatData?.choices?.[0]?.message?.content;

            if (!content) {
                return { error: true, message: "Ba a samu amsa daga AI ba." };
            }

            
            const entityMatch = content.match(/<entity_name>(.*?)<\/entity_name>/i);
            const responseMatch = content.match(/<response>(.*?)<\/response>/i);

            const entityName = entityMatch ? entityMatch[1].trim() : "general";
            const responseText = responseMatch ? responseMatch[1].trim() : "Ba a samu labarin da ake nema ba.";

            return {
                query_type: entityName === "general" ? "general_question" : "entity_search",
                entity_name: entityName,
                response_text: responseText
            };
        } catch (e) {
            console.error("Chat API error:", e.message);
            return { error: true, message: "An samu matsala wajen haɗawa da API. Da fatan za a gwada daga baya." };
        }
    };

    
    const searchTheSportsDB = async (entityName) => {
        const TEAM_API = "https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=";
        const PLAYER_API = "https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=";
        try {
            const [teamRes, playerRes] = await Promise.all([
                fetch(TEAM_API + encodeURIComponent(entityName)),
                fetch(PLAYER_API + encodeURIComponent(entityName))
            ]);

            const teamData = teamRes.ok ? await teamRes.json() : null;
            const playerData = playerRes.ok ? await playerRes.json() : null;

            if (teamData?.teams?.length > 0) {
                const team = teamData.teams[0];
                return team.strTeamBadge || team.strTeamJersey || team.strStadiumThumb || null;
            }

            if (playerData?.player?.length > 0) {
                const player = playerData.player[0];
                return player.strThumb || player.strCutout || null;
            }

        } catch (e) {
            console.error("TheSportsDB search error:", e.message);
        }

        return null;
    };


    try {
        const requestBody = await request.json();
        const { query } = requestBody;

        if (!query) {
            const response = new Response(
                JSON.stringify({ error: true, message: "Tambaya ba ta nan." }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                }
            );
            return withCORSHeaders(response, origin);
        }

        // Yana Kiran aikin da aka gyara don samun amsa daga AI.
        const gptResult = await getChatAnswer(query);

        if (gptResult.error) {
            const errorResponse = new Response(JSON.stringify({ error: true, message: gptResult.message }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
            return withCORSHeaders(errorResponse, origin);
        }

        let finalResponseData = { message: gptResult.response_text, image: null };

        // Yana neman hoton idan tambayar tana nufin wani mutum ko kulob.
        if (gptResult.query_type === "entity_search" && gptResult.entity_name && gptResult.entity_name !== "general") {
            const image = await searchTheSportsDB(gptResult.entity_name);
            if (image) {
                finalResponseData.image = image;
            }
        }

        const finalResponse = new Response(JSON.stringify(finalResponseData), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

        return withCORSHeaders(finalResponse, origin);
    } catch (e) {
        console.error("Kuskuren aiki a tambaya.js:", e.message);
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
