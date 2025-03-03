import worker from "./src/index";

const server = Bun.serve(worker);
console.log(`Listening on ${server.url.origin}`);
