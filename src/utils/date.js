import { tz } from '@date-fns/tz';
import { format } from 'date-fns';

const TZ = 'Asia/Yangon';
const myTZ = tz(TZ);

export const myanmarFormat = (date, fmt) => {
  // Treat naive timestamps from backend as UTC before converting to Myanmar Time
  if (typeof date === 'string' && !date.includes('Z') && !date.includes('+')) {
    date = date.replace(' ', 'T') + '+00:00';
  }
  return format(date, fmt, { in: myTZ });
};
