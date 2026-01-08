import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { MarketingFooter } from '../components/MarketingFooter';
import { MarketingNav } from '../components/MarketingNav';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
const COPY = {
    zh: {
        heroTitle: ['让用户真实声音', '驱动你的产品决策'],
        heroSubtitle: ['持续分析 YouTube / Reddit 等平台的用户源声', '帮你第一时间了解用户真实需求，并做出正确的产品决策'],
        heroHighlights: ['多渠道用户源声分析', '自定义你关注的内容', '实时消息通知', 'AI 智能分析'],
        cta: '开始免费试用',
        featuresHeading: '如何帮助你做产品决策',
        featuresSub: '持续追踪主流社媒平台的热门用户源声，智能分析并提炼用户评价和需求，第一时间为您提供用户洞察分析。',
        features: [
            {
                title: '多渠道用户源声分析',
                desc: '涵盖YouTube / Reddit等主流社媒平台的用户评价、吐槽、讨论、产品测评分析。',
                iconType: 'social'
            },
            {
                title: '自定义您关注的内容',
                desc: '支持自定义您想分析的社媒平台、关键词、定时分析时间。',
                iconType: 'custom'
            },
            {
                title: '实时消息通知',
                desc: '通过Lark、Slack、飞书、企微、钉钉等平台实时通知用户源声分析结果。',
                iconType: 'notify'
            },
            {
                title: 'AI智能分析',
                desc: '通过AI 智能分析用户需求和改进点，节省人工逐条分析的时间。',
                iconType: 'ai'
            }
        ]
    },
    en: {
        heroTitle: ['Let real user voices', 'guide your product decisions'],
        heroSubtitle: ['Continuously analyze user conversations on YouTube / Reddit and more', 'See real needs first and make the right product decisions faster'],
        heroHighlights: ['Multi-channel user insights', 'Customize what you track', 'Real-time notifications', 'AI-powered analysis'],
        cta: 'Start free trial',
        featuresHeading: 'How we help you make product decisions',
        featuresSub: 'Track trending user feedback across major social platforms, analyze and summarize it with AI, and deliver user insights instantly.',
        features: [
            {
                title: 'Multi-channel user insights',
                desc: 'Cover YouTube / Reddit and other major platforms to aggregate reviews, pain points, and product evaluations.',
                iconType: 'social'
            },
            {
                title: 'Customize what you track',
                desc: 'Pick platforms, keywords, and daily schedules to fit your workflow.',
                iconType: 'custom'
            },
            {
                title: 'Real-time notifications',
                desc: 'Send fresh insights to Lark, Slack, Feishu, WeCom, DingTalk and more.',
                iconType: 'notify'
            },
            {
                title: 'AI-powered analysis',
                desc: 'Let AI extract user needs and improvement ideas, saving you from manual review.',
                iconType: 'ai'
            }
        ]
    }
};
export function LandingPage() {
    const { user } = useAuth();
    const { lang } = useLanguage();
    const navigate = useNavigate();
    const handleStartTrial = () => {
        if (user) {
            navigate('/app');
            return;
        }
        navigate('/register');
    };
    return (_jsxs(_Fragment, { children: [_jsx(MarketingNav, {}), _jsxs("main", { className: "st-page", children: [_jsx("section", { className: "st-hero", children: _jsxs("div", { className: "st-shell st-hero__grid", children: [_jsxs("div", { className: "st-hero__content", children: [_jsxs("h1", { children: [COPY[lang].heroTitle[0], _jsx("br", {}), COPY[lang].heroTitle[1]] }), _jsxs("p", { className: "st-hero__subtitle", children: [COPY[lang].heroSubtitle[0], _jsx("br", {}), COPY[lang].heroSubtitle[1]] }), _jsx("ul", { className: "st-hero__highlights st-hero__highlights--grid", children: COPY[lang].heroHighlights.map((item) => (_jsxs("li", { children: [_jsx("span", { className: "st-check", "aria-hidden": "true", children: "\u2713" }), item] }, item))) }), _jsx("div", { className: "st-actions st-actions--spaced", children: _jsx("button", { type: "button", className: "btn primary", onClick: handleStartTrial, children: COPY[lang].cta }) })] }), _jsx("div", { className: "st-hero__visual", children: _jsx("div", { className: "st-hero__image", children: _jsx("img", { src: "/assets/hero.jpg", alt: "\u4EA7\u54C1\u793A\u610F\u56FE", loading: "lazy" }) }) })] }) }), _jsxs("section", { className: "st-section", id: "features", children: [_jsxs("div", { className: "st-shell st-section__header", children: [_jsx("h2", { children: COPY[lang].featuresHeading }), _jsx("p", { className: "st-section__sub", children: COPY[lang].featuresSub })] }), _jsx("div", { className: "st-shell st-feature-grid", children: COPY[lang].features.map((feature) => (_jsxs("article", { className: "st-feature-card", children: [_jsxs("div", { className: "st-feature-card__body", children: [_jsx("h3", { children: feature.title }), _jsx("p", { className: "st-feature-desc", children: feature.desc })] }), _jsxs("div", { className: "st-feature-card__icon", children: [feature.iconType === 'social' ? (_jsxs("div", { className: "st-media-logos st-media-logos--row st-media-logos--tight", children: [_jsx("span", { className: "st-media-logo", children: _jsxs("svg", { width: "42", height: "30", viewBox: "0 0 56 40", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [_jsx("path", { d: "M53.18 6.27c-.62-2.32-2.45-4.15-4.77-4.77C45.09 1 28 1 28 1S10.91 1 7.59 1.5C5.27 2.12 3.44 3.95 2.82 6.27 2 9.59 2 20 2 20s0 10.41.82 13.73c.62 2.32 2.45 4.15 4.77 4.77C10.91 38.99 28 38.99 28 38.99s17.09 0 20.41-.82c2.32-.62 4.15-2.45 4.77-4.77C54 30.41 54 20 54 20s0-10.41-.82-13.73Z", fill: "#FF0000" }), _jsx("path", { d: "M22 28V12l12 8-12 8Z", fill: "white" })] }) }), _jsx("span", { className: "st-media-logo", children: _jsx("img", { src: "/assets/logos/reddit.png", alt: "Reddit", loading: "lazy" }) })] })) : null, feature.iconType === 'custom' ? (_jsx("div", { className: "st-media-placeholder", children: _jsx("img", { src: "/assets/logos/customize.png", alt: "\u81EA\u5B9A\u4E49\u914D\u7F6E\u793A\u610F\u56FE", loading: "lazy" }) })) : null, feature.iconType === 'notify' ? (_jsx("div", { className: "st-media-logos st-media-logos--grid2", children: [
                                                        { src: '/assets/logos/lark.png', alt: 'Lark' },
                                                        { src: '/assets/logos/slark.png', alt: 'Slack' },
                                                        { src: '/assets/logos/qywx.png', alt: '企微' },
                                                        { src: '/assets/logos/dingding.png', alt: '钉钉' }
                                                    ].map((item) => (_jsx("span", { className: "st-media-logo st-media-logo--tile", children: _jsx("img", { src: item.src, alt: item.alt, loading: "lazy" }) }, item.alt))) })) : null, feature.iconType === 'ai' ? (_jsx("div", { className: "st-media-placeholder", children: _jsx("img", { src: "/assets/logos/ai.png", alt: "AI \u5206\u6790\u793A\u610F", loading: "lazy" }) })) : null] })] }, feature.title))) })] })] }), _jsx(MarketingFooter, {})] }));
}
