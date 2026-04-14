/**
 * Student Feedback System — backend/server.js
 * Stack : Node.js + Express + MongoDB (native driver)
 * CORS  : enabled for React dev server on :5173
 *
 * Routes
 * ─────────────────────────────────────────────
 * GET    /api/feedback           list all feedback (newest first)
 * POST   /api/feedback           submit new feedback
 * GET    /api/feedback/stats     aggregate stats (avg rating, counts)
 * DELETE /api/feedback/:id       delete one entry
 */

const express     = require("express");
const cors        = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const PORT      = process.env.PORT      || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const DB_NAME   = "studentFeedback";

const app = express();
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:3000"] }));
app.use(express.json());

// ── DB ────────────────────────────────────────────────
let db;
async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`✅  MongoDB → ${MONGO_URI}/${DB_NAME}`);
}

const col  = ()  => db.collection("feedback");
const oid  = id  => new ObjectId(id);
const ok   = (res, data, status = 200) => res.status(status).json({ ok: true,  data });
const fail = (res, msg,  status = 500) => res.status(status).json({ ok: false, error: msg });

// ── GET /api/feedback ─────────────────────────────────
app.get("/api/feedback", async (req, res) => {
  try {
    const { subject, rating, search } = req.query;
    const filter = {};
    if (subject) filter.subject = subject;
    if (rating)  filter.rating  = Number(rating);
    if (search)  filter.$or = [
      { studentName: { $regex: search, $options: "i" } },
      { comment:     { $regex: search, $options: "i" } },
    ];
    const docs = await col().find(filter).sort({ createdAt: -1 }).toArray();
    ok(res, docs);
  } catch (e) { fail(res, e.message); }
});

// ── GET /api/feedback/stats ───────────────────────────
app.get("/api/feedback/stats", async (req, res) => {
  try {
    const [agg] = await col().aggregate([
      {
        $group: {
          _id: null,
          total:     { $sum: 1 },
          avgRating: { $avg: "$rating" },
          r1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
          r2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          r3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          r4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          r5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
        },
      },
    ]).toArray();

    // Per-subject counts
    const bySubject = await col().aggregate([
      { $group: { _id: "$subject", count: { $sum: 1 }, avg: { $avg: "$rating" } } },
      { $sort: { count: -1 } },
    ]).toArray();

    ok(res, { summary: agg || { total: 0, avgRating: 0 }, bySubject });
  } catch (e) { fail(res, e.message); }
});

// ── POST /api/feedback ────────────────────────────────
app.post("/api/feedback", async (req, res) => {
  try {
    const { studentName, rollNo, subject, faculty, rating, comment, anonymous } = req.body;

    if (!subject || !faculty || !rating) {
      return fail(res, "subject, faculty and rating are required.", 400);
    }
    if (rating < 1 || rating > 5) {
      return fail(res, "rating must be between 1 and 5.", 400);
    }

    const doc = {
      studentName: anonymous ? "Anonymous" : (studentName || "Anonymous").trim(),
      rollNo:      anonymous ? "" : (rollNo || "").trim(),
      subject:     subject.trim(),
      faculty:     faculty.trim(),
      rating:      Number(rating),
      comment:     (comment || "").trim(),
      anonymous:   Boolean(anonymous),
      createdAt:   new Date(),
    };

    const result = await col().insertOne(doc);
    ok(res, { ...doc, _id: result.insertedId }, 201);
  } catch (e) { fail(res, e.message); }
});

// ── DELETE /api/feedback/:id ──────────────────────────
app.delete("/api/feedback/:id", async (req, res) => {
  try {
    const result = await col().deleteOne({ _id: oid(req.params.id) });
    if (result.deletedCount === 0) return fail(res, "Not found.", 404);
    ok(res, { deleted: true });
  } catch (e) { fail(res, e.message); }
});

// ── Start ─────────────────────────────────────────────
connectDB()
  .then(() => app.listen(PORT, () => console.log(`🚀  API → http://localhost:${PORT}`)))
  .catch(e  => { console.error("❌ DB:", e.message); process.exit(1); });
