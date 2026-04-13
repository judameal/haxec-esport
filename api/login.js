export default function handler(req, res) {
  if (req.method === "POST") {
    const { user, password } = req.body;

    if (user === "Judameal" && password === "1234") {
      return res.status(200).json({ success: true });
    }

    return res.status(401).json({ success: false });
  }

  return res.status(200).json({ message: "login endpoint" });
}