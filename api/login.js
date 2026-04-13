export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({ message: "login endpoint" });
    }

    const { user, password } = req.body;

    if (user === "Judameal" && password === "1234") {
      return res.status(200).json({ success: true });
    }

    return res.status(401).json({ success: false });

  } catch (error) {
    return res.status(500).json({ error: "Error del servidor" });
  }
}