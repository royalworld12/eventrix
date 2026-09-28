import { Suspense } from "react";
import EventCard from "@/components/EventCard";
import ExploreBtn from "@/components/ExploreBtn";
import { type SerializedEvent } from "@/database/event.model";
import { cacheLife } from "next/cache";

const BaseUrl = process.env.NEXT_PUBLIC_BASE_URL;

/**
 * Featured events are read fresh on every request (`cache: "no-store"`), so the read lives in its
 * own component: with `cacheComponents` enabled, an uncached read in the page body would make this
 * route blocking (see the page component below).
 */
const FeaturedEvents = async () => {
  'use cache'
  cacheLife('hours')
  const response = fetch(`${BaseUrl}/api/events`);
  const events: SerializedEvent[] = await response.then((res) => res.json()).then((data) => data.events).catch((error) => {
    console.error("Error fetching events:", error);
    return [];
  });

  return (
    <ul className='events'>
      {events && events.length > 0  &&events.map((event: SerializedEvent) => (
        <li key={event.title}>
          <EventCard {...event} />
        </li>
      ))}
    </ul>
  );
}

/**
 * The page itself stays synchronous so its markup ships as the prerendered shell; the event list
 * streams in once the request-time read resolves.
 */
const Page = () => (
  <section>
    <h1 className="text-center">The Hub for Every Dev <br/>Event You Can't Miss</h1>
    <p className="text-center mt-5">Hackathons, Meetups and Conferences, All in One Place</p>
    <ExploreBtn />

    <div className="mt-20 space-y-7">
      <h3>Featured Events</h3>
      <Suspense fallback={<p>Loading events…</p>}>
        <FeaturedEvents />
      </Suspense>
    </div>
  </section>
);
 
export default Page;