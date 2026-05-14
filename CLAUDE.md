# CLAUDE.md

## About This Project

Built Daily is a beginner-friendly workout tracking app designed around consistency and simplicity.

The app focuses on helping users:

- Build workout habits
- Log workouts quickly
- Track visible progress
- Stay motivated without complexity

This is intentionally not a hardcore bodybuilding or fitness analytics platform.

---

# Product Philosophy

Key principle:

> Consistency matters more than optimization.

Every feature should reduce friction and encourage users to continue showing up.

---

# Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Firebase Auth
- Firestore

---

# Coding Principles

## Prioritize Readability

Prefer code that is easy to understand over clever abstractions.

Good:

- Explicit naming
- Small focused functions
- Clear component boundaries

Avoid:

- Over-abstraction
- Premature optimization
- Excessive indirection
- Unnecessary generic utilities

---

# UX Priorities

This app is mobile-first.

Optimize for:

- Fast interactions
- Large touch targets
- Minimal typing
- Clear visual hierarchy
- Smooth workout logging

The active workout experience is the highest priority flow in the application.

---

# Design Guidelines

The UI should feel:

- Clean
- Calm
- Focused
- Encouraging
- Lightweight

Avoid:

- Visual clutter
- Overly complex dashboards
- Excessive gamification
- Aggressive fitness branding

---

# Feature Priorities

## MVP Features

- Authentication
- Workout logging
- Exercise tracking
- Workout templates
- Body weight tracking
- Progress history
- Offline support

---

# Data Modeling

Prefer straightforward Firestore document structures.

Optimize for:

- Developer velocity
- Query simplicity
- Predictable data access

Denormalization is acceptable when it improves UX or reduces complexity.

---

# Component Guidelines

Prefer:

- Small reusable UI components
- Feature-oriented structure
- Colocated logic when appropriate

Example structure:

src/
  app/
  components/
  features/
  hooks/
  lib/

---

# State Management

Default to simple React patterns first.

Use:

- React state
- Context when necessary

Avoid adding heavy state management libraries unless complexity requires it.

---

# Performance

Prioritize:

1. Fast mobile interactions
2. Smooth workout logging
3. Offline reliability
4. Fast perceived loading times

---

# Accessibility

Maintain baseline accessibility support:

- Semantic HTML
- Form labels
- Keyboard accessibility where appropriate
- Reasonable contrast ratios

---

# Non-Goals

Do not prioritize during MVP:

- Nutrition tracking
- Social feeds
- AI coaching
- Smartwatch integrations
- Advanced analytics
- Complex gamification

---

# Contribution Expectations

When making changes:

- Keep components focused
- Prefer maintainable solutions
- Minimize unnecessary dependencies
- Keep files reasonably small
- Document important architectural decisions

---

# Product Identity

Built Daily should feel like:

- A workout journal
- A consistency tool
- A supportive companion

Not:

- A competitive social network
- A bodybuilding platform
- A complex fitness ERP

---

# Decision Framework

When uncertain between two approaches, prefer the option that:

- Reduces user friction
- Simplifies the experience
- Improves maintainability
- Speeds up iteration
- Keeps the product approachable for beginners