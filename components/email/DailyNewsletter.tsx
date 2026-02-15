
import * as React from 'react';

interface Article {
    bill_id: string;
    title: string;
    url_slug: string;
    tldr: string | null;
}

interface DailyNewsletterProps {
    articles: Article[];
    date: string;
}

export const DailyNewsletterTemplate: React.FC<Readonly<DailyNewsletterProps>> = ({
    articles,
    date,
}) => (
    <div style={{
        fontFamily: 'serif',
        backgroundColor: '#ffffff',
        color: '#18181b',
        padding: '40px 20px',
        maxWidth: '600px',
        margin: '0 auto',
    }}>
        <header style={{
            borderBottom: '1px solid #e4e4e7',
            paddingBottom: '20px',
            marginBottom: '40px',
            textAlign: 'center',
        }}>
            <h2 style={{
                margin: 0,
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: '#71717a',
            }}>The Daily Law</h2>
            <h1 style={{
                margin: '10px 0 5px 0',
                fontSize: '28px',
                fontWeight: '900',
            }}>Daily News Updated</h1>
            <p style={{
                margin: 0,
                fontSize: '14px',
                fontStyle: 'italic',
                color: '#71717a',
            }}>{date}</p>
        </header>

        <main>
            {articles.length > 0 ? (
                articles.map((article) => (
                    <div key={article.bill_id} style={{
                        marginBottom: '40px',
                        padding: '20px',
                        backgroundColor: '#fafafa',
                        borderRadius: '12px',
                        border: '1px solid #f4f4f5',
                    }}>
                        <span style={{
                            display: 'inline-block',
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            marginBottom: '12px',
                            textTransform: 'uppercase',
                        }}>
                            Bill {article.bill_id}
                        </span>
                        <h2 style={{
                            margin: '0 0 12px 0',
                            fontSize: '20px',
                            fontWeight: 'bold',
                            lineHeight: '1.4',
                        }}>
                            {article.title}
                        </h2>
                        <p style={{
                            margin: '0 0 20px 0',
                            fontSize: '15px',
                            lineHeight: '1.6',
                            color: '#3f3f46',
                        }}>
                            {article.tldr}
                        </p>
                        <a
                            href={`https://thedailylaw.org/legislation-summary/${article.url_slug}`}
                            style={{
                                display: 'inline-block',
                                backgroundColor: '#18181b',
                                color: '#ffffff',
                                padding: '10px 20px',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                fontSize: '13px',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            Read Full Investigation
                        </a>
                    </div>
                ))
            ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <p style={{ fontStyle: 'italic', color: '#71717a' }}>No new legislation was published today. Check back tomorrow for more updates.</p>
                </div>
            )}
        </main>

        <footer style={{
            marginTop: '60px',
            paddingTop: '20px',
            borderTop: '1px solid #e4e4e7',
            textAlign: 'center',
            fontSize: '12px',
            color: '#a1a1aa',
        }}>
            <p>© {new Date().getFullYear()} The Daily Law. All rights reserved.</p>
            <p>
                You are receiving this email because you subscribed to updates on our website.
            </p>
            <p>
                <a href="https://thedailylaw.org/about" style={{ color: '#71717a', marginRight: '10px' }}>About Us</a>
                <a href="https://thedailylaw.org/newsletter" style={{ color: '#71717a' }}>Newsletter</a>
            </p>
        </footer>
    </div>
);
