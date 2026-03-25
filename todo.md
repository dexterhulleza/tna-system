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

## Bug Fixes (Mar 22 2026)
- [x] Fix: batch-uploaded questions not appearing in Manage Questions after successful import

## Pagination (Mar 22 2026)
- [x] Paginate Manage Questions list (25 per page, page size selector, prev/next controls, count summary)

## Search (Mar 22 2026)
- [x] Keyword search bar in Manage Questions — live filter by question text, resets pagination

## Bulk Actions (Mar 22 2026)
- [x] Backend: bulkDeactivate and bulkDelete tRPC procedures for questions
- [x] Frontend: per-row checkboxes, Select All on Page, bulk action toolbar (deactivate / delete)
- [x] Frontend: confirmation dialog before bulk delete

## Navigation (Mar 22 2026)
- [x] Audit all pages for missing back/home navigation
- [x] Add persistent breadcrumb/back navigation to all admin pages
- [x] Add back-to-home navigation to survey pages and standalone pages

## Survey Configuration Module (Mar 22 2026)
- [x] DB: survey_configurations table (groupId, objectives, businessGoals, targetCompetencies, industryContext, targetParticipants, surveyPeriod, notes, createdBy)
- [x] Backend: CRUD procedures for survey configurations (create, update, get by group)
- [x] Backend: AI endpoint to generate recommended question list from config context
- [x] Frontend: Survey Configuration page accessible to admin/trainer/hr_officer
- [x] Frontend: Configuration form (objectives, business goals, industry context, target participants, competency areas)
- [x] Frontend: AI-generated question recommendations panel with accept/reject per question
- [x] Frontend: Link configuration to group in Manage Groups
- [x] Frontend: Show configuration summary in Group Analysis report
- [x] Navigation: Add breadcrumb to ManageGroups, SurveyHistory, ProfileSetup, AdminReports

## Bug Fixes (Mar 25 2026)
- [x] Fix: login on published site (tna1.net) redirects to home but user is not logged in (OAuth state encoding mismatch - fixed btoa(JSON.stringify) to btoa(redirectUri))

## Bug Fixes (Mar 25 2026 - cont.)
- [x] Fix: AI-generated questions from Survey Configuration not appearing in actual survey (added addToQuestionBank procedure that inserts accepted questions into the questions table)

## Enhanced Report Generation (Mar 25 2026)
- [ ] Backend: update AI group analysis prompt to cover all 14 KRA dimensions (Strategic Alignment, Core Competency Gaps, Job Role Mapping, Performance Improvement, Workforce Planning, L&D Priorities, Digital Transformation, Leadership, Compliance, Career Development, Department Analysis, Training Investment, Risk Areas, Innovation Readiness)
- [ ] Backend: include survey configuration objectives and company goals in the analysis prompt context
- [ ] Backend: return structured JSON analysis with per-KRA sections, metrics, and recommendations
- [ ] Frontend: render full 14-KRA report in Group Analysis tab with collapsible sections
- [ ] Frontend: show executive summary, KRA breakdown, priority matrix, and training investment recommendations
- [ ] Frontend: include survey config objectives and business goals in the report header context

## TESDA/NTESDP Framework Restructuring (Mar 25 2026)
- [x] Rewrite AI group analysis prompt: Industry Profile & Context → Occupational Mapping → Competency Gap Analysis → Skills Categorization → Technology & Equipment Requirements → Training Priority Matrix → Training Beneficiaries → Delivery Mode Analysis → Training Plan Output table
- [x] Rewrite AI question generation prompt to generate questions covering all 9 TESDA framework sections per group
- [x] Update Group Analysis frontend to display all 9 sections with Training Plan Output as a structured table
- [x] Add Export (Markdown download) and Regenerate buttons to Group Analysis
- [x] Update explanation banner to describe TESDA/NTESDP 9-section framework

## AI Provider Configuration (Mar 25 2026)
- [x] DB: ai_settings table (provider, apiKey, model, baseUrl, isActive, updatedBy, updatedAt)
- [x] Backend: tRPC procedures for AI settings (getSettings, saveSettings, testConnection)
- [x] Backend: invokeAI() helper that uses configured OpenAI key if set, else falls back to built-in LLM
- [x] Backend: wire group analysis (groupAnalysis procedure) to use invokeAI()
- [x] Backend: wire question generation (generateQuestions procedure) to use invokeAI() with if/else fallback
- [x] Frontend: Admin AI Settings page (/admin/ai-settings) with provider selector, API key input, model selector, base URL override, test connection button
- [x] Frontend: Add "AI Settings" link to Admin Dashboard
- [x] Tests: 7 vitest tests for AI settings procedures (27 total, all passing)

## Gemini AI Provider (Mar 25 2026)
- [x] Install @google/generative-ai npm package
- [x] Update aiProvider.ts to call Gemini API when provider = "gemini"
- [x] Update routers.ts zod enum for provider to include "gemini"
- [x] Update AdminAISettings.tsx frontend with Gemini option, model list, and API key link
- [x] Run tests and verify TypeScript (27 tests passing, 0 TS errors)
