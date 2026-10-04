import type { ClaimCategory, ClaimStatus, PaymentMethod, PropertyKind, UnitKind, UnitState } from "./types";

export const unitKindLabel: Record<UnitKind, string> = {
  appartement: "Appartement",
  studio: "Studio",
  bureau: "Bureau",
  boutique: "Boutique",
  magasin: "Magasin",
};

export const propertyKindLabel: Record<PropertyKind, string> = {
  immeuble: "Immeuble",
  villa: "Villa",
  commercial: "Centre commercial",
  mixte: "Immeuble mixte",
};

export const unitStateLabel: Record<UnitState, string> = {
  paid: "Payé",
  upcoming: "À venir",
  due: "Échéance proche",
  partial: "Partiel",
  late: "En retard",
  vacant: "Vacant",
};

export const methodLabel: Record<PaymentMethod, string> = {
  wave: "Wave",
  orange_money: "Orange Money",
  free_money: "Free Money",
  card: "Carte bancaire",
  cash: "Espèces",
  transfer: "Virement",
};

export const claimCategoryLabel: Record<ClaimCategory, string> = {
  plomberie: "Plomberie",
  electricite: "Électricité",
  serrurerie: "Serrurerie",
  humidite: "Humidité",
  climatisation: "Climatisation",
  parties_communes: "Parties communes",
  autre: "Autre",
};

export const claimStatusLabel: Record<ClaimStatus, string> = {
  open: "Nouvelle",
  in_progress: "En cours",
  scheduled: "Intervention planifiée",
  resolved: "Résolue",
};

export function levelLabel(level: number): string {
  if (level === 0) return "Rez-de-chaussée";
  if (level === 1) return "1er étage";
  return `${level}e étage`;
}

export function levelShort(level: number): string {
  return level === 0 ? "RDC" : `R+${level}`;
}

export function unitTitle(kind: UnitKind, code: string): string {
  return `${unitKindLabel[kind]} ${code}`;
}
