import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function AuthLayout({ title, subtitle, children, footer }) {
    return (_jsx("div", { className: "auth-page", children: _jsxs("div", { className: "auth-card", children: [_jsxs("header", { className: "auth-card__header", children: [_jsx("h1", { className: "auth-card__title", children: title }), subtitle ? _jsx("p", { className: "auth-card__subtitle", children: subtitle }) : null] }), _jsx("div", { className: "auth-card__body", children: children }), footer ? _jsx("footer", { className: "auth-card__footer", children: footer }) : null] }) }));
}
