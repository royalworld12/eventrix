import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";
import { Event } from "./event.model";

export interface IBooking {
  /** Reference to the booked event. */
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export type BookingDocument = HydratedDocument<IBooking>;

/** Pragmatic format check: local part, `@`, domain and a 2+ letter TLD. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

const bookingSchema = new Schema<IBooking>(
  {
    // ObjectId + `ref` keeps the relation typed and lets `populate("eventId")` resolve the Event.
    // The index makes "bookings for this event" queries and the reference check below cheap.
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true, // "Ada@Example.com" and "ada@example.com" are the same attendee
      match: [EMAIL_PATTERN, "email must be a valid email address."],
    },
  },
  { timestamps: true }, // manages createdAt / updatedAt
);

// Referential integrity: only bookings for existing events are persisted. `save()` rejects with
// this error instead of writing a dangling reference (throwing is what aborts a pre-save hook).
bookingSchema.pre("save", async function (this: BookingDocument) {
  const eventExists = await Event.exists({ _id: this.eventId });

  if (!eventExists) {
    throw new mongoose.Error.ValidatorError({
      path: "eventId",
      message: `Event ${String(this.eventId)} does not exist.`,
      value: this.eventId,
      type: "notFound",
    });
  }
});

/** Compiled model; read from `mongoose.models` first so hot reloads never recompile the schema. */
export const Booking: Model<IBooking> =
  (mongoose.models.Booking as Model<IBooking> | undefined) ??
  mongoose.model<IBooking>("Booking", bookingSchema);
