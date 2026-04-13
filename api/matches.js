import { connectDB } from "./lib/db";
import { Match, Player } from "./lib/models";

export default async function handler(req, res) {
  await connectDB();

  if (req.method === "GET") {
    return res.json(await Match.find());
  }

  if (req.method === "POST") {
    const body = req.body;

    // VALIDACIONES
    if (body.homeTeamId === body.awayTeamId) {
      return res.status(400).json({ error: "Equipos iguales" });
    }

    // ACTUALIZAR STATS
    for (const s of body.scorers) {
      const p = await Player.findById(s.playerId);
      if (p) p.goals++;
      await p.save();
    }

    for (const a of body.assists) {
      const p = await Player.findById(a.playerId);
      if (p) p.assists++;
      await p.save();
    }

    if (body.mvpId) {
      const p = await Player.findById(body.mvpId);
      if (p) p.mvps++;
      await p.save();
    }

    for (const y of body.yellowCards) {
      const p = await Player.findById(y);
      if (p) p.yellowCards++;
      await p.save();
    }

    for (const r of body.redCards) {
      const p = await Player.findById(r);
      if (p) p.redCards++;
      await p.save();
    }

    // VALLA INVICTA
    if (body.homeScore === 0) {
      const players = await Player.find({ teamId: body.awayTeamId, position: "Portero" });
      players.forEach(async p => { p.cleanSheets++; await p.save(); });
    }

    if (body.awayScore === 0) {
      const players = await Player.find({ teamId: body.homeTeamId, position: "Portero" });
      players.forEach(async p => { p.cleanSheets++; await p.save(); });
    }

    const match = await Match.create(body);

    return res.json(match);
  }
}