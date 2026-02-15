/**
 * Parse a human-readable status label from a Congress.gov latest_action text.
 * These map to the standard legislative process steps.
 */

export type BillStatus =
  | 'Introduced'
  | 'Referred to Committee'
  | 'Reported by Committee'
  | 'On Calendar'
  | 'Passed House'
  | 'Passed Senate'
  | 'Received in Senate'
  | 'Received in House'
  | 'Resolving Differences'
  | 'Sent to President'
  | 'Signed into Law'
  | 'Vetoed'
  | 'Passed';

const STATUS_PATTERNS: [RegExp, BillStatus][] = [
  [/became public law/i, 'Signed into Law'],
  [/signed by.*president/i, 'Signed into Law'],
  [/vetoed/i, 'Vetoed'],
  [/sent to.*president/i, 'Sent to President'],
  [/presented to.*president/i, 'Sent to President'],
  [/resolving differences/i, 'Resolving Differences'],
  [/passed senate/i, 'Passed Senate'],
  [/passed.*senate/i, 'Passed Senate'],
  [/agreed to in.*senate/i, 'Passed Senate'],
  [/passed house/i, 'Passed House'],
  [/passed.*house/i, 'Passed House'],
  [/agreed to in.*house/i, 'Passed House'],
  [/passed/i, 'Passed'],
  [/received in the senate/i, 'Received in Senate'],
  [/received in the house/i, 'Received in House'],
  [/placed on.*calendar/i, 'On Calendar'],
  [/ordered to be reported/i, 'Reported by Committee'],
  [/reported.*committee/i, 'Reported by Committee'],
  [/referred to/i, 'Referred to Committee'],
  [/introduced/i, 'Introduced'],
];

export function parseStatusFromAction(actionText: string | null | undefined): BillStatus {
  if (!actionText) return 'Introduced';

  for (const [pattern, status] of STATUS_PATTERNS) {
    if (pattern.test(actionText)) {
      return status;
    }
  }

  return 'Introduced';
}

/**
 * Status badge styling
 */
const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Signed into Law': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Sent to President': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  'Passed House': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  'Passed Senate': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  'Passed': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  'On Calendar': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  'Reported by Committee': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Referred to Committee': { bg: 'bg-zinc-50', text: 'text-zinc-600', border: 'border-zinc-200' },
  'Received in Senate': { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
  'Received in House': { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
  'Resolving Differences': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Vetoed': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  'Introduced': { bg: 'bg-zinc-50', text: 'text-zinc-500', border: 'border-zinc-200' },
};

export function statusStyle(status: string) {
  return STATUS_STYLES[status] || STATUS_STYLES['Introduced'];
}

/**
 * Is this a "major" status change that warrants a highlight?
 */
export function isSignificantChange(oldStatus: string | null, newStatus: string): boolean {
  if (!oldStatus) return true;
  if (oldStatus === newStatus) return false;

  // Any movement beyond "Referred to Committee" is significant
  const significantStatuses = [
    'Reported by Committee',
    'On Calendar',
    'Passed House',
    'Passed Senate',
    'Passed',
    'Received in Senate',
    'Received in House',
    'Resolving Differences',
    'Sent to President',
    'Signed into Law',
    'Vetoed',
  ];

  return significantStatuses.includes(newStatus);
}
