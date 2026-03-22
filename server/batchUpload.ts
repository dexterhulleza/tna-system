import { Express, Request, Response } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { getDb } from "./db";
import { questions, sectors, skillAreas, surveyGroups, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { sdk } from "./_core/sdk";

// ─── Multer: memory storage ────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "text/csv" ||
      file.originalname.endsWith(".xlsx") ||
      file.originalname.endsWith(".xls") ||
      file.originalname.endsWith(".csv");
    if (!ok) cb(new Error("Only Excel (.xlsx, .xls) or CSV files are accepted"));
    else cb(null, true);
  },
});

const VALID_CATEGORIES = ["organizational", "job_task", "individual", "training_feasibility", "evaluation_success", "custom"] as const;
const VALID_TYPES = ["text", "multiple_choice", "checkbox", "rating", "yes_no", "scale"] as const;
const VALID_ROLES = ["industry_worker", "trainer", "assessor", "hr_officer", "admin"];

type ParsedRow = {
  rowNumber: number;
  questionText: string;
  category: string;
  customCategory?: string;
  questionType: string;
  options?: string[];
  targetRoles?: string[];
  helpText?: string;
  isRequired: boolean;
  isActive: boolean;
  weight: number;
  sortOrder: number;
  sectorCode?: string;
  skillAreaCode?: string;
  groupCode?: string;
  sectorId?: number | null;
  skillAreaId?: number | null;
  groupId?: number | null;
};

type RowResult = {
  rowNumber: number;
  status: "success" | "error";
  questionText?: string;
  reason?: string;
};

function parseRow(raw: Record<string, any>, rowNumber: number): { row?: ParsedRow; error?: string } {
  const questionText = String(raw["question_text"] ?? raw["Question Text"] ?? raw["questionText"] ?? "").trim();
  if (!questionText) return { error: "question_text is required" };

  const rawCat = String(raw["category"] ?? raw["Category"] ?? "organizational").trim().toLowerCase().replace(/ /g, "_");
  if (!VALID_CATEGORIES.includes(rawCat as any)) {
    return { error: `Invalid category "${rawCat}". Must be one of: ${VALID_CATEGORIES.join(", ")}` };
  }

  const rawType = String(raw["question_type"] ?? raw["Question Type"] ?? raw["questionType"] ?? "scale").trim().toLowerCase().replace(/ /g, "_");
  if (!VALID_TYPES.includes(rawType as any)) {
    return { error: `Invalid question_type "${rawType}". Must be one of: ${VALID_TYPES.join(", ")}` };
  }

  const optionsRaw = String(raw["options"] ?? raw["Options"] ?? "").trim();
  const options = optionsRaw ? optionsRaw.split("|").map((o) => o.trim()).filter(Boolean) : undefined;

  const rolesRaw = String(raw["target_roles"] ?? raw["Target Roles"] ?? raw["targetRoles"] ?? "").trim();
  const targetRoles = rolesRaw
    ? rolesRaw.split("|").map((r) => r.trim().toLowerCase()).filter((r) => VALID_ROLES.includes(r))
    : [];

  const customCategory = String(raw["custom_category"] ?? raw["Custom Category"] ?? raw["customCategory"] ?? "").trim() || undefined;
  const helpText = String(raw["help_text"] ?? raw["Help Text"] ?? raw["helpText"] ?? "").trim() || undefined;
  const isRequired = String(raw["is_required"] ?? raw["Required"] ?? "true").toLowerCase() !== "false";
  const isActive = String(raw["is_active"] ?? raw["Active"] ?? "true").toLowerCase() !== "false";
  const weight = parseFloat(String(raw["weight"] ?? raw["Weight"] ?? "1")) || 1;
  const sortOrder = parseInt(String(raw["sort_order"] ?? raw["Sort Order"] ?? raw["sortOrder"] ?? "0")) || 0;
  const sectorCode = String(raw["sector_code"] ?? raw["Sector Code"] ?? raw["sectorCode"] ?? "").trim().toUpperCase() || undefined;
  const skillAreaCode = String(raw["skill_area_code"] ?? raw["Skill Area Code"] ?? raw["skillAreaCode"] ?? "").trim().toUpperCase() || undefined;
  const groupCode = String(raw["group_code"] ?? raw["Group Code"] ?? raw["groupCode"] ?? "").trim().toUpperCase() || undefined;

  return {
    row: {
      rowNumber,
      questionText,
      category: rawCat,
      customCategory,
      questionType: rawType,
      options,
      targetRoles,
      helpText,
      isRequired,
      isActive,
      weight,
      sortOrder,
      sectorCode,
      skillAreaCode,
      groupCode,
    },
  };
}

export function registerBatchUploadRoutes(app: Express) {
  // ── POST /api/questions/batch ─────────────────────────────────────────────────
  app.post("/api/questions/batch", upload.single("file"), async (req: Request, res: Response) => {
    try {
      // Auth
      let authUserId: number;
      try {
        const authUser = await sdk.authenticateRequest(req);
        authUserId = authUser.id;
      } catch {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const db = await getDb();
      if (!db) { res.status(500).json({ error: "Database unavailable" }); return; }

      // Check admin role
      const userRows = await db.select().from(users).where(eq(users.id, authUserId)).limit(1);
      const authUser = userRows[0];
      if (!authUser || authUser.role !== "admin") {
        res.status(403).json({ error: "Admin access required" });
        return;
      }

      if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

      // Parse workbook
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (rawRows.length === 0) { res.status(400).json({ error: "The file is empty or has no data rows" }); return; }

      // Load lookup tables
      const allSectors = await db.select().from(sectors);
      const allSkillAreas = await db.select().from(skillAreas);
      const allGroups = await db.select().from(surveyGroups);

      const sectorByCode = new Map(allSectors.map((s) => [s.code.toUpperCase(), s.id]));
      const skillAreaByCode = new Map(allSkillAreas.map((sa) => [sa.code.toUpperCase(), sa.id]));
      const groupByCode = new Map(allGroups.map((g) => [g.code.toUpperCase(), g.id]));

      const results: RowResult[] = [];
      const validRows: ParsedRow[] = [];

      for (let i = 0; i < rawRows.length; i++) {
        const rowNumber = i + 2;
        const { row, error } = parseRow(rawRows[i], rowNumber);
        if (error || !row) {
          results.push({ rowNumber, status: "error", reason: error ?? "Parse error" });
          continue;
        }

        // Resolve codes to IDs
        if (row.sectorCode) {
          const sId = sectorByCode.get(row.sectorCode);
          if (!sId) {
            results.push({ rowNumber, status: "error", questionText: row.questionText, reason: `Sector code "${row.sectorCode}" not found` });
            continue;
          }
          row.sectorId = sId;
        } else { row.sectorId = null; }

        if (row.skillAreaCode) {
          const saId = skillAreaByCode.get(row.skillAreaCode);
          if (!saId) {
            results.push({ rowNumber, status: "error", questionText: row.questionText, reason: `Skill area code "${row.skillAreaCode}" not found` });
            continue;
          }
          row.skillAreaId = saId;
        } else { row.skillAreaId = null; }

        if (row.groupCode) {
          const gId = groupByCode.get(row.groupCode);
          if (!gId) {
            results.push({ rowNumber, status: "error", questionText: row.questionText, reason: `Group code "${row.groupCode}" not found` });
            continue;
          }
          row.groupId = gId;
        } else { row.groupId = null; }

        validRows.push(row);
      }

      // Insert valid rows
      let insertedCount = 0;
      for (const row of validRows) {
        try {
          await db.insert(questions).values({
            sectorId: row.sectorId ?? null,
            skillAreaId: row.skillAreaId ?? null,
            groupId: row.groupId ?? null,
            category: row.category as any,
            customCategory: row.customCategory ?? null,
            questionText: row.questionText,
            questionType: row.questionType as any,
            options: row.options && row.options.length > 0 ? row.options : null,
            targetRoles: row.targetRoles && row.targetRoles.length > 0 ? row.targetRoles : null,
            helpText: row.helpText ?? null,
            isRequired: row.isRequired,
            isActive: row.isActive,
            weight: row.weight,
            sortOrder: row.sortOrder,
            createdBy: authUserId,
          });
          results.push({ rowNumber: row.rowNumber, status: "success", questionText: row.questionText });
          insertedCount++;
        } catch (dbErr: any) {
          results.push({ rowNumber: row.rowNumber, status: "error", questionText: row.questionText, reason: dbErr.message ?? "Database error" });
        }
      }

      res.json({ total: rawRows.length, inserted: insertedCount, errors: results.filter((r) => r.status === "error").length, results });
    } catch (err: any) {
      console.error("[BatchUpload] Error:", err);
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  });

  // ── GET /api/questions/batch/template ─────────────────────────────────────────
  app.get("/api/questions/batch/template", (_req: Request, res: Response) => {
    try {
      const headers = [
        "question_text", "category", "custom_category", "question_type",
        "options", "target_roles", "help_text", "is_required", "is_active",
        "weight", "sort_order", "sector_code", "skill_area_code", "group_code",
      ];
      const instructions = [
        "Required. Full text of the survey question.",
        "Required. organizational|job_task|individual|training_feasibility|evaluation_success|custom",
        "If category=custom, enter the custom label here (e.g., Digital Literacy).",
        "Required. text|multiple_choice|checkbox|rating|yes_no|scale",
        "For multiple_choice/checkbox only. Separate with | e.g.: Beginner|Intermediate|Advanced",
        "Pipe-separated roles: industry_worker|trainer|assessor|hr_officer|admin. Blank=all.",
        "Optional guidance text shown to the respondent.",
        "TRUE or FALSE. Default: TRUE",
        "TRUE or FALSE. Default: TRUE",
        "Numeric weight for scoring. Default: 1",
        "Integer sort order. Default: 0",
        "Sector code (e.g., ICT). Must match an existing sector.",
        "Skill area code. Must match an existing skill area under the sector.",
        "Group code (e.g., FILMANIM2025). Must match an existing group.",
      ];
      const exampleRow = [
        "How would you rate your current proficiency in 2D animation principles?",
        "individual", "", "scale", "", "industry_worker|trainer",
        "Rate from 1 (no knowledge) to 5 (expert level)", "TRUE", "TRUE", "1", "10", "", "", "FILMANIM2025",
      ];

      const wb = XLSX.utils.book_new();
      const wsData = [headers, instructions, exampleRow];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!cols"] = headers.map(() => ({ wch: 30 }));
      XLSX.utils.book_append_sheet(wb, ws, "Questions Template");

      const refData = [
        ["REFERENCE: Valid Values"],
        [],
        ["category", "organizational | job_task | individual | training_feasibility | evaluation_success | custom"],
        ["question_type", "text | multiple_choice | checkbox | rating | yes_no | scale"],
        ["target_roles", "industry_worker | trainer | assessor | hr_officer | admin"],
        [],
        ["NOTES:"],
        ["- options: pipe-separated, only for multiple_choice and checkbox types"],
        ["- target_roles: pipe-separated; blank = show to all roles"],
        ["- sector_code / skill_area_code: must exactly match codes in the system"],
        ["- group_code: must exactly match a group code in Manage Groups"],
        ["- custom_category: required when category=custom"],
        ["- Row 2 in the template is the instructions row — delete it before uploading"],
      ];
      const wsRef = XLSX.utils.aoa_to_sheet(refData);
      wsRef["!cols"] = [{ wch: 20 }, { wch: 80 }];
      XLSX.utils.book_append_sheet(wb, wsRef, "Reference");

      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", 'attachment; filename="tna_questions_template.xlsx"');
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
