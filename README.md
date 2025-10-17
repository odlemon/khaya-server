# Pine Fluent - Language Learning Application

A comprehensive language learning backend application built with TypeScript, Node.js, Express.js, Prisma ORM, and MySQL.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Overview

Pine Fluent is a robust backend system designed to power a language learning platform. It provides APIs for user management, language content, lessons, live video streaming, and progress tracking.

## Technology Stack

- **Language**: [TypeScript](https://www.typescriptlang.org/) (v4.9+)
- **Runtime**: [Node.js](https://nodejs.org/) (v14+)
- **Framework**: [Express.js](https://expressjs.com/) (v4.18+)
- **ORM**: [Prisma](https://www.prisma.io/) (v5+)
- **Database**: [MySQL](https://www.mysql.com/) (v8+)
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express Validator
- **Development Tools**: ESLint, Prettier, ts-node-dev

## Project Structure

```
pine-fluent/
├── prisma/                  # Prisma ORM configuration and schema
│   └── schema.prisma        # Database schema definition
├── src/                     # Source code
│   ├── controllers/         # Request handlers
│   │   ├── user.controller.ts
│   │   ├── language.controller.ts
│   │   ├── lesson.controller.ts
│   │   └── progress.controller.ts
│   ├── middleware/          # Express middleware
│   │   ├── auth.middleware.ts
│   │   └── error.middleware.ts
│   ├── models/              # Data models
│   │   ├── user.model.ts
│   │   ├── language.model.ts
│   │   ├── lesson.model.ts
│   │   └── progress.model.ts
│   ├── repositories/        # Database operations
│   │   ├── user.repository.ts
│   │   ├── language.repository.ts
│   │   ├── lesson.repository.ts
│   │   └── progress.repository.ts
│   ├── routes/              # API routes
│   │   ├── user.routes.ts
│   │   ├── language.routes.ts
│   │   ├── lesson.routes.ts
│   │   └── progress.routes.ts
│   ├── types/               # TypeScript type definitions
│   │   ├── dtos.ts
│   │   └── error.types.ts
│   └── app.ts               # Application entry point
├── .env                     # Environment variables
├── .eslintrc                # ESLint configuration
├── .gitignore               # Git ignore file
├── .prettierrc              # Prettier configuration
├── package.json             # Project dependencies and scripts
├── tsconfig.json            # TypeScript configuration
└── README.md                # Project documentation
```

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- [MySQL](https://www.mysql.com/) (v8 or higher)
- [Git](https://git-scm.com/) (optional, for cloning the repository)

## Installation

Follow these steps to set up the project locally:

### 1. Clone the repository

```bash
git clone https://github.com/odlemon/pine-fluent.git
cd pine-fluent

# Install all dependencies
npm install

# Create .env file
touch .env

# Add the following content to the .env file
echo 'DATABASE_URL="mysql://username:password@localhost:3306/pine_fluent_db"
PORT=3000
JWT_SECRET="your-secret-key-here"
JWT_EXPIRES_IN="24h"' > .env

# Create MySQL database
mysql -u root -p -e "CREATE DATABASE pine_fluent_db;"

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Compile TypeScript
npm run build

# Start the server with hot-reloading
npm run dev

