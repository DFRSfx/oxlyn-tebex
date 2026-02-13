import React from 'react';
import { motion } from 'framer-motion';

// Reusable component for the scroll animation
const RevealSection = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} // Start slightly down and invisible
      whileInView={{ opacity: 1, y: 0 }} // Animate to visible and original position
      viewport={{ once: true, margin: "-50px" }} // Trigger when element is 50px into view
      transition={{ duration: 0.6, delay: delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#050505] text-white relative z-10 selection:bg-white/20 selection:text-white">
      {/* Background Gradient Effect (Optional - keeping generic subtle glow) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white/5 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 container mx-auto max-w-4xl px-6 py-24 md:py-32">
        {/* Header Section */}
        <header className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              Terms of Service
            </h1>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <p className="text-neutral-500 text-sm md:text-base font-medium uppercase tracking-widest">
              Last updated: February 13, 2026
            </p>
          </motion.div>
        </header>

        {/* Content Section */}
        <div className="space-y-16">
          
          {/* 1. Acceptance of Terms */}
          <RevealSection>
            <h2 className="text-2xl font-bold mb-4 text-white">
              1. Acceptance of Terms
            </h2>
            <p className="text-neutral-400 leading-relaxed text-lg">
              By accessing and using Oxlyn Software, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </RevealSection>

          {/* 2. Use License */}
          <RevealSection>
            <h2 className="text-2xl font-bold mb-4 text-white">
              2. Use License
            </h2>
            <div className="space-y-4 text-neutral-400 leading-relaxed text-lg">
              <p>
                When you purchase a script from Oxlyn Software, you are granted a non-exclusive license. The license gives you limited rights to use the software for personal purposes and only with the account that made the purchase. With our scripts, you are allowed to use them on your own server, but you are not allowed to sell them or distribute them to other people.
              </p>
              <p>
                This license shall automatically terminate if you violate any of these restrictions and may be terminated by Oxlyn Software at any time. Upon terminating your viewing of these materials or upon the termination of this license, you must destroy any downloaded materials in your possession.
              </p>
            </div>
          </RevealSection>

          {/* 3. Disclaimer */}
          <RevealSection>
            <h2 className="text-2xl font-bold mb-4 text-white">
              3. Disclaimer
            </h2>
            <p className="text-neutral-400 leading-relaxed text-lg">
              The materials on Oxlyn Software's website are provided on an 'as is' basis. Oxlyn Software does not provide any custom changes on the base code of the scripts.
            </p>
          </RevealSection>

          {/* 4. Modifications */}
          <RevealSection>
            <h2 className="text-2xl font-bold mb-4 text-white">
              4. Modifications
            </h2>
            <p className="text-neutral-400 leading-relaxed text-lg">
              Oxlyn Software may revise these terms of service for its website at any time without notice. By using this website you are agreeing to be bound by the then current version of these Terms and Conditions of Use.
            </p>
          </RevealSection>

          {/* 5. Refund Policy */}
          <RevealSection>
            <h2 className="text-2xl font-bold mb-4 text-white">
              5. Refund Policy
            </h2>
            <div className="space-y-4 text-neutral-400 leading-relaxed text-lg">
              <p>
                Due to the digital nature of our products, we do not offer refunds once a purchase has been completed. All sales are final. We encourage customers to:
              </p>
              <ul className="list-disc pl-6 space-y-2 marker:text-neutral-600">
                <li>Read product descriptions carefully before purchasing</li>
                <li>Check system requirements and compatibility</li>
                <li>Review our documentation and support resources</li>
                <li>Contact our support team with any questions before purchasing</li>
              </ul>
              <p>
                In exceptional circumstances, refunds may be considered at our sole discretion. Please contact our support team if you believe you have a valid reason for a refund request.
              </p>
            </div>
          </RevealSection>

          {/* 6. Intellectual Property */}
          <RevealSection>
            <h2 className="text-2xl font-bold mb-4 text-white">
              6. Intellectual Property
            </h2>
            <p className="text-neutral-400 leading-relaxed text-lg">
              All content on this website, including but not limited to text, graphics, logos, images, audio clips, digital downloads, data compilations, and software, is the property of Oxlyn Software or its content suppliers and is protected by international copyright laws.
            </p>
          </RevealSection>

          {/* 7. Contact Information */}
          <RevealSection>
            <h2 className="text-2xl font-bold mb-4 text-white">
              7. Contact Information
            </h2>
            <p className="text-neutral-400 leading-relaxed text-lg">
              If you have any questions about these Terms of Service, please contact us through our Discord server and open a ticket.
            </p>
          </RevealSection>

        </div>
      </div>
    </div>
  );
};

export default TermsPage;