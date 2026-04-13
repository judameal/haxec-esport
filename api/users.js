import { connectDB } from "./lib/db";
import { User } from "./lib/models";

export default async function handler(req, res) {
  await connectDB();

  if (req.method === "GET") {
    return res.json(await User.find());
  }
}