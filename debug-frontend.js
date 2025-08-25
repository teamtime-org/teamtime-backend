// Script para debuggear el problema de la matriz
// Simular los datos que llegan del API y la lógica del frontend

const apiData = [
  {
    "id": "32c22ea0-9d10-4f7e-9d1a-2e35fe82691a",
    "taskId": "58e97240-2c8d-4f4d-92aa-d9417a9a6b32",
    "date": "2025-08-18T00:00:00.000Z",
    "hours": "1"
  },
  {
    "id": "b96a89a2-11fe-495d-8157-52a1382f42ad", 
    "taskId": "c777dc39-5dc8-4874-816b-71d162563c9c",
    "date": "2025-08-18T00:00:00.000Z",
    "hours": "1"
  }
];

// Simular la función normalizeDateString del frontend
const normalizeDateString = (date) => {
  if (!date) return '';
  
  // Si ya está en formato YYYY-MM-DD, devolverlo
  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // Si tiene T (ISO), simplemente tomar la parte de la fecha sin conversiones
    if (date.includes('T')) {
      return date.split('T')[0];
    }
  }
  
  // Para objetos Date, extraer fecha local
  let dateObj;
  if (date instanceof Date) {
    dateObj = date;
  } else {
    dateObj = new Date(date);
  }
  
  if (isNaN(dateObj.getTime())) return '';
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// Simular exactamente como el frontend genera la semana
// Crear weekStart simulando que hoy es 18 de agosto
const simulatedToday = new Date('2025-08-18T10:00:00'); // Un día típico
const dayOfWeek = simulatedToday.getDay();
const monday = new Date(simulatedToday);
monday.setDate(simulatedToday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
monday.setHours(12, 0, 0, 0);
const weekStart = monday;

const weekDays = Array.from({ length: 7 }, (_, i) => {
  const day = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i, 12, 0, 0);
  return day;
});

console.log('=== DEBUG FRONTEND LOGIC ===');
console.log('Week start:', weekStart);
console.log('Generated week days:');
weekDays.forEach((day, i) => {
  console.log(`  ${i}: ${day.toISOString()} -> normalized: "${normalizeDateString(day)}"`);
});

console.log('\nAPI data entries:');
apiData.forEach(entry => {
  console.log(`  Entry: ${entry.id.slice(0, 8)}... -> date: "${entry.date}" -> normalized: "${normalizeDateString(entry.date)}"`);
});

console.log('\nMatching logic test:');
const taskId = "58e97240-2c8d-4f4d-92aa-d9417a9a6b32";
weekDays.forEach((day, i) => {
  const targetDateStr = normalizeDateString(day);
  const entry = apiData.find(entry => {
    const entryDateStr = normalizeDateString(entry.date);
    return entry.taskId === taskId && entryDateStr === targetDateStr;
  });
  
  console.log(`  Day ${i} (${targetDateStr}): ${entry ? `Found hours: ${entry.hours}` : 'No entry found'}`);
});

console.log('\nWeek range check:');
const startFormatted = normalizeDateString(weekStart);
const endFormatted = normalizeDateString(weekDays[6]);
console.log(`Week range: ${startFormatted} to ${endFormatted}`);
console.log(`Entry "2025-08-18" should be in range: ${startFormatted <= "2025-08-18" && "2025-08-18" <= endFormatted}`);