# M-Pesa Inspired UI Components

A collection of shadcn-style components built with React, Next.js, TailwindCSS, and Lucide Icons to create an M-Pesa inspired mobile banking interface.

## Components

### 1. BalanceCard Component
Displays the user's account balance with a gradient green background, eye toggle for hiding/showing balance, and quick stats.

**Location:** `components/BalanceCard.js`

**Props:**
- `balance` (number): The account balance to display. Default: `45250.50`
- `userName` (string): The user's name to display. Default: `"John Doe"`

**Features:**
- Toggle balance visibility with eye icon
- Gradient background with decorative elements
- Quick stats showing Total Savings, Active Loans, and Next Interest
- Responsive design

**Usage:**
```jsx
import BalanceCard from '../components/BalanceCard';

<BalanceCard balance={45250.50} userName="Sarah Opondo" />
```

---

### 2. ActionButtons Component
A grid of 4 action buttons for quick access to common transactions: Send Money, Withdraw, Deposit, and Pay Bill.

**Location:** `components/ActionButtons.js`

**Props:**
- `onActionClick` (function): Callback function triggered when an action button is clicked. Receives the action id as parameter.

**Features:**
- 4-button grid layout (2x2)
- Hover effects and animations
- Icon and description for each action
- Recent transaction preview at the bottom
- Responsive design

**Usage:**
```jsx
import ActionButtons from '../components/ActionButtons';

const handleActionClick = (action) => {
  console.log('Action clicked:', action);
  // Handle: 'send', 'withdraw', 'deposit', 'pay'
};

<ActionButtons onActionClick={handleActionClick} />
```

---

### 3. BottomNavigation Component
A fixed bottom navigation bar with 4 main navigation items (Home, Send, Savings, Settings) and a collapsible "More" menu.

**Location:** `components/BottomNavigation.js`

**Props:**
- `activeTab` (string): The currently active tab. Default: `'home'`
- `onTabChange` (function): Callback function triggered when a tab changes. Receives the tab id.

**Features:**
- Fixed bottom position that doesn't interfere with scrollable content
- Active state indicator with green highlight
- Dropdown "More" menu with additional options
- Smooth transitions and hover effects
- Mobile-friendly spacing

**Usage:**
```jsx
import BottomNavigation from '../components/BottomNavigation';

const [activeTab, setActiveTab] = useState('home');

const handleTabChange = (tab) => {
  setActiveTab(tab);
  // Navigate to tab: 'home', 'send', 'savings', 'settings'
};

<BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
```

---

## Complete Example

A full working example was previously available in a dedicated demo page, but that legacy demo route has been removed from the app:

```jsx
import BalanceCard from '../components/BalanceCard';
import ActionButtons from '../components/ActionButtons';
import BottomNavigation from '../components/BottomNavigation';

export default function MPesaDashboard() {
  const [activeTab, setActiveTab] = useState('home');
  const [balance, setBalance] = useState(45250.50);

  const handleActionClick = (action) => {
    switch (action) {
      case 'send':
        // Handle send money
        break;
      case 'withdraw':
        // Handle withdrawal
        break;
      case 'deposit':
        // Handle deposit
        break;
      case 'pay':
        // Handle bill payment
        break;
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        {/* Header content */}
      </header>

      <main>
        <BalanceCard balance={balance} userName="Sarah Opondo" />
        <ActionButtons onActionClick={handleActionClick} />
        {/* More content */}
      </main>

      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
```

## Accessing the Demo

Use the active dashboard routes in the app instead of the removed `mpesa-dashboard` demo page.

## Styling & Customization

All components use TailwindCSS for styling and follow shadcn design principles:

- **Colors:** Green (#10b981) as primary, with supporting colors for actions
- **Typography:** Bold headers with hierarchical text sizing
- **Spacing:** Consistent padding and margins following TailwindCSS scale
- **Animations:** Smooth transitions for all interactive elements
- **Icons:** Lucide React icons for consistent iconography

### Color Schema
- Primary: Green (Sacco/M-Pesa brand)
- Actions: Blue (Send), Orange (Withdraw), Green (Deposit), Purple (Pay)
- Neutral: Slate variations for backgrounds and text

## Dependencies

- React 19.2.3
- Next.js 16.1.7
- TailwindCSS 4.2.2
- Lucide React (for icons)

## Installation

The components are ready to use. Ensure all dependencies are installed:

```bash
npm install lucide-react
```

## Notes

- The BottomNavigation component automatically adds bottom padding to the page to prevent content from being hidden
- The BalanceCard includes an eye toggle for privacy
- All components are fully responsive and mobile-optimized
- The ActionButtons component accepts action callbacks for custom behaviors
- Components follow accessibility best practices with proper ARIA labels and keyboard support
