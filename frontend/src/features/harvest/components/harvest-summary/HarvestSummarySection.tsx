type HarvestSummarySectionProps = {
  title: string;
  description: string;
};

export function HarvestSummarySection({ title, description }: HarvestSummarySectionProps) {
  return (
    <section className="shipments-empty-state">
      <h2 className="shipments-empty-title">{title}</h2>
      <p className="shipments-empty-desc">{description}</p>
    </section>
  );
}
