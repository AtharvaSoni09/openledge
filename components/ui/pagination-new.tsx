import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export function Pagination({ currentPage, totalPages, baseUrl }: PaginationProps) {
  // Show pages with ellipsis for large page counts
  const getVisiblePages = (current: number, total: number) => {
    const pages = [];
    
    // Always show first page
    pages.push(1);
    
    // Show pages around current page
    const startPage = Math.max(2, current - 1);
    const endPage = Math.min(current + 2, total - 1);
    
    // Add ellipsis if needed before current range
    if (startPage > 2) {
      pages.push('...');
    }
    
    // Add pages around current
    for (let i = startPage; i <= endPage; i++) {
      if (i > 1 && i < total) {
        pages.push(i);
      }
    }
    
    // Add ellipsis if needed after current range
    if (endPage < total - 1) {
      pages.push('...');
    }
    
    // Always show last page if more than 1 page
    if (total > 1) {
      pages.push(total);
    }
    
    // Remove duplicates and filter out ellipsis duplicates
    const uniquePages = [];
    let lastWasEllipsis = false;
    
    for (const page of pages) {
      if (page === '...') {
        if (!lastWasEllipsis) {
          uniquePages.push(page);
          lastWasEllipsis = true;
        }
      } else {
        uniquePages.push(page);
        lastWasEllipsis = false;
      }
    }
    
    return uniquePages;
  };

  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-center space-x-1" role="navigation" aria-label="Pagination">
      {/* Previous */}
      {currentPage > 1 && (
        <Link
          href={`${baseUrl}?page=${currentPage - 1}`}
          className="px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900 rounded-md transition-colors"
          aria-label={`Go to page ${currentPage - 1}`}
        >
          ← Previous
        </Link>
      )}
      
      {/* Page Numbers */}
      <div className="flex space-x-1">
        {getVisiblePages(currentPage, totalPages).map((page, index) => (
          page === '...' ? (
            <span
              key={`ellipsis-${index}`}
              className="px-3 py-2 text-sm text-zinc-400"
              aria-hidden="true"
            >
              ...
            </span>
          ) : (
            <Link
              key={page}
              href={`${baseUrl}?page=${page}`}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                page === currentPage 
                  ? 'bg-blue-600 text-white' 
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
              aria-label={`Go to page ${page}`}
              aria-current={page === currentPage}
            >
              {page}
            </Link>
          )
        ))}
      </div>
      
      {/* Next */}
      {currentPage < totalPages && (
        <Link
          href={`${baseUrl}?page=${currentPage + 1}`}
          className="px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900 rounded-md transition-colors"
          aria-label={`Go to page ${currentPage + 1}`}
        >
          Next →
        </Link>
      )}
    </nav>
  );
}
