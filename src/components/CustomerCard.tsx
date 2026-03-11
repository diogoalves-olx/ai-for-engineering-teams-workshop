export interface CustomerCardProps {
  customer: {
    name: string;
    email?: string;
    company: string;
    healthScore: number;
    domains?: string[];
  };
  onClick?: () => void;
}

function getHealthColor(score: number): string {
  if (score <= 30) return 'bg-red-500';
  if (score <= 70) return 'bg-yellow-400';
  return 'bg-green-500';
}

function getHealthLabel(score: number): string {
  if (score <= 30) return 'Poor';
  if (score <= 70) return 'Moderate';
  return 'Good';
}

export default function CustomerCard({ customer, onClick }: CustomerCardProps) {
  const { name, email, company, healthScore, domains } = customer;
  const badgeColor = getHealthColor(healthScore);
  const healthLabel = getHealthLabel(healthScore);
  const domainCount = domains?.length ?? 0;

  return (
    <div
      className="max-w-[400px] min-h-[120px] rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md cursor-pointer"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-gray-900">{name}</p>
          <p className="truncate text-sm font-medium text-gray-600">{company}</p>
          {email && <p className="truncate text-xs text-gray-400">{email}</p>}
        </div>
        <div className={`flex shrink-0 flex-col items-center rounded-full px-3 py-1 ${badgeColor}`}>
          <span className="text-sm font-bold text-white">{healthScore}</span>
          <span className="text-xs text-white">{healthLabel}</span>
        </div>
      </div>

      {domainCount > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          {domainCount === 1 ? (
            <p className="text-xs text-gray-500">{domains![0]}</p>
          ) : (
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-gray-500">{domainCount} domains</p>
              <ul className="space-y-0.5">
                {domains!.map((domain) => (
                  <li key={domain} className="text-xs text-gray-400">
                    {domain}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
