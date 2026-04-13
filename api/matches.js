import { connectDB } from "./lib/db";
import { Match } from "./lib/models";

export default async function handler(req, res) {
  await connectDB();

  if (req.method === "GET") {
    return res.json(await Match.find());
  }

  if (req.method === "POST") {
    return res.json(await Match.create(req.body));
  }

  if (req.method === "DELETE") {
    await Match.findByIdAndDelete(req.query.id);
    return res.json({ success: true });
  }
}