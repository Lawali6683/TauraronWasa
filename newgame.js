export async function handleNewGame(request) {
  return new Response("New Game API working!", {
    headers: { "Content-Type": "text/plain" }
  });
}
