import { verifyToken } from "./lib/auth";

export default function handler(req, res) {
  const token = req.headers.authorization;
  const user = verifyToken(token);

  if (!user) return res.status(401).json({ error: "No autorizado" });

  res.json(user);
}