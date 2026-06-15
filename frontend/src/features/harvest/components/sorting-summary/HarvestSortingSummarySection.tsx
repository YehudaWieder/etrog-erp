type HarvestSortingSummarySectionProps = {
  lang: 'he' | 'en';
  title: string;
  description: string;
};

export function HarvestSortingSummarySection({ title, description }: HarvestSortingSummarySectionProps) {
  return (
    <section className="shipments-empty-state">
      <h2 className="shipments-empty-title">{title}</h2>
      <p className="shipments-empty-desc">{description}</p>
    </section>
  );
}
