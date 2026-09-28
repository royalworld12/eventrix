import EventForm from "@/components/EventForm";

export const metadata = {
  title: "Create Event | Eventrix",
  description: "Create and publish a new event on Eventrix",
};

const CreateEventPage = () => {
  return (
    <main>
      <section className="mb-10 text-center">
        <h1 className="text-center">Create an Event</h1>
        <p className="text-light-100 text-lg mt-3 max-w-xl mx-auto">
          Share your upcoming conference, meetup, or hackathon with our developer community.
        </p>
      </section>

      <EventForm />
    </main>
  );
};

export default CreateEventPage;
