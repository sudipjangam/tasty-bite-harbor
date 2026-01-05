import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Mail, Phone, MapPin } from "lucide-react";
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
              <strong>Last Updated:</strong> January 5, 2026
            </p>
          </div>

          {/* Introduction */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              1. Introduction
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Swadeshi Solutions ("we," "our," or "us") operates the restaurant
              management platform. We are committed to protecting the privacy
              and security of our restaurant partners, their staff, and their
              customers. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our
              application.
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
                <li>Name and contact information (email, phone number)</li>
                <li>
                  Business information (restaurant name, address, GST number)
                </li>
                <li>Login credentials (encrypted)</li>
                <li>Staff details for role-based access</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                2.2 Transaction Data
              </h3>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                <li>Order history and billing records</li>
                <li>
                  Payment information (processed securely via third-party
                  providers)
                </li>
                <li>Inventory and menu data</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                2.3 Technical Data
              </h3>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                <li>Device information and browser type</li>
                <li>IP address and location data</li>
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
                To provide and maintain our restaurant management services
              </li>
              <li>To process transactions and send related notifications</li>
              <li>To improve our platform and develop new features</li>
              <li>To provide customer support and respond to inquiries</li>
              <li>To ensure security and prevent fraud</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              4. Data Sharing
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              We do not sell your personal information. We may share data with:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
              <li>
                <strong>Service Providers:</strong> Cloud hosting (Supabase),
                email services, and payment processors
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law or to
                protect our rights
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with any
                merger or acquisition
              </li>
            </ul>
          </section>

          {/* Data Security */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              5. Data Security
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              We implement industry-standard security measures including:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
              <li>SSL/TLS encryption for all data in transit</li>
              <li>Encrypted storage for sensitive information</li>
              <li>Row-Level Security (RLS) for database access control</li>
              <li>Regular security audits and updates</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              6. Your Rights
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
              To exercise these rights, please visit our{" "}
              <Link
                to="/delete-account"
                className="text-blue-600 hover:underline"
              >
                Account Deletion page
              </Link>{" "}
              or contact us directly.
            </p>
          </section>

          {/* Data Retention */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              7. Data Retention
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              We retain your data for as long as your account is active or as
              needed to provide services. Financial records are retained for 7
              years as required by Indian tax laws. Upon account deletion,
              personal data is removed within 30 days, except where retention is
              legally required.
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              8. Children's Privacy
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Our services are intended for business use and are not directed at
              individuals under 18 years of age. We do not knowingly collect
              personal information from children.
            </p>
          </section>

          {/* Changes to Policy */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              9. Changes to This Policy
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will
              notify you of any changes by posting the new policy on this page
              and updating the "Last Updated" date.
            </p>
          </section>

          {/* Contact Information */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              10. Contact Us
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              If you have questions about this Privacy Policy, please contact
              us:
            </p>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <Mail className="h-5 w-5 text-blue-600" />
                <span>support@swadeshisolutions.in</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <Phone className="h-5 w-5 text-blue-600" />
                <span>+91 XXXXX XXXXX</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <MapPin className="h-5 w-5 text-blue-600" />
                <span>India</span>
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
