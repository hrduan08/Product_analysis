import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function LoadingSkeleton() {
    return (_jsx("div", { className: "skeleton-list", children: Array.from({ length: 3 }).map((_, index) => (_jsxs("div", { className: "skeleton-card", children: [_jsx("div", { className: "skeleton-thumb shimmer" }), _jsxs("div", { className: "skeleton-body", children: [_jsx("div", { className: "skeleton-line skeleton-line--lg shimmer" }), _jsx("div", { className: "skeleton-line shimmer" }), _jsx("div", { className: "skeleton-line shimmer" })] })] }, index))) }));
}
