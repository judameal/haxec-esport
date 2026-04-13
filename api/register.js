import { connectDB } from "./lib/db";
import { User } from "./lib/models";

export default async function handler(req, res) {
  await connectDB();

  const { username, password } = req.body;

  const exists = await User.findOne({ username });
  if (exists) return res.status(400).json({ error: "Usuario ya existe" });

  const role = username.toLowerCase() === "judameal" ? "admin" : "user";

  await User.create({ username, password, role });

  res.json({ success: true });
}