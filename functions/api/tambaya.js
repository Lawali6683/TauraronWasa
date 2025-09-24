export async function onRequest(context) {
    const { request } = context;
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

    // CORS preflight
    if (request.method === "OPTIONS") {
        return withCORSHeaders(new Response(null, { status: 204 }), origin);
    }

    // Na saka API key naka kai tsaye (GWADAWA NE)
    const TRANSLATE_API_KEY = "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";
    const TRANSLATE_API_URL = "https://openrouter.ai/api/v1/chat/completions";

    // Tabbatar client ɗinka na aika da wannan
    const WORKER_API_KEY = request.headers.get("x-api-key");
    if (WORKER_API_KEY !== "@haruna66") {
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

    const systemPrompt = `Kai mai ba da labari ne na wasanni. Za ka amsa tambayoyi cikin harshen da aka yi maka tambaya, ko dai Hausa ko Turanci. Idan aka haɗa Hausa da Turanci, ka ba da amsa da Hausa.

Kafin ka ba da amsa, bincika ko tambayar tana neman bayani game da wani kulob ko mutum (ɗan wasa). Idan haka ne, fito da sunan mutumin ko kulob din a Turanci a cikin alamar <entity_name>. Idan ba tambayar ba ce ta mutum ko kulob, ka sa <entity_name>general</entity_name>.

Ka bayar da amsar ka a cikin alamar <response>.`;

    // Function don aika query zuwa OpenRouter
    const getChatAnswer = async (userQuery) => {
        try {
            const chatRes = await fetch(TRANSLATE_API_URL, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${TRANSLATE_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://tauraronwasa.pages.dev",
                    "X-Title": "Tauraron Wasa",
                },
                body: JSON.stringify({
                    model: "openai/gpt-4o", // canja zuwa gpt-4o
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
