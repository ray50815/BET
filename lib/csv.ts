export function parseCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return { header: [], rows: [] };
  const header = lines[0].split(',').map((item) => item.trim());
  const rows = lines.slice(1).map((line) => {
    const values = line.split(',');
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      record[key] = values[index]?.trim() ?? '';
    });
    return record;
  });
  return { header, rows };
}
