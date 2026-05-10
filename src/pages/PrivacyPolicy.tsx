import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Privacy Policy
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-8">
          {/* Header Section */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Privacy Policy for Swadeshi Solutions
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              <strong>Effective Date:</strong> January 5, 2026
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              <strong>Last Updated:</strong> May 2, 2026
            </p>
          </div>

          {/* Introduction */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              1. Introduction
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Swadeshi Solutions ("we," "our," or "us") operates a restaurant
              and hotel management platform available at{" "}
              <a
                href="https://swadeshisolutions.co.in"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                swadeshisolutions.co.in
              </a>
              . We are committed to protecting the privacy and security of our
              restaurant partners, their staff, and their end customers. This
              Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our application and
              related services, including our WhatsApp Business messaging
              integration.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              By using our platform or receiving messages from businesses
              powered by our platform, you acknowledge that you have read and
              understood this Privacy Policy.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              2. Information We Collect
            </h2>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                2.1 Personal Information
              </h3>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                <li>
                  Name and contact information (email address, phone number,
                  WhatsApp number)
                </li>
                <li>
                  Business information (restaurant name, address, GST number)
                </li>
                <li>Login credentials (stored in encrypted form)</li>
                <li>Staff details for role-based access control</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                2.2 Transaction Data
              </h3>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                <li>Order history, billing records, and invoice details</li>
                <li>
                  Payment information (processed securely via third-party
                  payment processors — we do not store card numbers)
                </li>
                <li>Inventory, menu, and purchase order data</li>
                <li>Hotel room reservation and checkout records</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                2.3 WhatsApp Messaging Data
              </h3>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                <li>
                  Phone numbers of customers to whom transactional or
                  promotional messages are sent via WhatsApp
                </li>
                <li>Message delivery status (sent, delivered, read, failed)</li>
                <li>Template message names and parameters used</li>
                <li>
                  Campaign history and analytics (aggregated, non-personal)
                </li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed ml-4 text-sm italic">
                We do not read, store, or process the content of personal
                WhatsApp conversations. Our messaging is limited to pre-approved
                template messages sent through the WhatsApp Business Platform.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                2.4 Technical Data
              </h3>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                <li>Device information and browser type</li>
                <li>IP address and approximate location</li>
                <li>Usage analytics and performance metrics</li>
              </ul>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
              <li>
                To provide and maintain our restaurant and hotel management
                services
              </li>
              <li>
                To process transactions, generate invoices, and send billing
                notifications
              </li>
              <li>
                <strong>To send transactional WhatsApp messages</strong> such as
                order confirmations, digital bills/invoices, room checkout
                receipts, purchase order notifications, and payment
                confirmations on behalf of our business customers
              </li>
              <li>
                <strong>To send promotional WhatsApp messages</strong> such as
                offers, loyalty rewards, and campaign communications — only when
                the end customer has provided explicit opt-in consent to the
                restaurant
              </li>
              <li>
                To improve our platform, develop new features, and perform
                analytics
              </li>
              <li>To provide customer support and respond to inquiries</li>
              <li>To ensure platform security and prevent fraud</li>
              <li>
                To comply with applicable legal and regulatory obligations
              </li>
            </ul>
          </section>

          {/* WhatsApp Business Messaging */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              4. WhatsApp Business Messaging
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Our platform integrates with the{" "}
              <strong>WhatsApp Business Platform (Meta)</strong> to enable
              restaurants and hotels to communicate with their customers. This
              section describes how we handle data in connection with WhatsApp
              messaging.
            </p>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                4.1 Purpose of WhatsApp Messaging
              </h3>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                <li>
                  <strong>Transactional messages:</strong> Digital bill/invoice
                  delivery, order confirmations, room checkout receipts, and
                  purchase order notifications
                </li>
                <li>
                  <strong>Utility messages:</strong> Booking reminders, payment
                  confirmations, and delivery status updates
                </li>
                <li>
                  <strong>Promotional messages:</strong> Marketing campaigns,
                  loyalty program updates, special offers, and promotional codes
                  — sent only with prior customer consent
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                4.2 Consent & Opt-In
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                We require that our business customers (restaurants/hotels)
                obtain <strong>explicit consent</strong> from their end
                customers before sending WhatsApp messages. Consent is collected
                through:
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                <li>
                  Providing a phone number at the point of sale or during
                  checkout
                </li>
                <li>
                  Explicit opt-in during CRM registration or loyalty program
                  enrollment
                </li>
                <li>
                  Written or digital consent at the time of hotel check-in
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                4.3 Opt-Out & Unsubscribe
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                End customers can opt out of receiving WhatsApp messages at any
                time by:
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                <li>
                  Replying <strong>"STOP"</strong> to any message received from
                  the business
                </li>
                <li>
                  Contacting the restaurant or hotel directly and requesting
                  removal
                </li>
                <li>
                  Emailing us at{" "}
                  <a
                    href="mailto:support@swadeshisolutions.in"
                    className="text-blue-600 hover:underline"
                  >
                    support@swadeshisolutions.in
                  </a>{" "}
                  with the subject line "Opt-Out WhatsApp"
                </li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Once opt-out is received, we will cease all non-essential
                communications within <strong>48 hours</strong>.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                4.4 Data Minimization
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                We collect only the minimum data necessary to deliver WhatsApp
                messages: the recipient's phone number, name (for
                personalization), and transaction-specific details (amount,
                date, bill link). We do not collect or store message content
                beyond delivery metadata.
              </p>
            </div>
          </section>

          {/* Data Sharing */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              5. Data Sharing & Third-Party Services
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              We do not sell your personal information. We may share data with
              the following categories of service providers, solely for the
              purposes described in this policy:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
              <li>
                <strong>
                  Meta Platforms, Inc. (WhatsApp Business Platform):
                </strong>{" "}
                Phone numbers and template message parameters are transmitted to
                Meta for WhatsApp message delivery. Meta processes this data as
                a data processor under their{" "}
                <a
                  href="https://www.whatsapp.com/legal/privacy-policy"
                  className="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong>Cloud Infrastructure (Supabase / AWS):</strong> Data
                hosting and serverless function execution for platform
                operations.
              </li>
              <li>
                <strong>MSG91:</strong> Alternative WhatsApp Business API
                provider used for message delivery on select configurations.
              </li>
              <li>
                <strong>Netlify:</strong> Web application hosting and
                deployment.
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law, court
                order, or to protect our legal rights.
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with any
                merger, acquisition, or sale of assets.
              </li>
            </ul>
          </section>

          {/* Data Security */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              6. Data Security
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              We implement industry-standard security measures to protect your
              data:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
              <li>SSL/TLS encryption for all data in transit</li>
              <li>
                AES-256 encrypted storage for sensitive information at rest
              </li>
              <li>
                Row-Level Security (RLS) policies for database access control —
                ensuring each restaurant can only access its own data
              </li>
              <li>
                Role-based access control (RBAC) with granular permissions for
                staff
              </li>
              <li>JWT-based authentication with secure session management</li>
              <li>Regular security audits and dependency updates</li>
              <li>
                WhatsApp messages are sent via encrypted HTTPS APIs and are
                protected by WhatsApp's end-to-end encryption in transit
              </li>
            </ul>
          </section>

          {/* Your Rights */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              7. Your Rights
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Depending on your jurisdiction, you have the right to:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
              <li>
                <strong>Access</strong> your personal data held by us
              </li>
              <li>
                <strong>Rectify</strong> inaccurate or incomplete information
              </li>
              <li>
                <strong>Erase</strong> your personal data (Right to be
                Forgotten)
              </li>
              <li>
                <strong>Export</strong> your data in a portable,
                machine-readable format
              </li>
              <li>
                <strong>Restrict</strong> processing of your data under certain
                circumstances
              </li>
              <li>
                <strong>Withdraw consent</strong> at any time for marketing
                communications, including WhatsApp messages
              </li>
              <li>
                <strong>Object</strong> to processing based on legitimate
                interests
              </li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
              To exercise these rights, please visit our{" "}
              <Link
                to="/delete-account"
                className="text-blue-600 hover:underline"
              >
                Account Deletion page
              </Link>{" "}
              or email us at{" "}
              <a
                href="mailto:support@swadeshisolutions.in"
                className="text-blue-600 hover:underline"
              >
                support@swadeshisolutions.in
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          {/* Data Retention */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              8. Data Retention
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              We retain your data for as long as your account is active or as
              needed to provide services:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
              <li>
                <strong>Account data:</strong> Retained while account is active;
                deleted within 30 days of account deletion request
              </li>
              <li>
                <strong>Financial records:</strong> Retained for 7 years as
                required by Indian tax laws (Income Tax Act, GST regulations)
              </li>
              <li>
                <strong>WhatsApp message logs:</strong> Delivery metadata
                retained for 90 days for debugging and analytics; then
                automatically purged
              </li>
              <li>
                <strong>Campaign analytics:</strong> Aggregated, non-personal
                statistics retained indefinitely for service improvement
              </li>
            </ul>
          </section>

          {/* International Data Transfers */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              9. International Data Transfers
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Our primary servers are located in India (AWS ap-south-1).
              However, certain third-party services (Meta/WhatsApp, Supabase)
              may process data in other regions. When data is transferred
              internationally, we ensure appropriate safeguards are in place
              through contractual obligations and compliance with applicable
              data protection regulations.
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              10. Children's Privacy
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Our services are intended for business use and are not directed at
              individuals under 18 years of age. We do not knowingly collect
              personal information from children. If we become aware that we
              have collected data from a minor, we will delete it promptly.
            </p>
          </section>

          {/* Compliance */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              11. Legal Compliance
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              This Privacy Policy is designed to comply with:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
              <li>
                Information Technology Act, 2000 (India) and IT Rules, 2011
              </li>
              <li>Digital Personal Data Protection Act, 2023 (India)</li>
              <li>Meta Platform Terms and WhatsApp Business Policy</li>
              <li>
                General Data Protection Regulation (GDPR) — for users in the
                European Union
              </li>
            </ul>
          </section>

          {/* Changes to Policy */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              12. Changes to This Policy
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will
              notify you of material changes by posting the updated policy on
              this page, updating the "Last Updated" date, and — where
              appropriate — sending a notification via email or in-app alert.
            </p>
          </section>

          {/* Contact Information */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              13. Contact Us
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              If you have questions about this Privacy Policy, our WhatsApp
              messaging practices, or wish to exercise your data rights, please
              contact us:
            </p>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 space-y-3">
              <p className="text-gray-800 dark:text-gray-200 font-semibold text-lg">
                Swadeshi Solutions
              </p>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <Mail className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <a
                  href="mailto:support@swadeshisolutions.in"
                  className="hover:underline"
                >
                  support@swadeshisolutions.in
                </a>
              </div>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <Phone className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <span>+91 9370505279</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <span>India</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <MessageCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span>
                  WhatsApp Data Inquiries: support@swadeshisolutions.in
                </span>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} Swadeshi Solutions. All rights
              reserved.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Made with ❤️ in India | Atmanirbhar Bharat
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
