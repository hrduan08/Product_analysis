import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Toast({ message, type = 'success', onClose }) {
    return (_jsxs("div", { className: `toast toast--${type}`, role: "status", children: [_jsx("span", { children: message }), onClose ? (_jsx("button", { type: "button", className: "toast__close", onClick: onClose, "aria-label": "\u5173\u95ED\u63D0\u793A", children: "\u00D7" })) : null] }));
}
