# Theme

## Compact Token Summary

- Product feel: warm, low-pressure, soft glass surfaces, mobile-first calm.
- Current risk: desktop is visually a phone-width app because `.app-shell` is capped at `393px`.
- Font stack: `ui-sans-serif`, `SF Pro Text`, `PingFang SC`, `Hiragino Sans GB`, `system-ui`, `sans-serif`.
- Base body sizes: `16px`; secondary `15px`; metadata `13px`; tabs `15px`.
- Touch target: `44px`.
- Core colors:
  - `--cream`: `#fff8f3`
  - `--peach-50`: `#fff5ed`
  - `--coral`: `#e88b6a`
  - `--coral-soft`: `rgba(232, 139, 106, 0.22)`
  - `--amber-glow`: `#f4c975`
  - `--text`: `#3a2f2c`
  - `--text-muted`: `#7d6e68`
  - `--stroke-glass`: `rgba(255, 255, 255, 0.55)`
  - `--surface-glass`: `rgba(255, 255, 255, 0.42)`
  - `--surface-glass-strong`: `rgba(255, 255, 255, 0.68)`
  - `--surface-input`: `rgba(255, 253, 248, 0.74)`
  - `--warm-line`: `rgba(255, 255, 255, 0.78)`
- Radius:
  - large: `20px`
  - medium: `14px`
  - desktop shell currently: `34px`
- Shadows:
  - soft: `0 18px 48px rgba(212, 140, 100, 0.18)`
  - low: `0 10px 28px rgba(212, 140, 100, 0.11)`
- Breakpoints:
  - mobile-specific: `max-width: 759px`
  - desktop-specific: `min-width: 760px`

## Design Direction For Next Drafts

- Desktop should become a true responsive web app surface, not a centered 393px mobile frame.
- Mobile should keep a native single-column 390px rhythm.
- Preserve the warm restrained tone and the core copy: `先不用想清楚`, `也许可以先看这个`, `其他想法都还在`, `帮我捋一捋`.
- Avoid card-heavy dashboards and pressure language.

## Raw CSS Token Source

```css
:root {
  color-scheme: light;
  --cream: #fff8f3;
  --peach-50: #fff5ed;
  --coral: #e88b6a;
  --coral-soft: rgba(232, 139, 106, 0.22);
  --amber-glow: #f4c975;
  --text: #3a2f2c;
  --text-muted: #7d6e68;
  --stroke-glass: rgba(255, 255, 255, 0.55);
  --shadow-soft: 0 18px 48px rgba(212, 140, 100, 0.18);
  --radius-lg: 20px;
  --radius-md: 14px;
  --blur: 18px;
  --font: ui-sans-serif, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", system-ui, sans-serif;
  --mini-fs-body: 16px;
  --mini-fs-secondary: 15px;
  --mini-fs-meta: 13px;
  --mini-fs-tab: 15px;
  --mini-tap-min: 44px;
  --surface-glass: rgba(255, 255, 255, 0.42);
  --surface-glass-strong: rgba(255, 255, 255, 0.68);
  --surface-input: rgba(255, 253, 248, 0.74);
  --warm-line: rgba(255, 255, 255, 0.78);
  --warm-shadow-low: 0 10px 28px rgba(212, 140, 100, 0.11);
}
```

