'use client';

import { useState, useEffect, FormEvent } from 'react';
import { X, Mail } from 'lucide-react';
import { Modal } from './Modal';

interface EmailCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (token: string) => void;
  source?: 'popup' | 'header' | 'footer' | 'newsletter_page';
}

export function EmailCaptureModal({ 
  isOpen, 
  onClose, 
  onAuthenticated, 
  source = 'popup' 
}: EmailCaptureModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Pre-fill email from localStorage if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('subscriber_email');
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      // First try to authenticate with existing cookie
      const authResponse = await fetch('/api/auth/check', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      const authResult = await authResponse.json();
      
      if (authResult.authenticated || authResult.user_status === 'subscribed') {
        // User is already authenticated/subscribed
        onAuthenticated('authenticated');
        onClose();
        return;
      }
      
      // If not authenticated, try to subscribe with entered email
      const subscribeResponse = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      
      const subscribeResult = await subscribeResponse.json();
      if (subscribeResult.success) {
        // Store email for future use
        if (typeof window !== 'undefined') {
          localStorage.setItem('subscriber_email', email.toLowerCase());
        }
        onAuthenticated('subscribed');
        onClose();
      } else {
        setError(subscribeResult.error || '❌ Subscription failed. Please try again.');
      }
    } catch (err) {
      setError('❌ Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-serif font-bold text-zinc-900">
            {source === 'popup' ? 'Continue Reading' : 'Subscribe to The Daily Law'}
          </h3>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
          
        {/* Message */}
        <p className="text-zinc-600 text-sm mb-6">
          {source === 'popup' 
            ? 'Enter your email to continue reading articles and get legislative updates.'
            : 'Get weekly legislative analysis delivered to your inbox.'
          }
        </p>
          
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="your@email.com"
              required
              disabled={isSubmitting}
            />
          </div>
            
          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}
            
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Subscribing...' : 'Subscribe & Continue'}
          </button>
            
          {/* Privacy Note */}
          <p className="text-xs text-zinc-500 text-center mt-4">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </form>
      </div>
    </Modal>
  );
}
