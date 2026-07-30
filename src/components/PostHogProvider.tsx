'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.location.hostname === 'localhost') return

    posthog.init('phc_mtVbW9nET3w5qybzT6PmfbJLMPYy4Yv69wjmrnhxMJSf', {
      api_host: 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      cookieless_mode: 'on_reject',
      capture_pageview: 'history_change',
      capture_pageleave: true,
    })
    posthog.register({
      site_id: 'empowr-members',
      org: 'empowr-cic',
      brand: 'Empowr',
      site_name: 'Empowr Members',
      site_url: 'https://members.empowrcic.org',
    })
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
