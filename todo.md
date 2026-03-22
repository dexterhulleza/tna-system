# TNA System - Project TODO

## Database Schema
- [x] Extended users table with tna_role, admin_level fields
- [x] Sectors table (6 WorldSkills sectors)
- [x] Skill areas table per sector
- [x] Questions table (per sector, skill area, category, role)
- [x] Surveys table with conductedWith collaboration field
- [x] Survey responses table
- [x] Reports table with gap analysis fields
- [x] Recommendations table with priority and training type
- [x] Admin permissions via role/adminLevel fields on users

## Backend API
- [x] Extended auth procedures (role assignment, admin levels)
- [x] Sectors CRUD procedures
- [x] Skill areas CRUD procedures
- [x] Questions CRUD procedures (admin customizable per sector/skill area)
- [x] Survey procedures (start, getQuestions, saveResponse, complete)
- [x] Report generation procedure (TNA gap analysis engine)
- [x] Recommendations procedure (priority-based with type/duration)
- [x] Admin user management procedures
- [x] PDF export REST endpoint (/api/reports/:id/pdf)
- [x] Survey history procedure

## Frontend - Auth & Layout
- [x] Global styling (enterprise navy/blue theme with Inter + Sora fonts)
- [x] Landing/home page with sectors, features, CTA
- [x] Login via Manus OAuth
- [x] Profile setup page (TNA role, organization, job title)
- [x] User dashboard page

## Frontend - Survey Flow
- [x] Sector selection page
- [x] Skill area selection page
- [x] Survey questions page (5 categories: Organizational, Job/Task, Individual, Feasibility, Evaluation)
- [x] Survey report page with full gap analysis
- [x] Survey history page

## Frontend - Admin Panel
- [x] Admin dashboard with stats (users, surveys, reports, sectors)
- [x] User management (list, set admin level, promote/demote)
- [x] Sector management (CRUD)
- [x] Skill area management (CRUD per sector)
- [x] Question management (CRUD per sector/skill area/category)
- [x] Admin reports overview with filtering

## Frontend - Reports & History
- [x] Survey history page with status badges
- [x] Report view page (gap analysis, category scores, identified gaps)
- [x] Training recommendations display (priority, type, duration)
- [x] PDF export button (downloads PDF from server)
- [x] Admin reports overview

## Testing
- [x] auth.logout unit test (20 tests total, all passing)
- [x] TNA system tests: auth, sectors, questions, admin, surveys, reports

## New Features (Mar 22 2026)
- [x] groups table: admin-created group tags with name, description, sector scope
- [x] surveys table: add respondentName, respondentAge, respondentGender, respondentPosition, respondentCompany, groupId fields
- [x] questions table: support custom category name (for group-specific categories)
- [x] Group CRUD API (admin)
- [x] Survey respondent info capture form (before survey questions)
- [x] Group tag selection on survey start
- [x] Custom category support in Manage Questions (admin can add named category per group)
- [x] Admin reports: group filter and AI-generated analysis explanation per group
- [x] AI narrative: methodology, theoretical basis, external study references

## Batch Upload Feature (Mar 22 2026)
- [x] Backend: batch question upload REST endpoint (POST /api/questions/batch) with Excel/CSV parsing
- [x] Backend: validate uploaded rows against schema (category, questionType, sector, group)
- [x] Frontend: Batch Upload dialog in Manage Questions with file picker
- [x] Frontend: Download Excel template button with all required columns pre-filled
- [x] Frontend: Upload preview table showing parsed rows before confirming import
- [x] Frontend: Import result summary (success count, skipped rows, errors)
- [x] Excel file: Comprehensive Film Animation TNA questions (all 5 categories + custom)
