/**
 * College Enquiry Form — server.js
 * Stack : Node.js + Express + MongoDB (native driver)
 * Routes:
 *   GET  /              → serve the enquiry form
 *   POST /enquiry       → save enquiry to MongoDB
 *   GET  /enquiries     → return all enquiries as JSON
 *   DELETE /enquiry/:id → delete one enquiry
 */

const express  = require("express");
const path     = require("path");
const { MongoClient, ObjectId } = require("mongodb");

// ── Config ────────────────────────────────────────────────────────────────────
const PORT       = process.env.PORT || 3000;
const MONGO_URI  = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const DB_NAME    = "collegeEnquiry";
const COLLECTION = "enquiries";

// ── App setup ─────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ── MongoDB connection ────────────────────────────────────────────────────────
let db;

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`✅  MongoDB connected  →  ${MONGO_URI}/${DB_NAME}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function collection() {
  return db.collection(COLLECTION);
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /enquiry — submit a new enquiry
app.post("/enquiry", async (req, res) => {
  try {
    const { name, email, phone, course, message } = req.body;

    // Basic server-side validation
    if (!name || !email || !course) {
      return res.status(400).json({ ok: false, error: "Name, email and course are required." });
    }

    const doc = {
      name:    name.trim(),
      email:   email.trim().toLowerCase(),
      phone:   (phone || "").trim(),
      course:  course.trim(),
      message: (message || "").trim(),
      createdAt: new Date(),
    };

    const result = await collection().insertOne(doc);
    res.status(201).json({ ok: true, id: result.insertedId });
  } catch (err) {
    console.error("POST /enquiry error:", err);
    res.status(500).json({ ok: false, error: "Server error." });
  }
});

// GET /enquiries — list all enquiries (newest first)
app.get("/enquiries", async (req, res) => {
  try {
    const docs = await collection()
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ ok: true, data: docs });
  } catch (err) {
    console.error("GET /enquiries error:", err);
    res.status(500).json({ ok: false, error: "Server error." });
  }
});

// DELETE /enquiry/:id — remove an enquiry
app.delete("/enquiry/:id", async (req, res) => {
  try {
    const result = await collection().deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ ok: false, error: "Enquiry not found." });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /enquiry error:", err);
    res.status(500).json({ ok: false, error: "Invalid ID or server error." });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀  Server running  →  http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌  Could not connect to MongoDB:", err.message);
    process.exit(1);
  });
