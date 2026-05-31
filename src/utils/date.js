import { tz } from '@date-fns/tz';
import { format } from 'date-fns';

const TZ = 'Asia/Yangon';
const myTZ = tz(TZ);

export const myanmarFormat = (date, fmt) => format(date, fmt, { in: myTZ });
