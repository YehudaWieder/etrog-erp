import { useCallback } from 'react';
import { saveHarvestSortingBatch } from '../../../../services/classificationsApi';
import type { ClassificationRecord } from '../../../../services/classificationsApi';
import { updateHarvest, type HarvestRecord } from '../../../../services/harvestsApi';
import type { HarvestFormClassificationDraft } from '../../harvestPage.types';
import type { HarvestI18n } from '../../i18n';
import { buildExistingHarvestClassificationsPayload } from '../../utils/harvestFormSubmission.util';
import { translateHarvestApiError } from '../../utils/translateHarvestApiError';

type UseHarvestEditFormSubmissionParams = {
  t: HarvestI18n;
  selectedHarvestRow: HarvestRecord | null;
  form: {
    dateGregorian: string;
    dateHebrew: string;
    fieldId: number;
    totalHarvested: number;
    totalRejected: number;
    ownerHarvested: number;
    ownerRejected: number;
    notes: string;
    isPartialClassification: boolean;
    uncalculatedRejected: number;
    remainsInItalyGradeH: boolean;
    remainsInItalyGradeV: boolean;
  };
  classificationDrafts: HarvestFormClassificationDraft[];
  existingHarvestClassifications: ClassificationRecord[];
  pendingExistingClassificationEdits: Record<number, string>;
  setPendingExistingClassificationEdits: (value: Record<number, string>) => void;
  setClassificationDrafts: (drafts: HarvestFormClassificationDraft[]) => void;
  deletionClassificationIds: number[];
  setDeletionClassificationIds: (value: number[]) => void;
  setIsEditingHarvest: (value: boolean) => void;
  setEditHarvestError: (value: string) => void;
  setIsEditHarvestDialogOpen: (value: boolean) => void;
  setSelectedHarvestRow: (updater: (row: HarvestRecord | null) => HarvestRecord | null) => void;
  setDetailsRecord: (updater: (row: HarvestRecord | null) => HarvestRecord | null) => void;
  refreshHarvestWorkspaceData: () => Promise<HarvestRecord[]>;
};

export function useHarvestEditFormSubmission({
  t,
  selectedHarvestRow,
  form,
  classificationDrafts,
  existingHarvestClassifications,
  pendingExistingClassificationEdits,
  setPendingExistingClassificationEdits,
  setClassificationDrafts,
  deletionClassificationIds,
  setDeletionClassificationIds,
  setIsEditingHarvest,
  setEditHarvestError,
  setIsEditHarvestDialogOpen,
  setSelectedHarvestRow,
  setDetailsRecord,
  refreshHarvestWorkspaceData,
}: UseHarvestEditFormSubmissionParams) {
  const handleEditHarvest = useCallback(async () => {
    if (!selectedHarvestRow) return;

    if (form.uncalculatedRejected > form.totalRejected) {
      setEditHarvestError(
        t.formSubmission.uncalculatedRejectedExceedsTotal(form.uncalculatedRejected, form.totalRejected),
      );
      return;
    }

    const classificationsById = new Map(existingHarvestClassifications.map((record) => [record.id, record]));
    const edits: { classificationId: number; quantity: number }[] = [];
    let classifiedTotalAdjustment = 0;
    for (const [classificationIdStr, rawValue] of Object.entries(pendingExistingClassificationEdits)) {
      const classificationId = Number(classificationIdStr);
      const quantity = Number(rawValue);
      if (!Number.isFinite(quantity) || quantity < 0) {
        setEditHarvestError(t.bulkForm.existingClassificationCellInvalidQuantityError);
        return;
      }
      const oldQuantity = classificationsById.get(classificationId)?.quantity ?? 0;
      classifiedTotalAdjustment += quantity - oldQuantity;
      edits.push({ classificationId, quantity });
    }

    // Deletions are folded into the same batch as quantity-0 edits (the backend deletes a
    // classification whenever an edit brings its quantity to 0) rather than fired as separate,
    // eagerly-committed calls. Sending them as standalone deletes ran each one in its own
    // transaction *before* the compensating edits in this save, so the backend's final-mode
    // consistency check (classifiedTotal must equal net harvested) fired mid-flight against a
    // momentarily-unbalanced total and rejected an otherwise-valid combined change — e.g.
    // deleting a customer's sorting row while adding the same quantity to a general row in the
    // same save. Bundling them ensures that check only runs once, against the final state.
    for (const deletedId of deletionClassificationIds) {
      classifiedTotalAdjustment -= classificationsById.get(deletedId)?.quantity ?? 0;
      edits.push({ classificationId: deletedId, quantity: 0 });
    }

    const classifiedTotal = selectedHarvestRow.classifiedTotal + classifiedTotalAdjustment;

    // Net can never drop below what's already classified, regardless of whether this submission touches
    // any sorting rows — e.g. raising totalRejected together with lowering totalHarvested can push net
    // below classifiedTotal on its own. Catching it here (rather than letting the backend reject the
    // updateHarvest call) gives a clear, immediate message instead of a generic save failure.
    const netQuantity = form.totalHarvested - form.totalRejected;
    if (netQuantity < classifiedTotal) {
      setEditHarvestError(t.formSubmission.apiClassificationsExceedNet(classifiedTotal, netQuantity));
      return;
    }

    const creates = buildExistingHarvestClassificationsPayload({
      t: t.formSubmission,
      harvestId: String(selectedHarvestRow.id),
      isPartialClassification: form.isPartialClassification,
      selectedHarvestSummary: {
        totalHarvested: form.totalHarvested,
        totalRejected: form.totalRejected,
        classifiedTotal,
      },
      classifications: classificationDrafts,
    });

    if (!creates.payloads) {
      setEditHarvestError(creates.error);
      return;
    }

    setIsEditingHarvest(true);
    setEditHarvestError('');
    try {
      // Quantity-related harvest fields are sent through the same batch transaction as the
      // classification edits/creates (rather than a separate updateHarvest call beforehand), so the
      // backend validates net-vs-classified against the *final* combined state. Applying totals first
      // via a standalone updateHarvest call would validate against the still-old classifiedTotal before
      // this transaction's edits land, which can reject perfectly valid combined changes (e.g. lowering
      // net while also lowering an existing sorting's quantity in the same save).
      try {
        await saveHarvestSortingBatch({
          harvestId: selectedHarvestRow.id,
          isPartialClassification: form.isPartialClassification,
          edits,
          creates: creates.payloads.map(({ harvestId: _harvestId, isPartialClassification: _isPartial, ...item }) => item),
          harvestUpdate: {
            totalHarvested: form.totalHarvested,
            totalRejected: form.totalRejected,
            ownerHarvested: form.ownerHarvested,
            ownerRejected: form.ownerRejected,
            notes: form.notes || undefined,
            uncalculatedRejected: form.uncalculatedRejected,
            remainsInItalyGradeH: form.remainsInItalyGradeH,
            remainsInItalyGradeV: form.remainsInItalyGradeV,
          },
        });
      } catch (error) {
        if (error instanceof Error && error.message.trim()) {
          setEditHarvestError(translateHarvestApiError(error.message, t.formSubmission));
        } else {
          setEditHarvestError(t.bulkForm.existingClassificationCellSaveError);
        }
        return;
      }

      // fieldId/date aren't part of the batch's harvestUpdate and aren't subject to the net-vs-classified
      // check, so they can be applied last through the regular partial-update endpoint.
      const fieldOrDateChanged =
        form.fieldId !== selectedHarvestRow.fieldId
        || form.dateGregorian !== selectedHarvestRow.dateGregorian.slice(0, 10);
      if (fieldOrDateChanged) {
        try {
          await updateHarvest({
            id: selectedHarvestRow.id,
            dateGregorian: form.dateGregorian,
            dateHebrew: form.dateHebrew,
            fieldId: form.fieldId,
          });
        } catch (error) {
          if (error instanceof Error && error.message.trim()) {
            setEditHarvestError(translateHarvestApiError(error.message, t.formSubmission));
          } else {
            setEditHarvestError(t.formSubmission.saveFailed);
          }
          return;
        }
      }

      // Everything saved successfully — close the dialog and clear its local state right away, before
      // waiting on the follow-up refetch below. Clearing the pending edits/drafts while the dialog was
      // still open (waiting on the refetch) made the classification rows flash back to their pre-save
      // numbers for a moment, since existingHarvestClassifications itself isn't updated until that
      // refetch resolves. Closing first means the user never sees that stale in-between state.
      setPendingExistingClassificationEdits({});
      setClassificationDrafts([]);
      setDeletionClassificationIds([]);
      setIsEditHarvestDialogOpen(false);

      // Re-fetch from the server rather than assembling the row from the individual responses above:
      // separate calls just landed (batch / field-date update), so the season-wide refetch is the
      // simplest way to get a single, fully consistent row back.
      const freshRecords = await refreshHarvestWorkspaceData();
      const freshRow = freshRecords.find((row) => row.id === selectedHarvestRow.id);
      if (freshRow) {
        setSelectedHarvestRow((prev) => (prev ? { ...prev, ...freshRow } : prev));
        setDetailsRecord((prev) => (prev?.id === freshRow.id ? { ...prev, ...freshRow } : prev));
      }
    } catch {
      setEditHarvestError(t.formSubmission.saveFailed);
    } finally {
      setIsEditingHarvest(false);
    }
  }, [
    classificationDrafts,
    deletionClassificationIds,
    existingHarvestClassifications,
    form,
    pendingExistingClassificationEdits,
    refreshHarvestWorkspaceData,
    selectedHarvestRow,
    setClassificationDrafts,
    setDeletionClassificationIds,
    setDetailsRecord,
    setEditHarvestError,
    setIsEditHarvestDialogOpen,
    setIsEditingHarvest,
    setPendingExistingClassificationEdits,
    setSelectedHarvestRow,
    t,
  ]);

  return { handleEditHarvest };
}
