import { connectDB } from "../lib/db";
import { Team, Match } from "../lib/models";

export default async function handler(req, res) {
  await connectDB();

  const teams = await Team.find();
  const matches = await Match.find();

  const stats = teams.map(t => ({
    teamId: t._id,
    teamName: t.name,
    goals: 0,
    assists: 0,
    mvps: 0,
    buses: 0,
    cleanSheets: 0
  }));

  matches.forEach(m => {
    const home = stats.find(t => t.teamId == m.homeTeamId);
    const away = stats.find(t => t.teamId == m.awayTeamId);

    if (!home || !away) return;

    home.goals += m.homeScore;
    away.goals += m.awayScore;

    home.buses += m.homeBuses;
    away.buses += m.awayBuses;
  });

  res.json(stats);
}