import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Content Pipeline | The Daily Law",
  description: "Learn about The Daily Law's content pipeline and how we process, analyze, and deliver legislative insights.",
  openGraph: {
    title: "Content Pipeline | The Daily Law",
    description: "Learn about The Daily Law's content pipeline and how we process, analyze, and deliver legislative insights.",
    url: "https://thedailylaw.org/about/pipeline",
    type: "website",
  },
};

export default function PipelinePage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="prose prose-lg max-w-none">
        <h1 className="text-3xl font-serif font-bold text-gray-900 mb-6">Content Pipeline</h1>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
          <p className="text-sm text-gray-600 mb-4">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
          </p>
          <p className="text-gray-700 leading-relaxed">
            The Daily Law operates a sophisticated content pipeline that transforms raw legislative data 
            into comprehensive, AI-powered analysis and insights. Our pipeline ensures accuracy, timeliness, 
            and quality across all published content.
          </p>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Data Collection</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Our pipeline begins with comprehensive data collection from official government sources including:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Congress.gov API for bill information and updates</li>
            <li>Government Publishing Office for official legislative documents</li>
            <li>Committee reports and hearing transcripts</li>
            <li>Executive branch actions and regulations</li>
            <li>State and local legislative databases</li>
          </ul>
          <p className="text-gray-700 leading-relaxed">
            Data is collected in real-time, with updates processed every 5 hours to ensure the most current 
            information is always available.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Data Processing</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Raw legislative data undergoes sophisticated processing to extract meaningful insights:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Text normalization and standardization</li>
            <li>Entity recognition for sponsors, cosponsors, and committees</li>
            <li>Timeline reconstruction of legislative progress</li>
            <li>Policy impact analysis and categorization</li>
            <li>Cross-referencing with related legislation</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">AI Analysis</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Our advanced AI systems analyze processed data to generate comprehensive insights:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Natural language processing for content understanding</li>
            <li>Sentiment analysis and policy impact assessment</li>
            <li>Automatic summarization and key point extraction</li>
            <li>Predictive analysis of legislative outcomes</li>
            <li>Stakeholder impact identification</li>
          </ul>
          <p className="text-gray-700 leading-relaxed">
            All AI-generated content undergoes rigorous quality control and human review to ensure 
            accuracy and reliability.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Quality Assurance</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Multiple layers of quality assurance ensure the highest standards:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Automated validation checks for data integrity</li>
            <li>Human review of AI-generated content</li>
            <li>Cross-verification with official sources</li>
            <li>Fact-checking and source verification</li>
            <li>Editorial review for clarity and accuracy</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Content Publishing</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Final content is published through our automated publishing system:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>SEO optimization for discoverability</li>
            <li>Responsive formatting for all devices</li>
            <li>Automatic sitemap generation</li>
            <li>Social media integration</li>
            <li>Email newsletter distribution</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Continuous Improvement</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Our pipeline is continuously improved through:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Machine learning model updates</li>
            <li>User feedback integration</li>
            <li>Performance monitoring and optimization</li>
            <li>New data source integration</li>
            <li>Regulatory compliance updates</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Technical Infrastructure</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Our pipeline runs on a robust technical infrastructure:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Cloud-based processing for scalability</li>
            <li>Automated backup and disaster recovery</li>
            <li>Real-time monitoring and alerting</li>
            <li>API integration with government systems</li>
            <li>Secure data storage and transmission</li>
          </ul>
        </section>

        <div className="border-t border-gray-200 pt-6 mt-8">
          <p className="text-sm text-gray-600 text-center">
            This pipeline is continuously evolving to better serve our users and provide the most accurate, 
            timely legislative analysis available.
          </p>
        </div>
      </div>
    </div>
  );
}