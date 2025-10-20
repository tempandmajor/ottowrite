'use client'

type TelemetryPayload = {
  event: string
  context?: Record<string, unknown>
}

const ENDPOINT = '/api/telemetry/ui'

function sendBeacon(payload: TelemetryPayload) {
  try {
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      return navigator.sendBeacon(ENDPOINT, blob)
    }
  } catch (error) {
    console.warn('sendBeacon failed', error)
  }
  return false
}

export async function trackEvent(event: string, context?: Record<string, unknown>) {
  if (typeof window === 'undefined') {
    return
  }

  const payload: TelemetryPayload = { event, context }

  const beaconSent = sendBeacon(payload)
  if (beaconSent) {
    return
  }

  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch (error) {
    console.warn('Failed to send telemetry event', error)
  }
}
