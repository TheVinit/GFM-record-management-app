/**
 * Data Validation & Safety Utilities
 * Prevents crashes from invalid, undefined, null, or mismatched data.
 */

// ============= SAFE VALUE EXTRACTORS =============

/** Safe string: never returns undefined/null */
export const safeStr = (val: unknown, fallback = ''): string => {
    if (val == null) return fallback;
    if (typeof val === 'string') return val;
    return String(val);
};

/** Safe number: never returns NaN/undefined/null */
export const safeNum = (val: unknown, fallback = 0): number => {
    if (val == null) return fallback;
    const n = typeof val === 'number' ? val : Number(val);
    return isNaN(n) ? fallback : n;
};

/** Safe boolean */
export const safeBool = (val: unknown, fallback = false): boolean => {
    if (val == null) return fallback;
    if (typeof val === 'boolean') return val;
    if (val === 'true' || val === 1) return true;
    if (val === 'false' || val === 0) return false;
    return fallback;
};

/** Safe array: ensures a value is always an array */
export const safeArr = <T>(val: unknown, fallback: T[] = []): T[] => {
    if (Array.isArray(val)) return val;
    return fallback;
};

/** Safe object property access with fallback */
export const safeProp = <T>(obj: unknown, key: string, fallback: T): T => {
    if (obj == null || typeof obj !== 'object') return fallback;
    const val = (obj as Record<string, unknown>)[key];
    return (val != null ? val : fallback) as T;
};

// ============= API RESPONSE VALIDATION =============

export interface SafeResponse<T> {
    data: T | null;
    error: string | null;
    ok: boolean;
}

/** Wraps an async API call with error handling */
export async function safeApiCall<T>(
    fn: () => Promise<T>,
    context?: string
): Promise<SafeResponse<T>> {
    try {
        const data = await fn();
        return { data, error: null, ok: true };
    } catch (err: any) {
        const msg = err?.message || err?.toString?.() || 'Unknown error';
        console.error(`[safeApiCall${context ? ': ' + context : ''}]`, msg);
        return { data: null, error: msg, ok: false };
    }
}

/** Validates a Supabase response { data, error } and returns cleaned data */
export function validateSupabaseResponse<T>(
    result: { data: T | null; error: any },
    fallback: T,
    context?: string
): T {
    if (result.error) {
        console.error(`[Supabase${context ? ': ' + context : ''}]`, result.error.message || result.error);
        return fallback;
    }
    return result.data ?? fallback;
}

// ============= DATA SHAPE VALIDATORS =============

/** Ensure a student object has all required safe defaults */
export function safeStudent(raw: Record<string, any>): Record<string, any> {
    return {
        prn: safeStr(raw.prn),
        fullName: safeStr(raw.fullName || raw.full_name),
        rollNo: safeStr(raw.rollNo || raw.roll_no),
        email: safeStr(raw.email),
        phone: safeStr(raw.phone),
        branch: safeStr(raw.branch, 'CSE'),
        division: safeStr(raw.division, 'A'),
        yearOfStudy: safeStr(raw.yearOfStudy || raw.year_of_study, 'First Year'),
        gender: safeStr(raw.gender),
        dob: safeStr(raw.dob),
        // category: safeStr(raw.category), // Removed as per user request
        photoUri: safeStr(raw.photoUri || raw.photo_uri),
        permanentAddress: safeStr(raw.permanentAddress || raw.permanent_address),
        temporaryAddress: safeStr(raw.temporaryAddress || raw.temporary_address),
        fatherName: safeStr(raw.fatherName || raw.father_name),
        motherName: safeStr(raw.motherName || raw.mother_name),
        fatherPhone: safeStr(raw.fatherPhone || raw.father_phone),
        annualIncome: safeStr(raw.annualIncome || raw.annual_income, '0'),
    };
}

/** Ensure a fee payment object has safe defaults */
export function safeFeePayment(raw: Record<string, any>): Record<string, any> {
    return {
        id: safeNum(raw.id),
        prn: safeStr(raw.prn),
        totalFee: safeNum(raw.totalFee || raw.total_fee),
        amountPaid: safeNum(raw.amountPaid || raw.amount_paid),
        remainingBalance: safeNum(raw.remainingBalance || raw.remaining_balance),
        receiptUri: safeStr(raw.receiptUri || raw.receipt_uri),
        verificationStatus: safeStr(raw.verificationStatus || raw.verification_status, 'Pending'),
        paymentDate: safeStr(raw.paymentDate || raw.payment_date),
        installmentNumber: safeNum(raw.installmentNumber || raw.installment_number, 1),
        academicYear: safeStr(raw.academicYear || raw.academic_year, 'N/A'),
    };
}

// ============= RENDER SAFETY =============

/** Prevents rendering when data isn't ready. Returns true if safe to render. */
export const isDataReady = (...deps: unknown[]): boolean => {
    return deps.every(d => d != null && d !== undefined);
};

/** Format currency safely */
export const safeCurrency = (val: unknown, symbol = '₹'): string => {
    const n = safeNum(val);
    return `${symbol}${n.toLocaleString('en-IN')}`;
};

/** Safe date formatting */
export const safeDate = (val: unknown, fallback = 'N/A'): string => {
    if (!val) return fallback;
    const str = String(val);
    try {
        const d = new Date(str);
        if (isNaN(d.getTime())) return fallback;
        return d.toLocaleDateString('en-IN');
    } catch {
        return fallback;
    }
};

// ============= CSV VALIDATION =============

/** Validate a CSV row has required fields */
export function validateCSVRow(
    row: Record<string, any>,
    requiredFields: string[],
    rowIndex: number
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    for (const field of requiredFields) {
        if (!row[field] || String(row[field]).trim() === '') {
            errors.push(`Row ${rowIndex + 1}: Missing required field "${field}"`);
        }
    }
    return { valid: errors.length === 0, errors };
}

/** Validate an entire CSV dataset */
export function validateCSVData(
    data: Record<string, any>[],
    requiredFields: string[]
): { valid: Record<string, any>[]; invalid: { row: number; errors: string[] }[] } {
    const valid: Record<string, any>[] = [];
    const invalid: { row: number; errors: string[] }[] = [];

    data.forEach((row, i) => {
        const result = validateCSVRow(row, requiredFields, i);
        if (result.valid) {
            valid.push(row);
        } else {
            invalid.push({ row: i + 1, errors: result.errors });
        }
    });

    return { valid, invalid };
}
