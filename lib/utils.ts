import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAUD(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function generateQuoteNumber(sequence: number): string {
  const year = new Date().getFullYear();
  return `QT-${year}-${String(sequence).padStart(4, "0")}`;
}

export function generateInvoiceNumber(sequence: number): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(sequence).padStart(4, "0")}`;
}

export function generateSwmsNumber(sequence: number): string {
  const year = new Date().getFullYear();
  return `SWMS-${year}-${String(sequence).padStart(4, "0")}`;
}

export function generatePublicToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export function calculateGST(subtotal: number): number {
  return Math.round(subtotal * 0.1 * 100) / 100;
}

export function daysOverdue(dueDate: Date | string): number {
  const due = new Date(dueDate);
  const now = new Date();
  const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export const TRADE_TYPES = [
  { value: "ELECTRICIAN", label: "Electrician" },
  { value: "PLUMBER", label: "Plumber" },
  { value: "HVAC", label: "HVAC Technician" },
  { value: "CARPENTER", label: "Carpenter" },
  { value: "PAINTER", label: "Painter" },
  { value: "BUILDER", label: "Builder" },
  { value: "OTHER", label: "Other" },
] as const;

export const AUSTRALIAN_STATES = [
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "SA", label: "South Australia" },
  { value: "WA", label: "Western Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "NT", label: "Northern Territory" },
  { value: "ACT", label: "Australian Capital Territory" },
] as const;

export const STATE_REGULATORS: Record<string, string> = {
  NSW: "SafeWork NSW",
  VIC: "WorkSafe Victoria",
  QLD: "Workplace Health and Safety Queensland (WHSQ)",
  SA: "SafeWork SA",
  WA: "WorkSafe WA",
  TAS: "WorkSafe Tasmania",
  NT: "NT WorkSafe",
  ACT: "WorkSafe ACT",
};
