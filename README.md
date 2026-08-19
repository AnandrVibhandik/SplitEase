# SplitEase

A full-stack expense-splitting app (like Splitwise) with an Express/MongoDB backend and a React/Material UI frontend.

## Structure

```
splitease/
├── backend/          Express API (auth, groups, expenses, balances)
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── frontend/         React app (React Router, MUI, Axios)
    ├── public/
    ├── src/
    │   ├── components/   Navbar, PrivateRoute
    │   ├── context/      AuthContext
    │   ├── pages/        Login, Register, Dashboard, Groups, GroupDetails, Expenses, CreateExpense, Profile
    │   ├── App.js
    │   ├── index.js
    │   └── index.css
    └── package.json
```

## Backend setup

```bash
cd backend
npm install
cp .env.example .env   # fill in MONGODB_URI and JWT_SECRET
npm run dev             # nodemon, http://localhost:5000
```

## Frontend setup

```bash
cd frontend
npm install
npm start                # http://localhost:3000
```

The frontend `package.json` already proxies API calls to `http://localhost:5000`, matching the default backend port, so `axios.get('/api/...')` calls work in development without extra config.

