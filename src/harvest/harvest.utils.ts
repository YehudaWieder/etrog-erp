// src/harvest/harvest.utils.ts

export function calculateHarvestFields(data: {
  totalHarvested?: number;
  totalRejected?: number;
  ownerHarvested?: number;
  ownerRejected?: number;
  classifiedTotal?: number;
  isPartialClassification?: boolean;
}) {
  const totalHarvested = data.totalHarvested || 0;
  const totalRejected = data.totalRejected || 0;
  const ownerHarvested = data.ownerHarvested || 0;
  const ownerRejected = data.ownerRejected || 0;
  const totalAfterRejected = Math.max(totalHarvested - totalRejected, 0);
  const ownerAfterRejected = Math.max(ownerHarvested - ownerRejected, 0);
  const classifiedTotal = data.classifiedTotal || 0;
  const isPartialClassification =
    data.isPartialClassification ?? classifiedTotal < totalAfterRejected;

  return {
    rejectionRate: totalHarvested > 0 ? (totalRejected / totalHarvested) * 100 : 0,
    ownerRejectionRate: ownerHarvested > 0 ? (ownerRejected / ownerHarvested) * 100 : 0,
    totalAfterRejected,
    ownerAfterRejected,
    classifiedTotal,
    isPartialClassification,
  };
}
