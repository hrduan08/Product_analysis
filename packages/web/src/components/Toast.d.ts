type ToastProps = {
    message: string;
    type?: 'success' | 'error';
    onClose?: () => void;
};
export declare function Toast({ message, type, onClose }: ToastProps): import("react/jsx-runtime").JSX.Element;
export {};
