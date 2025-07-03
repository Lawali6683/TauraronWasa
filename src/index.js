import { handleGetLink } from "./functions/getLink.js";
import { handleNewGame } from "./functions/newgame.js";
import { handleFotbal } from "./functions/fotbal.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 📌 Route: /getLink (POST file upload)
    if (url.pathname === "/getLink" && request.method === "POST") {
      return await handleGetLink(request);
    }

    // 📌 Route: /newgame (GET/POST)
    if (url.pathname === "/newgame") {
      return await handleNewGame(request);
    }

    // 📌 Route: /fotbal (GET/POST)
    if (url.pathname === "/fotbal") {
      return await handleFotbal(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};
 
