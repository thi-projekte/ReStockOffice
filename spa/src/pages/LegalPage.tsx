type LegalPageProps = {
  title: string;
};

export function LegalPage({ title }: LegalPageProps) {
  return (
    <section className="page-card legal-page">
      <span className="eyebrow">ReStockOffice</span>
      <h1>{title}</h1>
      <div className="legal-page__body" />
    </section>
  );
}
