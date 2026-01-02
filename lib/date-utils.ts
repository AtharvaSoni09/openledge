export function formatDate(dateString: string) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        // Using 'en-US' and fixed options to ensure consistency between server (Vercel) and client
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC' // Supabase TIMESTAMPTZ is usually UTC
        });
    } catch (e) {
        return dateString;
    }
}
