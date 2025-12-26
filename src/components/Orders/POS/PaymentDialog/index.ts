// Re-export the original PaymentDialog for backward compatibility
// This allows existing imports like `import PaymentDialog from './POS/PaymentDialog'` to work
export { default } from "../PaymentDialog";

// Also export the modular components for direct use
export * from "./types";
export * from "./steps";
export * from "./utils/paymentCalculations";
