# Rice Mill ERP Platform
Version: 1.0
Project Type: Enterprise Resource Planning (ERP)
Architecture: Next.js + PostgreSQL + Prisma
Development Model: Agent-First SDLC

---

# Mission

You are building a production-grade Enterprise Resource Planning (ERP) platform for a Rice Mill.

This system is not an accounting application alone.

It is a centralized operational, financial, inventory, manufacturing, maintenance, procurement, labor, and executive analytics platform.

Every implementation decision must prioritize:

- Accuracy
- Financial integrity
- Scalability
- Maintainability
- Performance
- Clean Architecture

Never sacrifice correctness for speed.

---

# Development Workflow

You MUST follow this workflow.

Never skip steps.

## Step 1

Understand the feature request.

Determine:

- business purpose
- affected modules
- required database changes
- APIs
- UI
- reports
- permissions

---

## Step 2

Generate an Implementation Plan.

The implementation plan must include:

### Scope

### Database Changes

### Backend Changes

### UI Changes

### Validation Rules

### Testing Plan

### Risks

Wait for approval before major architectural changes.

---

## Step 3

Generate Task List

Break work into small tasks.

Example

- Create Prisma models
- Create migration
- Create server actions
- Add validation
- Create UI
- Add charts
- Add tests
- Run QA

---

## Step 4

Implement ONE module only.

Never implement multiple major modules simultaneously.

Every module must be fully complete before moving to the next one.

---

## Step 5

Run QA

Produce:

- screenshots
- walkthrough
- testing notes
- known limitations

Only after QA is complete may another module begin.

---

# Core Technology Stack

Frontend

- Next.js App Router
- React
- TypeScript

Backend

- Next.js Server Actions
- Route Handlers

Database

- PostgreSQL

ORM

- Prisma

Validation

- Zod

Authentication

- RBAC
- Session based authentication

Styling

- Tailwind CSS

Icons

Heroicons
or

Lucide

Images

Next.js Image component only.

No generic AI generated artwork.

---

# Architectural Rules

Strict separation of concerns.

UI must never contain business logic.

Business logic belongs inside

/domain

or

/services

Database access belongs inside

/repositories

Validation belongs inside

/validators

Utilities belong inside

/lib

Never mix layers.

---

# Financial Precision

All financial values MUST use high precision decimals.

Never use floating point arithmetic.

Use Decimal.js or Prisma Decimal.

This includes

- currency
- paddy weights
- moisture calculations
- yield percentages
- depreciation
- taxes
- milling charges
- labor wages

Precision is mandatory.

---

# Data Validation

Every API

Every Server Action

Every mutation

must validate inputs using Zod.

Reject invalid requests.

Never trust client input.

---

# Database Design Principles

Database must be normalized.

Use foreign keys.

Use transactions for financial operations.

Use indexes for:

- dates
- ledger lookups
- inventory
- procurement
- stock movement

Avoid table locking.

Support high-volume harvesting season workloads.

---

# Domain Modules

Modules must be implemented in this exact order.

## 1

Authentication

RBAC

Users

Permissions

---

## 2

Master Data

Suppliers

Customers

Products

Godowns

Vehicles

Machines

Employees

Laborers

Banks

Expense Categories

---

## 3

Paddy Procurement

Features

- Purchase
- Moisture
- Deductions
- Quality
- Transport
- Supplier Ledger

---

## 4

Inventory

Raw Paddy

Rice

Broken Rice

Bran

Husk

Packing Materials

Stock Movement

Warehouse Capacity

FIFO support

---

## 5

Moisture Calculation

Implement

Wf = Wi × (100 − MCi) / (100 − MCf)

Target moisture

14%

All calculations must preserve precision.

---

## 6

Production

Batch

Input

Output

Yield

Recovery

Losses

Machine utilization

---

## 7

Hamali Labor

Daily Muster

Piece Rate

Bag Count

Attendance

Payments

Pending wages

---

## 8

Machinery

Maintenance

Service History

Downtime

Fuel

Oil

Repairs

TAUH

Depreciation

---

## 9

Finance

Ledger

Cash Book

Bank Book

Journal

Receipts

Payments

Loans

Interest

Working Capital

---

## 10

Overheads

Electricity

Boiler Fuel

Insurance

Rent

Licenses

Maintenance

Administrative Costs

---

## 11

Depreciation

Straight Line Method

Annual

10%

Assets

- Buildings
- Machinery
- Vehicles

Automatic ledger updates.

---

## 12

Sales

Invoices

Dispatch

Transport

Receivables

Customer Ledger

---

## 13

Reports

Procurement

Production

Yield

Inventory

Finance

Profit

Loss

Working Capital

Debt

Executive Dashboard

---

# UI Rules

Mobile first.

Tablet optimized.

Outdoor visibility.

Large touch targets.

Responsive.

Support

Light Mode

Dark Mode

Numeric columns must use

tabular-nums

---

# Tailwind Rules

Use utility classes only.

No CSS files.

No SCSS.

No inline styles.

Exception

Dynamic width

Example

Warehouse capacity bars

---

# Color Palette

Primary

emerald-700

Background

slate-50

Dark Mode

neutral-900

Maintain high contrast.

---

# Components

Reusable.

Composable.

Accessible.

Never duplicate code.

---

# State Management

Keep state on the server whenever possible.

Prefer

React Server Components

Server Actions

Use client state only for

- forms
- dropdowns
- modals
- interactive calculators

---

# Performance

Lazy load heavy dashboards.

Paginate tables.

Optimize SQL queries.

Avoid N+1 queries.

Cache read-only reports.

---

# Security

RBAC required.

Audit Logs required.

Soft Delete where appropriate.

Encrypt sensitive fields.

Never expose internal IDs unnecessarily.

Prevent mass assignment.

Use CSRF protection.

Validate every mutation.

---

# Logging

Maintain

Audit Trail

Track

who

what

when

before

after

For

- financial edits
- inventory
- purchases
- production
- wages

---

# Testing

Every completed module requires

Unit Tests

Integration Tests

UI Tests

Browser Walkthrough

Screenshots

Regression Validation

---

# Code Quality

TypeScript strict mode.

No any.

No ignored errors.

No dead code.

Meaningful naming.

Small functions.

Single responsibility.

---

# Folder Structure

/app

/components

/domain

/services

/repositories

/lib

/hooks

/types

/validators

/prisma

/public

/tests

---

# Git Rules

Small commits.

Meaningful messages.

One feature per commit.

---

# Documentation

Every completed module must generate

Implementation Summary

Database Changes

API List

Testing Notes

Walkthrough

Known Limitations

---

# Agent Behavior

Never assume business rules.

Ask when requirements are ambiguous.

Always generate an implementation plan before coding.

Always validate data.

Always preserve financial precision.

Never bypass architecture.

Never skip testing.

Never skip walkthrough generation.

Never skip documentation.

Never implement unfinished logic.

Always prefer correctness over speed.

This ERP manages real financial operations.

Every calculation must be deterministic, reproducible, and auditable.

