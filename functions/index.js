// /functions/index.js

import { handleChampions } from "./api/champions.js";
import { handleEropa } from "./api/eropa.js";
import { handleFa } from "./api/fa.js";
import { handleFootball } from "./api/football.js";
import { handleLabarinWasa } from "./api/labarinWasa.js";
import { handleLaliga } from "./api/laliga.js";
import { handleNpfl } from "./api/npfl.js";
import { handlePremier } from "./api/premier.js";
import { handleSearch } from "./api/search.js";
import { handleSiriyaa } from "./api/siriyaa.js";
import { handleSite6 } from "./api/site6.js";
import { handleTranslate } from "./api/translate.js";
import { handleUserNotification } from "./api/userNotification.js";

// Domains masu izini don CORS
const ALLOWED_ORIGINS = [
  "https://tauraronwasa.pages.dev",
  "https://leadwaypeace.pages.dev",
  "http://localhost:8080",
];

// Helper don bada response da CORS headers
function withCORSHeaders(response, request) {
  const origin = request.headers.get("Origin");
  if (ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else {
    response.headers.set("Access-Control-Allow-Origin", "https://tauraronwasa.pages.dev");
  }
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, x-api-key");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

// Babban handler na Pages Functions
export async function onRequest(context) {
  const { request } = context;

  // A fara sarrafa kiran OPTIONS (CORS preflight)
  if (request.method === "OPTIONS") {
    const origin = request.headers.get("Origin");
    if (ALLOWED_ORIGINS.includes(origin)) {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-api-key",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    return new Response(null, { status: 403 });
  }

  // Duba API Key
  const WORKER_API_KEY = request.headers.get("x-api-key");
  if (WORKER_API_KEY !== "@haruna66") {
    const forbiddenResponse = new Response(
      JSON.stringify({ error: true, message: "Invalid API Key" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
    return withCORSHeaders(forbiddenResponse, request);
  }

  // A duba ko request din POST ne
  const contentType = request.headers.get("content-type") || "";
  if (request.method !== "POST" || !contentType.includes("application/json")) {
    const invalidResponse = new Response("Invalid Request Method or Content-Type", {
      status: 400,
    });
    return withCORSHeaders(invalidResponse, request);
  }

  // Anan ne babban logic din ka
  try {
    const url = new URL(request.url);
    let response;

    switch (url.pathname) {
      case "/api/football":
        response = await handleFootball(request);
        break;
      case "/api/champions":
        response = await handleChampions(request);
        break;
      case "/api/eropa":
        response = await handleEropa(request);
        break;
      case "/api/fa":
        response = await handleFa(request);
        break;
      case "/api/labarinWasa":
        response = await handleLabarinWasa(request);
        break;
      case "/api/laliga":
        response = await handleLaliga(request);
        break;
      case "/api/npfl":
        response = await handleNpfl(request);
        break;
      case "/api/premier":
        response = await handlePremier(request);
        break;
      case "/api/search":
        response = await handleSearch(request);
        break;
      case "/api/siriyaa":
        response = await handleSiriyaa(request);
        break;
      case "/api/site6":
        response = await handleSite6(request);
        break;
      case "/api/translate":
        response = await handleTranslate(request);
        break;
      case "/api/userNotification":
        response = await handleUserNotification(request);
        break;
      default:
        response = new Response("Not Found", { status: 404 });
        break;
    }

    return withCORSHeaders(response, request);
  } catch (e) {
    const errorResponse = new Response(
      JSON.stringify({
        error: true,
        message: "Server error while processing request.",
        details: e.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
    return withCORSHeaders(errorResponse, request);
  }
}
