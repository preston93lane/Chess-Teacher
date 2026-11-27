import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
const listeners = new Set();
let timer;
export function toast(msg, ms = 2600) {
    listeners.forEach((l) => l(msg));
    clearTimeout(timer);
    timer = setTimeout(() => listeners.forEach((l) => l(null)), ms);
}
export function Toaster() {
    const [msg, setMsg] = useState(null);
    useEffect(() => {
        listeners.add(setMsg);
        return () => {
            listeners.delete(setMsg);
        };
    }, []);
    if (!msg)
        return null;
    return (_jsx("div", { className: "toast", role: "status", children: msg }));
}
