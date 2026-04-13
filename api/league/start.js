import { connectDB } from "../lib/db";
import { Team } from "../lib/models";

function generateSchedule(teams) {
  const n = teams.length;
  let rounds = [];

  let teamList = [...teams];

  if (n % 2 !== 0) teamList.push(null);

  const totalRounds = teamList.length - 1;
  const half = teamList.length / 2;

  for (let round = 0; round < totalRounds; round++) {
    let jornada = [];

    for (let i = 0; i < half; i++) {
      const home = teamList[i];
      const away = teamList[teamList.length - 1 - i];

      if (home && away) {
        jornada.push({
          home: home._id.toString(),
          away: away._id.toString(),
          played: false
        });
      }
    }

    rounds.push({ jornada: round + 1, matches: jornada });

    // rotación
    const fixed = teamList[0];
    const rest = teamList.slice(1);
    rest.unshift(rest.pop());
    teamList = [fixed, ...rest];
  }

  // vuelta
  const reverse = rounds.map((r, i) => ({
    jornada: i + 1 + totalRounds,
    matches: r.matches.map(m => ({
      home: m.away,
      away: m.home,
      played: false
    }))
  }));

  return [...rounds, ...reverse];
}

let globalSchedule = [];

export default async function handler(req, res) {
  await connectDB();

  const teams = await Team.find();

  if (teams.length !== 10) {
    return res.status(400).json({ error: "Se necesitan 10 equipos" });
  }

  globalSchedule = generateSchedule(teams);

  res.json({
    success: true,
    schedule: globalSchedule,
    leagueStarted: true
  });
}

export { globalSchedule };