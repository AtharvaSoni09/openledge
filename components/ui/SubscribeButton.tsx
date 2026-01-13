'use client';

import { useState } from 'react';
import { EmailCaptureModal } from './EmailCaptureModal';

export function SubscribeButton({ 
  variant = 'primary' 
}: { 
  variant?: 'primary' | 'secondary' 
}) {
  const [showModal, setShowModal] = useState(false);
  
  const isAuthenticated = localStorage.getItem('authenticated') === 'true';
  
  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className={`${
          variant === 'primary' 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50'
        } px-6 py-2 rounded-lg font-medium transition-colors`}
      >
        {isAuthenticated ? 'Manage Subscription' : 'Subscribe'}
      </button>
      
      {showModal && (
        <EmailCaptureModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onAuthenticated={(token) => {
            console.log('User subscribed:', token);
          }}
          source="header"
        />
      )}
    </>
  );
}
