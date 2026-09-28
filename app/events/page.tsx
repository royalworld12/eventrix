import { Suspense } from "react";
import EventCard from "@/components/EventCard";
import { type SerializedEvent } from "@/database/event.model";

const AllEvents = async () => {
  let events: SerializedEvent[] = [];
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/events`, {
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json();
      events = data.events || [];
    }
  } catch (error) {
    console.error("Failed to fetch events:", error);
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-light-200 text-lg">No events found at the moment.</p>
        <p className="text-light-200/60 text-sm mt-2">Check back soon or create your own event!</p>
      </div>
    );
  }

  return (
    <ul className="events">
      {events.map((event: SerializedEvent) => (
        <li key={event._id || event.slug}>
          <EventCard {...event} />
        </li>
      ))}
    </ul>
  );
};

const EventsPage = () => {
  return (
    <main>
      <section className="mb-10">
        <h1 className="text-left">All Events</h1>
        <p className="text-light-100 text-lg mt-3">
          Explore upcoming conferences, workshops, and tech meetups.
        </p>
      </section>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <p className="text-light-200 text-lg">Loading events…</p>
          </div>
        }
      >
        <AllEvents />
      </Suspense>
    </main>
  );
};

export default EventsPage;
