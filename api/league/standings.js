import { connectDB } from "../lib/db";
import { Team, Match } from "../lib/models";

export default async function handler(req, res) {
  await connectDB();

  const teams = await Team.find();
  const matches = await Match.find();

  let table = teams.map(t => ({
    teamId: t._id.toString(),
    teamName: t.name,
    PJ: 0, W: 0, D: 0, L: 0,
    GF: 0, GC: 0, DG: 0, Pts: 0
  }));

  matches.forEach(m => {
    const home = table.find(t => t.teamId === m.homeTeamId);
    const away = table.find(t => t.teamId === m.awayTeamId);

    if (!home || !away) return;

    home.PJ++; away.PJ++;
    home.GF += m.homeScore;
    home.GC += m.awayScore;
    away.GF += m.awayScore;
    away.GC += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.W++; away.L++; home.Pts += 3;
    } else if (m.homeScore < m.awayScore) {
      away.W++; home.L++; away.Pts += 3;
    } else {
      home.D++; away.D++;
      home.Pts++; away.Pts++;
    }
  });

  table.forEach(t => t.DG = t.GF - t.GC);

  table.sort((a, b) => b.Pts - a.Pts || b.DG - a.DG || b.GF - a.GF);

  res.json(table);
}