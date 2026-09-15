export default function StatCard({ title, count, icon: Icon, color, description }) {
  return (
    <section className={`card stat-card ${color}`}>
      <div>
        <span className="stat-title">{title}</span>
        <div className="stat-value">
          {count.toLocaleString('ko-KR')}
          <span>건</span>
        </div>
        <p>{description}</p>
      </div>
      <div className="stat-icon">
        <Icon size={22} />
      </div>
    </section>
  );
}
