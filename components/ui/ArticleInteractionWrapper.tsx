'use client';

import { useState, useEffect } from 'react';
import { EmailCaptureModal } from './EmailCaptureModal';

interface ArticleInteractionWrapperProps {
  children: React.ReactNode;
  articleId: string;
  category?: string;
}

export function ArticleInteractionWrapper({ 
  children, 
  articleId, 
  category 
}: ArticleInteractionWrapperProps) {
  const [showModal, setShowModal] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Check authentication on mount
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('authenticated') === 'true';
    if (!isAuthenticated) {
      // Don't show modal immediately, let user interact first
      return;
    }
  }, [articleId]);
  
  const handleInteraction = (e: React.MouseEvent) => {
    const isAuthenticated = localStorage.getItem('authenticated') === 'true';
    
    if (!isAuthenticated && !hasInteracted) {
      e.preventDefault();
      e.stopPropagation();
      setShowModal(true);
      setHasInteracted(true);
    }
  };
  
  return (
    <div onClick={handleInteraction}>
      {children}
      {showModal && (
        <EmailCaptureModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onAuthenticated={(token) => {
            console.log('User subscribed:', token);
            // Could trigger analytics or personalization here
          }}
          source="popup"
        />
      )}
    </div>
  );
}
