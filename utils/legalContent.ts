export interface LegalSection {
    title: string;
    body: string;
}

const LAST_UPDATED = "February 17, 2026";
const APP_NAME = "brutalDO";
const DEVELOPER = "Mhuka Consulting";
const CONTACT_EMAIL = "contact@mhuka-consulting.com";

export function getPrivacyPolicy(): LegalSection[] {
    return [
        {
            title: "Introduction",
            body: `${DEVELOPER} ("we", "us", or "our") operates the ${APP_NAME} mobile application. This Privacy Policy explains how we collect, use, and protect your information when you use our app.\n\nLast updated: ${LAST_UPDATED}`,
        },
        {
            title: "Data Storage",
            body: `${APP_NAME} stores all your data locally on your device using on-device storage. We do not operate servers that collect or store your personal data. Your tasks, settings, and preferences remain entirely on your device.`,
        },
        {
            title: "Information We Do Not Collect",
            body: `We do not collect, transmit, or store:\n\n• Your tasks, notes, or to-do items\n• Personal identification information\n• Location data\n• Contacts or address book data\n• Photos, media, or files\n• Usage analytics or tracking data`,
        },
        {
            title: "Notifications",
            body: `${APP_NAME} may request permission to send local notifications for task reminders and pomodoro timer alerts. These notifications are scheduled and delivered entirely on your device. No notification data is sent to external servers.`,
        },
        {
            title: "In-App Purchases",
            body: `${APP_NAME} offers optional premium subscriptions and one-time purchases processed through Apple's App Store or Google Play Store. We do not directly collect or process payment information. All transactions are handled by Apple or Google according to their respective privacy policies.\n\nWe may receive anonymized transaction confirmations to verify your subscription status.`,
        },
        {
            title: "Third-Party Services",
            body: `The app integrates with the following third-party services:\n\n• Apple App Store / Google Play Store — for in-app purchases and subscription management\n• Expo — for app updates and build infrastructure\n\nThese services have their own privacy policies governing their data practices.`,
        },
        {
            title: "Children's Privacy",
            body: `${APP_NAME} does not knowingly collect personal information from children under 13. Since all data is stored locally and we do not collect user data, the app can be used by individuals of all ages.`,
        },
        {
            title: "Data Deletion",
            body: `Since all data is stored locally on your device, you can delete all ${APP_NAME} data by uninstalling the app or clearing the app's data through your device settings.`,
        },
        {
            title: "Changes to This Policy",
            body: `We may update this Privacy Policy from time to time. Changes will be reflected in the app with an updated "Last Updated" date. Continued use of the app after changes constitutes acceptance of the updated policy.`,
        },
        {
            title: "Contact Us",
            body: `If you have questions about this Privacy Policy, contact us at:\n\n${CONTACT_EMAIL}`,
        },
    ];
}

export function getTermsOfService(): LegalSection[] {
    return [
        {
            title: "Introduction",
            body: `These Terms of Service ("Terms") govern your use of the ${APP_NAME} mobile application developed by ${DEVELOPER} ("we", "us", or "our"). By using ${APP_NAME}, you agree to these Terms.\n\nLast updated: ${LAST_UPDATED}`,
        },
        {
            title: "License Grant",
            body: `We grant you a limited, non-exclusive, non-transferable, revocable license to use ${APP_NAME} for personal, non-commercial purposes on devices you own or control, subject to these Terms and applicable app store terms.`,
        },
        {
            title: "Subscription Terms",
            body: `${APP_NAME} offers optional premium features through:\n\n• Monthly subscription\n• Yearly subscription\n• One-time lifetime purchase\n\nSubscriptions automatically renew unless cancelled at least 24 hours before the end of the current billing period. You can manage and cancel subscriptions through your Apple App Store or Google Play Store account settings.\n\nPrices are displayed in your local currency and may vary by region.`,
        },
        {
            title: "Free Trial",
            body: `If a free trial is offered, it will convert to a paid subscription at the end of the trial period unless cancelled at least 24 hours before the trial ends. Any unused portion of a free trial is forfeited when you purchase a subscription.`,
        },
        {
            title: "Refunds",
            body: `All purchases are processed by Apple or Google. Refund requests must be directed to the respective app store:\n\n• Apple: https://support.apple.com/en-us/HT204084\n• Google: https://support.google.com/googleplay/answer/2479637\n\nWe do not process refunds directly.`,
        },
        {
            title: "Acceptable Use",
            body: `You agree not to:\n\n• Reverse engineer, decompile, or disassemble the app\n• Modify, adapt, or create derivative works of the app\n• Remove or alter any proprietary notices or labels\n• Use the app for any unlawful purpose\n• Attempt to gain unauthorized access to the app's systems\n• Redistribute, sublicense, or resell the app`,
        },
        {
            title: "Intellectual Property",
            body: `${APP_NAME}, including its design, code, graphics, and content, is the intellectual property of ${DEVELOPER} and is protected by applicable copyright and trademark laws. All rights not expressly granted are reserved.`,
        },
        {
            title: "Disclaimer of Warranties",
            body: `${APP_NAME} is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, either express or implied. We do not warrant that the app will be uninterrupted, error-free, or free of harmful components.\n\nWe are not responsible for any data loss resulting from device failure, app updates, or uninstallation.`,
        },
        {
            title: "Limitation of Liability",
            body: `To the maximum extent permitted by law, ${DEVELOPER} shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of ${APP_NAME}.\n\nOur total liability shall not exceed the amount you paid for the app in the 12 months preceding the claim.`,
        },
        {
            title: "Termination",
            body: `We reserve the right to terminate or suspend your access to ${APP_NAME} at any time, without notice, for conduct that we determine violates these Terms or is harmful to other users or the app.\n\nUpon termination, your license to use the app is revoked. Sections regarding intellectual property, disclaimers, and limitation of liability survive termination.`,
        },
        {
            title: "Changes to These Terms",
            body: `We may update these Terms from time to time. Changes will be reflected in the app with an updated "Last Updated" date. Continued use of the app after changes constitutes acceptance of the updated Terms.`,
        },
        {
            title: "Contact Us",
            body: `If you have questions about these Terms, contact us at:\n\n${CONTACT_EMAIL}`,
        },
    ];
}
