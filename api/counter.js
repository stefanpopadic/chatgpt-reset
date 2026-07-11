import { createCounterService } from "../server/counter-service.mjs";
import { handleCounterRequest } from "../server/counter-handler.mjs";

const counter = createCounterService(process.env.DATABASE_URL);

export default async function handler(request, response) {
  return handleCounterRequest(request, response, {
    counter,
    secret: process.env.IP_HASH_SALT,
  });
}
