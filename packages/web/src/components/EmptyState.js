import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function EmptyState({ title, description, actionText, onAction }) {
    return (_jsxs("div", { className: "empty-state", children: [_jsx("h3", { children: title }), description ? _jsx("p", { children: description }) : null, actionText && onAction ? (_jsx("button", { type: "button", className: "ghost-button", onClick: onAction, children: actionText })) : null] }));
}
