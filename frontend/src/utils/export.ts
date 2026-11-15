import type { AcademicDataset, OptimizationResult } from '../types/academic';

export function downloadJsonFile(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadOptimizationCsv(result: OptimizationResult): void {
  const headers = [
    'exam_id',
    'exam_name',
    'subject_code',
    'subject_name',
    'teacher_name',
    'original_date',
    'original_time',
    'proposed_date',
    'proposed_time',
    'proposed_slot_type',
    'changed',
    'contextual_incident_before',
    'contextual_incident_after',
    'isolated_penalty_delta',
    'reason',
  ];

  const escapeCsv = (val: unknown) => {
    const str = String(val ?? '');
    return `"${str.replaceAll('"', '""')}"`;
  };

  const rows = result.reschedule_explanations.map((item) =>
    [
      item.exam_id,
      item.exam_name,
      item.subject_code,
      item.subject_name,
      item.teacher_name,
      item.original_date,
      item.original_time,
      item.proposed_date,
      item.proposed_time,
      item.proposed_slot_type,
      item.changed ? 'SI' : 'NO',
      item.contextual_incident_before,
      item.contextual_incident_after,
      item.isolated_penalty_delta,
      item.reason,
    ]
      .map(escapeCsv)
      .join(','),
  );

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `cronograph_resultados_${result.run_id}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function formatSlotTypeLabel(slotType: string): string {
  return slotType === 'authorized_saturday'
    ? 'Sábado autorizado'
    : 'Sesión habitual de clase';
}

export function countDatasetSlots(dataset: AcademicDataset): {
  regular: number;
  saturday: number;
} {
  let regular = 0;
  let saturday = 0;
  for (const exam of dataset.exams) {
    for (const slot of exam.authorized_slots) {
      if (slot.slot_type === 'authorized_saturday') saturday += 1;
      else regular += 1;
    }
  }
  return { regular, saturday };
}
