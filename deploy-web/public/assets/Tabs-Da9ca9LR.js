import{aQ as ut,aR as vt,aS as me,c7 as ht,cf as Z,cg as gt,J as xt,aX as mt,aU as yt,bc as wt,ch as St,h as r,o as i,j as g,k as z,n as Ct,bp as re,aY as ye,ci as ne,l as Rt,_ as $e,$ as Tt,cj as zt,a0 as $t,bl as we,b3 as Pt,a8 as Wt,ck as _t,cl as Lt,a6 as j,b4 as J,a3 as Q}from"./index-BAVTO56l.js";import{A as Et}from"./Add-DqghysFa.js";import{U as be,n as b,r as E,ah as At,F as Bt,W as kt,c as Y,S as oe,Y as jt,ag as It,ab as Ht,ai as Ot,Q as ie,a3 as Ft,ad as I}from"./index-BU1Iooo8.js";const Mt=me(".v-x-scroll",{overflow:"auto",scrollbarWidth:"none"},[me("&::-webkit-scrollbar",{width:0,height:0})]),Dt=be({name:"XScroll",props:{disabled:Boolean,onScroll:Function},setup(){const e=E(null);function o(c){!(c.currentTarget.offsetWidth<c.currentTarget.scrollWidth)||c.deltaY===0||(c.currentTarget.scrollLeft+=c.deltaY+c.deltaX,c.preventDefault())}const l=ut();return Mt.mount({id:"vueuc/x-scroll",head:!0,anchorMetaName:vt,ssr:l}),Object.assign({selfRef:e,handleWheel:o},{scrollTo(...c){var x;(x=e.value)===null||x===void 0||x.scrollTo(...c)}})},render(){return b("div",{ref:"selfRef",onScroll:this.onScroll,onWheel:this.disabled?void 0:this.handleWheel,class:"v-x-scroll"},this.$slots)}});var Nt=/\s/;function Vt(e){for(var o=e.length;o--&&Nt.test(e.charAt(o)););return o}var Ut=/^\s+/;function Xt(e){return e&&e.slice(0,Vt(e)+1).replace(Ut,"")}var Se=NaN,Yt=/^[-+]0x[0-9a-f]+$/i,Gt=/^0b[01]+$/i,Kt=/^0o[0-7]+$/i,qt=parseInt;function Ce(e){if(typeof e=="number")return e;if(ht(e))return Se;if(Z(e)){var o=typeof e.valueOf=="function"?e.valueOf():e;e=Z(o)?o+"":o}if(typeof e!="string")return e===0?e:+e;e=Xt(e);var l=Gt.test(e);return l||Kt.test(e)?qt(e.slice(2),l?2:8):Yt.test(e)?Se:+e}var se=function(){return gt.Date.now()},Jt="Expected a function",Qt=Math.max,Zt=Math.min;function ea(e,o,l){var u,c,x,v,f,h,m=0,y=!1,T=!1,L=!0;if(typeof e!="function")throw new TypeError(Jt);o=Ce(o)||0,Z(l)&&(y=!!l.leading,T="maxWait"in l,x=T?Qt(Ce(l.maxWait)||0,o):x,L="trailing"in l?!!l.trailing:L);function C(s){var _=u,F=c;return u=c=void 0,m=s,v=e.apply(F,_),v}function S(s){return m=s,f=setTimeout(W,o),y?C(s):v}function R(s){var _=s-h,F=s-m,M=o-_;return T?Zt(M,x-F):M}function P(s){var _=s-h,F=s-m;return h===void 0||_>=o||_<0||T&&F>=x}function W(){var s=se();if(P(s))return $(s);f=setTimeout(W,R(s))}function $(s){return f=void 0,L&&u?C(s):(u=c=void 0,v)}function H(){f!==void 0&&clearTimeout(f),m=0,u=h=c=f=void 0}function k(){return f===void 0?v:$(se())}function p(){var s=se(),_=P(s);if(u=arguments,c=this,h=s,_){if(f===void 0)return S(h);if(T)return clearTimeout(f),f=setTimeout(W,o),C(h)}return f===void 0&&(f=setTimeout(W,o)),v}return p.cancel=H,p.flush=k,p}var ta="Expected a function";function aa(e,o,l){var u=!0,c=!0;if(typeof e!="function")throw new TypeError(ta);return Z(l)&&(u="leading"in l?!!l.leading:u,c="trailing"in l?!!l.trailing:c),ea(e,o,{leading:u,maxWait:o,trailing:c})}const Pe=xt("n-tabs"),ra={tab:[String,Number,Object,Function],name:{type:[String,Number],required:!0},disabled:Boolean,displayDirective:{type:String,default:"if"},closable:{type:Boolean,default:void 0},tabProps:Object,label:[String,Number,Object,Function]},na=Object.assign({internalLeftPadded:Boolean,internalAddable:Boolean,internalCreatedByPane:Boolean},St(ra,["displayDirective"])),ce=be({__TAB__:!0,inheritAttrs:!1,name:"Tab",props:na,setup(e){const{mergedClsPrefixRef:o,valueRef:l,typeRef:u,closableRef:c,tabStyleRef:x,addTabStyleRef:v,tabClassRef:f,addTabClassRef:h,tabChangeIdRef:m,onBeforeLeaveRef:y,triggerRef:T,handleAdd:L,activateTab:C,handleClose:S}=kt(Pe);return{trigger:T,mergedClosable:Y(()=>{if(e.internalAddable)return!1;const{closable:R}=e;return R===void 0?c.value:R}),style:x,addStyle:v,tabClass:f,addTabClass:h,clsPrefix:o,value:l,type:u,handleClose(R){R.stopPropagation(),!e.disabled&&S(e.name)},activateTab(){if(e.disabled)return;if(e.internalAddable){L();return}const{name:R}=e,P=++m.id;if(R!==l.value){const{value:W}=y;W?Promise.resolve(W(e.name,l.value)).then($=>{$&&m.id===P&&C(R)}):C(R)}}}},render(){const{internalAddable:e,clsPrefix:o,name:l,disabled:u,label:c,tab:x,value:v,mergedClosable:f,trigger:h,$slots:{default:m}}=this,y=c??x;return b("div",{class:`${o}-tabs-tab-wrapper`},this.internalLeftPadded?b("div",{class:`${o}-tabs-tab-pad`}):null,b("div",Object.assign({key:l,"data-name":l,"data-disabled":u?!0:void 0},At({class:[`${o}-tabs-tab`,v===l&&`${o}-tabs-tab--active`,u&&`${o}-tabs-tab--disabled`,f&&`${o}-tabs-tab--closable`,e&&`${o}-tabs-tab--addable`,e?this.addTabClass:this.tabClass],onClick:h==="click"?this.activateTab:void 0,onMouseenter:h==="hover"?this.activateTab:void 0,style:e?this.addStyle:this.style},this.internalCreatedByPane?this.tabProps||{}:this.$attrs)),b("span",{class:`${o}-tabs-tab__label`},e?b(Bt,null,b("div",{class:`${o}-tabs-tab__height-placeholder`}," "),b(mt,{clsPrefix:o},{default:()=>b(Et,null)})):m?m():typeof y=="object"?y:yt(y??l)),f&&this.type==="card"?b(wt,{clsPrefix:o,class:`${o}-tabs-tab__close`,onClick:this.handleClose,disabled:u}):null))}}),oa=r("tabs",`
 box-sizing: border-box;
 width: 100%;
 display: flex;
 flex-direction: column;
 transition:
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
`,[i("segment-type",[r("tabs-rail",[g("&.transition-disabled",[r("tabs-capsule",`
 transition: none;
 `)])])]),i("top",[r("tab-pane",`
 padding: var(--n-pane-padding-top) var(--n-pane-padding-right) var(--n-pane-padding-bottom) var(--n-pane-padding-left);
 `)]),i("left",[r("tab-pane",`
 padding: var(--n-pane-padding-right) var(--n-pane-padding-bottom) var(--n-pane-padding-left) var(--n-pane-padding-top);
 `)]),i("left, right",`
 flex-direction: row;
 `,[r("tabs-bar",`
 width: 2px;
 right: 0;
 transition:
 top .2s var(--n-bezier),
 max-height .2s var(--n-bezier),
 background-color .3s var(--n-bezier);
 `),r("tabs-tab",`
 padding: var(--n-tab-padding-vertical); 
 `)]),i("right",`
 flex-direction: row-reverse;
 `,[r("tab-pane",`
 padding: var(--n-pane-padding-left) var(--n-pane-padding-top) var(--n-pane-padding-right) var(--n-pane-padding-bottom);
 `),r("tabs-bar",`
 left: 0;
 `)]),i("bottom",`
 flex-direction: column-reverse;
 justify-content: flex-end;
 `,[r("tab-pane",`
 padding: var(--n-pane-padding-bottom) var(--n-pane-padding-right) var(--n-pane-padding-top) var(--n-pane-padding-left);
 `),r("tabs-bar",`
 top: 0;
 `)]),r("tabs-rail",`
 position: relative;
 padding: 3px;
 border-radius: var(--n-tab-border-radius);
 width: 100%;
 background-color: var(--n-color-segment);
 transition: background-color .3s var(--n-bezier);
 display: flex;
 align-items: center;
 `,[r("tabs-capsule",`
 border-radius: var(--n-tab-border-radius);
 position: absolute;
 pointer-events: none;
 background-color: var(--n-tab-color-segment);
 box-shadow: 0 1px 3px 0 rgba(0, 0, 0, .08);
 transition: transform 0.3s var(--n-bezier);
 `),r("tabs-tab-wrapper",`
 flex-basis: 0;
 flex-grow: 1;
 display: flex;
 align-items: center;
 justify-content: center;
 `,[r("tabs-tab",`
 overflow: hidden;
 border-radius: var(--n-tab-border-radius);
 width: 100%;
 display: flex;
 align-items: center;
 justify-content: center;
 `,[i("active",`
 font-weight: var(--n-font-weight-strong);
 color: var(--n-tab-text-color-active);
 `),g("&:hover",`
 color: var(--n-tab-text-color-hover);
 `)])])]),i("flex",[r("tabs-nav",`
 width: 100%;
 position: relative;
 `,[r("tabs-wrapper",`
 width: 100%;
 `,[r("tabs-tab",`
 margin-right: 0;
 `)])])]),r("tabs-nav",`
 box-sizing: border-box;
 line-height: 1.5;
 display: flex;
 transition: border-color .3s var(--n-bezier);
 `,[z("prefix, suffix",`
 display: flex;
 align-items: center;
 `),z("prefix","padding-right: 16px;"),z("suffix","padding-left: 16px;")]),i("top, bottom",[g(">",[r("tabs-nav",[r("tabs-nav-scroll-wrapper",[g("&::before",`
 top: 0;
 bottom: 0;
 left: 0;
 width: 20px;
 `),g("&::after",`
 top: 0;
 bottom: 0;
 right: 0;
 width: 20px;
 `),i("shadow-start",[g("&::before",`
 box-shadow: inset 10px 0 8px -8px rgba(0, 0, 0, .12);
 `)]),i("shadow-end",[g("&::after",`
 box-shadow: inset -10px 0 8px -8px rgba(0, 0, 0, .12);
 `)])])])])]),i("left, right",[r("tabs-nav-scroll-content",`
 flex-direction: column;
 `),g(">",[r("tabs-nav",[r("tabs-nav-scroll-wrapper",[g("&::before",`
 top: 0;
 left: 0;
 right: 0;
 height: 20px;
 `),g("&::after",`
 bottom: 0;
 left: 0;
 right: 0;
 height: 20px;
 `),i("shadow-start",[g("&::before",`
 box-shadow: inset 0 10px 8px -8px rgba(0, 0, 0, .12);
 `)]),i("shadow-end",[g("&::after",`
 box-shadow: inset 0 -10px 8px -8px rgba(0, 0, 0, .12);
 `)])])])])]),r("tabs-nav-scroll-wrapper",`
 flex: 1;
 position: relative;
 overflow: hidden;
 `,[r("tabs-nav-y-scroll",`
 height: 100%;
 width: 100%;
 overflow-y: auto; 
 scrollbar-width: none;
 `,[g("&::-webkit-scrollbar, &::-webkit-scrollbar-track-piece, &::-webkit-scrollbar-thumb",`
 width: 0;
 height: 0;
 display: none;
 `)]),g("&::before, &::after",`
 transition: box-shadow .3s var(--n-bezier);
 pointer-events: none;
 content: "";
 position: absolute;
 z-index: 1;
 `)]),r("tabs-nav-scroll-content",`
 display: flex;
 position: relative;
 min-width: 100%;
 min-height: 100%;
 width: fit-content;
 box-sizing: border-box;
 `),r("tabs-wrapper",`
 display: inline-flex;
 flex-wrap: nowrap;
 position: relative;
 `),r("tabs-tab-wrapper",`
 display: flex;
 flex-wrap: nowrap;
 flex-shrink: 0;
 flex-grow: 0;
 `),r("tabs-tab",`
 cursor: pointer;
 white-space: nowrap;
 flex-wrap: nowrap;
 display: inline-flex;
 align-items: center;
 color: var(--n-tab-text-color);
 font-size: var(--n-tab-font-size);
 background-clip: padding-box;
 padding: var(--n-tab-padding);
 transition:
 box-shadow .3s var(--n-bezier),
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 `,[i("disabled",{cursor:"not-allowed"}),z("close",`
 margin-left: 6px;
 transition:
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
 `),z("label",`
 display: flex;
 align-items: center;
 z-index: 1;
 `)]),r("tabs-bar",`
 position: absolute;
 bottom: 0;
 height: 2px;
 border-radius: 1px;
 background-color: var(--n-bar-color);
 transition:
 left .2s var(--n-bezier),
 max-width .2s var(--n-bezier),
 opacity .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 `,[g("&.transition-disabled",`
 transition: none;
 `),i("disabled",`
 background-color: var(--n-tab-text-color-disabled)
 `)]),r("tabs-pane-wrapper",`
 position: relative;
 overflow: hidden;
 transition: max-height .2s var(--n-bezier);
 `),r("tab-pane",`
 color: var(--n-pane-text-color);
 width: 100%;
 transition:
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 opacity .2s var(--n-bezier);
 left: 0;
 right: 0;
 top: 0;
 `,[g("&.next-transition-leave-active, &.prev-transition-leave-active, &.next-transition-enter-active, &.prev-transition-enter-active",`
 transition:
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 transform .2s var(--n-bezier),
 opacity .2s var(--n-bezier);
 `),g("&.next-transition-leave-active, &.prev-transition-leave-active",`
 position: absolute;
 `),g("&.next-transition-enter-from, &.prev-transition-leave-to",`
 transform: translateX(32px);
 opacity: 0;
 `),g("&.next-transition-leave-to, &.prev-transition-enter-from",`
 transform: translateX(-32px);
 opacity: 0;
 `),g("&.next-transition-leave-from, &.next-transition-enter-to, &.prev-transition-leave-from, &.prev-transition-enter-to",`
 transform: translateX(0);
 opacity: 1;
 `)]),r("tabs-tab-pad",`
 box-sizing: border-box;
 width: var(--n-tab-gap);
 flex-grow: 0;
 flex-shrink: 0;
 `),i("line-type, bar-type",[r("tabs-tab",`
 font-weight: var(--n-tab-font-weight);
 box-sizing: border-box;
 vertical-align: bottom;
 `,[g("&:hover",{color:"var(--n-tab-text-color-hover)"}),i("active",`
 color: var(--n-tab-text-color-active);
 font-weight: var(--n-tab-font-weight-active);
 `),i("disabled",{color:"var(--n-tab-text-color-disabled)"})])]),r("tabs-nav",[i("line-type",[i("top",[z("prefix, suffix",`
 border-bottom: 1px solid var(--n-tab-border-color);
 `),r("tabs-nav-scroll-content",`
 border-bottom: 1px solid var(--n-tab-border-color);
 `),r("tabs-bar",`
 bottom: -1px;
 `)]),i("left",[z("prefix, suffix",`
 border-right: 1px solid var(--n-tab-border-color);
 `),r("tabs-nav-scroll-content",`
 border-right: 1px solid var(--n-tab-border-color);
 `),r("tabs-bar",`
 right: -1px;
 `)]),i("right",[z("prefix, suffix",`
 border-left: 1px solid var(--n-tab-border-color);
 `),r("tabs-nav-scroll-content",`
 border-left: 1px solid var(--n-tab-border-color);
 `),r("tabs-bar",`
 left: -1px;
 `)]),i("bottom",[z("prefix, suffix",`
 border-top: 1px solid var(--n-tab-border-color);
 `),r("tabs-nav-scroll-content",`
 border-top: 1px solid var(--n-tab-border-color);
 `),r("tabs-bar",`
 top: -1px;
 `)]),z("prefix, suffix",`
 transition: border-color .3s var(--n-bezier);
 `),r("tabs-nav-scroll-content",`
 transition: border-color .3s var(--n-bezier);
 `),r("tabs-bar",`
 border-radius: 0;
 `)]),i("card-type",[z("prefix, suffix",`
 transition: border-color .3s var(--n-bezier);
 `),r("tabs-pad",`
 flex-grow: 1;
 transition: border-color .3s var(--n-bezier);
 `),r("tabs-tab-pad",`
 transition: border-color .3s var(--n-bezier);
 `),r("tabs-tab",`
 font-weight: var(--n-tab-font-weight);
 border: 1px solid var(--n-tab-border-color);
 background-color: var(--n-tab-color);
 box-sizing: border-box;
 position: relative;
 vertical-align: bottom;
 display: flex;
 justify-content: space-between;
 font-size: var(--n-tab-font-size);
 color: var(--n-tab-text-color);
 `,[i("addable",`
 padding-left: 8px;
 padding-right: 8px;
 font-size: 16px;
 justify-content: center;
 `,[z("height-placeholder",`
 width: 0;
 font-size: var(--n-tab-font-size);
 `),Ct("disabled",[g("&:hover",`
 color: var(--n-tab-text-color-hover);
 `)])]),i("closable","padding-right: 8px;"),i("active",`
 background-color: #0000;
 font-weight: var(--n-tab-font-weight-active);
 color: var(--n-tab-text-color-active);
 `),i("disabled","color: var(--n-tab-text-color-disabled);")])]),i("left, right",`
 flex-direction: column; 
 `,[z("prefix, suffix",`
 padding: var(--n-tab-padding-vertical);
 `),r("tabs-wrapper",`
 flex-direction: column;
 `),r("tabs-tab-wrapper",`
 flex-direction: column;
 `,[r("tabs-tab-pad",`
 height: var(--n-tab-gap-vertical);
 width: 100%;
 `)])]),i("top",[i("card-type",[r("tabs-scroll-padding","border-bottom: 1px solid var(--n-tab-border-color);"),z("prefix, suffix",`
 border-bottom: 1px solid var(--n-tab-border-color);
 `),r("tabs-tab",`
 border-top-left-radius: var(--n-tab-border-radius);
 border-top-right-radius: var(--n-tab-border-radius);
 `,[i("active",`
 border-bottom: 1px solid #0000;
 `)]),r("tabs-tab-pad",`
 border-bottom: 1px solid var(--n-tab-border-color);
 `),r("tabs-pad",`
 border-bottom: 1px solid var(--n-tab-border-color);
 `)])]),i("left",[i("card-type",[r("tabs-scroll-padding","border-right: 1px solid var(--n-tab-border-color);"),z("prefix, suffix",`
 border-right: 1px solid var(--n-tab-border-color);
 `),r("tabs-tab",`
 border-top-left-radius: var(--n-tab-border-radius);
 border-bottom-left-radius: var(--n-tab-border-radius);
 `,[i("active",`
 border-right: 1px solid #0000;
 `)]),r("tabs-tab-pad",`
 border-right: 1px solid var(--n-tab-border-color);
 `),r("tabs-pad",`
 border-right: 1px solid var(--n-tab-border-color);
 `)])]),i("right",[i("card-type",[r("tabs-scroll-padding","border-left: 1px solid var(--n-tab-border-color);"),z("prefix, suffix",`
 border-left: 1px solid var(--n-tab-border-color);
 `),r("tabs-tab",`
 border-top-right-radius: var(--n-tab-border-radius);
 border-bottom-right-radius: var(--n-tab-border-radius);
 `,[i("active",`
 border-left: 1px solid #0000;
 `)]),r("tabs-tab-pad",`
 border-left: 1px solid var(--n-tab-border-color);
 `),r("tabs-pad",`
 border-left: 1px solid var(--n-tab-border-color);
 `)])]),i("bottom",[i("card-type",[r("tabs-scroll-padding","border-top: 1px solid var(--n-tab-border-color);"),z("prefix, suffix",`
 border-top: 1px solid var(--n-tab-border-color);
 `),r("tabs-tab",`
 border-bottom-left-radius: var(--n-tab-border-radius);
 border-bottom-right-radius: var(--n-tab-border-radius);
 `,[i("active",`
 border-top: 1px solid #0000;
 `)]),r("tabs-tab-pad",`
 border-top: 1px solid var(--n-tab-border-color);
 `),r("tabs-pad",`
 border-top: 1px solid var(--n-tab-border-color);
 `)])])])]),le=aa,ia=Object.assign(Object.assign({},$e.props),{value:[String,Number],defaultValue:[String,Number],trigger:{type:String,default:"click"},type:{type:String,default:"bar"},closable:Boolean,justifyContent:String,size:String,placement:{type:String,default:"top"},tabStyle:[String,Object],tabClass:String,addTabStyle:[String,Object],addTabClass:String,barWidth:Number,paneClass:String,paneStyle:[String,Object],paneWrapperClass:String,paneWrapperStyle:[String,Object],addable:[Boolean,Object],tabsPadding:{type:Number,default:0},animated:Boolean,onBeforeLeave:Function,onAdd:Function,"onUpdate:value":[Function,Array],onUpdateValue:[Function,Array],onClose:[Function,Array],labelSize:String,activeName:[String,Number],onActiveNameChange:[Function,Array]}),ca=be({name:"Tabs",props:ia,slots:Object,setup(e,{slots:o}){var l,u,c,x;const{mergedClsPrefixRef:v,inlineThemeDisabled:f,mergedComponentPropsRef:h}=Rt(e),m=$e("Tabs","-tabs",oa,Lt,e,v),y=E(null),T=E(null),L=E(null),C=E(null),S=E(null),R=E(null),P=E(!0),W=E(!0),$=we(e,["labelSize","size"]),H=Y(()=>{var t,a;if($.value)return $.value;const n=(a=(t=h?.value)===null||t===void 0?void 0:t.Tabs)===null||a===void 0?void 0:a.size;return n||"medium"}),k=we(e,["activeName","value"]),p=E((u=(l=k.value)!==null&&l!==void 0?l:e.defaultValue)!==null&&u!==void 0?u:o.default?(x=(c=re(o.default())[0])===null||c===void 0?void 0:c.props)===null||x===void 0?void 0:x.name:null),s=Tt(k,p),_={id:0},F=Y(()=>{if(!(!e.justifyContent||e.type==="card"))return{display:"flex",justifyContent:e.justifyContent}});oe(s,()=>{_.id=0,G(),pe()});function M(){var t;const{value:a}=s;return a===null?null:(t=y.value)===null||t===void 0?void 0:t.querySelector(`[data-name="${a}"]`)}function We(t){if(e.type==="card")return;const{value:a}=T;if(!a)return;const n=a.style.opacity==="0";if(t){const d=`${v.value}-tabs-bar--disabled`,{barWidth:w,placement:A}=e;if(t.dataset.disabled==="true"?a.classList.add(d):a.classList.remove(d),["top","bottom"].includes(A)){if(fe(["top","maxHeight","height"]),typeof w=="number"&&t.offsetWidth>=w){const B=Math.floor((t.offsetWidth-w)/2)+t.offsetLeft;a.style.left=`${B}px`,a.style.maxWidth=`${w}px`}else a.style.left=`${t.offsetLeft}px`,a.style.maxWidth=`${t.offsetWidth}px`;a.style.width="8192px",n&&(a.style.transition="none"),a.offsetWidth,n&&(a.style.transition="",a.style.opacity="1")}else{if(fe(["left","maxWidth","width"]),typeof w=="number"&&t.offsetHeight>=w){const B=Math.floor((t.offsetHeight-w)/2)+t.offsetTop;a.style.top=`${B}px`,a.style.maxHeight=`${w}px`}else a.style.top=`${t.offsetTop}px`,a.style.maxHeight=`${t.offsetHeight}px`;a.style.height="8192px",n&&(a.style.transition="none"),a.offsetHeight,n&&(a.style.transition="",a.style.opacity="1")}}}function _e(){if(e.type==="card")return;const{value:t}=T;t&&(t.style.opacity="0")}function fe(t){const{value:a}=T;if(a)for(const n of t)a.style[n]=""}function G(){if(e.type==="card")return;const t=M();t?We(t):_e()}function pe(){var t;const a=(t=S.value)===null||t===void 0?void 0:t.$el;if(!a)return;const n=M();if(!n)return;const{scrollLeft:d,offsetWidth:w}=a,{offsetLeft:A,offsetWidth:B}=n;d>A?a.scrollTo({top:0,left:A,behavior:"smooth"}):A+B>d+w&&a.scrollTo({top:0,left:A+B-w,behavior:"smooth"})}const K=E(null);let ee=0,O=null;function Le(t){const a=K.value;if(a){ee=t.getBoundingClientRect().height;const n=`${ee}px`,d=()=>{a.style.height=n,a.style.maxHeight=n};O?(d(),O(),O=null):O=d}}function Ee(t){const a=K.value;if(a){const n=t.getBoundingClientRect().height,d=()=>{document.body.offsetHeight,a.style.maxHeight=`${n}px`,a.style.height=`${Math.max(ee,n)}px`};O?(O(),O=null,d()):O=d}}function Ae(){const t=K.value;if(t){t.style.maxHeight="",t.style.height="";const{paneWrapperStyle:a}=e;if(typeof a=="string")t.style.cssText=a;else if(a){const{maxHeight:n,height:d}=a;n!==void 0&&(t.style.maxHeight=n),d!==void 0&&(t.style.height=d)}}}const ue={value:[]},ve=E("next");function Be(t){const a=s.value;let n="next";for(const d of ue.value){if(d===a)break;if(d===t){n="prev";break}}ve.value=n,ke(t)}function ke(t){const{onActiveNameChange:a,onUpdateValue:n,"onUpdate:value":d}=e;a&&Q(a,t),n&&Q(n,t),d&&Q(d,t),p.value=t}function je(t){const{onClose:a}=e;a&&Q(a,t)}function he(){const{value:t}=T;if(!t)return;const a="transition-disabled";t.classList.add(a),G(),t.classList.remove(a)}const D=E(null);function te({transitionDisabled:t}){const a=y.value;if(!a)return;t&&a.classList.add("transition-disabled");const n=M();n&&D.value&&(D.value.style.width=`${n.offsetWidth}px`,D.value.style.height=`${n.offsetHeight}px`,D.value.style.transform=`translateX(${n.offsetLeft-Pt(getComputedStyle(a).paddingLeft)}px)`,t&&D.value.offsetWidth),t&&a.classList.remove("transition-disabled")}oe([s],()=>{e.type==="segment"&&ie(()=>{te({transitionDisabled:!1})})}),jt(()=>{e.type==="segment"&&te({transitionDisabled:!0})});let ge=0;function Ie(t){var a;if(t.contentRect.width===0&&t.contentRect.height===0||ge===t.contentRect.width)return;ge=t.contentRect.width;const{type:n}=e;if((n==="line"||n==="bar")&&he(),n!=="segment"){const{placement:d}=e;ae((d==="top"||d==="bottom"?(a=S.value)===null||a===void 0?void 0:a.$el:R.value)||null)}}const He=le(Ie,64);oe([()=>e.justifyContent,()=>e.size],()=>{ie(()=>{const{type:t}=e;(t==="line"||t==="bar")&&he()})});const N=E(!1);function Oe(t){var a;const{target:n,contentRect:{width:d,height:w}}=t,A=n.parentElement.parentElement.offsetWidth,B=n.parentElement.parentElement.offsetHeight,{placement:U}=e;if(!N.value)U==="top"||U==="bottom"?A<d&&(N.value=!0):B<w&&(N.value=!0);else{const{value:X}=C;if(!X)return;U==="top"||U==="bottom"?A-d>X.$el.offsetWidth&&(N.value=!1):B-w>X.$el.offsetHeight&&(N.value=!1)}ae(((a=S.value)===null||a===void 0?void 0:a.$el)||null)}const Fe=le(Oe,64);function Me(){const{onAdd:t}=e;t&&t(),ie(()=>{const a=M(),{value:n}=S;!a||!n||n.scrollTo({left:a.offsetLeft,top:0,behavior:"smooth"})})}function ae(t){if(!t)return;const{placement:a}=e;if(a==="top"||a==="bottom"){const{scrollLeft:n,scrollWidth:d,offsetWidth:w}=t;P.value=n<=0,W.value=n+w>=d}else{const{scrollTop:n,scrollHeight:d,offsetHeight:w}=t;P.value=n<=0,W.value=n+w>=d}}const De=le(t=>{ae(t.target)},64);Ft(Pe,{triggerRef:I(e,"trigger"),tabStyleRef:I(e,"tabStyle"),tabClassRef:I(e,"tabClass"),addTabStyleRef:I(e,"addTabStyle"),addTabClassRef:I(e,"addTabClass"),paneClassRef:I(e,"paneClass"),paneStyleRef:I(e,"paneStyle"),mergedClsPrefixRef:v,typeRef:I(e,"type"),closableRef:I(e,"closable"),valueRef:s,tabChangeIdRef:_,onBeforeLeaveRef:I(e,"onBeforeLeave"),activateTab:Be,handleClose:je,handleAdd:Me}),zt(()=>{G(),pe()}),It(()=>{const{value:t}=L;if(!t)return;const{value:a}=v,n=`${a}-tabs-nav-scroll-wrapper--shadow-start`,d=`${a}-tabs-nav-scroll-wrapper--shadow-end`;P.value?t.classList.remove(n):t.classList.add(n),W.value?t.classList.remove(d):t.classList.add(d)});const Ne={syncBarPosition:()=>{G()}},Ve=()=>{te({transitionDisabled:!0})},xe=Y(()=>{const{value:t}=H,{type:a}=e,n={card:"Card",bar:"Bar",line:"Line",segment:"Segment"}[a],d=`${t}${n}`,{self:{barColor:w,closeIconColor:A,closeIconColorHover:B,closeIconColorPressed:U,tabColor:X,tabBorderColor:Ue,paneTextColor:Xe,tabFontWeight:Ye,tabBorderRadius:Ge,tabFontWeightActive:Ke,colorSegment:qe,fontWeightStrong:Je,tabColorSegment:Qe,closeSize:Ze,closeIconSize:et,closeColorHover:tt,closeColorPressed:at,closeBorderRadius:rt,[j("panePadding",t)]:q,[j("tabPadding",d)]:nt,[j("tabPaddingVertical",d)]:ot,[j("tabGap",d)]:it,[j("tabGap",`${d}Vertical`)]:st,[j("tabTextColor",a)]:lt,[j("tabTextColorActive",a)]:dt,[j("tabTextColorHover",a)]:ct,[j("tabTextColorDisabled",a)]:bt,[j("tabFontSize",t)]:ft},common:{cubicBezierEaseInOut:pt}}=m.value;return{"--n-bezier":pt,"--n-color-segment":qe,"--n-bar-color":w,"--n-tab-font-size":ft,"--n-tab-text-color":lt,"--n-tab-text-color-active":dt,"--n-tab-text-color-disabled":bt,"--n-tab-text-color-hover":ct,"--n-pane-text-color":Xe,"--n-tab-border-color":Ue,"--n-tab-border-radius":Ge,"--n-close-size":Ze,"--n-close-icon-size":et,"--n-close-color-hover":tt,"--n-close-color-pressed":at,"--n-close-border-radius":rt,"--n-close-icon-color":A,"--n-close-icon-color-hover":B,"--n-close-icon-color-pressed":U,"--n-tab-color":X,"--n-tab-font-weight":Ye,"--n-tab-font-weight-active":Ke,"--n-tab-padding":nt,"--n-tab-padding-vertical":ot,"--n-tab-gap":it,"--n-tab-gap-vertical":st,"--n-pane-padding-left":J(q,"left"),"--n-pane-padding-right":J(q,"right"),"--n-pane-padding-top":J(q,"top"),"--n-pane-padding-bottom":J(q,"bottom"),"--n-font-weight-strong":Je,"--n-tab-color-segment":Qe}}),V=f?$t("tabs",Y(()=>`${H.value[0]}${e.type[0]}`),xe,e):void 0;return Object.assign({mergedClsPrefix:v,mergedValue:s,renderedNames:new Set,segmentCapsuleElRef:D,tabsPaneWrapperRef:K,tabsElRef:y,barElRef:T,addTabInstRef:C,xScrollInstRef:S,scrollWrapperElRef:L,addTabFixed:N,tabWrapperStyle:F,handleNavResize:He,mergedSize:H,handleScroll:De,handleTabsResize:Fe,cssVars:f?void 0:xe,themeClass:V?.themeClass,animationDirection:ve,renderNameListRef:ue,yScrollElRef:R,handleSegmentResize:Ve,onAnimationBeforeLeave:Le,onAnimationEnter:Ee,onAnimationAfterEnter:Ae,onRender:V?.onRender},Ne)},render(){const{mergedClsPrefix:e,type:o,placement:l,addTabFixed:u,addable:c,mergedSize:x,renderNameListRef:v,onRender:f,paneWrapperClass:h,paneWrapperStyle:m,$slots:{default:y,prefix:T,suffix:L}}=this;f?.();const C=y?re(y()).filter(p=>p.type.__TAB_PANE__===!0):[],S=y?re(y()).filter(p=>p.type.__TAB__===!0):[],R=!S.length,P=o==="card",W=o==="segment",$=!P&&!W&&this.justifyContent;v.value=[];const H=()=>{const p=b("div",{style:this.tabWrapperStyle,class:`${e}-tabs-wrapper`},$?null:b("div",{class:`${e}-tabs-scroll-padding`,style:l==="top"||l==="bottom"?{width:`${this.tabsPadding}px`}:{height:`${this.tabsPadding}px`}}),R?C.map((s,_)=>(v.value.push(s.props.name),de(b(ce,Object.assign({},s.props,{internalCreatedByPane:!0,internalLeftPadded:_!==0&&(!$||$==="center"||$==="start"||$==="end")}),s.children?{default:s.children.tab}:void 0)))):S.map((s,_)=>(v.value.push(s.props.name),de(_!==0&&!$?ze(s):s))),!u&&c&&P?Te(c,(R?C.length:S.length)!==0):null,$?null:b("div",{class:`${e}-tabs-scroll-padding`,style:{width:`${this.tabsPadding}px`}}));return b("div",{ref:"tabsElRef",class:`${e}-tabs-nav-scroll-content`},P&&c?b(ne,{onResize:this.handleTabsResize},{default:()=>p}):p,P?b("div",{class:`${e}-tabs-pad`}):null,P?null:b("div",{ref:"barElRef",class:`${e}-tabs-bar`}))},k=W?"top":l;return b("div",{class:[`${e}-tabs`,this.themeClass,`${e}-tabs--${o}-type`,`${e}-tabs--${x}-size`,$&&`${e}-tabs--flex`,`${e}-tabs--${k}`],style:this.cssVars},b("div",{class:[`${e}-tabs-nav--${o}-type`,`${e}-tabs-nav--${k}`,`${e}-tabs-nav`]},ye(T,p=>p&&b("div",{class:`${e}-tabs-nav__prefix`},p)),W?b(ne,{onResize:this.handleSegmentResize},{default:()=>b("div",{class:`${e}-tabs-rail`,ref:"tabsElRef"},b("div",{class:`${e}-tabs-capsule`,ref:"segmentCapsuleElRef"},b("div",{class:`${e}-tabs-wrapper`},b("div",{class:`${e}-tabs-tab`}))),R?C.map((p,s)=>(v.value.push(p.props.name),b(ce,Object.assign({},p.props,{internalCreatedByPane:!0,internalLeftPadded:s!==0}),p.children?{default:p.children.tab}:void 0))):S.map((p,s)=>(v.value.push(p.props.name),s===0?p:ze(p))))}):b(ne,{onResize:this.handleNavResize},{default:()=>b("div",{class:`${e}-tabs-nav-scroll-wrapper`,ref:"scrollWrapperElRef"},["top","bottom"].includes(k)?b(Dt,{ref:"xScrollInstRef",onScroll:this.handleScroll},{default:H}):b("div",{class:`${e}-tabs-nav-y-scroll`,onScroll:this.handleScroll,ref:"yScrollElRef"},H()))}),u&&c&&P?Te(c,!0):null,ye(L,p=>p&&b("div",{class:`${e}-tabs-nav__suffix`},p))),R&&(this.animated&&(k==="top"||k==="bottom")?b("div",{ref:"tabsPaneWrapperRef",style:m,class:[`${e}-tabs-pane-wrapper`,h]},Re(C,this.mergedValue,this.renderedNames,this.onAnimationBeforeLeave,this.onAnimationEnter,this.onAnimationAfterEnter,this.animationDirection)):Re(C,this.mergedValue,this.renderedNames)))}});function Re(e,o,l,u,c,x,v){const f=[];return e.forEach(h=>{const{name:m,displayDirective:y,"display-directive":T}=h.props,L=S=>y===S||T===S,C=o===m;if(h.key!==void 0&&(h.key=m),C||L("show")||L("show:lazy")&&l.has(m)){l.has(m)||l.add(m);const S=!L("if");f.push(S?Ht(h,[[Wt,C]]):h)}}),v?b(_t,{name:`${v}-transition`,onBeforeLeave:u,onEnter:c,onAfterEnter:x},{default:()=>f}):f}function Te(e,o){return b(ce,{ref:"addTabInstRef",key:"__addable",name:"__addable",internalCreatedByPane:!0,internalAddable:!0,internalLeftPadded:o,disabled:typeof e=="object"&&e.disabled})}function ze(e){const o=Ot(e);return o.props?o.props.internalLeftPadded=!0:o.props={internalLeftPadded:!0},o}function de(e){return Array.isArray(e.dynamicProps)?e.dynamicProps.includes("internalLeftPadded")||e.dynamicProps.push("internalLeftPadded"):e.dynamicProps=["internalLeftPadded"],e}export{ce as _,ca as a};
