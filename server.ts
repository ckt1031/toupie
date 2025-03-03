import worker from "./src/index";

// worker.port = 8080;
// worker.development = process.env.NODE_ENV==="development"

const server = Bun.serve(worker);
console.log(`Listening on ${server.url.origin}`);
