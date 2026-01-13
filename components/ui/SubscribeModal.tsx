'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Mail, Lock } from 'lucide-react';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: (email: string) => void;
  hasSubscribed: boolean;
}

export default function SubscribeModal({ isOpen, onClose, onSubscribe, hasSubscribed }: SubscribeModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
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
          source: 'article_paywall',
          preferences: { frequency: 'daily' }
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Store email in localStorage for sign-in form
        if (typeof window !== 'undefined') {
          localStorage.setItem('subscriber_email', email.toLowerCase());
        }
        onSubscribe(email);
        setMessage('🎉 Successfully subscribed!');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          
          <h3 className="text-xl font-serif font-semibold text-gray-900 mb-2">
            The Daily Law
          </h3>
          <p className="text-gray-600 mb-6">
            Get unlimited access to in-depth legislative analysis and policy insights.
          </p>
        </div>

        {!hasSubscribed ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="your@email.com"
                required
              />
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm ${message.includes('Successfully') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !email}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Subscribing...' : 'Subscribe for full access'}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-gray-600">
              You're already subscribed! Check your email for the latest updates.
            </p>
          </div>
        )}

        <div className="text-xs text-gray-500 mt-4 text-center">
          By subscribing, you agree to receive our daily newsletter. Unsubscribe anytime.
        </div>
      </div>
    </div>
  );
}
