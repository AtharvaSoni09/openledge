// Standardized slug generation for consistency across the app
export function generateSlug(billId: string): string {
    return billId.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

// Alternative: Use GPT's slug if available, fallback to generated
export function getArticleSlug(gptSlug: string, billId: string): string {
    if (gptSlug && gptSlug.length > 0) {
        return gptSlug;
    }
    return generateSlug(billId);
}
