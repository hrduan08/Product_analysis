import type { ReactNode } from 'react';
type Props = {
    title: string;
    subtitle?: string;
    children: ReactNode;
    footer?: ReactNode;
};
export declare function AuthLayout({ title, subtitle, children, footer }: Props): import("react/jsx-runtime").JSX.Element;
export {};
