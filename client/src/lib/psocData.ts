/**
 * PSOC-aligned occupational function list for the Primary Work Function field.
 * Based on the Philippine Standard Occupational Classification (PSOC) major groups.
 * Used in the My Profile page for Employee Respondent users.
 */

export interface PsocJobFunction {
  code: string;
  title: string;
  normalizedTitle: string; // UPPER_SNAKE_CASE for DB storage
}

export interface PsocGroup {
  code: string;
  category: string; // UPPER_SNAKE_CASE for DB storage
  label: string;    // Display label
  functions: PsocJobFunction[];
}

export const PSOC_GROUPS: PsocGroup[] = [
  {
    code: "1",
    category: "MANAGERS",
    label: "Managers",
    functions: [
      { code: "1.01", title: "General Manager / Chief Executive", normalizedTitle: "GENERAL_MANAGER" },
      { code: "1.02", title: "Operations Manager", normalizedTitle: "OPERATIONS_MANAGER" },
      { code: "1.03", title: "Project Manager", normalizedTitle: "PROJECT_MANAGER" },
      { code: "1.04", title: "HR Manager / People Manager", normalizedTitle: "HR_MANAGER" },
      { code: "1.05", title: "Finance Manager", normalizedTitle: "FINANCE_MANAGER" },
      { code: "1.06", title: "Sales and Marketing Manager", normalizedTitle: "SALES_MARKETING_MANAGER" },
      { code: "1.07", title: "IT / Technology Manager", normalizedTitle: "IT_MANAGER" },
      { code: "1.08", title: "Production / Manufacturing Manager", normalizedTitle: "PRODUCTION_MANAGER" },
      { code: "1.09", title: "Supply Chain / Logistics Manager", normalizedTitle: "SUPPLY_CHAIN_MANAGER" },
      { code: "1.10", title: "Training and Development Manager", normalizedTitle: "TRAINING_MANAGER" },
      { code: "1.11", title: "Quality Assurance Manager", normalizedTitle: "QA_MANAGER" },
      { code: "1.12", title: "Retail / Store Manager", normalizedTitle: "RETAIL_MANAGER" },
    ],
  },
  {
    code: "2",
    category: "PROFESSIONALS",
    label: "Professionals",
    functions: [
      { code: "2.01", title: "Software Developer / Programmer", normalizedTitle: "SOFTWARE_DEVELOPER" },
      { code: "2.02", title: "Civil / Structural Engineer", normalizedTitle: "CIVIL_ENGINEER" },
      { code: "2.03", title: "Electrical / Electronics Engineer", normalizedTitle: "ELECTRICAL_ENGINEER" },
      { code: "2.04", title: "Mechanical Engineer", normalizedTitle: "MECHANICAL_ENGINEER" },
      { code: "2.05", title: "Accountant / CPA", normalizedTitle: "ACCOUNTANT" },
      { code: "2.06", title: "Nurse / Registered Nurse", normalizedTitle: "NURSE" },
      { code: "2.07", title: "Doctor / Physician", normalizedTitle: "PHYSICIAN" },
      { code: "2.08", title: "Architect", normalizedTitle: "ARCHITECT" },
      { code: "2.09", title: "Lawyer / Legal Counsel", normalizedTitle: "LAWYER" },
      { code: "2.10", title: "Teacher / Educator", normalizedTitle: "TEACHER" },
      { code: "2.11", title: "Nutritionist / Dietitian", normalizedTitle: "NUTRITIONIST" },
      { code: "2.12", title: "Social Worker", normalizedTitle: "SOCIAL_WORKER" },
      { code: "2.13", title: "Data Analyst / Data Scientist", normalizedTitle: "DATA_ANALYST" },
      { code: "2.14", title: "Business Analyst", normalizedTitle: "BUSINESS_ANALYST" },
      { code: "2.15", title: "Chemist / Chemical Professional", normalizedTitle: "CHEMIST" },
    ],
  },
  {
    code: "3",
    category: "TECHNICIANS_ASSOCIATE_PROFESSIONALS",
    label: "Technicians and Associate Professionals",
    functions: [
      { code: "3.01", title: "Engineering Technician", normalizedTitle: "ENGINEERING_TECHNICIAN" },
      { code: "3.02", title: "ICT Support Technician / Help Desk", normalizedTitle: "ICT_SUPPORT_TECHNICIAN" },
      { code: "3.03", title: "Medical / Laboratory Technician", normalizedTitle: "MEDICAL_TECHNICIAN" },
      { code: "3.04", title: "Accounting Technician / Bookkeeper", normalizedTitle: "ACCOUNTING_TECHNICIAN" },
      { code: "3.05", title: "Legal / Paralegal Associate", normalizedTitle: "PARALEGAL" },
      { code: "3.06", title: "Sales Representative / Account Officer", normalizedTitle: "SALES_REPRESENTATIVE" },
      { code: "3.07", title: "Graphic Designer / Multimedia Artist", normalizedTitle: "GRAPHIC_DESIGNER" },
      { code: "3.08", title: "Surveyor / Cartographer", normalizedTitle: "SURVEYOR" },
      { code: "3.09", title: "Radiographer / Imaging Technician", normalizedTitle: "RADIOGRAPHER" },
      { code: "3.10", title: "Electronics / Instrumentation Technician", normalizedTitle: "ELECTRONICS_TECHNICIAN" },
    ],
  },
  {
    code: "4",
    category: "CLERICAL_SUPPORT_WORKERS",
    label: "Clerical Support Workers",
    functions: [
      { code: "4.01", title: "Administrative Assistant / Secretary", normalizedTitle: "ADMINISTRATIVE_ASSISTANT" },
      { code: "4.02", title: "Data Entry Clerk / Encoder", normalizedTitle: "DATA_ENTRY_CLERK" },
      { code: "4.03", title: "Customer Service Representative", normalizedTitle: "CUSTOMER_SERVICE_REPRESENTATIVE" },
      { code: "4.04", title: "Receptionist / Front Desk Officer", normalizedTitle: "RECEPTIONIST" },
      { code: "4.05", title: "Records / Document Controller", normalizedTitle: "RECORDS_CONTROLLER" },
      { code: "4.06", title: "Payroll Clerk", normalizedTitle: "PAYROLL_CLERK" },
      { code: "4.07", title: "Purchasing / Procurement Clerk", normalizedTitle: "PROCUREMENT_CLERK" },
      { code: "4.08", title: "Cashier / Teller", normalizedTitle: "CASHIER" },
      { code: "4.09", title: "Inventory / Stockroom Clerk", normalizedTitle: "INVENTORY_CLERK" },
    ],
  },
  {
    code: "5",
    category: "SERVICE_AND_SALES_WORKERS",
    label: "Service and Sales Workers",
    functions: [
      { code: "5.01", title: "Retail Sales Associate / Salesperson", normalizedTitle: "RETAIL_SALES_ASSOCIATE" },
      { code: "5.02", title: "Cook / Chef", normalizedTitle: "COOK_CHEF" },
      { code: "5.03", title: "Food Service Worker / Waiter", normalizedTitle: "FOOD_SERVICE_WORKER" },
      { code: "5.04", title: "Security Guard / Safety Officer", normalizedTitle: "SECURITY_GUARD" },
      { code: "5.05", title: "Hairdresser / Beautician / Cosmetologist", normalizedTitle: "HAIRDRESSER_BEAUTICIAN" },
      { code: "5.06", title: "Caregiver / Personal Care Worker", normalizedTitle: "CAREGIVER" },
      { code: "5.07", title: "Tour Guide / Travel Agent", normalizedTitle: "TOUR_GUIDE" },
      { code: "5.08", title: "Housekeeper / Housekeeping Attendant", normalizedTitle: "HOUSEKEEPER" },
      { code: "5.09", title: "Driver / Delivery Rider", normalizedTitle: "DRIVER" },
      { code: "5.10", title: "Fitness Instructor / Sports Coach", normalizedTitle: "FITNESS_INSTRUCTOR" },
    ],
  },
  {
    code: "6",
    category: "SKILLED_AGRICULTURAL_FORESTRY_FISHERY",
    label: "Skilled Agricultural, Forestry and Fishery Workers",
    functions: [
      { code: "6.01", title: "Farmer / Agricultural Worker", normalizedTitle: "FARMER" },
      { code: "6.02", title: "Fisherman / Aquaculture Worker", normalizedTitle: "FISHERMAN" },
      { code: "6.03", title: "Forestry / Logging Worker", normalizedTitle: "FORESTRY_WORKER" },
      { code: "6.04", title: "Livestock / Poultry Worker", normalizedTitle: "LIVESTOCK_WORKER" },
      { code: "6.05", title: "Agricultural Technician / Extension Worker", normalizedTitle: "AGRICULTURAL_TECHNICIAN" },
    ],
  },
  {
    code: "7",
    category: "CRAFT_AND_RELATED_TRADES",
    label: "Craft and Related Trades Workers",
    functions: [
      { code: "7.01", title: "Electrician / Wireman", normalizedTitle: "ELECTRICIAN" },
      { code: "7.02", title: "Plumber / Pipefitter", normalizedTitle: "PLUMBER" },
      { code: "7.03", title: "Carpenter / Joiner", normalizedTitle: "CARPENTER" },
      { code: "7.04", title: "Welder / Metal Fabricator", normalizedTitle: "WELDER" },
      { code: "7.05", title: "Automotive Mechanic / Technician", normalizedTitle: "AUTOMOTIVE_MECHANIC" },
      { code: "7.06", title: "Mason / Bricklayer / Tile Setter", normalizedTitle: "MASON" },
      { code: "7.07", title: "Painter / Varnisher", normalizedTitle: "PAINTER" },
      { code: "7.08", title: "Refrigeration and Air Conditioning Technician", normalizedTitle: "RAC_TECHNICIAN" },
      { code: "7.09", title: "Dressmaker / Tailor / Garment Worker", normalizedTitle: "DRESSMAKER_TAILOR" },
      { code: "7.10", title: "Jewelry / Precious Metals Worker", normalizedTitle: "JEWELRY_WORKER" },
    ],
  },
  {
    code: "8",
    category: "PLANT_AND_MACHINE_OPERATORS",
    label: "Plant and Machine Operators and Assemblers",
    functions: [
      { code: "8.01", title: "Machine Operator / Production Line Worker", normalizedTitle: "MACHINE_OPERATOR" },
      { code: "8.02", title: "Heavy Equipment Operator", normalizedTitle: "HEAVY_EQUIPMENT_OPERATOR" },
      { code: "8.03", title: "Forklift / Warehouse Equipment Operator", normalizedTitle: "FORKLIFT_OPERATOR" },
      { code: "8.04", title: "Printing / Packaging Machine Operator", normalizedTitle: "PRINTING_MACHINE_OPERATOR" },
      { code: "8.05", title: "Assembler / Quality Checker", normalizedTitle: "ASSEMBLER" },
      { code: "8.06", title: "Chemical Plant / Refinery Operator", normalizedTitle: "CHEMICAL_PLANT_OPERATOR" },
      { code: "8.07", title: "Textile / Garment Machine Operator", normalizedTitle: "TEXTILE_MACHINE_OPERATOR" },
    ],
  },
  {
    code: "9",
    category: "ELEMENTARY_OCCUPATIONS",
    label: "Elementary Occupations",
    functions: [
      { code: "9.01", title: "Laborer / General Worker", normalizedTitle: "LABORER" },
      { code: "9.02", title: "Janitor / Cleaner / Sanitation Worker", normalizedTitle: "JANITOR_CLEANER" },
      { code: "9.03", title: "Messenger / Courier / Delivery Worker", normalizedTitle: "MESSENGER_COURIER" },
      { code: "9.04", title: "Garbage Collector / Waste Sorter", normalizedTitle: "GARBAGE_COLLECTOR" },
      { code: "9.05", title: "Street Vendor / Market Stall Worker", normalizedTitle: "STREET_VENDOR" },
      { code: "9.06", title: "Domestic Helper / Household Worker", normalizedTitle: "DOMESTIC_HELPER" },
    ],
  },
  {
    code: "10",
    category: "OTHERS",
    label: "Others",
    functions: [
      { code: "10.01", title: "Others (specify)", normalizedTitle: "OTHERS_SPECIFY" },
    ],
  },
];

/** Flat list of all job functions for search */
export const ALL_PSOC_FUNCTIONS: (PsocJobFunction & { groupLabel: string; groupCategory: string })[] =
  PSOC_GROUPS.flatMap((g) =>
    g.functions.map((f) => ({ ...f, groupLabel: g.label, groupCategory: g.category }))
  );

/** Find a job function by its normalized title */
export function findPsocFunction(normalizedTitle: string) {
  return ALL_PSOC_FUNCTIONS.find((f) => f.normalizedTitle === normalizedTitle) ?? null;
}

/** Find a group by its category code */
export function findPsocGroup(category: string) {
  return PSOC_GROUPS.find((g) => g.category === category) ?? null;
}
