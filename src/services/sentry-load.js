// The lazily loaded half of src/services/errors.js: only these SDK parts reach the bundle (a namespace import would pull in
// replay, feedback and tracing too). Errors only: no session pings, console hooks or rAF/addEventListener wrapping.
import { init, eventFiltersIntegration, functionToStringIntegration, breadcrumbsIntegration, globalHandlersIntegration,
  linkedErrorsIntegration, dedupeIntegration, httpContextIntegration, captureException, captureMessage } from '@sentry/browser';

export function start(options) {
  init({
    ...options,
    defaultIntegrations: false,
    integrations: [
      eventFiltersIntegration(), functionToStringIntegration(),
      breadcrumbsIntegration({ console: false, dom: false, xhr: false, fetch: true, history: true, sentry: true }),
      globalHandlersIntegration(), linkedErrorsIntegration(), dedupeIntegration(), httpContextIntegration(),
    ],
  });
  return { captureException, captureMessage };
}
