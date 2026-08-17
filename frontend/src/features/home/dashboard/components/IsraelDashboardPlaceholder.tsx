type IsraelDashboardPlaceholderProps = {
  lang: 'he' | 'en';
};

export function IsraelDashboardPlaceholder({ lang }: IsraelDashboardPlaceholderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <span style={{ fontSize: '4rem', fontWeight: 'bold' }}>
        {lang === 'he' ? 'בקרוב...' : 'Coming soon...'}
      </span>
    </div>
  );
}
