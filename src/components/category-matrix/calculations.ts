export function calculateRowTotal(data: number[]) {
  return data.reduce((sum, value) => sum + value, 0);
}

export function calculateColumnTotal(all: number[][], monthIndex: number) {
  return all.reduce((sum, row) => sum + row[monthIndex], 0);
}

export function calculateGrandTotal(all: number[][]) {
  return all.reduce((sum, row) => sum + calculateRowTotal(row), 0);
}


