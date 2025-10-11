import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            {/* Introduction */}
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-muted-foreground">
                Welcome to ViralForge AI ("we," "our," or "us"). We are committed to protecting your privacy and personal data.
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application
                and services (collectively, the "Service").
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>

              <h3 className="text-lg font-semibold mb-2 mt-4">2.1 Information You Provide</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Account Information:</strong> Username, password, email address (optional), and full name (optional)</li>
                <li><strong>Subscription Information:</strong> Payment and billing information processed through RevenueCat</li>
                <li><strong>YouTube Account Connection:</strong> When you connect your YouTube account, we access your channel data, video analytics, and performance metrics</li>
              </ul>

              <h3 className="text-lg font-semibold mb-2 mt-4">2.2 Automatically Collected Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Usage Data:</strong> App features accessed, time spent in the app, and interaction patterns</li>
                <li><strong>Device Information:</strong> Device type, operating system, unique device identifiers</li>
                <li><strong>Analytics Data:</strong> App performance metrics, crash reports, and usage statistics</li>
              </ul>

              <h3 className="text-lg font-semibold mb-2 mt-4">2.3 YouTube API Data</h3>
              <p className="text-muted-foreground mb-2">
                When you connect your YouTube account, we access and process:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Channel information (name, description, subscriber count)</li>
                <li>Video metadata (titles, descriptions, tags, thumbnails)</li>
                <li>Video analytics (views, likes, comments, engagement metrics)</li>
                <li>Audience demographics and retention data</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                ViralForge AI's use and transfer of information received from Google APIs adheres to the{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
            </section>

            {/* How We Use Your Information */}
            <section>
              <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Service Delivery:</strong> To provide AI-powered content analysis and personalized recommendations</li>
                <li><strong>Account Management:</strong> To create and manage your account, process subscriptions, and authenticate access</li>
                <li><strong>Content Analysis:</strong> To analyze your YouTube channel and videos using AI to provide insights and recommendations</li>
                <li><strong>Service Improvement:</strong> To improve our AI models, features, and user experience</li>
                <li><strong>Communication:</strong> To send service updates, recommendations, and respond to your inquiries</li>
                <li><strong>Security:</strong> To detect and prevent fraud, abuse, and security incidents</li>
              </ul>
            </section>

            {/* Data Storage and Security */}
            <section>
              <h2 className="text-xl font-semibold mb-3">4. Data Storage and Security</h2>
              <p className="text-muted-foreground mb-2">
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Encryption:</strong> All data transmitted between your device and our servers uses TLS/SSL encryption</li>
                <li><strong>Secure Storage:</strong> Your data is stored on secure Firebase and Neon PostgreSQL databases</li>
                <li><strong>Access Controls:</strong> Strict access controls limit who can access your personal information</li>
                <li><strong>Authentication:</strong> JWT-based authentication with secure token management</li>
              </ul>
            </section>

            {/* Data Sharing and Disclosure */}
            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Sharing and Disclosure</h2>
              <p className="text-muted-foreground mb-2">We may share your information with:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Service Providers:</strong> Firebase (hosting, authentication), RevenueCat (subscription management), Google Cloud (AI processing)</li>
                <li><strong>YouTube API:</strong> We access YouTube data solely to provide our service and comply with YouTube's API Terms of Service</li>
                <li><strong>Legal Requirements:</strong> When required by law, legal process, or to protect our rights and users</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                We do NOT sell your personal information to third parties.
              </p>
            </section>

            {/* YouTube Specific Terms */}
            <section>
              <h2 className="text-xl font-semibold mb-3">6. YouTube API Services</h2>
              <p className="text-muted-foreground mb-2">
                By connecting your YouTube account, you agree to be bound by the{' '}
                <a
                  href="https://www.youtube.com/t/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  YouTube Terms of Service
                </a>
                .
              </p>
              <p className="text-muted-foreground mb-2">
                You can revoke ViralForge AI's access to your YouTube data at any time via the{' '}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google security settings page
                </a>
                .
              </p>
              <p className="text-muted-foreground">
                You can also view Google's{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Privacy Policy
                </a>
                .
              </p>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="text-xl font-semibold mb-3">7. Your Rights and Choices</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Access and Update:</strong> You can access and update your account information in the app settings</li>
                <li><strong>Disconnect YouTube:</strong> You can disconnect your YouTube account at any time</li>
                <li><strong>Data Deletion:</strong> You can request deletion of your account and associated data by contacting us</li>
                <li><strong>Opt-Out:</strong> You can opt out of marketing communications while still receiving essential service updates</li>
                <li><strong>Data Portability:</strong> You can request a copy of your data in a machine-readable format</li>
              </ul>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-xl font-semibold mb-3">8. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your personal data for as long as your account is active or as needed to provide services.
                When you delete your account, we will delete or anonymize your data within 30 days, except where we
                are required to retain it for legal compliance, dispute resolution, or security purposes.
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-xl font-semibold mb-3">9. Children's Privacy</h2>
              <p className="text-muted-foreground">
                Our Service is not intended for users under the age of 13. We do not knowingly collect personal information
                from children under 13. If you believe we have collected information from a child under 13, please contact us
                immediately, and we will delete such information.
              </p>
            </section>

            {/* International Data Transfers */}
            <section>
              <h2 className="text-xl font-semibold mb-3">10. International Data Transfers</h2>
              <p className="text-muted-foreground">
                Your information may be transferred to and processed in countries other than your country of residence.
                These countries may have different data protection laws. We ensure appropriate safeguards are in place
                to protect your data in accordance with this Privacy Policy.
              </p>
            </section>

            {/* Changes to Privacy Policy */}
            <section>
              <h2 className="text-xl font-semibold mb-3">11. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by
                posting the new Privacy Policy in the app and updating the "Last updated" date. Your continued use
                of the Service after changes become effective constitutes acceptance of the revised policy.
              </p>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-xl font-semibold mb-3">12. Contact Us</h2>
              <p className="text-muted-foreground mb-2">
                If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-semibold">ViralForge AI</p>
                <p className="text-muted-foreground">Email: info@viralforgeai.co.uk</p>
                <p className="text-muted-foreground">Support: omar@viralforgeai.co.uk</p>
              </div>
            </section>

            {/* GDPR/CCPA Specific Rights */}
            <section>
              <h2 className="text-xl font-semibold mb-3">13. Additional Rights for EU/UK/California Users</h2>
              <p className="text-muted-foreground mb-2">
                If you are located in the European Union, United Kingdom, or California, you have additional rights:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Right to Know:</strong> What personal information we collect and how we use it</li>
                <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
                <li><strong>Right to Rectification:</strong> Correct inaccurate personal data</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your personal data</li>
                <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
                <li><strong>Right to Data Portability:</strong> Receive your data in a portable format</li>
                <li><strong>Right to Object:</strong> Object to certain types of processing</li>
                <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                To exercise these rights, please contact us at info@viralforgeai.co.uk
              </p>
            </section>

            {/* Footer */}
            <section className="border-t pt-6 mt-8">
              <p className="text-xs text-muted-foreground text-center">
                © {new Date().getFullYear()} ViralForge AI. All rights reserved.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
