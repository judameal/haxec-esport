import { connectDB } from "./lib/db";
import { Team } from "./lib/models";

export default async function handler(req, res) {
  await connectDB();

  if (req.method === "GET") {
    const teams = await Team.find();
    return res.json(teams);
  }

  if (req.method === "POST") {
    const team = await Team.create(req.body);
    return res.json(team);
  }
}