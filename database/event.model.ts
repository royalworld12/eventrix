import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

/** Delivery modes an event can use; a union keeps invalid values out at compile time and at runtime. */
export const EVENT_MODES = ["online", "offline", "hybrid"] as const;

export type EventMode = (typeof EVENT_MODES)[number];

export interface IEvent {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  /** Calendar date, normalised to ISO `YYYY-MM-DD` by the pre-save hook. */
  date: string;
  /** Start time or range, normalised to `HH:mm` / `HH:mm - HH:mm` by the pre-save hook. */
  time: string;
  mode: EventMode;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type EventDocument = HydratedDocument<IEvent>;

/** Canonical ISO calendar date, e.g. `2024-03-15`. */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** Requires a month name so V8's ambiguous numeric parsing (`03/04/2024`) is never trusted. */
const MONTH_NAME_PATTERN = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\b/i;
/** Requires a day number (`15`, `15th`) so `"March 2024"` cannot silently become March 1st. */
const DAY_NUMBER_PATTERN = /\b\d{1,2}(st|nd|rd|th)?\b/i;
/** `14-16` denotes a multi-day range, which is not a single calendar date. */
const DAY_RANGE_PATTERN = /\d\s*[-\u2013\u2014]\s*\d/;
/** A clock value: 24-hour (`18:00`) or 12-hour with an AM/PM suffix (`6:00 PM`). */
const CLOCK_PATTERN = /^(\d{1,2})(?::([0-5]\d))?\s*([ap]\.?m\.?)?$/i;
/** Separates the two ends of a time range: hyphen, en dash or em dash. */
const RANGE_SEPARATOR_PATTERN = /\s*[-\u2013\u2014]\s*/;

/** Scalar paths that must be present and non-empty once trimmed. */
const REQUIRED_TEXT_FIELDS = [
  "title",
  "description",
  "overview",
  "image",
  "venue",
  "location",
  "date",
  "time",
  "audience",
  "organizer",
] as const satisfies readonly (keyof IEvent)[];

/** Array paths that must contain at least one non-blank value. */
const REQUIRED_LIST_FIELDS = ["agenda", "tags"] as const satisfies readonly (keyof IEvent)[];

/** A single validation failure, scoped to the path that caused it. */
type ValidationIssue = { path: keyof IEvent; message: string };

/** `"AI Innovation Hackathon!"` -> `"ai-innovation-hackathon"`. */
function slugify(title: string): string {
  return title
    .normalize("NFKD") // decompose accented characters so the marks can be stripped
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // collapse every run of unsupported characters into one hyphen
    .replace(/^-+|-+$/g, ""); // drop leading/trailing hyphens
}

/**
 * Normalises a date string to ISO `YYYY-MM-DD`.
 *
 * Only unambiguous input is accepted: `"2024-03-15"` (ISO) or a month-name date such as
 * `"March 15, 2024"`. Everything else returns `null` — numeric formats like `"03/04/2024"`
 * are locale dependent, and ranges like `"June 14-16, 2024"` silently lose days in `Date`.
 */
function toIsoDate(value: string): string | null {
  const input = value.trim();

  if (ISO_DATE_PATTERN.test(input)) {
    // Re-parse so impossible dates such as `2024-02-31` are rejected instead of stored.
    const parsed = new Date(`${input}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== input
      ? null
      : input;
  }

  if (
    !MONTH_NAME_PATTERN.test(input) ||
    !DAY_NUMBER_PATTERN.test(input) ||
    DAY_RANGE_PATTERN.test(input)
  ) {
    return null;
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;

  // Read local parts on purpose: `toISOString()` would shift the day for timezones behind UTC.
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${parsed.getFullYear()}-${month}-${day}`;
}

/** Converts `"6:00 PM"` / `"18:00"` to 24-hour `HH:mm`; returns `null` when unparseable. */
function to24HourClock(value: string): string | null {
  const match = CLOCK_PATTERN.exec(value.trim());
  if (!match) return null;

  const [, rawHour, rawMinute, meridiem] = match;
  let hour = Number(rawHour);

  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    hour = meridiem.toLowerCase().startsWith("p") ? (hour % 12) + 12 : hour % 12;
  }

  return hour > 23 ? null : `${String(hour).padStart(2, "0")}:${rawMinute ?? "00"}`;
}

/** Converts a time or range to `HH:mm` / `HH:mm - HH:mm`; returns `null` when unparseable. */
function toCanonicalTime(value: string): string | null {
  const [start, end, ...extra] = value.trim().split(RANGE_SEPARATOR_PATTERN);
  if (extra.length > 0) return null;

  const startClock = to24HourClock(start);
  if (startClock === null) return null;
  if (end === undefined) return startClock;

  const endClock = to24HourClock(end);
  return endClock === null ? null : `${startClock} - ${endClock}`;
}

/**
 * Builds a field-scoped `ValidationError`. Throwing it from a hook rejects `save()`
 * (calling `invalidate()` alone does not stop a pre-save hook from writing).
 */
function validationError(
  doc: EventDocument,
  issues: ValidationIssue[],
): mongoose.Error.ValidationError {
  // Mongoose types this constructor as taking a MongooseError, so the document is omitted here.
  const error = new mongoose.Error.ValidationError();
  for (const { path, message } of issues) {
    error.addError(
      path,
      new mongoose.Error.ValidatorError({ path, message, value: doc.get(path) }),
    );
  }
  return error;
}

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    // `unique` builds the unique index; the slug value itself is generated by the hook below.
    slug: { type: String, unique: true, trim: true, lowercase: true },
    description: { type: String, required: true, trim: true },
    overview: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    mode: { type: String, required: true, trim: true, lowercase: true, enum: [...EVENT_MODES] },
    audience: { type: String, required: true, trim: true },
    agenda: { type: [String], required: true },
    organizer: { type: String, required: true, trim: true },
    tags: { type: [String], required: true },
  },
  { timestamps: true }, // manages createdAt / updatedAt
);

eventSchema.pre("save", function (this: EventDocument) {
  const issues: ValidationIssue[] = [];

  // Required fields: `trim` + `required` already reject blanks for normal saves; this guard
  // keeps the contract when validation is skipped and rejects blank array entries, which the
  // schema-level `required` check (presence only) lets through.
  for (const field of REQUIRED_TEXT_FIELDS) {
    const value: string = this[field] ?? "";
    if (value.trim() === "") {
      issues.push({ path: field, message: `${field} is required and cannot be empty.` });
    }
  }

  for (const field of REQUIRED_LIST_FIELDS) {
    const values: string[] = this[field] ?? [];
    if (values.length === 0 || values.some((item) => item.trim() === "")) {
      issues.push({
        path: field,
        message: `${field} must contain at least one non-empty value.`,
      });
    }
  }

  // Slug: regenerate only when the title changed (or no slug exists yet) so URLs stay stable.
  if ((this.isModified("title") || !this.slug) && this.title.trim() !== "") {
    const slug = slugify(this.title);
    if (slug === "") {
      issues.push({ path: "slug", message: "title does not produce a URL-friendly slug." });
    } else {
      this.slug = slug;
    }
  }

  // Date: normalise to a single ISO calendar date.
  const date = this.date?.trim() ?? "";
  if (date !== "") {
    const isoDate = toIsoDate(date);
    if (isoDate === null) {
      issues.push({
        path: "date",
        message: `date must be a single real date, e.g. "2024-03-15" or "March 15, 2024" (received "${date}").`,
      });
    } else {
      this.date = isoDate;
    }
  }

  // Time: normalise to a 24-hour clock, ranges as "HH:mm - HH:mm".
  const time = this.time?.trim() ?? "";
  if (time !== "") {
    const canonicalTime = toCanonicalTime(time);
    if (canonicalTime === null) {
      issues.push({
        path: "time",
        message: `time must be a clock value or range, e.g. "18:00" or "9:00 AM - 6:00 PM" (received "${time}").`,
      });
    } else {
      this.time = canonicalTime;
    }
  }

  if (issues.length > 0) throw validationError(this, issues);
});

/** Compiled model; read from `mongoose.models` first so hot reloads never recompile the schema. */
export const Event: Model<IEvent> =
  (mongoose.models.Event as Model<IEvent> | undefined) ??
  mongoose.model<IEvent>("Event", eventSchema);
