/**
 * Doctor Appointment Booking — server.js
 * Stack : Node.js + Express + MongoDB (native driver)
 *
 * REST API
 * ─────────────────────────────────────────────────────
 * Doctors
 *   GET    /api/doctors              list all doctors
 *
 * Appointments
 *   POST   /api/appointments         book new appointment
 *   GET    /api/appointments         list all  (admin)
 *   GET    /api/appointments/:id     single appointment
 *   PATCH  /api/appointments/:id     update status
 *   DELETE /api/appointments/:id     cancel / delete
 *
 * Slots
 *   GET    /api/slots?doctorId=&date= available time slots
 */

const express  = require("express");
const path     = require("path");
const { MongoClient, ObjectId } = require("mongodb");

// ── Config ────────────────────────────────────────────
const PORT      = process.env.PORT     || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const DB_NAME   = "doctorBooking";

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── DB ────────────────────────────────────────────────
let db;
async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  await seedDoctors();
  console.log(`✅  MongoDB → ${MONGO_URI}/${DB_NAME}`);
}

// ── Seed doctors on first run ─────────────────────────
const DOCTORS = [
  { _id: "doc1", name: "Dr. Priya Sharma",   specialty: "Cardiologist",    experience: 12, fee: 800,  avatar: "❤️",  availableDays: [1,2,3,4,5] },
  { _id: "doc2", name: "Dr. Arjun Mehta",    specialty: "Neurologist",     experience: 9,  fee: 1000, avatar: "🧠",  availableDays: [1,3,5] },
  { _id: "doc3", name: "Dr. Sneha Kulkarni", specialty: "Dermatologist",   experience: 7,  fee: 600,  avatar: "🩺",  availableDays: [2,4,6] },
  { _id: "doc4", name: "Dr. Ravi Desai",     specialty: "Orthopedic",      experience: 15, fee: 900,  avatar: "🦴",  availableDays: [1,2,3,4,5] },
  { _id: "doc5", name: "Dr. Anita Joshi",    specialty: "Pediatrician",    experience: 11, fee: 700,  avatar: "👶",  availableDays: [1,2,3,4,5,6] },
  { _id: "doc6", name: "Dr. Karan Nair",     specialty: "Psychiatrist",    experience: 8,  fee: 1200, avatar: "🧘",  availableDays: [2,3,4] },
  { _id: "doc7", name: "Dr. Meera Pillai",   specialty: "Ophthalmologist", experience: 10, fee: 750,  avatar: "👁️",  availableDays: [1,2,4,5] },
  { _id: "doc8", name: "Dr. Suresh Patil",   specialty: "ENT Specialist",  experience: 14, fee: 650,  avatar: "👂",  availableDays: [1,3,5,6] },
];

const ALL_SLOTS = ["09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30"];

async function seedDoctors() {
  const col = db.collection("doctors");
  const count = await col.countDocuments();
  if (count === 0) {
    await col.insertMany(DOCTORS);
    console.log("🌱  Seeded doctors");
  }
}

// ── Helpers ───────────────────────────────────────────
const col  = name => db.collection(name);
const oid  = id   => new ObjectId(id);
const send = (res, status, body) => res.status(status).json(body);
const ok   = (res, data)        => send(res, 200, { ok: true, data });
const created = (res, data)     => send(res, 201, { ok: true, data });
const err  = (res, status, msg) => send(res, status, { ok: false, error: msg });

// ── GET /api/doctors ──────────────────────────────────
app.get("/api/doctors", async (req, res) => {
  try {
    const docs = await col("doctors").find({}).toArray();
    ok(res, docs);
  } catch (e) { err(res, 500, e.message); }
});

// ── GET /api/slots ────────────────────────────────────
// Query: ?doctorId=doc1&date=2026-04-20
app.get("/api/slots", async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) return err(res, 400, "doctorId and date required");

    const doctor = await col("doctors").findOne({ _id: doctorId });
    if (!doctor) return err(res, 404, "Doctor not found");

    // Check if doctor works on that weekday (0=Sun … 6=Sat)
    const dayOfWeek = new Date(date).getDay();
    if (!doctor.availableDays.includes(dayOfWeek)) {
      return ok(res, []);
    }

    // Get already-booked slots for that doctor+date
    const booked = await col("appointments")
      .find({ doctorId, date, status: { $ne: "cancelled" } })
      .project({ slot: 1 })
      .toArray();

    const bookedSlots = new Set(booked.map(b => b.slot));
    const available   = ALL_SLOTS.filter(s => !bookedSlots.has(s));
    ok(res, available);
  } catch (e) { err(res, 500, e.message); }
});

// ── POST /api/appointments ────────────────────────────
app.post("/api/appointments", async (req, res) => {
  try {
    const { patientName, patientEmail, patientPhone, patientAge,
            doctorId, date, slot, reason } = req.body;

    if (!patientName || !patientEmail || !doctorId || !date || !slot) {
      return err(res, 400, "patientName, patientEmail, doctorId, date and slot are required.");
    }

    // Confirm slot still free
    const conflict = await col("appointments").findOne({
      doctorId, date, slot, status: { $ne: "cancelled" }
    });
    if (conflict) return err(res, 409, "Slot already booked. Please pick another.");

    const doctor = await col("doctors").findOne({ _id: doctorId });
    if (!doctor) return err(res, 404, "Doctor not found.");

    const doc = {
      patientName:  patientName.trim(),
      patientEmail: patientEmail.trim().toLowerCase(),
      patientPhone: (patientPhone || "").trim(),
      patientAge:   patientAge ? Number(patientAge) : null,
      doctorId,
      doctorName:   doctor.name,
      specialty:    doctor.specialty,
      fee:          doctor.fee,
      date,
      slot,
      reason:       (reason || "").trim(),
      status:       "confirmed",   // confirmed | completed | cancelled
      bookedAt:     new Date(),
    };

    const result = await col("appointments").insertOne(doc);
    created(res, { ...doc, _id: result.insertedId });
  } catch (e) { err(res, 500, e.message); }
});

// ── GET /api/appointments ─────────────────────────────
app.get("/api/appointments", async (req, res) => {
  try {
    const { status, doctorId, date } = req.query;
    const filter = {};
    if (status)   filter.status   = status;
    if (doctorId) filter.doctorId = doctorId;
    if (date)     filter.date     = date;

    const docs = await col("appointments")
      .find(filter)
      .sort({ date: 1, slot: 1 })
      .toArray();
    ok(res, docs);
  } catch (e) { err(res, 500, e.message); }
});

// ── GET /api/appointments/:id ─────────────────────────
app.get("/api/appointments/:id", async (req, res) => {
  try {
    const doc = await col("appointments").findOne({ _id: oid(req.params.id) });
    if (!doc) return err(res, 404, "Appointment not found.");
    ok(res, doc);
  } catch (e) { err(res, 500, e.message); }
});

// ── PATCH /api/appointments/:id ───────────────────────
app.patch("/api/appointments/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["confirmed", "completed", "cancelled"];
    if (!allowed.includes(status)) return err(res, 400, `status must be one of: ${allowed.join(", ")}`);

    const result = await col("appointments").findOneAndUpdate(
      { _id: oid(req.params.id) },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!result) return err(res, 404, "Appointment not found.");
    ok(res, result);
  } catch (e) { err(res, 500, e.message); }
});

// ── DELETE /api/appointments/:id ──────────────────────
app.delete("/api/appointments/:id", async (req, res) => {
  try {
    const result = await col("appointments").deleteOne({ _id: oid(req.params.id) });
    if (result.deletedCount === 0) return err(res, 404, "Appointment not found.");
    ok(res, { deleted: true });
  } catch (e) { err(res, 500, e.message); }
});

// ── Start ─────────────────────────────────────────────
connectDB()
  .then(() => app.listen(PORT, () =>
    console.log(`🚀  http://localhost:${PORT}`)
  ))
  .catch(e => { console.error("❌  DB error:", e.message); process.exit(1); });
