'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Mail, CheckCircle } from 'lucide-react';

export default function NewsletterPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.toLowerCase(),
          source: 'newsletter_page',
          preferences: { frequency: 'daily' }
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setIsSubscribed(true);
        setMessage('🎉 Successfully subscribed! Thank you for joining our newsletter.');
        setEmail('');
      } else {
        setMessage(result.error || '❌ Subscription failed. Please try again.');
      }
    } catch (error) {
      setMessage('❌ Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-20 max-w-4xl">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">
            Newsletter
          </h1>
          <div className="w-24 h-1 bg-gray-300 mx-auto mb-6"></div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-12 max-w-2xl mx-auto">
          {!isSubscribed ? (
            <>
              <div className="mb-8">
                <div className="text-6xl mb-4">📧</div>
                <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">
                  Stay Informed
                </h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Get daily legislative updates, policy analysis, and legal insights delivered directly to your inbox. 
                  Join thousands of readers who trust The Daily Law for clear, non-partisan analysis.
                </p>
              </div>

              <form onSubmit={handleSubscribe} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                {message && (
                  <div className={`p-4 rounded-lg ${isSubscribed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Subscribing...' : 'Subscribe to Newsletter'}
                </button>
              </form>

              <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">What you'll receive:</h3>
                <ul className="text-left text-gray-600 space-y-2">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Daily legislative updates and analysis</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span>In-depth policy briefings</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Exclusive legal insights</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span>No spam, unsubscribe anytime</span>
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4 text-green-600">🎉</div>
              <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">
                Successfully Subscribed!
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Thank you for subscribing to The Daily Law newsletter. 
                Check your email for a confirmation message.
              </p>
              <Link 
                href="/legislation-summary"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
              >
                Continue Reading
              </Link>
            </div>
          )}
        </div>

        <div className="mt-12 text-center">
          <Link 
            href="/legislation-summary"
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            ← Back to Articles
          </Link>
        </div>
      </div>
    </div>
  );
}
