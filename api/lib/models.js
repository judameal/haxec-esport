import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  role: { type: String, default: "user" },
  banned: { type: Boolean, default: false }
});

const teamSchema = new mongoose.Schema({
  name: String,
  logo: String,
  coach: String
});

const playerSchema = new mongoose.Schema({
  name: String,
  dorsal: Number,
  teamId: String,
  position: String,
  goals: { type: Number, default: 0 },
  assists: { type: Number, default: 0 },
  mvps: { type: Number, default: 0 },
  cleanSheets: { type: Number, default: 0 },
  yellowCards: { type: Number, default: 0 },
  redCards: { type: Number, default: 0 }
});

const matchSchema = new mongoose.Schema({
  jornada: Number,
  homeTeamId: String,
  awayTeamId: String,
  homeScore: Number,
  awayScore: Number,
  scorers: Array,
  assists: Array,
  yellowCards: Array,
  redCards: Array,
  homeBuses: Number,
  awayBuses: Number,
  mvpId: String,
  notes: String,
  recordingUrl: String,
  playedAt: { type: Date, default: Date.now }
});

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Team = mongoose.models.Team || mongoose.model("Team", teamSchema);
export const Player = mongoose.models.Player || mongoose.model("Player", playerSchema);
export const Match = mongoose.models.Match || mongoose.model("Match", matchSchema);