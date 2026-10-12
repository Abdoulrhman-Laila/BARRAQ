import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";

type MetricTone = "purple" | "green" | "blue" | "pink" | "gold" | "red";
type MetricIcon = "users" | "file" | "quiz" | "spark" | "credit" | "support";

export function MetricCard({
  title,
  value,
  detail,
  icon,
  tone
}: {
  title: string;
  value: number | string;
  detail: string;
  icon: MetricIcon;
  tone: MetricTone;
}) {
  return (
    <Card className={`metric-card metric-card--${tone}`} interactive>
      <div className="metric-card__icon">
        <Icon name={icon} />
      </div>
      <div>
        <span>{title}</span>
        <strong>{typeof value === "number" ? value.toLocaleString("ar-SY") : value}</strong>
        <small>{detail}</small>
      </div>
    </Card>
  );
}
