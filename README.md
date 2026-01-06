# Roomate

A roommate coordination app to help you and your roommates manage shared living expenses, shopping lists, calendar events, and household goals.

## Features

### Expense Management
- Track shared expenses with flexible splitting (even or manual)
- Automatic balance calculations showing who owes what
- Settle up with payment proof attachments (receipts/screenshots)
- Settlement history with proof viewing
- Forgive debts or net mutual balances

### Spending Insights
- Pie chart breakdown by category
- Monthly spending trends
- Filter by week, month, year, or all time

### Shopping Lists
- Multiple shopping lists per household
- Quick add with natural language parsing
- Swipe gestures: left to delete, right to complete
- Shared or personal items

### Calendar
- Interactive monthly calendar with event dots
- Tap dates to view/add events
- Event types: bills, cleaning, social, meals, meetings, etc.
- View upcoming, past, or all events

### Goals Board
- Create and track household goals
- Status tracking: idea → planned → in progress → done
- Upvote goals to prioritize

### Household Management
- Create or join households with invite codes
- Manage multiple households
- Member avatars and profiles

## Tech Stack

- **Mobile**: React Native (Expo) + TypeScript
- **Backend**: Node.js + Express + TypeScript + MongoDB
- **Authentication**: JWT with email verification (OTP)
