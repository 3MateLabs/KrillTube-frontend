/**
 * Platform Fee Comparison Dialog
 * Shows how KrillTube's 10% fee compares to other content monetization platforms
 */

"use client";

interface PlatformFeeComparisonDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlatformFeeComparisonDialog({
  isOpen,
  onClose,
}: PlatformFeeComparisonDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-background-elevated border-2 border-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-foreground">
            Platform Fee Comparison
          </h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-foreground transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <p className="text-sm text-text-muted mb-6">
          KrillTube's 10% platform fee is competitive compared to other content
          monetization platforms:
        </p>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  Platform
                </th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  Platform Fee
                </th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  Creator Gets
                </th>
              </tr>
            </thead>
            <tbody className="text-text-muted">
              <tr className="border-b border-border/50">
                <td className="py-3 px-4">
                  <span className="font-medium text-walrus-mint">
                    KrillTube
                  </span>
                </td>
                <td className="py-3 px-4 text-walrus-mint font-semibold">
                  10%
                </td>
                <td className="py-3 px-4 text-walrus-mint font-semibold">
                  up to 90%**
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4">
                  <a
                    href="https://support.google.com/youtube/answer/72902?hl=en&utm_source=chatgpt.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-walrus-mint transition-colors inline-flex items-center gap-1"
                  >
                    YouTube
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </td>
                <td className="py-3 px-4">48-58%*</td>
                <td className="py-3 px-4">42-52%</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4">
                  <a
                    href="https://en.wikipedia.org/wiki/Twitch_(service)"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-walrus-mint transition-colors inline-flex items-center gap-1"
                  >
                    Twitch
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </td>
                <td className="py-3 px-4">
                  53%*
                  <div className="text-xs text-text-muted mt-1">
                    (33%* for top creators)
                  </div>
                </td>
                <td className="py-3 px-4">47-67%</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4">
                  <a
                    href="https://freshlearn.com/blog/what-is-fanfix/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-walrus-mint transition-colors inline-flex items-center gap-1"
                  >
                    Fanfix
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </td>
                <td className="py-3 px-4">23%*</td>
                <td className="py-3 px-4">77%</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4">
                  <a
                    href="https://en.wikipedia.org/wiki/OnlyFans"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-walrus-mint transition-colors inline-flex items-center gap-1"
                  >
                    OnlyFans
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </td>
                <td className="py-3 px-4">23%*</td>
                <td className="py-3 px-4">77%</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4">
                  <a
                    href="https://en.wikipedia.org/wiki/Patreon"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-walrus-mint transition-colors inline-flex items-center gap-1"
                  >
                    Patreon
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </td>
                <td className="py-3 px-4">11-15%*</td>
                <td className="py-3 px-4">85-89%</td>
              </tr>
              <tr>
                <td className="py-3 px-4">
                  <a
                    href="https://en.wikipedia.org/wiki/Substack"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-walrus-mint transition-colors inline-flex items-center gap-1"
                  >
                    Substack
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </td>
                <td className="py-3 px-4">13%*</td>
                <td className="py-3 px-4">87%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-xs text-orange-400 mt-3">
          * All competitor platforms include an additional ~3% credit card
          processing fee.
          <br />
          ** Depends on referral fee configuration.
        </p>

        <div className="mt-6 p-4 bg-walrus-mint/10 border border-walrus-mint/30 rounded-lg">
          <p className="text-sm text-foreground">
            <span className="font-semibold text-walrus-mint">Why 10%?</span>{" "}
            This fee helps us maintain infrastructure, provide reliable service,
            and continue improving the platform for creators like you. These income
            will also be used for future incentive and airdrop to users.
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-walrus-mint hover:bg-mint-800 text-background font-medium rounded-lg transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
