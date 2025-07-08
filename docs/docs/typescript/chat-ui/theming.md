---
sidebar_position: 3
---

# Theming Guide

Learn how to customize the appearance of @pressw/chat-ui components to match your brand.

## Theme Structure

The theme object controls all visual aspects of the chat components:

```tsx
interface ChatTheme {
  colors: ColorPalette;
  typography: Typography;
  spacing: SpacingScale;
  borderRadius: BorderRadius;
  shadows: Shadows;
  transitions: Transitions;
  breakpoints: Breakpoints;
}
```

## Default Theme

The default theme provides a clean, modern appearance:

```tsx
const defaultTheme: ChatTheme = {
  colors: {
    primary: '#0066CC',
    primaryDark: '#0052A3',
    primaryLight: '#3385D6',
    secondary: '#6C757D',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    text: '#212529',
    textSecondary: '#6C757D',
    textInverse: '#FFFFFF',
    border: '#DEE2E6',
    error: '#DC3545',
    warning: '#FFC107',
    success: '#28A745',
    info: '#17A2B8',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    base: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
  transitions: {
    fast: '150ms ease-in-out',
    base: '250ms ease-in-out',
    slow: '350ms ease-in-out',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
};
```

## Applying a Theme

### Using ChatProvider

Wrap your application with `ChatProvider` and pass your theme:

```tsx
import { ChatProvider } from '@pressw/chat-ui';
import { customTheme } from './theme';

function App() {
  return (
    <ChatProvider theme={customTheme}>
      <YourChatApp />
    </ChatProvider>
  );
}
```

### Partial Theme Override

You can override specific parts of the default theme:

```tsx
import { defaultTheme, ChatProvider } from '@pressw/chat-ui';

const customTheme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    primary: '#FF6B6B',
    primaryDark: '#FF5252',
    primaryLight: '#FF8787',
  },
};
```

## Color Schemes

### Light Theme

```tsx
const lightTheme = {
  colors: {
    primary: '#0066CC',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    text: '#212529',
    textSecondary: '#6C757D',
    border: '#DEE2E6',
    // Message bubbles
    messageBg: '#F0F2F5',
    messageCurrentBg: '#0066CC',
    messageText: '#212529',
    messageCurrentText: '#FFFFFF',
  },
};
```

### Dark Theme

```tsx
const darkTheme = {
  colors: {
    primary: '#4A9EFF',
    background: '#121212',
    surface: '#1E1E1E',
    text: '#E0E0E0',
    textSecondary: '#A0A0A0',
    border: '#2D2D2D',
    // Message bubbles
    messageBg: '#2D2D2D',
    messageCurrentBg: '#4A9EFF',
    messageText: '#E0E0E0',
    messageCurrentText: '#FFFFFF',
  },
};
```

### Theme Toggle

Implement theme switching:

```tsx
function ThemedApp() {
  const [isDark, setIsDark] = useState(false);
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ChatProvider theme={theme}>
      <button onClick={() => setIsDark(!isDark)}>{isDark ? '☀️' : '🌙'}</button>
      <ChatWindow />
    </ChatProvider>
  );
}
```

## Component-Specific Styling

### Message Styling

Customize message appearance:

```tsx
const messageTheme = {
  colors: {
    // Sent messages
    messageCurrentBg: '#007AFF',
    messageCurrentText: '#FFFFFF',
    // Received messages
    messageBg: '#E5E5EA',
    messageText: '#000000',
    // System messages
    systemBg: 'transparent',
    systemText: '#8E8E93',
  },
  borderRadius: {
    message: '18px',
    messageFirst: '18px 18px 18px 4px',
    messageLast: '4px 18px 18px 18px',
    messageCurrentFirst: '18px 18px 4px 18px',
    messageCurrentLast: '18px 4px 18px 18px',
  },
};
```

### Input Styling

Customize the message input:

```tsx
const inputTheme = {
  colors: {
    inputBg: '#FFFFFF',
    inputBorder: '#E0E0E0',
    inputText: '#212529',
    inputPlaceholder: '#9E9E9E',
    inputFocus: '#0066CC',
  },
  borderRadius: {
    input: '24px',
  },
  spacing: {
    inputPadding: '12px 20px',
  },
};
```

## CSS Variables

For fine-grained control, use CSS variables:

```css
.chat-container {
  /* Colors */
  --chat-color-primary: #0066cc;
  --chat-color-primary-hover: #0052a3;
  --chat-color-background: #ffffff;
  --chat-color-surface: #f8f9fa;
  --chat-color-text: #212529;
  --chat-color-text-secondary: #6c757d;

  /* Typography */
  --chat-font-family: system-ui, -apple-system, sans-serif;
  --chat-font-size-base: 16px;
  --chat-line-height: 1.5;

  /* Spacing */
  --chat-spacing-xs: 0.25rem;
  --chat-spacing-sm: 0.5rem;
  --chat-spacing-md: 1rem;
  --chat-spacing-lg: 1.5rem;

  /* Border radius */
  --chat-radius-sm: 4px;
  --chat-radius-md: 8px;
  --chat-radius-lg: 16px;
  --chat-radius-message: 18px;

  /* Shadows */
  --chat-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --chat-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

## Responsive Theming

Adjust theme based on screen size:

```tsx
const responsiveTheme = {
  ...defaultTheme,
  spacing: {
    xs: 'clamp(0.125rem, 1vw, 0.25rem)',
    sm: 'clamp(0.25rem, 2vw, 0.5rem)',
    md: 'clamp(0.5rem, 3vw, 1rem)',
    lg: 'clamp(0.75rem, 4vw, 1.5rem)',
  },
  typography: {
    ...defaultTheme.typography,
    fontSize: {
      base: 'clamp(14px, 2vw, 16px)',
      lg: 'clamp(16px, 2.5vw, 18px)',
    },
  },
};
```

## Accessibility Themes

### High Contrast

```tsx
const highContrastTheme = {
  colors: {
    primary: '#0050EF',
    background: '#FFFFFF',
    text: '#000000',
    border: '#000000',
    messageBg: '#F0F0F0',
    messageCurrentBg: '#0050EF',
    messageText: '#000000',
    messageCurrentText: '#FFFFFF',
  },
};
```

### Color Blind Friendly

```tsx
const colorBlindTheme = {
  colors: {
    primary: '#0072B2',
    secondary: '#E69F00',
    success: '#009E73',
    error: '#CC79A7',
    warning: '#F0E442',
    info: '#56B4E9',
  },
};
```

## Theme Utilities

### Theme Hook

Access theme values in components:

```tsx
import { useChatTheme } from '@pressw/chat-ui';

function CustomComponent() {
  const theme = useChatTheme();

  return (
    <div
      style={{
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
      }}
    >
      Custom content
    </div>
  );
}
```

### Theme Helper Functions

```tsx
import { lighten, darken, alpha } from '@pressw/chat-ui/utils';

const customColors = {
  primary: '#0066CC',
  primaryLight: lighten('#0066CC', 0.2),
  primaryDark: darken('#0066CC', 0.2),
  primaryAlpha: alpha('#0066CC', 0.1),
};
```

## Examples

### Slack-like Theme

```tsx
const slackTheme = {
  colors: {
    primary: '#611F69',
    background: '#FFFFFF',
    surface: '#F8F8F8',
    messageBg: 'transparent',
    messageCurrentBg: 'transparent',
    border: '#E8E8E8',
  },
  borderRadius: {
    message: '6px',
  },
  typography: {
    fontFamily: 'Slack-Lato, sans-serif',
  },
};
```

### WhatsApp-like Theme

```tsx
const whatsappTheme = {
  colors: {
    primary: '#25D366',
    background: '#E5DDD5',
    messageBg: '#FFFFFF',
    messageCurrentBg: '#DCF8C6',
  },
  borderRadius: {
    message: '7.5px',
  },
};
```

### Discord-like Theme

```tsx
const discordTheme = {
  colors: {
    primary: '#5865F2',
    background: '#36393F',
    surface: '#2F3136',
    text: '#DCDDDE',
    messageBg: 'transparent',
    messageHoverBg: '#32353B',
  },
  borderRadius: {
    message: '3px',
  },
};
```

## Best Practices

1. **Consistency**: Use theme values consistently throughout your app
2. **Accessibility**: Ensure sufficient color contrast (WCAG AA minimum)
3. **Performance**: Avoid excessive CSS variable updates
4. **Responsiveness**: Test themes on different screen sizes
5. **User Preference**: Respect system theme preferences

```tsx
// Detect system theme preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const theme = prefersDark ? darkTheme : lightTheme;
```
