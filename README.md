# Built Daily

Built Daily is a beginner-friendly workout tracker focused on consistency, simplicity, and visible progress.

The goal is to make workout tracking feel approachable instead of overwhelming. The app is designed for people who want to build habits, stay consistent, and see gradual improvement over time without dealing with bloated fitness software.

---

# Core Philosophy

Built Daily prioritizes:

- Fast workout logging
- Minimal friction
- Beginner-friendly UX
- Consistency over optimization
- Clear progress tracking
- Mobile-first experience

The app intentionally avoids unnecessary complexity during the MVP phase.

---

# MVP Feature Set

## Authentication

Users can create accounts and sync workout data across devices.

### Features

- Google sign-in
- Email/password authentication
- Optional anonymous/guest mode

### Tech

- Firebase Auth

---

# Workout Logging

The core experience of the app.

Users can create and complete workout sessions quickly with minimal input.

## Workout Session

A workout includes:

- Workout title
- Date
- Duration
- Exercises
- Notes

## Exercise Logging

Each exercise contains:

- Exercise name
- Sets
- Reps
- Weight
- Optional notes

### UX Goals

- Fast set entry
- Autofill previous values
- Duplicate previous sets quickly
- Minimal typing
- Mobile-friendly interactions

### Example

Bench Press

- 135 × 5
- 135 × 5
- 135 × 5

---

# Exercise Library

A searchable list of exercises available during workout creation.

## MVP Scope

- Common preloaded exercises
- Search functionality
- User-created custom exercises

## Exercise Fields

- Name
- Category
- Muscle group
- Equipment type

---

# Workout Templates

Users can save workouts as reusable templates.

## Features

- Save workout templates
- Start workouts from templates
- Beginner-friendly starter routines

## Example Templates

- Full Body A
- Push Day
- Pull Day
- Beginner 3-Day Split

---

# Progress Tracking

Users should be able to clearly see improvement over time.

## Exercise Progress

Track:

- Previous workout values
- Personal records
- Best weight
- Workout frequency
- Total sessions completed

## Example

Bench Press

- Best: 185 × 3
- Last session: 165 × 5
- Total sessions: 12

---

# Body Weight Tracking

Simple metric tracking focused on consistency.

## MVP Metrics

- Body weight
- Date logged

## Visualizations

- Weight trend graph
- Weekly/monthly progress

---

# Dashboard / Home Screen

The dashboard should quickly answer:

> What should I do today?

## Planned Sections

- Start Workout
- Continue Active Workout
- Recent Workouts
- Current Streak
- Weight Trend
- Suggested Routine

---

# Workout Timer

Small but high-value quality-of-life feature.

## Features

- Workout duration timer
- Optional rest timer between sets

---

# Offline Support

Workout logging should continue working without internet access.

## Features

- Offline workout logging
- Automatic sync when connection returns

## Tech

- Firestore offline persistence

---

# Mobile-First Design

The app is designed primarily for phones.

## Goals

- One-handed usage
- Large tap targets
- Fast interactions
- Minimal navigation friction

---

# Initial Tech Stack

## Frontend

- Next.js
- TypeScript
- Tailwind CSS

## Backend / Infrastructure

- Firebase Auth
- Firestore
- Firebase Storage (optional later)

---

# Future Features (Post-MVP)

Features intentionally deferred until after the core experience is polished.

## Possible Future Additions

- Social/accountability features
- AI workout suggestions
- Exercise animations/videos
- Apple Health / Google Fit integration
- Smartwatch support
- Nutrition tracking
- Advanced analytics
- Habit tracking
- Push notifications
- Progressive overload recommendations

---

# Non-Goals for MVP

The MVP intentionally avoids becoming:

- A bodybuilding analytics platform
- A calorie tracking app
- A social media feed
- A complex fitness coaching system

The focus is consistency and simplicity.