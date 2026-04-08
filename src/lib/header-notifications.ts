/** localStorage keys for header notification badges (last-seen timestamps). */

export const LS_STAFF_BLOG_LAST_SEEN = "eden_header_staff_blog_last_seen";
export const LS_ADMIN_ENQUIRY_LAST_SEEN = "eden_header_admin_enquiry_last_seen";

export const HEADER_NOTIFICATIONS_REFRESH = "eden-notifications-refresh";

export function dispatchNotificationsRefresh(): void {
  window.dispatchEvent(new Event(HEADER_NOTIFICATIONS_REFRESH));
}
