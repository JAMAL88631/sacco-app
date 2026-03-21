# SACCO Application - Complete Setup Guide

A fully functional SACCO (Savings and Credit Cooperative Organization) web application built with Next.js, React, Supabase, and Tailwind CSS.

## Features Implemented

✅ **User Authentication**
- Sign up with email, password, full name, and phone number
- Secure login system
- Session management

✅ **Member Dashboard**
- Welcome screen with member information
- Four main sections: Overview, Savings, Loans, and Transactions

✅ **Savings Management**
- Make deposits to savings account
- Withdraw from savings with balance validation
- View current savings balance
- Transaction history tracking

✅ **Loan Management**
- Apply for loans with amount and purpose
- View all loans with status tracking
- Make loan repayments
- Monitor repayment progress with visual indicators
- Loan statuses: pending, approved, active, completed

✅ **Dashboard Features**
- Overview tab showing savings balance, active loans, and total repaid
- Responsive design for mobile and desktop
- Real-time data updates
- Comprehensive transaction history
- Error handling and user feedback

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (free tier available at supabase.com)

## Installation & Setup

### 1. Install Dependencies

```bash
cd c:\Users\PC\Desktop\sacco-app
npm install
```

### 2. Set Up Supabase Database

Follow the instructions in `DATABASE_SETUP.md` to create the required tables:
- **members** - Store member profiles and savings
- **loans** - Track member loans
- **transactions** - Record all financial transactions

### 3. Configure Environment (Optional)

The app already has Supabase credentials configured in `lib/supabaseClient.js`. Update if needed:
- Replace Supabase URL
- Replace Supabase Anon Key

You can find these in your Supabase project settings.

### 4. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Usage Guide

### Creating an Account

1. Visit the app at `http://localhost:3000`
2. Click on the "Sign Up" tab
3. Fill in:
   - Full Name
   - Email Address
   - Phone Number
   - Password (minimum 6 characters)
4. Click "Sign Up"
5. Log in with your credentials

### Making a Deposit

1. Go to the Dashboard
2. Click on the "Savings" tab
3. Enter the amount in the "Deposit Savings" section
4. Click "Deposit"
5. The amount will be added to your savings immediately

### Withdrawing Savings

1. Go to the "Savings" tab
2. Enter the amount in the "Withdraw Savings" section
3. Click "Withdraw"
4. The system will check if you have sufficient balance
5. The withdrawal will be processed and recorded

### Applying for a Loan

1. Go to the "Loans" tab
2. Enter the loan amount
3. Select the loan purpose (Emergency, Business, Education, Medical, Housing, Other)
4. Click "Apply for Loan"
5. Your loan application will be submitted with "pending" status

### Repaying a Loan

1. Go to the "Loans" tab
2. Find your active loan
3. Click "Make Payment"
4. Enter the repayment amount
5. The repayment will be recorded and the progress bar will update

### Viewing Transaction History

1. Click on the "Transactions" tab
2. View all your deposits, withdrawals, and loan repayments
3. Each transaction shows:
   - Type (deposit, withdrawal, loan_repayment)
   - Amount
   - Date

## Project Structure

```
sacco-app/
├── lib/
│   └── supabaseClient.js      # Supabase configuration
├── pages/
│   ├── auth.js                # Login/Signup page
│   ├── index.js               # Home page (redirects to auth)
│   └── memberDashboard.js     # Main dashboard
├── app/
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # App router entry point
├── public/                    # Static assets
├── DATABASE_SETUP.md          # Database setup instructions
├── next.config.ts             # Next.js configuration
├── package.json               # Project dependencies
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## Database Schema

### Members Table
- `id` - UUID (Primary Key, references auth.users)
- `email` - Text (Unique)
- `name` - Text
- `phone_number` - Text
- `savings` - Decimal (Default: 0)
- `loans_taken` - Decimal (Default: 0)
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Loans Table
- `id` - UUID (Primary Key)
- `member_id` - UUID (Foreign Key)
- `amount` - Decimal
- `purpose` - Text
- `status` - Text (pending, approved, active, completed, rejected)
- `repaid` - Decimal (Default: 0)
- `created_at` - Timestamp
- `approved_at` - Timestamp
- `completed_at` - Timestamp

### Transactions Table
- `id` - UUID (Primary Key)
- `member_id` - UUID (Foreign Key)
- `type` - Text (deposit, withdrawal, loan_repayment, loan_disbursement)
- `amount` - Decimal
- `description` - Text
- `created_at` - Timestamp

## Available Scripts

```bash
# Development
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Troubleshooting

### Issue: "Auth session expired"
- Clear browser cookies
- Sign out and log back in
- Check Supabase auth settings

### Issue: "Table not found"
- Verify all tables were created in Supabase
- Check table names match exactly (members, loans, transactions)
- Ensure RLS policies are properly configured

### Issue: "CORS error"
- Verify Supabase URL and key are correct in supabaseClient.js
- Check that Supabase project is accessible from your domain

### Issue: "Deposit/Withdrawal not updating"
- Ensure you're connected to the internet
- Check Supabase status at status.supabase.com
- Try refreshing the page

## Security Notes

⚠️ **Important**: The Supabase keys in `lib/supabaseClient.js` are public anon keys meant for development. For production:

1. Set up proper Row Level Security (RLS) policies
2. Use environment variables for sensitive keys
3. Implement proper backend validation
4. Add rate limiting for transactions
5. Implement approval workflows for loans

## Future Enhancements

- Admin panel for loan approvals
- Interest calculation on savings
- Automated loan maturity dates
- SMS/Email notifications
- Mobile app (React Native)
- Payment gateway integration
- Advanced reporting and analytics
- Group management features
- Dividend payouts

## Support & Contributions

For issues or feature requests, please document them clearly with:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser/environment details

## License

This project is provided as-is for SACCO management purposes.

## Contact

For questions about setup or functionality, refer to the Supabase documentation at docs.supabase.com

---

**Enjoy using the SACCO Application!** 🎉
