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

## Gemini Auto-Fallback (Mar 25 2026)
- [x] isGeminiQuotaError() helper to detect 429/RESOURCE_EXHAUSTED errors
- [x] invokeGeminiWithFallback(): on quota error, auto-retry with gemini-1.5-flash; propagate error only if fallback also fails
- [x] invokeAI(): uses invokeGeminiWithFallback, logs fallback usage to console
- [x] testAiConnection(): on Gemini 429, reports success with fallback note instead of failure
- [x] 27 tests passing, 0 TypeScript errors

## Gemini Tier 1 Model Fix (Mar 26 2026)
- [x] Diagnosed: gemini-2.0-flash is deprecated (404 "no longer available to new users"); only gemini-2.5-flash and gemini-2.5-pro work on Tier 1
- [x] Updated GEMINI_FALLBACK_CHAIN to ["gemini-2.5-flash", "gemini-2.5-pro"]
- [x] Extended invokeGeminiWithFallback to retry on 404 not-found/deprecated errors (not just quota 429)
- [x] Updated default model to gemini-2.5-flash in aiProvider.ts and testAiConnection
- [x] Updated AdminAISettings.tsx model dropdown to show only gemini-2.5-flash and gemini-2.5-pro
- [x] 27 tests passing, 0 TypeScript errors

## Group Analysis Redesign - Coherent + Credit-Efficient (Mar 26 2026)
- [x] DB: group_analysis_sections table for per-section AI caching (upsert/get/delete helpers)
- [x] Backend: computeGroupSummary() helper - aggregate individual responses into stats (no AI, free)
- [x] Backend: tRPC groupSummary procedure - returns computed stats + cached sections in one call
- [x] Backend: tRPC generateSection procedure - generates a single TESDA section on demand with caching
- [x] Backend: tRPC deleteSection procedure - clears cached section for regeneration
- [x] Frontend: Free summary dashboard (score distribution bar, category score bars, top 5 gaps, respondent list)
- [x] Frontend: 9 TESDA section cards with Generate/Regenerate/Export buttons and cache timestamp
- [x] Frontend: Export All button for all generated sections as a single Markdown file
- [x] Frontend: Updated explanation banner describing credit-efficient workflow
- [x] 27 tests passing, 0 TypeScript errors

## HR Workflow UX Improvements (Apr 13 2026)
- [x] Survey Readiness Checklist: dashboard widget on Admin Dashboard showing 7-phase completion status with progress bar and direct action links
- [x] HR Officer TNA Workflow Recommendation Document (PDF + Markdown)
- [ ] Staff CSV/Excel bulk import: allow HR Officers to upload staff profiles (name, position, department, duties) to pre-populate respondent data
- [ ] Survey QR Code / shareable link per group: generate a direct link and QR code for each group's survey that pre-selects the group
- [x] TNA Setup Wizard page: wizard-style step flow on AdminDashboard — horizontal step tabs (desktop), stepper/progress bar (mobile), locked/completed/error states, Back/Next nav, auto-advance on completion, explicit final confirmation, AI Provider excluded from HR Officer flow (admin-only)

## Full UI/UX Redesign (Apr 2026)
- [x] AdminLayout: shared sidebar wrapper for all admin/HR pages (nav, user avatar, logout)
- [x] StaffLayout: shared sidebar wrapper for staff pages
- [x] Landing Page: redesign with hero, how-it-works, role cards (HR vs Staff), footer
- [x] Role-based routing: Start Assessment button checks login + role + profile completeness
- [ ] Access Denied page: clean error state with role mismatch, incomplete profile, no group
- [ ] No Assigned Survey page: empty state for staff with no active survey
- [x] HR Officer Dashboard: stats cards, wizard, quick actions (wrapped in AdminLayout)
- [ ] Campaign Management page: list, search, filter, status badges, actions
- [ ] Create/Edit Campaign wizard: 5-step form (Details, Groups, Questions, Schedule, Review)
- [x] Staff Dashboard: simplified dashboard with assigned surveys, completed history (StaffLayout)
- [ ] Staff Survey page: distraction-free questionnaire with progress bar, section nav
- [ ] Settings page: profile, password, notifications, organization tabs
- [ ] Reports page: charts, summary cards, export (wrapped in AdminLayout)
- [ ] Mobile responsiveness: hamburger menu, responsive grids, touch targets

## One-Objective-Per-Page Redesign (Apr 2026)
### Rules: 3-second clarity · always-visible primary action · remove non-essential UI
- [ ] Landing Page: ONE objective = "Start your assessment" — strip hero to headline + single CTA, remove stats/how-it-works/role cards (move to /about)
- [ ] Profile Setup: ONE objective = "Tell us about yourself" — 3 fields max visible, inline progress, auto-advance
- [ ] Staff Dashboard: ONE objective = "Take your assigned survey" — show only active survey card + big CTA; history collapsed
- [ ] Survey Start (SurveyStart): ONE objective = "Pick your sector" — one selection per screen, no multi-field form
- [ ] Survey Questions (SurveyQuestions): ONE objective = "Answer this question" — one question at a time, full-screen, auto-advance, no sidebar
- [ ] Survey Report (SurveyReport): ONE objective = "See your gaps" — top 3 gaps + traffic-light colors + Download PDF CTA; collapse details
- [ ] HR Officer Dashboard: ONE objective = "See what needs action" — only incomplete wizard steps shown, completed hidden by default
- [ ] AdminLayout sidebar: simplify nav labels, group Settings items under Settings, remove redundant items
- [ ] AdminDashboard: ONE objective = "Launch your TNA campaign" — wizard only, stats collapsed/hidden
- [ ] AdminReports: ONE objective = "Export or review reports" — table + Export PDF as primary action

## UX Improvements (Apr 19, 2026)
- [x] Staff "No Survey Assigned" empty state — friendly message + contact HR prompt when staff has no active survey
- [x] Survey share link per group — copy-to-clipboard URL button on ManageGroups card; ?group= pre-selects group in SurveyStart
- [x] Inline "Create Group" form in wizard Step 1 — embed compact name+code form inside wizard Groups step; auto-invalidates checklist on create

## QR Code + Production Deployment (Apr 19, 2026)
- [x] QR code per group — "Download QR" button on ManageGroups group card (qrcode npm package, PNG download dialog)
- [x] .env.example — all required env vars with placeholder values, no secrets
- [x] .gitignore — node_modules, .env, dist, build artifacts, logs, uploads; !.env.example explicitly allowed
- [x] README.md — local setup, env setup, build, production start, DB migration, VPS deployment, update workflow
- [x] Production build verification — pnpm build runs cleanly (2026 modules, dist/index.js 161.9kb)
- [x] Production start script — ecosystem.config.cjs for PM2 + update.sh one-liner deploy script
- [x] Error handling hardening — NODE_ENV=production disables debug; PM2 restart policy configured

## Post-Login Admin/HR UX Overhaul (Apr 20, 2026)
- [x] AdminLayout nav: add Survey Groups, Create Survey Group, Results & Analytics, Training Plans, Recommendations, Company Info, Reports
- [x] AdminDashboard: welcome header (name + role + org), 6 stat cards, 4 primary action cards, recent groups table, alerts/reminders
- [x] Survey Groups page: list view with search/filter, status badges, stats strip, action buttons
- [x] Create Survey Group wizard: 5-step (Info → Participants → Questionnaire → Schedule → Review)
- [x] Company Information page: editable form (org name, industry, TNA purpose, participants, regulatory requirements, notes) — stored in surveyConfig groupId=0
- [x] Other Outputs module: nav links in AdminLayout sidebar (Results & Analytics, Training Plans, Recommendations, Reports Archive)

## Staff UX Complete Redesign + Analytics (Apr 20, 2026)
### Staff respondent count
- [ ] DB: add expectedCount field to survey_groups table (migration)
- [ ] Backend: update groups.upsert to accept expectedCount
- [ ] Frontend: Add Staff button on ManageGroups group card — modal to set expected participant count
- [ ] Frontend: AdminDashboard progress bars use respondedCount/expectedCount for real percentage

### Staff experience (15 screens)
- [ ] Staff Dashboard: welcome, assigned group card, status (Not Started/In Progress/Submitted/Closed), Start/Continue Assessment CTA
- [ ] Staff Profile page: name, email, mobile, department, position, update + change password
- [ ] No Assigned Survey page: friendly empty state, contact HR, refresh button
- [ ] Survey Closed page: deadline passed message, contact HR note
- [ ] Survey Questionnaire: section nav, question counter, auto-save indicator, sticky Back/Next/Save Draft
- [ ] Review Answers page: summary of all answers, highlight unanswered, edit per question
- [ ] Submission Confirmation modal: "answers cannot be edited after submission" warning
- [ ] Success/Completion page: success icon, date submitted, reference number, return to dashboard
- [ ] Continue Assessment flow: resume from last saved question
- [ ] Staff top nav: Dashboard, My Assessment, Profile, Logout (no HR features)

### Results & Analytics page (admin)
- [ ] /admin/results page: response rate chart per group, category score breakdown bars, top skill gaps across all groups
- [ ] Tabbed layout: Overview, By Group, By Category, Skill Gaps

## Create Survey Group Wizard Improvements (Apr 20, 2026)
- [ ] Step 2 Participants: 3-method enrollment tabs (QR/open enrollment with expected count, manual search from registered users, CSV upload with downloadable template)
- [ ] Step 3 Questionnaire: quick-setup tabs (reuse previously used set, type new questions inline, upload questions CSV)

## Group Edit + Training Plans (Apr 20 2026)
- [x] Group Edit page: pre-filled 5-step wizard at /admin/survey-groups/:id/edit, Edit button on ManageGroups cards
- [x] Training Plans page: /admin/training-plans listing all groups with plan status, Generate Plan button, Download Markdown button

## Custom Auth System (Apr 22, 2026)
- [x] DB: extend users table with passwordHash, emailVerified, isActive, department, employeeId, mobile, pendingApproval, resetToken, resetTokenExpiry, lastLoginAt fields
- [x] DB: add auditLogs table (userId, userEmail, userName, action, module, details, ipAddress, createdAt)
- [x] DB: run migration (0006_shiny_cer.sql) to apply schema changes
- [x] Backend: server/customAuth.ts — hashPassword, verifyPassword, createSession, generateOpenId, writeAuditLog helpers
- [x] Backend: customAuth.register procedure — email/password registration, bcrypt hash, duplicate check, audit log
- [x] Backend: customAuth.login procedure — email/password login, bcrypt verify, JWT session cookie, audit log
- [x] Backend: customAuth.forgotPassword procedure — generate reset token, return token (email delivery TBD)
- [x] Backend: customAuth.resetPassword procedure — verify token, update password, clear token
- [x] Backend: customAuth.getAuditLogs procedure — paginated, filterable by action + search
- [x] Backend: customAuth.completeProfile procedure — update tnaRole, department, organization, jobTitle, groupId
- [x] Frontend: client/src/const.ts — getLoginUrl() now returns /login (custom auth) instead of Manus OAuth
- [x] Frontend: client/src/_core/hooks/useAuth.ts — skip redirect when already on auth pages (/login, /register, etc.)
- [x] Frontend: pages/auth/Login.tsx — email/password login form with show/hide password, returnPath redirect
- [x] Frontend: pages/auth/Register.tsx — full registration form (name, email, password, role, org, department)
- [x] Frontend: pages/auth/ForgotPassword.tsx — email input, shows reset token on success (email delivery TBD)
- [x] Frontend: pages/auth/ResetPassword.tsx — token + new password form
- [x] Frontend: pages/admin/AdminAuditLogs.tsx — paginated audit log table with action filter + search
- [x] Frontend: AdminLayout.tsx — auth guard (redirect to /login if not authenticated, Access Denied if wrong role)
- [x] Frontend: AdminLayout sidebar — Audit Logs link under Settings (admin only)
- [x] App.tsx — registered /login, /register, /forgot-password, /reset-password, /admin/audit-logs routes
- [x] All getLoginUrl() usages updated to point to /login instead of Manus OAuth portal
- [x] 27 tests passing, 0 TypeScript errors

## Role Governance Rules (Apr 22, 2026)
- [x] DB: extend tnaRole enum to include ld_officer, line_manager, employee, executive_reviewer (migration 0007)
- [x] Backend guard in customAuth.adminCreateUser: HR Officers cannot assign admin/System Admin role (TRPCError FORBIDDEN)
- [x] Backend guard in admin.users.updateRole: HR Officers cannot assign admin/System Admin role
- [x] Updated all tnaRole z.enum() in routers.ts to include all 9 role values
- [x] AdminUsers.tsx rewritten with full role governance UI:
  - HR Officer view: checkboxes for L&D Officer, Line Manager/Supervisor, Employee Respondent, Executive Reviewer only (System Admin hidden)
  - System Admin view: all 6 roles including System Administrator with ShieldAlert icon
  - Amber alert banner for HR Officers explaining their role assignment scope
  - Red alert when HR Officer opens edit dialog for a System Administrator user
  - Save button disabled when HR Officer is editing a System Admin user
  - Role filter dropdown hides System Administrator option for HR Officers
  - Add User dialog also uses checkbox-based role picker with same governance rules

## PSOC Primary Work Function (Apr 22, 2026)
- [x] DB: extended users table with workFunctionCategory, workFunctionTitle, workFunctionPsocCode, workFunctionOtherText columns (migration 0008)
- [x] Backend: auth.updateProfile procedure updated to accept and persist all 4 work function fields
- [x] Backend: customAuth.changePassword procedure added — verifies current password, updates hash, writes audit log
- [x] Frontend: client/src/lib/psocData.ts — 10 PSOC occupational groups with 80+ job functions and PSOC codes
- [x] Frontend: client/src/components/PsocWorkFunctionPicker.tsx — searchable grouped dropdown with Others free-text
- [x] Frontend: ProfileSetup.tsx — Work Information section shown for industry_worker/employee roles with PsocWorkFunctionPicker
- [x] Frontend: ProfileSetup.tsx — Password Change section now calls customAuth.changePassword (real password change)
- [x] 27 tests passing, 0 TypeScript errors

## T1-4 TESDA Reference Library (Apr 22, 2026)
- [x] DB: add tesdaReferences table (trCode, qualificationTitle, csUnitCode, csUnitTitle, competencyLevel, referenceType TR/CS/Supermarket, industry, isActive, createdBy, updatedBy) — migration 0009
- [x] Backend: tesda.list procedure — paginated, filterable by type/level/industry/search/activeOnly
- [x] Backend: tesda.getById procedure — fetch single reference by ID
- [x] Backend: tesda.upsert procedure — create or update reference (admin/hr_officer only)
- [x] Backend: tesda.delete procedure — soft-delete (admin/hr_officer only)
- [x] Backend: tesda.toggleActive procedure — toggle isActive flag
- [x] Frontend: AdminTesdaLibrary.tsx — full CRUD page with search, type filter, active toggle, add/edit dialog
- [x] App.tsx: /admin/tesda-library route registered
- [x] AdminLayout.tsx: TESDA Library link added under TNA Engine section

## T1-5 Task-to-Competency Mapping (Apr 22, 2026)
- [x] DB: add taskCompetencyMappings table (questionId, tesdaReferenceId, relevanceScore, mappingNotes, mappedBy) — migration 0010
- [x] Backend: taskMapping.listByQuestion procedure — list all mappings for a question with joined TESDA reference data
- [x] Backend: taskMapping.listByReference procedure — list all mappings for a TESDA reference
- [x] Backend: taskMapping.upsert procedure — create or update mapping with relevance score
- [x] Backend: taskMapping.delete procedure — remove a mapping
- [x] Backend: taskMapping.aiSuggest procedure — AI-assisted suggestions for mapping a question to TESDA references
- [x] Frontend: AdminTaskMapping.tsx — question browser with competency mapping panel, AI suggest button, relevance slider
- [x] App.tsx: /admin/task-mapping route registered
- [x] AdminLayout.tsx: Task Mapping link added under TNA Engine section

## T1-6 Weighted Multi-Source Scoring (Apr 22, 2026)
- [x] DB: extended surveyResponses table with supervisorScore, kpiScore, supervisorNotes, supervisorValidatedAt, supervisorId columns — migration 0011
- [x] DB: add scoringWeights table (selfWeight, supervisorWeight, kpiWeight, requireSupervisorValidation, fallbackToSelfOnly, updatedBy) — migration 0011
- [x] Migration 0011 applied to database
- [x] Backend: server/db.ts — getScoringWeights(), upsertScoringWeights(), computeWeightedScore() helpers added
- [x] Backend: scoringWeights.get procedure — fetch current weights (returns defaults if none exist)
- [x] Backend: scoringWeights.update procedure — save new weights (validates sum = 1.0)
- [x] Frontend: AdminScoringWeights.tsx — weight sliders (self/supervisor/KPI), visual distribution bar, presets, validation rule toggles, formula explanation
- [x] App.tsx: /admin/scoring-weights route registered
- [x] AdminLayout.tsx: Scoring Weights link added under TNA Engine section
- [x] AdminLayout.tsx: TNA Engine collapsible group added (TESDA Library, Task Mapping, Scoring Weights)
- [x] AdminLayout.tsx: refactored to per-group open state (openGroups map) to support multiple collapsible sections
- [x] 0 TypeScript errors, all tests passing

## T1-4 TESDA Reference Library (Apr 22, 2026)
- [x] DB: add tesdaReferences table (trCode, qualificationTitle, csUnitCode, csUnitTitle, competencyLevel, referenceType TR/CS/Supermarket, industry, isActive, createdBy, updatedBy) — migration 0009
- [x] Backend: tesda.list procedure — paginated, filterable by type/level/industry/search/activeOnly
- [x] Backend: tesda.getById procedure — fetch single reference by ID
- [x] Backend: tesda.upsert procedure — create or update reference (admin/hr_officer only)
- [x] Backend: tesda.delete procedure — soft-delete (admin/hr_officer only)
- [x] Backend: tesda.toggleActive procedure — toggle isActive flag
- [x] Frontend: AdminTesdaLibrary.tsx — full CRUD page with search, type filter, active toggle, add/edit dialog
- [x] App.tsx: /admin/tesda-library route registered
- [x] AdminLayout.tsx: TESDA Library link added under TNA Engine section

## T1-5 Task-to-Competency Mapping (Apr 22, 2026)
- [x] DB: add taskCompetencyMappings table (questionId, tesdaReferenceId, relevanceScore, mappingNotes, mappedBy) — migration 0010
- [x] Backend: taskMapping.listByQuestion procedure — list all mappings for a question with joined TESDA reference data
- [x] Backend: taskMapping.listByReference procedure — list all mappings for a TESDA reference
- [x] Backend: taskMapping.upsert procedure — create or update mapping with relevance score
- [x] Backend: taskMapping.delete procedure — remove a mapping
- [x] Backend: taskMapping.aiSuggest procedure — AI-assisted suggestions for mapping a question to TESDA references
- [x] Frontend: AdminTaskMapping.tsx — question browser with competency mapping panel, AI suggest button, relevance slider
- [x] App.tsx: /admin/task-mapping route registered
- [x] AdminLayout.tsx: Task Mapping link added under TNA Engine section

## T1-6 Weighted Multi-Source Scoring (Apr 22, 2026)
- [x] DB: extended surveyResponses table with supervisorScore, kpiScore, supervisorNotes, supervisorValidatedAt, supervisorId columns — migration 0011
- [x] DB: add scoringWeights table (selfWeight, supervisorWeight, kpiWeight, requireSupervisorValidation, fallbackToSelfOnly, updatedBy) — migration 0011
- [x] Migration 0011 applied to database
- [x] Backend: server/db.ts — getScoringWeights(), upsertScoringWeights(), computeWeightedScore() helpers added
- [x] Backend: scoringWeights.get procedure — fetch current weights (returns defaults if none exist)
- [x] Backend: scoringWeights.update procedure — save new weights (validates sum = 1.0)
- [x] Frontend: AdminScoringWeights.tsx — weight sliders (self/supervisor/KPI), visual distribution bar, presets, validation rule toggles, formula explanation
- [x] App.tsx: /admin/scoring-weights route registered
- [x] AdminLayout.tsx: Scoring Weights link added under TNA Engine section
- [x] AdminLayout.tsx: TNA Engine collapsible group added (TESDA Library, Task Mapping, Scoring Weights)
- [x] AdminLayout.tsx: refactored to per-group open state (openGroups map) to support multiple collapsible sections
- [x] 0 TypeScript errors, all tests passing

## Tier 2 — Core TNA Engine (T2-1 to T2-4)
- [x] T2-1: Target Proficiency Levels — DB table (target_proficiencies), backend CRUD procedures, AdminTargetProficiency.tsx page
- [x] T2-2: Competency Gap Records — DB table (competency_gap_records), saveCompetencyGapRecords helper, AdminGapRecords.tsx drill-down page
- [x] T2-3: Prioritization Matrix — DB table (prioritization_matrix), generate-from-gaps procedure, AdminPrioritizationMatrix.tsx page
- [x] T2-4: Supervisor Validation Workflow — supervisorScore/kpiScore columns on survey_responses, AdminSupervisorValidation.tsx page
- [x] tnaEngine.ts updated — gap computed vs. target proficiency (default 80%), composite weighted scoring, GapRecord[] output
- [x] surveys.complete updated — resolves target proficiencies, applies scoring weights, persists gap records on completion
- [x] AdminLayout.tsx updated — 4 new sidebar links under TNA Engine group
- [x] App.tsx updated — 4 new routes registered

## Tier 3 — Curriculum Engine (Completed)
- [x] T3-1: Curriculum Blueprint object — DB tables (curriculum_blueprints, curriculum_modules), CRUD procedures, list page, detail page with module editor
- [x] T3-2: AI-assisted curriculum generation — generateBlueprint procedure using gap records + prioritization data, 4-layer structured output
- [x] T3-3: TESDA alignment indicator — alignmentType (full_tr/partial_cs/supermarket/blended/none) + alignmentCondition (strong/partial/emerging/blended) on blueprint, editable alignment panel in detail page
- [x] T3-4: Review and approval workflow — Draft → For Review → Approved → Published status lifecycle, advance/revert controls, override reason tracking
- [x] Sidebar: Curriculum Blueprints link added to TNA Engine group in AdminLayout

## Tier 3 — Curriculum Engine (Completed Apr 22 2026)
- [x] T3-1: Curriculum Blueprint object — DB tables (curriculum_blueprints, curriculum_modules), CRUD procedures, list page, detail page with module editor
- [x] T3-2: AI-assisted curriculum generation — generateBlueprint procedure using gap records + prioritization data, 4-layer structured output
- [x] T3-3: TESDA alignment indicator — alignmentType + alignmentCondition fields, editable alignment panel in detail page
- [x] T3-4: Review and approval workflow — Draft → For Review → Approved → Published lifecycle, advance/revert controls
- [x] Sidebar: Curriculum Blueprints link added to TNA Engine group in AdminLayout

## Tier 4 — Learning Path Engine (Completed Apr 22, 2026)
- [x] T4-1: learning_paths and learning_path_steps DB tables + migration (0014)
- [x] T4-2: AI-assisted path generation via learningPaths.generatePath procedure
- [x] T4-3: Staff My Learning Path page (/dashboard/my-path) with step progress tracking
- [x] T4-4: Admin Learning Paths management page (/admin/learning-paths) with assign/archive/exempt
- [x] StaffLayout: My Learning Path nav item added
- [x] AdminLayout: Learning Paths nav item added to TNA Engine group
- [x] App.tsx: /admin/learning-paths and /dashboard/my-path routes registered
