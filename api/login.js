import { connectDB } from "./lib/db";
import { User } from "./lib/models";
import { createToken } from "./lib/auth";

export default async function handler(req, res) {
  await connectDB();

  if (req.method !== "POST")
    return res.status(405).json({ error: "Método no permitido" });

  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: "Usuario no existe" });

  if (user.password !== password)
    return res.status(400).json({ error: "Contraseña incorrecta" });

  if (user.banned)
    return res.status(403).json({ error: "Usuario baneado" });

  const token = createToken(user);

  return res.json({
    token,
    username: user.username,
    role: user.role,
    id: user._id
  });
}