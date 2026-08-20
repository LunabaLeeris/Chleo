export interface ProcessItemOptions {
  itemId: string;
  amount: number;
  domain?: string;
  deduct?: boolean;
}

/**
 * Centralized function to process the usage of an item on the frontend.
 * This delegates the actual effects (duration, emotion deltas, inventory deduction)
 * to the main process via IPC.
 */
export async function processItemUsage(options: ProcessItemOptions): Promise<boolean> {
  const { itemId, amount, domain, deduct } = options;
  if ((window as any).electronAPI?.applyItemEffect) {
    return await (window as any).electronAPI.applyItemEffect(itemId, amount, domain, deduct);
  }
  return false;
}
