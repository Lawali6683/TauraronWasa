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
    const TRANSLATE_API_KEY = env.TRANSLATE_API_KEY1;
    const TRANSLATE_API_URL = "https://openrouter.ai/api/v1/chat/completions";
    const WORKER_API_KEY = request.headers.get("x-api-key");
    if (WORKER_API_KEY !== env.API_AUTH_KEY) {
        const response = new Response(
            JSON.stringify({ error: true, message: "Maɓallin API bai daidaita ba." }),
            { status: 401, headers: { "Content-Type": "application/json" } }
        );
        return withCORSHeaders(response, origin);
    }
    const contentType = request.headers.get("content-type") || "";
    if (request.method !== "POST" || !contentType.includes("application/json")) {
        const response = new Response(
            JSON.stringify({ error: true, message: "Hanyar buƙata ko nau'in abun ciki bai daidaita ba." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
        return withCORSHeaders(response, origin);
    }
    const systemPrompt = `Kai babban kwararre ne kuma mai ba da labari game da wasanni. Amsoshin ka suna da ilimi, bayyanannu, kuma cikin yaren da aka yi maka tambaya (Hausa ko Turanci).
Dole ne ka bi waɗannan ƙa'idoji:
1. Yi amfani da binciken yanar gizo (Web Search) na ciki don bada amsoshi da suka shafi sabbin abubuwa, jadawalai, teburin gasa, da halin da ake ciki yanzu.
2. Idan tambayar tana neman hoto na ɗan wasa ko kulob, ka haɗa da URL na hoton da ya dace a cikin amsar ka a wajen <response>. Yi amfani da hanyar haɗi (link) kai tsaye zuwa hoton (misali: https://misali.com/hoto.jpg). Idan ba a samu hoton ba, ka ba da amsa mai kyau ba tare da ambaton hoton ba.
3. Tsara amsar ka a cikin alamar <response>...</response>.
4. Idan tambayar tana neman bayani game da wani mutum ko kulob, fito da sunan a Turanci a cikin alamar <entity_name>...</entity_name>. Idan tambayar ba ta da alaƙa da mutum ko kulob, yi amfani da <entity_name>general</entity_name>.
5. Ka tabbatar duk bayanan da ka bayar na gaskiya ne kuma babu karya.`;
    const getChatAnswer = async (userQuery) => {
        try {
            const chatRes = await fetch(TRANSLATE_API_URL, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${TRANSLATE_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://tauraronwasa.pages.dev",
                    "X-Title": "TauraronWasa",
                },
                body: JSON.stringify({
                    model: "openai/gpt-4o",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userQuery },
                    ],
                }),
            });
            if (!chatRes.ok) {
                const text = await chatRes.text();
                console.error("Chat API failed:", chatRes.status, text);
                return { error: true, message: `API error ${chatRes.status}: ${text}` };
            }
            const chatData = await chatRes.json();
            const content = chatData?.choices?.[0]?.message?.content;
            if (!content) {
                return { error: true, message: "Ba a samu amsa daga AI ba." };
            }
            let entityName = "general";
            let responseText = content;
            const entityMatch = content.match(/<entity_name>(.*?)<\/entity_name>/i);
            if (entityMatch) entityName = entityMatch[1].trim();
            const responseMatch = content.match(/<response>(.*?)<\/response>/i);
            if (responseMatch) responseText = responseMatch[1].trim();
            return {
                query_type: entityName === "general" ? "general_question" : "entity_search",
                entity_name: entityName,
                response_text: responseText,
            };
        } catch (e) {
            console.error("Chat API error:", e.message);
            return { error: true, message: "An samu matsala wajen haɗawa da API. Da fatan a gwada daga baya." };
        }
    };
    try {
        const requestBody = await request.json();
        const { query } = requestBody;
        if (!query) {
            const response = new Response(
                JSON.stringify({ error: true, message: "Tambaya ba ta nan." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
            return withCORSHeaders(response, origin);
        }
        const gptResult = await getChatAnswer(query);
        if (gptResult.error) {
            const errorResponse = new Response(
                JSON.stringify({ error: true, message: gptResult.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
            return withCORSHeaders(errorResponse, origin);
        }
        const finalResponse = new Response(
            JSON.stringify({ message: gptResult.response_text }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
        return withCORSHeaders(finalResponse, origin);
    } catch (e) {
        console.error("Kuskuren aiki:", e.message);
        const errorResponse = new Response(
            JSON.stringify({ error: true, message: "An samu matsala yayin aikin bincike.", details: e.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
        return withCORSHeaders(errorResponse, origin);
    }
}
