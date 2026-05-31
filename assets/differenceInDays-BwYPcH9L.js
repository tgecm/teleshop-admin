import{c as i}from"./index-Ca7VgzlI.js";import{n as a,d as r}from"./date-ri-P5uMW.js";/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]],h=i("zap",l);function y(n,s,t){const[e,c]=a(t==null?void 0:t.in,n,s),o=d(e,c),g=Math.abs(r(e,c));e.setDate(e.getDate()-o*g);const f=+(d(e,c)===-o),u=o*(g-f);return u===0?0:u}function d(n,s){const t=n.getFullYear()-s.getFullYear()||n.getMonth()-s.getMonth()||n.getDate()-s.getDate()||n.getHours()-s.getHours()||n.getMinutes()-s.getMinutes()||n.getSeconds()-s.getSeconds()||n.getMilliseconds()-s.getMilliseconds();return t<0?-1:t>0?1:t}export{h as Z,y as d};
