import { Metric } from "@kinetixui/ui";
import { DollarSign, TrendingDown, Users } from "lucide-react";

// kx-block:start
export function StatCardsBlock() {
  return (
    <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Metric label="Revenue" value="$45,231" trend="up" change="12.5%" icon={<DollarSign />} />
      <Metric label="Active users" value="2,420" trend="up" change="8.1%" icon={<Users />} />
      <Metric label="Churn" value="1.2%" trend="down" change="0.3%" icon={<TrendingDown />} />
    </div>
  );
}
// kx-block:end
