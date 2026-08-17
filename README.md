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

## Notes on this organization

- `backend/server.js` and both `package.json` files, `App.js`, `AuthContext.js`, `PrivateRoute.js`, and `index.js`/`index.css` are exactly what you provided, just placed into a standard project layout.
- `Navbar.js` was cut off partway through in what you sent (mid-`AppBar`) — I completed it in the same style (links to Dashboard/Groups/Expenses, avatar menu with Profile/Logout) so the app compiles.
- `App.js` imports eight pages (`Login`, `Register`, `Dashboard`, `Groups`, `GroupDetails`, `Expenses`, `CreateExpense`, `Profile`) that weren't included in your upload. I added working versions of each, wired to the backend routes in `server.js`, so the project actually builds and runs end-to-end rather than crashing on missing imports. Feel free to replace any of them with your own versions.
- Added `public/index.html` (required by `react-scripts`, not included in your files) and `.env.example` / `.gitignore` for both apps.
