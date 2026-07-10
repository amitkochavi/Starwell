// Canonical extraction target for Agent 1 (M2 covers the CIM doc type).
// Every value carries a citation; unknown = null (never inferred — C.7).
// Entry Multiple is NEVER extracted — it is computed downstream (invariant #3).
import { z } from 'zod';

export const CitationSchema = z.object({
  locator_type: z.enum(['page', 'sheet_range', 'section', 'timestamp', 'file']),
  locator_value: z.string(),
  snippet: z.string().default(''),
});

export const ExtractedValueSchema = z.object({
  field: z.string(),
  value: z.union([z.number(), z.string(), z.null()]),
  citation: CitationSchema,
  confidence: z.enum(['high', 'low', 'unclear']).default('high'),
});

export const ExtractionSchema = z.object({ values: z.array(ExtractedValueSchema) });
export type Extraction = z.infer<typeof ExtractionSchema>;

// Fields Agent 1 may propose from a CIM, with their canonical Deal column + label.
// Anything outside this map is ignored on accept (no silent schema drift).
export const CIM_FIELDS: Record<string, { column: string; label: string; kind: 'money' | 'text' | 'pct' }> = {
  revenueM: { column: 'revenueM', label: 'LTM Revenue ($M)', kind: 'money' },
  ebitdaM: { column: 'ebitdaM', label: 'LTM EBITDA ($M)', kind: 'money' },
  sdeM: { column: 'sdeM', label: 'SDE ($M)', kind: 'money' },
  evM: { column: 'evM', label: 'Enterprise Value / TEV ($M)', kind: 'money' },
  businessProfile: { column: 'businessProfile', label: 'Business profile', kind: 'text' },
  subIndustry: { column: 'subIndustry', label: 'Sub-industry', kind: 'text' },
  valuationBasis: { column: 'valuationBasis', label: 'Valuation basis', kind: 'text' },
};

export const FIELD_LIST = Object.entries(CIM_FIELDS)
  .map(([k, v]) => `- ${k}: ${v.label}${v.kind === 'money' ? ' (numeric, in $ millions)' : ''}`)
  .join('\n');
