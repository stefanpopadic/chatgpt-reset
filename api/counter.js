import { createCounterService } from "../server/counter-service.mjs";
import { hashRequestIp } from "../server/visitor-id.mjs";

const counter = createCounterService(process.env.DATABASE_URL);

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  try {
    const visitorHash = hashRequestIp(request, process.env.IP_HASH_SALT);

    if (request.method === "GET") {
      return response.status(200).json(await counter.read(visitorHash));
    }

    if (request.method === "POST") {
      return response.status(200).json(await counter.increment(visitorHash));
    }

    response.setHeader("Allow", "GET, POST");
    return response.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Counter unavailable" });
  }
}
