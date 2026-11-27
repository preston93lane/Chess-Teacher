import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import { back } from '../lib/router';
import { CLASS_INFO } from '../lib/coach/explain';
export function Button({ children, variant = 'primary', size, icon, className = '', ...rest }) {
    return (_jsxs("button", { className: `btn btn-${variant}${size ? ` btn-${size}` : ''} ${className}`, ...rest, children: [icon, children && _jsx("span", { children: children })] }));
}
export function IconButton({ label, children, className = '', ...rest }) {
    return (_jsx("button", { className: `icon-btn ${className}`, "aria-label": label, title: label, ...rest, children: children }));
}
export function Header({ title, backTo, actions, sub, }) {
    return (_jsxs("header", { className: "page-header", children: [backTo && (_jsx(IconButton, { label: "Back", onClick: () => back(typeof backTo === 'string' ? backTo : '/'), className: "back-btn", children: _jsx(ChevronLeft, { size: 22 }) })), _jsxs("div", { className: "page-header-title", children: [_jsx("h1", { children: title }), sub && _jsx("p", { className: "page-header-sub", children: sub })] }), actions && _jsx("div", { className: "page-header-actions", children: actions })] }));
}
export function Sheet({ open, onClose, title, children, wide, }) {
    useEffect(() => {
        if (!open)
            return;
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    if (!open)
        return null;
    // Portal to <body>: the scrolling main area is its own stacking context,
    // and a sheet must cover the tab bar.
    return createPortal(_jsx("div", { className: "sheet-backdrop", onClick: onClose, children: _jsxs("div", { className: `sheet${wide ? ' sheet-wide' : ''}`, onClick: (e) => e.stopPropagation(), role: "dialog", "aria-modal": true, children: [_jsxs("div", { className: "sheet-head", children: [title && _jsx("h2", { children: title }), _jsx(IconButton, { label: "Close", onClick: onClose, children: _jsx(X, { size: 20 }) })] }), _jsx("div", { className: "sheet-body", children: children })] }) }), document.body);
}
export function Segmented({ value, options, onChange, label, }) {
    return (_jsx("div", { className: "segmented", role: "radiogroup", "aria-label": label, children: options.map((o) => (_jsx("button", { role: "radio", "aria-checked": o.value === value, className: o.value === value ? 'is-on' : '', onClick: () => onChange(o.value), children: o.label }, o.value))) }));
}
export function Toggle({ checked, onChange, label, hint }) {
    return (_jsxs("label", { className: "toggle-row", children: [_jsxs("span", { children: [_jsx("span", { className: "toggle-label", children: label }), hint && _jsx("span", { className: "toggle-hint", children: hint })] }), _jsx("input", { type: "checkbox", className: "toggle", checked: checked, onChange: (e) => onChange(e.target.checked) })] }));
}
export function Glyph({ cls, size = 'md' }) {
    const info = CLASS_INFO[cls];
    return (_jsx("span", { className: `glyph glyph-${size} tone-${info.tone}`, "aria-label": info.label, title: info.label, children: info.glyph }));
}
export function Meter({ value, max = 100, tone }) {
    return (_jsx("div", { className: "meter", role: "progressbar", "aria-valuenow": value, "aria-valuemax": max, children: _jsx("div", { className: `meter-fill${tone ? ` tone-bg-${tone}` : ''}`, style: { width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` } }) }));
}
export function Empty({ title, children, action }) {
    return (_jsxs("div", { className: "empty", children: [_jsx("h3", { children: title }), children && _jsx("p", { children: children }), action] }));
}
export function Spinner({ label }) {
    return (_jsxs("span", { className: "spinner-wrap", role: "status", children: [_jsx("span", { className: "spinner" }), label && _jsx("span", { children: label })] }));
}
export function Section({ title, action, children, className = '' }) {
    return (_jsxs("section", { className: `section ${className}`, children: [(title || action) && (_jsxs("div", { className: "section-head", children: [title && _jsx("h2", { children: title }), action] })), children] }));
}
/**
 * The "next" action once a task is done: pinned above the tab bar on the
 * right, in the thumb zone, so it is reachable without scrolling past the
 * explanation.
 */
export function NextDock({ children }) {
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "next-dock-spacer", "aria-hidden": true }), createPortal(_jsx("div", { className: "next-dock", children: children }), document.body)] }));
}
