(function injectVercelAnalytics() {
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

  if (localHosts.has(window.location.hostname)) {
    return;
  }

  if (!window.va) {
    window.va = function queueVercelAnalyticsEvent() {
      window.vaq = window.vaq || [];
      window.vaq.push(Array.from(arguments));
    };
  }

  const scriptSrc = "/_vercel/insights/script.js";

  if (document.head.querySelector(`script[src="${scriptSrc}"]`)) {
    return;
  }

  const script = document.createElement("script");
  script.src = scriptSrc;
  script.defer = true;
  script.dataset.sdkn = "@vercel/analytics/custom";
  script.dataset.sdkv = "2.0.1";
  document.head.appendChild(script);
})();
