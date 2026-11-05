const mongoose = require('mongoose');

// Every scan at the gate becomes one document, whether it succeeded or not.
//
// Why MongoDB and not PostgreSQL? This is an append-heavy log whose shape changes
// with the result: an unknown ID has no student, a wrong-event scan also records
// which event the pass was really for. It never needs joins or transactions, and
// keeping it out of PostgreSQL keeps the tables that must stay consistent small.
const entryLogSchema = new mongoose.Schema(
  {
    registrationId: { type: String, required: true, uppercase: true, trim: true, maxlength: 40 },
    eventId: { type: Number, required: true }, // the event this gate is checking people into
    eventTitle: { type: String },
    result: {
      type: String,
      required: true,
      enum: ['success', 'already_checked_in', 'not_found', 'wrong_event'],
    },
    method: { type: String, enum: ['camera', 'manual'], default: 'manual' },
    // Present only when the ID matched a real pass.
    student: {
      name: String,
      email: String,
    },
    // Present only for wrong_event: which event the pass actually belongs to.
    registeredFor: {
      eventId: Number,
      title: String,
    },
    scannedBy: {
      id: Number,
      name: String,
    },
    note: { type: String, trim: true, maxlength: 300, default: '' },
  },
  { timestamps: true }, // adds createdAt and updatedAt automatically
);

// Most reads are "latest scans for this event", so index exactly that.
entryLogSchema.index({ eventId: 1, createdAt: -1 });

module.exports = mongoose.model('EntryLog', entryLogSchema);
