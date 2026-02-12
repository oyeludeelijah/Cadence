# Design System Consistency Guide

## Color System (STRICT)

### Status Colors
```javascript
SUCCESS (Completed, On Track):
- Primary: #10b981 (green)
- Light BG: #d1fae5
- Dark Text: #059669
- Darker Text: #047857

WARNING (Urgent < 24h):
- Primary: #f59e0b (orange)
- Light BG: #fef3c7
- Dark Text: #d97706
- Darker Text: #92400e

ERROR (Overdue):
- Primary: #ef4444 (red)
- Light BG: #fee2e2
- Dark Text: #dc2626
- Darker Text: #991b1b

PRIMARY (Pending, Actions):
- Primary: #3b82f6 (blue)
- Light BG: #dbeafe
- Dark: #2563eb
```

## Typography Scale

```javascript
Font Sizes:
- xs: 0.75rem (12px)   - Small labels, timestamps
- sm: 0.875rem (14px)  - Body text, descriptions
- base: 1rem (16px)    - Default text, buttons
- lg: 1.125rem (18px)  - Checkpoint titles
- xl: 1.25rem (20px)   - Section headers
- 2xl: 1.5rem (24px)   - Page titles
- 3xl: 2rem (32px)     - Main headings
- 4xl: 4rem (64px)     - Empty state icons

Font Weights:
- normal: 400  - Body text
- medium: 500  - Small buttons
- semibold: 600 - Headers, important text
- bold: 700    - Warnings, alerts
```

## Spacing Scale

```javascript
xs: 0.25rem (4px)
sm: 0.5rem (8px)
md: 0.75rem (12px)
lg: 1rem (16px)
xl: 1.5rem (24px)
2xl: 2rem (32px)
3xl: 3rem (48px)
4xl: 4rem (64px)
```

## Button Styles

### Primary Button
```javascript
{
  padding: '0.75rem 1.5rem',
  fontSize: '1rem',
  fontWeight: '600',
  color: 'white',
  backgroundColor: '#3b82f6',
  border: 'none',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  transition: 'all 0.2s'
}
Hover: backgroundColor = '#2563eb'
```

### Secondary Button
```javascript
{
  padding: '0.75rem 1.5rem',
  fontSize: '1rem',
  fontWeight: '600',
  color: 'var(--text-color)',
  backgroundColor: 'var(--glass-bg)',
  border: '1px solid var(--glass-border)',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  transition: 'all 0.2s'
}
Hover: backgroundColor = 'var(--glass-hover)'
```

### Danger Button
```javascript
{
  padding: '0.75rem 1.5rem',
  fontSize: '1rem',
  fontWeight: '600',
  color: 'white',
  backgroundColor: '#ef4444',
  border: 'none',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  transition: 'all 0.2s'
}
Hover: backgroundColor = '#dc2626'
```

### Small Button
```javascript
{
  padding: '0.5rem 1rem',
  fontSize: '0.875rem',
  fontWeight: '500'
}
```

## Status Badges

### Completed
```javascript
{
  padding: '0.25rem 0.75rem',
  borderRadius: '0.5rem',
  fontSize: '0.75rem',
  fontWeight: '600',
  backgroundColor: '#10b98120',
  color: '#10b981'
}
```

### Active/Pending
```javascript
{
  padding: '0.25rem 0.75rem',
  borderRadius: '0.5rem',
  fontSize: '0.75rem',
  fontWeight: '600',
  backgroundColor: '#3b82f620',
  color: '#3b82f6'
}
```

## Alert Banners

### Success Alert
```javascript
{
  backgroundColor: '#d1fae5',
  border: '2px solid #10b981',
  borderRadius: '0.5rem',
  padding: '0.75rem',
  color: '#059669'
}
```

### Warning Alert (Urgent)
```javascript
{
  backgroundColor: '#fef3c7',
  border: '2px solid #f59e0b',
  borderRadius: '0.5rem',
  padding: '0.75rem',
  color: '#d97706'
}
```

### Error Alert (Overdue)
```javascript
{
  backgroundColor: '#fee2e2',
  border: '2px solid #ef4444',
  borderRadius: '0.5rem',
  padding: '0.75rem',
  color: '#dc2626'
}
```

## Card Styles

### Glass Card
```javascript
{
  padding: '1.5rem',
  borderRadius: '1rem',
  backgroundColor: 'var(--glass-bg)'
}
```

### Large Glass Card
```javascript
{
  padding: '2rem',
  borderRadius: '1rem',
  backgroundColor: 'var(--glass-bg)'
}
```

## Border Radius

```javascript
sm: 0.25rem (4px)  - Small elements
md: 0.5rem (8px)   - Buttons, badges
lg: 0.75rem (12px) - Checkpoint cards
xl: 1rem (16px)    - Main cards
```

## Checkpoint Status Colors

```javascript
Completed: #10b981 (green)
Overdue: #ef4444 (red)
Urgent: #f59e0b (orange)
Pending: #3b82f6 (blue)
Current: #f59e0b (orange) - with orange background tint
```

## Usage Examples

### Status-based styling
```javascript
// Get color based on status
const getStatusColor = (status) => {
  switch(status) {
    case 'completed': return '#10b981'
    case 'overdue': return '#ef4444'
    case 'urgent': return '#f59e0b'
    case 'pending': return '#3b82f6'
    default: return '#3b82f6'
  }
}

// Get background color
const getStatusBg = (status) => {
  switch(status) {
    case 'completed': return '#d1fae5'
    case 'overdue': return '#fee2e2'
    case 'urgent': return '#fef3c7'
    default: return 'var(--glass-border)'
  }
}
```

## Key Consistency Rules

1. **All buttons** use same padding (0.75rem 1.5rem) and fontSize (1rem)
2. **All badges** use same padding (0.25rem 0.75rem) and fontSize (0.75rem)
3. **All alerts** use 2px solid border and 0.75rem padding
4. **All cards** use 1rem borderRadius
5. **Status colors** are NEVER mixed (green = success, red = error, orange = urgent, blue = pending)
6. **Font weights**: 600 for buttons/headers, 700 for alerts/warnings
7. **Transitions**: all 0.2s for interactive elements
8. **Border radius**: 0.5rem for buttons, 1rem for cards
