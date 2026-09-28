'use client'
import { createBooking } from "@/lib/actions/booking.action";
import { useState } from "react";
import posthog from 'posthog-js';

interface BookEventProps {
    
}
 
const BookEvent = ({eventId, slug} : {eventId: string, slug: string}) => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const {success, error} = await createBooking({eventId, slug, email})
        if(success) {
            setSubmitted(true);
            posthog.capture('event_booked', {eventId, slug, email})
        } else {
            console.error('Booking creation failed', error)
            posthog.captureException(error)
        }
       
    }
    return ( <div id="book-event">
        {submitted ? (
            <p className="text-sm">Thank you for signup!</p>
        ) : (
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="email">Email Address</label>
                     <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    id="email"
                />
                </div>
               
                <button type="submit" className="button-submit">Submit</button>
            </form>
        )}
    </div> );
}
 
export default BookEvent;