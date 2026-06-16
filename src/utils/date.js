import { tz } from '@date-fns/tz';
import { format } from 'date-fns';

const TZ = 'Asia/Yangon';
const myTZ = tz(TZ);

export const myanmarFormat = (date, fmt) => {
  if (typeof date === 'string') {
    date = date.replace(' ', 'T');
    if (!date.includes('Z') && !date.includes('+')) {
      date += '+00:00';
    }
  }
  return format(date, fmt, { in: myTZ });
};
