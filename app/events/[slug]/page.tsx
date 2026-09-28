import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import BookEvent from "@/components/BookEvent";
import { type SerializedEvent } from "@/database/event.model";
import { getSimiliarEventsBySlug } from "@/lib/actions/events.action";
import EventCard from "@/components/EventCard";

const EventDetailItem = ({ icon, alt, label }: { icon: string; alt: string; label: string }) => {
    return (
        <div className="flex flex-row gap-2 items-center">
            <Image src={icon} alt={alt} width={17} height={17} />
            <p>{label}</p>
        </div>
    )
}

const EventAgenda = ({ agenda }: { agenda: string[] }) => {
    return (
        <div className="flex flex-col gap-2">
            <h2>Agenda</h2>
            {agenda.map((item) => (
                <p key={item}>{item}</p>
            ))}
        </div>
    )
}

const EventTags = ({ tags }: { tags: string[] }) => {
    return (
        <div className="flex flex-row gap-1.5 flex-wrap">
            {tags.map((tag) => (
                <div key={tag} className="pill">{tag}</div>
            ))}
        </div>
    )
}

type EventPageProps = { params: Promise<{ slug: string }> };

/**
 * Fallback rendered while `EventDetails` resolves its data: only this section depends on the
 * request, so the route's shell stays visible instead of blanking the whole page.
 */
const EventDetailsLoading = () => (
    <section id="event">
        <div className="header">
            <h1>Event Description</h1>
            <p className="mt-2">Loading the event details…</p>
        </div>
        <div className="details">
            <div className="content">
                <p>Fetching the event, its agenda and the similar events…</p>
            </div>
        </div>
    </section>
);

/**
 * Owns every dynamic access of this route: the `params` promise, the event fetch and the MongoDB
 * reads behind `getSimiliarEventsBySlug`. Keeping them in one component lets the page wrap them in
 * a single <Suspense> boundary, which is what Cache Components requires (see the page below).
 */
const EventDetails = async ({ params }: EventPageProps) => {
    const { slug } = await params;

    let event;
    try {
        const request = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/events/${slug}`, { next: { revalidate: 60 } });

        if (!request.ok) {
            if (request.status === 404) {
                return notFound();
            }
            throw new Error('Failed to fetch event data');
        }

        const response = await request.json();
        event = response.event;

        if (!event) {
            return notFound();
        }




    } catch (error) {
        console.error('Error fetching event data:', error);
        return notFound();
    }

    const { description, image, date, time, location, mode, audience, overview, agenda, organizer, tags } = event;

    if (!description) {
        return notFound();
    }

    const bookings = 10; // Placeholder for bookings count, replace with actual data if available

    const similarEvents: SerializedEvent[] = await getSimiliarEventsBySlug(slug);


    return (
        <section id="event">
            <div className="header">
                <h1>Event Description</h1>
                <p className="mt-2">{description}</p>
            </div>
            <div className="details">
                {/* Left side content */}
                <div className="content">
                    <Image loading="eager" src={image} alt="Event Banner" width={800} height={800} className="banner" />

                    <section className="flex flex-col gap-2">
                        <h2>Overview</h2>
                        <p>{overview}</p>
                    </section>
                    <section className="flex flex-col gap-2">
                        <h2>Event Details</h2>
                        <div className="flex flex-col gap-2">
                            <EventDetailItem icon="/icons/calendar.svg" alt="Calendar" label={date} />
                            <EventDetailItem icon="/icons/clock.svg" alt="Clock" label={time} />
                            <EventDetailItem icon="/icons/pin.svg" alt="Location" label={location} />
                            <EventDetailItem icon="/icons/mode.svg" alt="Mode" label={mode} />
                            <EventDetailItem icon="/icons/audience.svg" alt="Audience" label={audience} />
                        </div>
                    </section>

                    <EventAgenda agenda={agenda} />

                    <section className="flex flex-col gap-2">
                        <h2>About the Organizer</h2>
                        <p>{organizer}</p>
                    </section>

                    <EventTags tags={tags} />
                </div>

                {/* Right side content */}
                <aside className="booking">
                <div className="signup-card">
                    <h2>Book Your Spot</h2>
                    {bookings > 0 ? (
                       <p className="text-sm">
                        Join {bookings} people who already booked their spot!
                       </p>
                    ) : (   
                        <p className="text-sm">Be the first to book your spot!</p>
                    )}
                    <BookEvent />
                </div>
                </aside>
            </div>

            <div className="flex w-full flex-col gap-4 pt-20">
                <h2>Similar Events</h2>
                <div className="events">
                    {similarEvents.length > 0 ? (
                        similarEvents.map((event: SerializedEvent) => (
                           <EventCard key={event.title} {...event} />
                        ))
                    ) : (
                        <p>No similar events found.</p>
                    )}
                </div>
            </div>
        </section>
    );
}

/**
 * `next.config.ts` sets `cacheComponents: true`, which makes Next.js prerender this route's static
 * shell and stream the dynamic parts in afterwards. Uncached work outside a <Suspense> boundary —
 * here `params`, the event fetch and the MongoDB query — makes the route blocking and Next.js
 * reports "encountered uncached data during prerendering" instead of shipping the shell.
 */
const EventDetailsPage = ({ params }: EventPageProps) => (
    <Suspense fallback={<EventDetailsLoading />}>
        <EventDetails params={params} />
    </Suspense>
);

export default EventDetailsPage;