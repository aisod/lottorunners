/** User-visible feedback for actions that are not yet available. */
export function notifyUnavailable(message: string): void {
  if (typeof window !== "undefined") {
    window.alert(message);
  }
}

export const UNAVAILABLE = {
  passwordReset:
    "Password reset is not available in the app yet. Contact support@lottorunners.na for help signing in.",
  privacySettings: "Privacy and security settings are not available in this release.",
  walletTopUp: "Wallet top-up is not available yet. Pay for jobs at checkout instead.",
  walletSend: "Sending money from your wallet is not available yet.",
  teamInvite: "Inviting team members is not available yet. Contact your account manager.",
  invoicePay: "Paying invoices online is not available yet. Use the bank details on your invoice.",
  invoicePdf: "Invoice PDF download is not available yet.",
  paymentMethodEdit: "Editing saved payment methods is not available yet.",
  subscriptionChoose: "Subscription plans are not available for purchase yet.",
  adminDigest: "Security digest export is not available yet.",
  adminPricingSave: "Saving service pricing from the console is not available yet.",
  adminSupportSearch: "Knowledge base search is not available yet. Use the operations desk contacts below.",
  adminSupportArticle: "Internal runbooks are not hosted in the app yet. Contact ops@lottorunners.na.",
  analyticsExport: "Exporting spending reports is not available yet.",
  analyticsDateRange: "Changing the date range is not available yet. This page shows sample data.",
  adminNotifications: "Admin notifications are not available yet.",
  adminHelp: "Admin help center is not available yet. See Support in the sidebar.",
  adminAccount: "Admin account settings are not available yet.",
  runnerNotifications: "Runner notifications are not available yet.",
  sos:
    "Emergency SOS is not monitored in this app. For emergencies, call local emergency services (10111).",
} as const;
