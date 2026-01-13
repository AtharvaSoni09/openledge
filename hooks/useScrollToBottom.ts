import { useState, useEffect, useRef } from 'react';

interface UseScrollToBottomProps {
  threshold?: number;
}

export function useScrollToBottom({ threshold = 0.9 }: UseScrollToBottomProps = {}) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      const scrollPercentage = scrollTop / (documentHeight - windowHeight);
      
      if (scrollPercentage >= threshold) {
        setHasScrolledToBottom(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold]);

  return hasScrolledToBottom;
}
