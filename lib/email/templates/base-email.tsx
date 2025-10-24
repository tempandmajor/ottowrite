/**
 * Base Email Template
 *
 * Provides consistent styling and layout for all OttoWrite emails.
 * Uses inline styles for maximum email client compatibility.
 */

import * as React from 'react'

interface BaseEmailProps {
  previewText: string
  children: React.ReactNode
}

export function BaseEmail({ previewText, children }: BaseEmailProps) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>OttoWrite</title>
        {/* Preview text - shows in inbox */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .preview-text {
                display: none;
                font-size: 1px;
                line-height: 1px;
                max-height: 0px;
                max-width: 0px;
                opacity: 0;
                overflow: hidden;
              }
            `,
          }}
        />
      </head>
      <body style={bodyStyle}>
        <span className="preview-text">{previewText}</span>
        <table style={containerStyle} cellPadding="0" cellSpacing="0">
          <tr>
            <td>
              {/* Header */}
              <table style={headerStyle} cellPadding="0" cellSpacing="0">
                <tr>
                  <td style={headerContentStyle}>
                    <h1 style={logoStyle}>OttoWrite</h1>
                  </td>
                </tr>
              </table>

              {/* Content */}
              <table style={contentStyle} cellPadding="0" cellSpacing="0">
                <tr>
                  <td style={contentPaddingStyle}>{children}</td>
                </tr>
              </table>

              {/* Footer */}
              <table style={footerStyle} cellPadding="0" cellSpacing="0">
                <tr>
                  <td style={footerContentStyle}>
                    <p style={footerTextStyle}>
                      © {new Date().getFullYear()} OttoWrite. All rights reserved.
                    </p>
                    <p style={footerTextStyle}>
                      <a href="{{unsubscribe_url}}" style={linkStyle}>
                        Unsubscribe
                      </a>
                      {' | '}
                      <a href="{{app_url}}/settings/notifications" style={linkStyle}>
                        Notification Preferences
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  )
}

// Inline styles for email client compatibility
const bodyStyle: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: 0,
  width: '100%',
}

const containerStyle: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  margin: '0 auto',
  padding: '20px 0',
  width: '100%',
  maxWidth: '600px',
}

const headerStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '8px 8px 0 0',
  width: '100%',
}

const headerContentStyle: React.CSSProperties = {
  padding: '24px 32px',
  textAlign: 'center',
}

const logoStyle: React.CSSProperties = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 700,
  margin: 0,
  textDecoration: 'none',
}

const contentStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  width: '100%',
}

const contentPaddingStyle: React.CSSProperties = {
  padding: '32px',
}

const footerStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '0 0 8px 8px',
  width: '100%',
}

const footerContentStyle: React.CSSProperties = {
  padding: '24px 32px',
  textAlign: 'center',
}

const footerTextStyle: React.CSSProperties = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '4px 0',
}

const linkStyle: React.CSSProperties = {
  color: '#5469d4',
  textDecoration: 'none',
}

// Export styles for use in other templates
export const emailStyles = {
  heading: {
    color: '#1a1a1a',
    fontSize: '24px',
    fontWeight: 600,
    lineHeight: '32px',
    margin: '0 0 16px',
  } as React.CSSProperties,

  paragraph: {
    color: '#525f7f',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 16px',
  } as React.CSSProperties,

  button: {
    backgroundColor: '#5469d4',
    borderRadius: '6px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '16px',
    fontWeight: 600,
    lineHeight: '24px',
    padding: '12px 24px',
    textDecoration: 'none',
    margin: '16px 0',
  } as React.CSSProperties,

  buttonSecondary: {
    backgroundColor: '#f6f9fc',
    border: '1px solid #d9e2ec',
    borderRadius: '6px',
    color: '#525f7f',
    display: 'inline-block',
    fontSize: '16px',
    fontWeight: 600,
    lineHeight: '24px',
    padding: '12px 24px',
    textDecoration: 'none',
    margin: '16px 0',
  } as React.CSSProperties,

  divider: {
    borderTop: '1px solid #e6ebf1',
    margin: '24px 0',
  } as React.CSSProperties,

  label: {
    color: '#8898aa',
    fontSize: '14px',
    fontWeight: 600,
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,

  value: {
    color: '#1a1a1a',
    fontSize: '16px',
    fontWeight: 500,
    margin: '0 0 16px',
  } as React.CSSProperties,

  alert: {
    backgroundColor: '#fff5f5',
    border: '1px solid #fc8181',
    borderRadius: '6px',
    padding: '16px',
    margin: '16px 0',
  } as React.CSSProperties,

  alertText: {
    color: '#c53030',
    fontSize: '14px',
    lineHeight: '20px',
    margin: 0,
  } as React.CSSProperties,

  success: {
    backgroundColor: '#f0fff4',
    border: '1px solid #68d391',
    borderRadius: '6px',
    padding: '16px',
    margin: '16px 0',
  } as React.CSSProperties,

  successText: {
    color: '#2f855a',
    fontSize: '14px',
    lineHeight: '20px',
    margin: 0,
  } as React.CSSProperties,
}
