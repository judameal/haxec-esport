import { connectDB } from "../lib/db";
import { Team } from "../lib/models";

let schedule = [];

export default async function handler(req, res) {
  await connectDB();

  const teams = await Team.find();

  if (teams.length !== 10)
    return res.status(400).json({ error: "Se necesitan 10 equipos" });

  // Generador simple
  schedule = teams.map((t, i) => ({
    jornada: i + 1,
    matches: []
  }));

  res.json({ success: true, schedule });
}