import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        // Get parameters from query string
        const title = searchParams.get('title') || 'The Daily Law';
        const billId = searchParams.get('billId') || '';
        const category = searchParams.get('category') || 'Legislation';

        // Truncate title if too long
        const displayTitle = title.length > 80 ? title.substring(0, 77) + '...' : title;

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'flex-end',
                        backgroundColor: '#18181b',
                        padding: '60px',
                    }}
                >
                    {/* Top badge */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '60px',
                            left: '60px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                        }}
                    >
                        <div
                            style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '24px',
                                fontWeight: 700,
                                letterSpacing: '0.05em',
                            }}
                        >
                            {billId || category}
                        </div>
                    </div>

                    {/* Main title */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '24px',
                            marginBottom: '40px',
                            maxWidth: '90%',
                        }}
                    >
                        <div
                            style={{
                                fontSize: billId ? '56px' : '72px',
                                fontWeight: 900,
                                color: 'white',
                                lineHeight: 1.1,
                                textAlign: 'left',
                            }}
                        >
                            {displayTitle}
                        </div>
                    </div>

                    {/* Footer branding */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            borderTop: '2px solid #3f3f46',
                            paddingTop: '24px',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '32px',
                                    fontWeight: 800,
                                    color: 'white',
                                }}
                            >
                                The Daily Law
                            </div>
                            <div
                                style={{
                                    fontSize: '20px',
                                    color: '#a1a1aa',
                                }}
                            >
                                thedailylaw.org
                            </div>
                        </div>
                        <div
                            style={{
                                fontSize: '18px',
                                color: '#71717a',
                            }}
                        >
                            AI-Powered Legislative Analysis
                        </div>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );
    } catch (error) {
        console.error('OG image generation error:', error);
        return new Response('Failed to generate image', { status: 500 });
    }
}
