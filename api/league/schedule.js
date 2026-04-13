import { globalSchedule } from "./start";

export default function handler(req, res) {
  res.json({
    schedule: globalSchedule,
    leagueStarted: globalSchedule.length > 0
  });
}