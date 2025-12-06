type EmptyStateProps = {
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionText, onAction }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {actionText && onAction ? (
        <button type="button" className="ghost-button" onClick={onAction}>
          {actionText}
        </button>
      ) : null}
    </div>
  );
}
