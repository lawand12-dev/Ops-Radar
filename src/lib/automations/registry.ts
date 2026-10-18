/**
 * STUB — integration wire-up pending (engine demolished 2026-05-26)
 */
import type { CustomerAutomation } from './types'

export async function listAutomations(_userId: string): Promise<CustomerAutomation[]> {
  return []
}

export async function inspectAutomation(
  _userId: string,
  _id: string,
): Promise<CustomerAutomation | null> {
  return null
}

export async function findAutomationsForEvent(): Promise<CustomerAutomation[]> {
  return []
}

export async function loadAutomationCatalog(): Promise<CustomerAutomation[]> {
  return []
}

export function buildAutomationsSystemBlock(): string {
  return ''
}
