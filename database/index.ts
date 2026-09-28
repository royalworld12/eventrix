/**
 * Database layer entry point: import models from `@/database` so every consumer shares the same
 * compiled Mongoose instances. Connect once with `connectToDatabase()` from `@/lib/mongodb`.
 */
export {
  EVENT_MODES,
  Event,
  serializeEvent,
  type EventDocument,
  type EventMode,
  type IEvent,
  type SerializedEvent,
  type StoredEvent,
} from "./event.model";
export { Booking, type BookingDocument, type IBooking } from "./booking.model";
