import { connectDB } from "./lib/db";
import { Player } from "./lib/models";

export default async function handler(req, res) {
  await connectDB();

  if (req.method === "GET") {
    return res.json(await Player.find());
  }

  if (req.method === "POST") {
    return res.json(await Player.create(req.body));
  }
}