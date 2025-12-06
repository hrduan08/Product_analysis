export function LoadingSkeleton() {
  return (
    <div className="skeleton-list">
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="skeleton-card" key={index}>
          <div className="skeleton-thumb shimmer" />
          <div className="skeleton-body">
            <div className="skeleton-line skeleton-line--lg shimmer" />
            <div className="skeleton-line shimmer" />
            <div className="skeleton-line shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}
