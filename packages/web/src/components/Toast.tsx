type ToastProps = {
  message: string;
  type?: 'success' | 'error';
  onClose?: () => void;
};

export function Toast({ message, type = 'success', onClose }: ToastProps) {
  return (
    <div className={`toast toast--${type}`} role="status">
      <span>{message}</span>
      {onClose ? (
        <button type="button" className="toast__close" onClick={onClose} aria-label="关闭提示">
          ×
        </button>
      ) : null}
    </div>
  );
}
