'use client'
import { useState } from "react";

interface BookEventProps {
    
}
 
const BookEvent = () => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/book-event', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });
            if (!response.ok) {
                throw new Error('Failed to book event');
            }
            setSubmitted(true);
        } catch (error) {
            console.error('Error booking event:', error);
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