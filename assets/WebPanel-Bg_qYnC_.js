import{J as t,z as e}from"./index-BSIgC2oS.js";const Ee="https://api.telegramecommerce.shop/api/webpanel",c={SIGNUP:"signup",CHANGEPW:"changepw",FORGOT:"forgot",SUCCESS:"success"},r={BOT:0,BOT_CODE:1,EMAIL:2,EMAIL_CODE:3,PASSWORD:4};function Oe(){const[y,l]=t.useState(null),[re,ke]=t.useState(""),[o,h]=t.useState(r.BOT),[f,B]=t.useState(""),[A,M]=t.useState(""),[m,G]=t.useState(""),[T,Y]=t.useState(""),[u,W]=t.useState(""),[V,$]=t.useState(""),[N,H]=t.useState(r.BOT),[S,J]=t.useState(""),[I,te]=t.useState(""),[E,ne]=t.useState(""),[Z,ie]=t.useState(""),[R,q]=t.useState(""),[F,oe]=t.useState(""),[k,ce]=t.useState(""),[K,le]=t.useState(""),[de,Q]=t.useState({}),[P,pe]=t.useState({}),[d,X]=t.useState({remaining:0,show:!1}),b=t.useRef(null),[z,we]=t.useState({icon:"✅",title:"Done!",msg:""}),D=t.useRef(null),n=(s,a,w)=>{Q(x=>({...x,[s]:{msg:a,type:w}}))},i=s=>{Q(a=>({...a,[s]:null}))},O=(s,a)=>{pe(w=>({...w,[s]:a}))},C=s=>{b.current&&clearInterval(b.current),X({remaining:s,show:!0}),b.current=setInterval(()=>{X(a=>a.remaining<=1?(clearInterval(b.current),b.current=null,{remaining:0,show:!1}):{...a,remaining:a.remaining-1})},1e3)};t.useEffect(()=>()=>{b.current&&clearInterval(b.current)},[]);const p=async(s,a)=>{const w=await fetch(Ee+s,{method:"POST",mode:"cors",credentials:"omit",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)}),x=await w.json();if(!w.ok){const ae=new Error(x.message||x.detail||"Request failed");throw ae.data=x,ae}return x};t.useEffect(()=>{l(c.SIGNUP)},[]);const ee=s=>{let a=s.trim();return a=a.replace(/^https?:\/\/(www\.)?t\.me\//,""),a=a.replace(/^t\.me\//,""),a=a.replace(/^@/,""),a=a.split("/")[0].split("?")[0],a},se=s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),ue=async()=>{const s=ee(f);if(!s)return n("signup","Please enter a valid bot username.","error");O("suBotSend",!0),i("signup");try{await p("/send-bot-code",{bot_username:s}),B(s),h(r.BOT_CODE),C(60)}catch(a){n("signup",a.message||"Failed to send code to bot owner.","error")}O("suBotSend",!1)},me=async()=>{if(A.length!==6)return n("signup2","Enter the 6-digit code from Telegram.","error");i("signup2");try{await p("/verify-bot-code",{bot_username:f,code:A}),h(r.EMAIL)}catch(s){n("signup2",s.message||"Incorrect code.","error")}},ge=async()=>{if(!se(m))return n("signup3","Please enter a valid email address.","error");O("suSend",!0),i("signup3");try{await p("/send-code",{email:m,flow:"signup",bot_username:f}),h(r.EMAIL_CODE),C(60)}catch(s){n("signup3",s.message||"Failed to send code. Try again.","error")}O("suSend",!1)},xe=async()=>{i("signup4");try{await p("/send-code",{email:m,flow:"signup",bot_username:f}),C(60)}catch{n("signup4","Failed to resend. Try again.","error")}},he=async()=>{if(T.length!==6)return n("signup4","Enter the 6-digit code.","error");i("signup4");try{await p("/verify-code",{email:m,code:T,flow:"signup"}),h(r.PASSWORD)}catch(s){n("signup4",s.message||"Incorrect code.","error")}},fe=async()=>{if(i("signup5"),u.length<6)return n("signup5","Password must be at least 6 characters.","error");if(u!==V)return n("signup5","Passwords do not match.","error");try{const s=await p("/signup",{email:m,password:u,bot_username:f});s.ok?_("🎉","Account Created!",`Your web panel is ready. Log in with ${m}.`,()=>{U(),l(c.SIGNUP)}):n("signup5",s.message||"Failed to create account.","error")}catch(s){n("signup5",s.message||"Network error.","error")}},U=()=>{h(r.BOT),B(""),M(""),G(""),Y(""),W(""),$(""),i("signup"),i("signup2"),i("signup3"),i("signup4"),i("signup5")},be=async()=>{if(i("changepw"),!R)return n("changepw","Enter your email address.","error");if(!F)return n("changepw","Enter your current password.","error");if(k.length<6)return n("changepw","New password must be at least 6 characters.","error");if(k!==K)return n("changepw","New passwords do not match.","error");try{await p("/change-password",{email:R,old_password:F,new_password:k}),_("🔑","Password Changed","Your password has been updated successfully.",()=>l(c.SIGNUP))}catch(s){n("changepw",s.message||"Current password is incorrect.","error")}},ve=async()=>{var a;const s=((a=document.getElementById("fp-email"))==null?void 0:a.value)||S;if(!se(s))return n("forgot","Enter a valid email address.","error");i("forgot"),J(s);try{await p("/send-code",{email:s,flow:"forgot"}),H(r.BOT_CODE),C(60)}catch(w){n("forgot",w.message||"Could not send reset code.","error")}},je=async()=>{i("forgot2");try{await p("/send-code",{email:S,flow:"forgot"}),C(60)}catch{}},ye=async()=>{if(i("forgot2"),I.length!==6)return n("forgot2","Enter the 6-digit code.","error");if(E.length<6)return n("forgot2","Password must be at least 6 characters.","error");if(E!==Z)return n("forgot2","Passwords do not match.","error");try{await p("/reset-password",{email:S,code:I,new_password:E}),_("✅","Password Reset","Your password has been reset. You can now log in.",()=>l(c.SIGNUP))}catch(s){n("forgot2",s.message||"Reset failed. Check the code.","error")}},_=(s,a,w,x)=>{we({icon:s,title:a,msg:w}),D.current=x,l(c.SUCCESS)},Ne=()=>{D.current?D.current():l(c.SIGNUP)},L=s=>{let a=0;return s.length>=6&&a++,s.length>=10&&a++,/[A-Z]/.test(s)&&/[0-9]/.test(s)&&a++,/[^A-Za-z0-9]/.test(s)&&a++,a},Ce=["#f87171","#fb923c","#facc15","#4ade80"],Se=["Too short","Weak","Fair","Strong","Very strong"],g=s=>{const a=de[s];return a?e.jsx("div",{className:`alert ${a.type}`,children:a.msg}):null},v=(s,a)=>a?"step-dot done":s?"step-dot active":"step-dot",j=s=>e.jsx("button",{type:"button",className:"eye-btn",tabIndex:-1,onClick:()=>{const a=document.getElementById(s);a&&(a.type=a.type==="password"?"text":"password")},children:"👁"});return y===null?null:e.jsxs("div",{className:"wp-wrapper",children:[e.jsx("style",{children:`
        :root {
          --wp-bg: #f8f9fc;
          --wp-surface: #fff;
          --wp-card: #fff;
          --wp-border: #e8ecf1;
          --wp-accent: #4f6ef7;
          --wp-accent-light: rgba(79,110,247,0.08);
          --wp-accent2: #825ee4;
          --wp-text: #1a1d26;
          --wp-muted: #888e9e;
          --wp-success: #22c55e;
          --wp-error: #ef4444;
          --wp-warn: #f59e0b;
          --wp-shadow: 0 4px 24px rgba(0,0,0,0.06);
          --wp-shadow-lg: 0 12px 48px rgba(0,0,0,0.08);
        }
        .wp-wrapper {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: var(--wp-bg);
          color: var(--wp-text);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
        }
        .wp-wrapper::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 50% 40% at 15% 20%, rgba(79,110,247,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 40% 50% at 85% 80%, rgba(130,94,228,0.05) 0%, transparent 60%);
          pointer-events: none;
        }
        .wp-container { position: relative; z-index: 1; width: 100%; max-width: 420px; }
        .wp-brand { text-align: center; margin-bottom: 36px; }
        .wp-brand-icon {
          width: 52px; height: 52px;
          background: linear-gradient(135deg, var(--wp-accent), var(--wp-accent2));
          border-radius: 14px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 24px; margin-bottom: 14px;
          box-shadow: 0 8px 24px rgba(79,110,247,0.25);
          transition: transform 0.3s ease;
        }
        .wp-brand-icon:hover { transform: scale(1.05) rotate(-2deg); }
        .wp-brand h1 {
          font-size: 23px; font-weight: 700; letter-spacing: -0.4px;
          color: var(--wp-text); margin: 0;
        }
        .wp-brand p { font-size: 14px; color: var(--wp-muted); margin-top: 5px; }
        .wp-card {
          background: var(--wp-card);
          border: 1px solid var(--wp-border);
          border-radius: 20px;
          padding: 32px 28px;
          box-shadow: var(--wp-shadow-lg);
          animation: wpFadeUp 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes wpFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .wp-card-title { font-size: 19px; font-weight: 700; margin-bottom: 4px; color: var(--wp-text); }
        .wp-card-sub { font-size: 13.5px; color: var(--wp-muted); margin-bottom: 24px; line-height: 1.6; }
        .wp-field { margin-bottom: 18px; }
        .wp-field label {
          display: block; font-size: 12.5px; font-weight: 600;
          color: var(--wp-text); margin-bottom: 7px; letter-spacing: 0.2px;
        }
        .wp-input-wrap { position: relative; }
        .wp-input-wrap input {
          width: 100%; background: var(--wp-surface);
          border: 1.5px solid var(--wp-border);
          border-radius: 12px; padding: 12px 44px 12px 16px;
          color: var(--wp-text); font-size: 14px;
          outline: none; transition: all 0.2s ease;
          box-sizing: border-box;
        }
        .wp-input-wrap input:focus {
          border-color: var(--wp-accent);
          box-shadow: 0 0 0 4px var(--wp-accent-light);
        }
        .wp-input-wrap input::placeholder { color: #b0b6c4; }
        .wp-input-wrap .eye-btn {
          position: absolute; right: 13px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--wp-muted); font-size: 17px; padding: 4px; line-height: 1;
          border-radius: 6px; transition: all 0.15s;
        }
        .wp-input-wrap .eye-btn:hover { background: var(--wp-accent-light); color: var(--wp-accent); }
        .wp-pw-hint { font-size: 11.5px; color: var(--wp-muted); margin-top: 6px; }
        .wp-strength-bar { display: flex; gap: 5px; margin-top: 10px; }
        .wp-strength-seg { height: 4px; flex: 1; border-radius: 4px; background: #eef0f4; transition: background 0.3s; }
        .wp-code-row { display: flex; gap: 10px; align-items: stretch; }
        .wp-code-row input {
          flex: 1; letter-spacing: 4px; text-align: center;
          font-size: 22px; font-weight: 700; padding: 12px 8px;
          font-variant-numeric: tabular-nums;
        }
        .wp-send-code-btn {
          padding: 12px 16px; border: none; border-radius: 12px;
          background: var(--wp-accent-light); color: var(--wp-accent);
          font-size: 12px; font-weight: 600; cursor: pointer;
          white-space: nowrap; min-width: 92px;
          transition: all 0.2s ease; border: 1px solid transparent;
        }
        .wp-send-code-btn:hover:not(:disabled) { background: rgba(79,110,247,0.15); }
        .wp-send-code-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .wp-btn-primary {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, var(--wp-accent), var(--wp-accent2));
          border: none; border-radius: 12px; color: #fff;
          font-size: 15px; font-weight: 600; cursor: pointer;
          margin-top: 10px; letter-spacing: 0.2px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 16px rgba(79,110,247,0.3);
        }
        .wp-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(79,110,247,0.4); }
        .wp-btn-primary:active { transform: translateY(0); box-shadow: 0 2px 8px rgba(79,110,247,0.3); }
        .wp-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
        .wp-btn-primary .spinner {
          display: inline-block; width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff;
          border-radius: 50%; animation: wpSpin 0.6s linear infinite;
          vertical-align: middle; margin-right: 8px;
        }
        @keyframes wpSpin { to { transform: rotate(360deg); } }
        .alert {
          border-radius: 12px; padding: 12px 16px;
          font-size: 13px; margin-bottom: 18px;
          line-height: 1.5; display: flex; align-items: center; gap: 8px;
          animation: wpFadeUp 0.25s ease;
        }
        .alert.success { background: #ecfdf5; border: 1px solid #bbf7d0; color: #15803d; }
        .alert.error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
        .alert.info { background: #eef2ff; border: 1px solid #c7d2fe; color: #4338ca; }
        .wp-link-btn { background: none; border: none; color: var(--wp-accent); font-size: 13px; cursor: pointer; font-weight: 500; padding: 4px 0; transition: all 0.15s; }
        .wp-link-btn:hover { color: var(--wp-accent2); opacity: 0.8; }
        .wp-steps { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 28px; }
        .step-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #dce0e8; transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .step-dot.done { background: var(--wp-success); transform: scale(1.1); }
        .step-dot.active { background: var(--wp-accent); width: 28px; border-radius: 4px; }
        .wp-timer { font-size: 12px; color: var(--wp-warn); margin-top: 8px; font-weight: 500; }
        .wp-success-icon { text-align: center; font-size: 52px; margin-bottom: 14px; animation: wpPop 0.45s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes wpPop { from { transform: scale(0.3) rotate(-8deg); opacity: 0; } to { transform: scale(1) rotate(0); opacity: 1; } }
        .wp-divider { margin: 22px 0; display: flex; align-items: center; gap: 14px; color: var(--wp-muted); font-size: 12px; }
        .wp-divider-line { flex: 1; height: 1px; background: var(--wp-border); }
        .wp-footer { text-align: center; margin-top: 22px; font-size: 13px; color: var(--wp-muted); }
      `}),e.jsxs("div",{className:"wp-container",children:[e.jsxs("div",{className:"wp-brand",children:[e.jsx("div",{className:"wp-brand-icon",children:"🛍"}),e.jsx("h1",{children:"Telegram E-commerce"}),e.jsx("p",{children:"Web Panel Access"})]}),y===c.SIGNUP&&e.jsxs("div",{className:"wp-card",children:[e.jsxs("div",{className:"wp-steps",children:[e.jsx("div",{className:v(o===r.BOT,!1)}),e.jsx("div",{className:v(o===r.BOT_CODE,o>r.BOT)}),e.jsx("div",{className:v(o===r.EMAIL,o>r.BOT_CODE)}),e.jsx("div",{className:v(o===r.EMAIL_CODE,o>r.EMAIL)}),e.jsx("div",{className:v(o===r.PASSWORD,o>r.EMAIL_CODE)})]}),o===r.BOT&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"wp-card-title",children:"Enter Bot Username"}),e.jsx("div",{className:"wp-card-sub",children:"Enter your Telegram bot's username. A verification code will be sent to the bot owner."}),g("signup"),e.jsxs("div",{className:"wp-field",children:[e.jsx("label",{children:"Bot Username"}),e.jsx("div",{className:"wp-input-wrap",children:e.jsx("input",{type:"text",value:f,onChange:s=>B(ee(s.target.value)),placeholder:"@yourbot or t.me/yourbot",autoComplete:"off"})})]}),e.jsx("button",{className:"wp-btn-primary",onClick:ue,disabled:P.suBotSend,children:P.suBotSend?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"spinner"}),"Sending…"]}):"Send Code to Bot Owner"}),e.jsxs("div",{className:"wp-divider",children:[e.jsx("span",{className:"wp-divider-line"}),e.jsx("span",{children:"or"}),e.jsx("span",{className:"wp-divider-line"})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("button",{className:"wp-link-btn",onClick:()=>{l(c.FORGOT),J(""),H(r.BOT),i("forgot")},style:{flex:1,textAlign:"center"},children:"Forgot Password?"}),e.jsx("button",{className:"wp-link-btn",onClick:()=>{l(c.CHANGEPW),q(""),i("changepw")},style:{flex:1,textAlign:"center"},children:"Change Password"})]})]}),o===r.BOT_CODE&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"wp-card-title",children:"Check Telegram"}),e.jsxs("div",{className:"wp-card-sub",children:["A verification code was sent to the owner of ",e.jsxs("strong",{children:["@",f]}),". Enter it below."]}),g("signup2"),e.jsxs("div",{className:"wp-field",children:[e.jsx("label",{children:"Confirmation Code"}),e.jsx("div",{className:"wp-code-row",children:e.jsx("div",{className:"wp-input-wrap",style:{flex:1},children:e.jsx("input",{type:"text",value:A,onChange:s=>M(s.target.value.replace(/\D/g,"").slice(0,6)),placeholder:"000000",maxLength:6,inputMode:"numeric"})})})]}),e.jsx("button",{className:"wp-btn-primary",onClick:me,children:"Verify Bot"}),e.jsx("div",{style:{textAlign:"center",marginTop:14},children:e.jsx("button",{className:"wp-link-btn",onClick:()=>{h(r.BOT),i("signup")},children:"← Use different bot"})})]}),o===r.EMAIL&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"wp-card-title",children:"Your Email"}),e.jsx("div",{className:"wp-card-sub",children:"Enter your email to receive a confirmation code for login."}),g("signup3"),e.jsxs("div",{className:"wp-field",children:[e.jsx("label",{children:"Email Address"}),e.jsx("div",{className:"wp-input-wrap",children:e.jsx("input",{type:"email",value:m,onChange:s=>G(s.target.value),placeholder:"you@example.com",autoComplete:"email"})})]}),e.jsx("button",{className:"wp-btn-primary",onClick:ge,disabled:P.suSend,children:P.suSend?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"spinner"}),"Sending…"]}):"Send Confirmation Code"})]}),o===r.EMAIL_CODE&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"wp-card-title",children:"Check Your Inbox"}),e.jsxs("div",{className:"wp-card-sub",children:["Enter the 6-digit code sent to ",e.jsx("strong",{children:m})]}),g("signup4"),e.jsxs("div",{className:"wp-field",children:[e.jsx("label",{children:"Confirmation Code"}),e.jsxs("div",{className:"wp-code-row",children:[e.jsx("div",{className:"wp-input-wrap",style:{flex:1},children:e.jsx("input",{type:"text",value:T,onChange:s=>Y(s.target.value.replace(/\D/g,"").slice(0,6)),placeholder:"000000",maxLength:6,inputMode:"numeric"})}),e.jsx("button",{className:"wp-send-code-btn",onClick:xe,disabled:d.remaining>0,children:d.remaining>0?`${d.remaining}s`:"Resend"})]}),d.show&&e.jsxs("div",{className:"wp-timer",children:["Resend in ",d.remaining,"s"]})]}),e.jsx("button",{className:"wp-btn-primary",onClick:he,children:"Verify Code"}),e.jsx("div",{style:{textAlign:"center",marginTop:14},children:e.jsx("button",{className:"wp-link-btn",onClick:()=>{h(r.EMAIL),i("signup3")},children:"← Use different email"})})]}),o===r.PASSWORD&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"wp-card-title",children:"Set Your Password"}),e.jsx("div",{className:"wp-card-sub",children:"Choose a secure password for your web panel."}),g("signup5"),e.jsxs("div",{className:"wp-field",children:[e.jsx("label",{children:"Password"}),e.jsxs("div",{className:"wp-input-wrap",children:[e.jsx("input",{id:"su-pw1",type:"password",value:u,onChange:s=>W(s.target.value),placeholder:"At least 6 characters"}),j("su-pw1")]}),e.jsx("div",{className:"wp-strength-bar",children:[0,1,2,3].map(s=>e.jsx("div",{className:"wp-strength-seg",style:u.length>0&&s<L(u)?{background:Ce[Math.min(L(u)-1,3)]}:{}},s))}),e.jsx("div",{className:"wp-pw-hint",children:u.length===0?"Minimum 6 characters":Se[L(u)]})]}),e.jsxs("div",{className:"wp-field",children:[e.jsx("label",{children:"Confirm Password"}),e.jsxs("div",{className:"wp-input-wrap",children:[e.jsx("input",{id:"su-pw2",type:"password",value:V,onChange:s=>$(s.target.value),placeholder:"Repeat password"}),j("su-pw2")]})]}),e.jsx("button",{className:"wp-btn-primary",onClick:fe,children:"Create Account"})]})]}),y===c.CHANGEPW&&e.jsxs("div",{className:"wp-card",children:[e.jsx("div",{className:"wp-card-title",children:"Change Password"}),e.jsx("div",{className:"wp-card-sub",children:"Enter your email and current password, then choose a new one."}),g("changepw"),e.jsxs("div",{className:"wp-field",children:[e.jsx("label",{children:"Email"}),e.jsx("div",{className:"wp-input-wrap",children:e.jsx("input",{type:"email",value:R,onChange:s=>q(s.target.value),placeholder:"Your email address",autoComplete:"email"})})]}),e.jsxs("div",{className:"wp-field",children:[e.jsx("label",{children:"Current Password"}),e.jsxs("div",{className:"wp-input-wrap",children:[e.jsx("input",{id:"cp-old",type:"password",value:F,onChange:s=>oe(s.target.value),placeholder:"Current password"}),j("cp-old")]})]}),e.jsxs("div",{className:"wp-field",children:[e.jsx("label",{children:"New Password"}),e.jsxs("div",{className:"wp-input-wrap",children:[e.jsx("input",{id:"cp-new1",type:"password",value:k,onChange:s=>ce(s.target.value),placeholder:"At least 6 characters"}),j("cp-new1")]})]}),e.jsxs("div",{className:"wp-field",children:[e.jsx("label",{children:"Confirm New Password"}),e.jsxs("div",{className:"wp-input-wrap",children:[e.jsx("input",{id:"cp-new2",type:"password",value:K,onChange:s=>le(s.target.value),placeholder:"Repeat new password"}),j("cp-new2")]})]}),e.jsx("button",{className:"wp-btn-primary",onClick:be,children:"Update Password"}),e.jsx("div",{style:{textAlign:"center",marginTop:14},children:e.jsx("button",{className:"wp-link-btn",onClick:()=>{l(c.SIGNUP),U()},children:"← Back"})})]}),y===c.FORGOT&&e.jsxs("div",{className:"wp-card",children:[e.jsxs("div",{className:"wp-steps",children:[e.jsx("div",{className:v(N===r.BOT,!1)}),e.jsx("div",{className:v(N===r.BOT_CODE,N>r.BOT)})]}),N===r.BOT&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"wp-card-title",children:"Reset Password"}),e.jsx("div",{className:"wp-card-sub",children:"We'll send a confirmation code to your registered email."}),g("forgot"),e.jsxs("div",{className:"wp-field",children:[e.jsx("label",{children:"Registered Email"}),e.jsx("div",{className:"wp-input-wrap",children:e.jsx("input",{id:"fp-email",type:"email",defaultValue:re,placeholder:"Your registered email"})})]}),e.jsx("button",{className:"wp-btn-primary",onClick:ve,children:"Send Reset Code"}),e.jsx("div",{style:{textAlign:"center",marginTop:14},children:e.jsx("button",{className:"wp-link-btn",onClick:()=>{l(c.SIGNUP),U()},children:"← Back"})})]}),N===r.BOT_CODE&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"wp-card-title",children:"Enter Code & New Password"}),e.jsxs("div",{className:"wp-card-sub",children:["Code sent to ",e.jsx("strong",{children:S})]}),g("forgot2"),e.jsxs("div",{className:"wp-field",children:[e.jsx("label",{children:"Confirmation Code"}),e.jsxs("div",{className:"wp-code-row",children:[e.jsx("div",{className:"wp-input-wrap",style:{flex:1},children:e.jsx("input",{type:"text",value:I,onChange:s=>te(s.target.value.replace(/\D/g,"").slice(0,6)),placeholder:"000000",maxLength:6,inputMode:"numeric"})}),e.jsx("button",{className:"wp-send-code-btn",onClick:je,disabled:d.remaining>0,children:d.remaining>0?`${d.remaining}s`:"Resend"})]}),d.show&&e.jsxs("div",{className:"wp-timer",children:["Resend in ",d.remaining,"s"]})]}),e.jsxs("div",{className:"wp-field",children:[e.jsx("label",{children:"New Password"}),e.jsxs("div",{className:"wp-input-wrap",children:[e.jsx("input",{id:"fp-pw1",type:"password",value:E,onChange:s=>ne(s.target.value),placeholder:"At least 6 characters"}),j("fp-pw1")]})]}),e.jsxs("div",{className:"wp-field",children:[e.jsx("label",{children:"Confirm New Password"}),e.jsxs("div",{className:"wp-input-wrap",children:[e.jsx("input",{id:"fp-pw2",type:"password",value:Z,onChange:s=>ie(s.target.value),placeholder:"Repeat password"}),j("fp-pw2")]})]}),e.jsx("button",{className:"wp-btn-primary",onClick:ye,children:"Reset Password"})]})]}),y===c.SUCCESS&&e.jsxs("div",{className:"wp-card",children:[e.jsx("div",{className:"wp-success-icon",children:z.icon}),e.jsx("div",{className:"wp-card-title",style:{textAlign:"center"},children:z.title}),e.jsx("div",{className:"wp-card-sub",style:{textAlign:"center",marginBottom:24},children:z.msg}),e.jsx("button",{className:"wp-btn-primary",onClick:Ne,children:"Got it"})]}),e.jsx("div",{className:"wp-footer",children:"TeleShop Web Panel"})]})]})}export{Oe as default};
