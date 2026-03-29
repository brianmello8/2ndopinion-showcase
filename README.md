# 2ndopinion-showcase

A realistic Express.js API used to demonstrate [2ndOpinion](https://www.get2ndopinion.dev/) multi-model consensus code review.

This repo represents a typical production Node.js service: auth middleware, PostgreSQL via connection pool, async order processing, and credit balance management. It's used weekly to generate real consensus results showing how three AI models catch bugs that single-model review misses.

## Stack

- **Runtime:** Node.js 18+
- **Framework:** Express 4
- **Database:** PostgreSQL (via `pg`)
- **Cache:** Redis (via `redis`)
- **Auth:** JWT + bcrypt
- **Package manager:** npm

## Project Structure

```
src/
├── index.js              # App entry point
├── db/
│   └── pool.js           # PostgreSQL connection pool
├── middleware/
│   ├── auth.js           # JWT authentication + role guards
│   ├── errorHandler.js   # Centralized error handling
│   └── requestLogger.js  # Request timing logger
├── routes/
│   ├── auth.js           # POST /api/auth/register, /login
│   ├── users.js          # GET /api/users, /me, /:id/orders
│   └── orders.js         # POST/GET /api/orders, PATCH status
└── services/
    └── orderService.js   # Order creation, credit deduction logic
```

## Setup

```bash
cp .env.example .env
# Edit .env with your DB credentials
npm install
npm start
```

## Why this repo exists

Weekly, a real code change is made here containing a subtle bug. The diff is submitted to 2ndOpinion's `--consensus` command — Claude, Codex, and Gemini independently review it and produce a calibrated consensus. Results are shared publicly to show how multi-model review catches issues that single-model review misses.
