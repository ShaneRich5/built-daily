# AGENT.md

## Project Overview

Built Daily is a beginner-friendly workout tracking application focused on consistency, simplicity, and habit formation.

The product philosophy is:

> Build habits first. Optimize later.

This app is intentionally lightweight compared to advanced fitness platforms. The primary goal is reducing friction so users can consistently log workouts and track progress over time.

---

# Core Product Principles

When building features, prioritize:

1. Speed of interaction
2. Simplicity
3. Mobile-first UX
4. Beginner accessibility
5. Low cognitive load
6. Fast workout logging
7. Visible progress and momentum

Avoid overengineering.

---

# MVP Goals

Users should be able to:

- Sign in quickly
- Start a workout in seconds
- Log exercises with minimal taps
- Reuse previous workout data
- Track body weight over time
- View progress history
- Stay motivated through consistency

---

# Technical Stack

## Frontend

- Next.js (App Router)
- TypeScript
- Tailwind CSS

## Backend

- Firebase Auth
- Firestore
- Firebase Hosting or Vercel

---

# Architecture Philosophy

Favor:

- Simple abstractions
- Colocation when reasonable
- Clear naming
- Readability over cleverness
- Incremental iteration
- Thin client-side state

Avoid:

- Premature optimization
- Deep inheritance
- Overly generic utilities
- Complex global state unless necessary

---

# UI/UX Guidelines

## Mobile First

The app is designed primarily for phones.

Design constraints:

- Large touch targets
- Minimal typing
- One-handed usage
- Fast transitions
- Minimal navigation depth

---

# Design Language

The UI should feel:

- Calm
- Focused
- Minimal
- Encouraging
- Modern

Avoid:

- Excessive gradients
- Overly aggressive gamification
- Cluttered dashboards
- Hardcore bodybuilding aesthetics

---

# Core Features

## Workout Logging

The active workout screen is the most important experience in the app.

Prioritize:

- Quick set entry
- Autofill previous values
- Fast exercise search
- Easy duplication of sets
- Minimal interaction friction

---

# Data Modeling Philosophy

Optimize for developer velocity and UX clarity first.

Firestore data can be denormalized when beneficial.

Prefer:

- Explicit structures
- Predictable query paths
- Readable document shapes

---

# Naming Conventions

## Components

Use descriptive component names:

- workout-card
- exercise-history-list
- active-workout-view

Avoid vague names like:

- Manager
- Helper
- Utils

---

# Folder Structure

Prefer feature-oriented organization over strict technical separation.

Example:

src/
  features/
    workouts/
    exercises/
    templates/
    metrics/
  components/
  lib/
  hooks/
  app/

---

# State Management

Default to:

- React state
- Context when necessary
- Server state from Firestore

Avoid introducing heavy state libraries early unless complexity justifies it.

---

# Performance Priorities

Optimize for:

1. Fast perceived performance
2. Fast workout interactions
3. Smooth mobile experience
4. Offline reliability

---

# Accessibility

Maintain reasonable accessibility support:

- Semantic HTML
- Keyboard navigation where appropriate
- Sufficient contrast
- Proper labels for form inputs

---

# Non-Goals (MVP)

Do not prioritize:

- Social feeds
- AI coaching
- Nutrition tracking
- Complex analytics
- Wearables
- Smartwatch integrations
- Advanced bodybuilding metrics

The MVP is focused on consistency and workout logging.

---

# Product Direction

Built Daily should feel like:

- A workout companion
- A habit-building tool
- A lightweight fitness journal

Not:

- A competitive social platform
- A bodybuilding analytics suite
- Enterprise fitness software

---

# Engineering Expectations

When contributing:

- Keep code readable
- Prefer small focused components
- Leave code cleaner than you found it
- Avoid unnecessary dependencies
- Document non-obvious decisions
- Prioritize maintainability

---

# Success Metric

The app succeeds if users consistently return and log workouts with minimal friction.