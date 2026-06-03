import React, { useEffect, useRef, useState } from 'react';
import { Shield, FileText, Scale } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';

/**
 * Reveal-on-scroll usando IntersectionObserver — substitui o framer-motion
 * antes usado só para fade-in. ~50KB poupados no bundle. Aparece uma vez.
 */
const RevealSection: React.FC<{ children: React.ReactNode; delay?: number }> = ({
  children,
  delay = 0,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        });
      },
      { rootMargin: '-50px' }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: `opacity 0.6s ease-out ${delay}s, transform 0.6s ease-out ${delay}s`,
        willChange: visible ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
};

const TermsPage: React.FC = () => {
  useSEO({
    title: 'Terms of Service',
    description:
      'Terms of service for OXLYN Software. Read our policies on FiveM script licensing, refunds, support, and use of our digital products.',
    canonical: '/terms',
  });
  return (
    <div className="min-h-screen bg-[#050505] text-white relative z-10 selection:bg-white/20 selection:text-white">
      {/* Same background as homepage */}
      <div className="fixed inset-0 grid-background opacity-20 pointer-events-none" />
      <div className="fixed inset-0 hero-gradient-enhanced pointer-events-none" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="geometric-shape geometric-shape-1" />
        <div className="geometric-shape geometric-shape-2" />
        <div className="geometric-shape geometric-shape-3" />
      </div>

      <div className="relative z-10 container mx-auto max-w-4xl px-6 py-24 md:py-32">
        {/* Header Section */}
        <header className="text-center mb-24">
          <div className="apple-slide-up">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500/15 to-red-500/15 border border-orange-500/30 mb-8">
              <Scale className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-bold text-orange-400 uppercase tracking-widest">Legal</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
              Terms of <span className="gradient-text-brand">Service</span>
            </h1>
          </div>

          <div className="apple-fade-in" style={{ animationDelay: '200ms' }}>
            <p className="text-neutral-500 text-sm md:text-base font-medium uppercase tracking-widest">
              Last updated: February 13, 2026
            </p>
          </div>
        </header>

        {/* Content Section */}
        <div className="space-y-16">

          {/* 1. Acceptance of Terms */}
          <RevealSection>
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-orange-400" />
                </div>
                1. Acceptance of Terms
              </h2>
              <p className="text-neutral-400 leading-relaxed text-lg">
                By accessing and using Oxlyn Software, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </div>
          </RevealSection>

          {/* 2. Use License */}
          <RevealSection>
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-orange-400" />
                </div>
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
            </div>
          </RevealSection>

          {/* 3. Disclaimer */}
          <RevealSection>
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-white">
                3. Disclaimer
              </h2>
              <p className="text-neutral-400 leading-relaxed text-lg">
                The materials on Oxlyn Software's website are provided on an 'as is' basis. Oxlyn Software does not provide any custom changes on the base code of the scripts.
              </p>
            </div>
          </RevealSection>

          {/* 4. Modifications */}
          <RevealSection>
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-white">
                4. Modifications
              </h2>
              <p className="text-neutral-400 leading-relaxed text-lg">
                Oxlyn Software may revise these terms of service for its website at any time without notice. By using this website you are agreeing to be bound by the then current version of these Terms and Conditions of Use.
              </p>
            </div>
          </RevealSection>

          {/* 5. Refund Policy */}
          <RevealSection>
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-white">
                5. Refund Policy
              </h2>
              <div className="space-y-4 text-neutral-400 leading-relaxed text-lg">
                <p>
                  Due to the digital nature of our products, we do not offer refunds once a purchase has been completed. All sales are final. We encourage customers to:
                </p>
                <ul className="list-disc pl-6 space-y-2 marker:text-orange-500">
                  <li>Read product descriptions carefully before purchasing</li>
                  <li>Check system requirements and compatibility</li>
                  <li>Review our documentation and support resources</li>
                  <li>Contact our support team with any questions before purchasing</li>
                </ul>
                <p>
                  In exceptional circumstances, refunds may be considered at our sole discretion. Please contact our support team if you believe you have a valid reason for a refund request.
                </p>
              </div>
            </div>
          </RevealSection>

          {/* 6. Intellectual Property */}
          <RevealSection>
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-white">
                6. Intellectual Property
              </h2>
              <p className="text-neutral-400 leading-relaxed text-lg">
                All content on this website, including but not limited to text, graphics, logos, images, audio clips, digital downloads, data compilations, and software, is the property of Oxlyn Software or its content suppliers and is protected by international copyright laws.
              </p>
            </div>
          </RevealSection>

          {/* 7. Contact Information */}
          <RevealSection>
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-white">
                7. Contact Information
              </h2>
              <p className="text-neutral-400 leading-relaxed text-lg">
                If you have any questions about these Terms of Service, please contact us through our Discord server and open a ticket.
              </p>
            </div>
          </RevealSection>

        </div>
      </div>
    </div>
  );
};

export default TermsPage;
