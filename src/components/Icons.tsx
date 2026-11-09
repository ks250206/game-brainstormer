import { ICONS } from '../core/icons.ts';
export function Icon({ name, className = '' }: {
    name: string;
    className?: string;
}) { return <svg viewBox="0 0 24 24" className={`icon ${className}`} aria-hidden="true"><path d={ICONS[name] ?? ICONS.spark}/></svg>; }
