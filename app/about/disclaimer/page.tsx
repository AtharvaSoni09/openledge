import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Disclaimer | The Daily Law",
  description: "Legal disclaimer and user responsibilities for The Daily Law's legislative analysis and policy insights.",
  openGraph: {
    title: "Disclaimer | The Daily Law",
    description: "Legal disclaimer and user responsibilities for The Daily Law's legislative analysis and policy insights.",
    url: "https://thedailylaw.org/about/disclaimer",
    type: "website",
  },
};

export default function DisclaimerPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="prose prose-lg max-w-none">
        <h1 className="text-3xl font-serif font-bold text-gray-900 mb-6">Disclaimer</h1>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
          <p className="text-sm text-gray-600 mb-4">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
          </p>
          <p className="text-gray-700 leading-relaxed">
            The information provided on The Daily Law website is for general informational purposes only. 
            This content does not constitute legal advice, professional consultation, or a substitute for 
            consultation with qualified legal professionals.
          </p>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">No Legal Advice</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            The Daily Law does not provide legal advice. The content on this website is intended for 
            informational purposes only and should not be relied upon as legal advice. You should consult 
            with a qualified legal professional for advice regarding your individual situation.
          </p>
          <p className="text-gray-700 leading-relaxed">
            No attorney-client relationship is formed by reading this website or by contacting The Daily Law. 
            Any information you provide to The Daily Law is not privileged or confidential.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Accuracy and Completeness</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            While we strive to provide accurate and up-to-date information, The Daily Law makes no warranties 
            or representations about the accuracy, completeness, or timeliness of the content. Legislative 
            information is subject to change, and official government sources should be consulted for the most 
            current information.
          </p>
          <p className="text-gray-700 leading-relaxed">
            The Daily Law is not responsible for any errors or omissions in the content, or for any losses, 
            injuries, or damages arising from the use of this information.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Third-Party Content</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            The Daily Law may contain links to third-party websites or content. We are not responsible for the 
            content, accuracy, or opinions expressed on third-party websites. Access to third-party websites 
            is at your own risk.
          </p>
          <p className="text-gray-700 leading-relaxed">
            The inclusion of any link does not imply endorsement by The Daily Law of the linked site or its 
            content.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Limitation of Liability</h2>
          <p className="text-gray-700 leading-relaxed">
            In no event shall The Daily Law, its authors, or anyone associated with The Daily Law be liable 
            for any direct, indirect, incidental, special, exemplary, or consequential damages arising from 
            the use of this website or the information contained herein.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Professional Consultation</h2>
          <p className="text-gray-700 leading-relaxed">
            For specific legal advice, please consult with a qualified attorney licensed in your jurisdiction. 
            The Daily Law encourages readers to seek professional legal counsel for any legal matters.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Contact Information</h2>
          <p className="text-gray-700 leading-relaxed">
            If you have questions about this disclaimer or the content on The Daily Law, please contact us 
            through the channels provided on our website.
          </p>
        </section>

        <div className="border-t border-gray-200 pt-6 mt-8">
          <p className="text-sm text-gray-600 text-center">
            This disclaimer is subject to change without notice. Please review this page periodically for updates.
          </p>
        </div>
      </div>
    </div>
  );
}