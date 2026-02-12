import React from 'react';

const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen page-gradient relative z-10">
      {/* Header Section */}
      <section className="mt-16 pt-20 pb-16 px-4 relative">
        <div className="container mx-auto max-w-4xl">
          <div className="apple-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white text-center font-display">
              Terms of Service
            </h1>
          </div>
          <div className="apple-fade-in">
            <p className="text-lg text-gray-400 text-center mb-12 leading-relaxed">
              Last updated: February 12, 2026
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="prose prose-lg max-w-none">
            {/* 1. Acceptance of Terms */}
            <div className="apple-fade-in mb-12">
              <h2 className="text-2xl font-semibold mb-4 text-white font-display">
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                By accessing and using Oxlyn Software, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </div>

            {/* 2. Use License */}
            <div className="apple-fade-in mb-12">
              <h2 className="text-2xl font-semibold mb-4 text-white font-display">
                2. Use License
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                When you purchase a script from Oxlyn Software, you are granted a non-exclusive license. The license gives you limited rights to use the software for personal purposes and only with the account that made the purchase. With our scripts, you are allowed to use them on your own server, but you are not allowed to sell them or distribute them to other people.
              </p>
              <p className="text-gray-300 leading-relaxed">
                This license shall automatically terminate if you violate any of these restrictions and may be terminated by Oxlyn Software at any time. Upon terminating your viewing of these materials or upon the termination of this license, you must destroy any downloaded materials in your possession.
              </p>
            </div>

            {/* 3. Disclaimer */}
            <div className="apple-fade-in mb-12">
              <h2 className="text-2xl font-semibold mb-4 text-white font-display">
                3. Disclaimer
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                The materials on Oxlyn Software's website are provided on an 'as is' basis. Oxlyn Software does not provide any custom changes on the base code of the scripts.
              </p>
            </div>

            {/* 4. Modifications */}
            <div className="apple-fade-in mb-12">
              <h2 className="text-2xl font-semibold mb-4 text-white font-display">
                4. Modifications
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Oxlyn Software may revise these terms of service for its website at any time without notice. By using this website you are agreeing to be bound by the then current version of these Terms and Conditions of Use.
              </p>
            </div>

            {/* 5. Refund Policy */}
            <div className="apple-fade-in mb-12">
              <h2 className="text-2xl font-semibold mb-4 text-white font-display">
                5. Refund Policy
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Due to the digital nature of our products, we do not offer refunds once a purchase has been completed. All sales are final. We encourage customers to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4 ml-4">
                <li>Read product descriptions carefully before purchasing</li>
                <li>Check system requirements and compatibility</li>
                <li>Review our documentation and support resources</li>
                <li>Contact our support team with any questions before purchasing</li>
              </ul>
              <p className="text-gray-300 leading-relaxed">
                In exceptional circumstances, refunds may be considered at our sole discretion. Please contact our support team if you believe you have a valid reason for a refund request.
              </p>
            </div>

            {/* 6. Intellectual Property */}
            <div className="apple-fade-in mb-12">
              <h2 className="text-2xl font-semibold mb-4 text-white font-display">
                6. Intellectual Property
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                All content on this website, including but not limited to text, graphics, logos, images, audio clips, digital downloads, data compilations, and software, is the property of Oxlyn Software or its content suppliers and is protected by international copyright laws.
              </p>
            </div>

            {/* 7. Contact Information */}
            <div className="apple-fade-in mb-12">
              <h2 className="text-2xl font-semibold mb-4 text-white font-display">
                7. Contact Information
              </h2>
              <p className="text-gray-300 leading-relaxed">
                If you have any questions about these Terms of Service, please contact us through our Discord server and open a ticket.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsPage;
