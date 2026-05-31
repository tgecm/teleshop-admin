import{c as o,j as t,m as i}from"./index-DQ-sLwyc.js";import{t as l,c as m}from"./date-ri-P5uMW.js";/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c=[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]],f=o("chart-column",c);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]],p=o("dollar-sign",x);function u({title:r,value:s,icon:a,trend:e,color:d="indigo"}){const n={indigo:"from-indigo-500 to-purple-600 shadow-indigo-100",emerald:"from-emerald-500 to-teal-600 shadow-emerald-100",rose:"from-rose-500 to-pink-600 shadow-rose-100",amber:"from-amber-500 to-orange-600 shadow-amber-100"};return t.jsxs(i.div,{whileTap:{scale:.98},className:"bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3 sm:gap-4 active:border-indigo-200 transition-colors",children:[t.jsx("div",{className:`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br ${n[d]} flex items-center justify-center text-white shadow-lg flex-shrink-0`,children:t.jsx(a,{className:"w-5 h-5 sm:w-6 sm:h-6"})}),t.jsxs("div",{className:"min-w-0 flex-1",children:[t.jsx("p",{className:"text-[9px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider truncate",children:r}),t.jsx("h3",{className:"text-xs sm:text-lg md:text-2xl font-bold text-gray-900 leading-tight mt-0.5",children:s}),e&&t.jsxs("p",{className:`text-[10px] sm:text-xs font-bold mt-0.5 ${e>0?"text-emerald-600":"text-rose-600"}`,children:[e>0?"+":"",e,"% from last month"]})]})]})}function w(r,s,a){const e=l(r,a==null?void 0:a.in);return isNaN(s)?m(r,NaN):(s&&e.setDate(e.getDate()+s),e)}export{f as C,p as D,u as S,w as a};
