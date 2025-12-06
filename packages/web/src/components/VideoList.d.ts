import type { FeedbackItem } from '../types/feedback';
type VideoListProps = {
    items: FeedbackItem[];
    onCopyLink: (url: string) => void;
};
export declare function VideoList({ items, onCopyLink }: VideoListProps): import("react/jsx-runtime").JSX.Element | null;
export {};
