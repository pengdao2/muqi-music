import{h as R,k as f,j as B,aY as V,l as $,_ as C,Z as w,a0 as L,cd as S,a6 as z,o as p,bm as I,ce as E}from"./index-DrP84MTY.js";import{U as _,n as l,c as u}from"./index-B5Ltq1S3.js";const H=_({name:"Empty",render(){return l("svg",{viewBox:"0 0 28 28",fill:"none",xmlns:"http://www.w3.org/2000/svg"},l("path",{d:"M26 7.5C26 11.0899 23.0899 14 19.5 14C15.9101 14 13 11.0899 13 7.5C13 3.91015 15.9101 1 19.5 1C23.0899 1 26 3.91015 26 7.5ZM16.8536 4.14645C16.6583 3.95118 16.3417 3.95118 16.1464 4.14645C15.9512 4.34171 15.9512 4.65829 16.1464 4.85355L18.7929 7.5L16.1464 10.1464C15.9512 10.3417 15.9512 10.6583 16.1464 10.8536C16.3417 11.0488 16.6583 11.0488 16.8536 10.8536L19.5 8.20711L22.1464 10.8536C22.3417 11.0488 22.6583 11.0488 22.8536 10.8536C23.0488 10.6583 23.0488 10.3417 22.8536 10.1464L20.2071 7.5L22.8536 4.85355C23.0488 4.65829 23.0488 4.34171 22.8536 4.14645C22.6583 3.95118 22.3417 3.95118 22.1464 4.14645L19.5 6.79289L16.8536 4.14645Z",fill:"currentColor"}),l("path",{d:"M25 22.75V12.5991C24.5572 13.0765 24.053 13.4961 23.5 13.8454V16H17.5L17.3982 16.0068C17.0322 16.0565 16.75 16.3703 16.75 16.75C16.75 18.2688 15.5188 19.5 14 19.5C12.4812 19.5 11.25 18.2688 11.25 16.75L11.2432 16.6482C11.1935 16.2822 10.8797 16 10.5 16H4.5V7.25C4.5 6.2835 5.2835 5.5 6.25 5.5H12.2696C12.4146 4.97463 12.6153 4.47237 12.865 4H6.25C4.45507 4 3 5.45507 3 7.25V22.75C3 24.5449 4.45507 26 6.25 26H21.75C23.5449 26 25 24.5449 25 22.75ZM4.5 22.75V17.5H9.81597L9.85751 17.7041C10.2905 19.5919 11.9808 21 14 21L14.215 20.9947C16.2095 20.8953 17.842 19.4209 18.184 17.5H23.5V22.75C23.5 23.7165 22.7165 24.5 21.75 24.5H6.25C5.2835 24.5 4.5 23.7165 4.5 22.75Z",fill:"currentColor"}))}}),P=R("empty",`
 display: flex;
 flex-direction: column;
 align-items: center;
 font-size: var(--n-font-size);
`,[f("icon",`
 width: var(--n-icon-size);
 height: var(--n-icon-size);
 font-size: var(--n-icon-size);
 line-height: var(--n-icon-size);
 color: var(--n-icon-color);
 transition:
 color .3s var(--n-bezier);
 `,[B("+",[f("description",`
 margin-top: 8px;
 `)])]),f("description",`
 transition: color .3s var(--n-bezier);
 color: var(--n-text-color);
 `),f("extra",`
 text-align: center;
 transition: color .3s var(--n-bezier);
 margin-top: 12px;
 color: var(--n-extra-text-color);
 `)]),T=Object.assign(Object.assign({},C.props),{description:String,showDescription:{type:Boolean,default:!0},showIcon:{type:Boolean,default:!0},size:{type:String,default:"medium"},renderIcon:Function}),Z=_({name:"Empty",props:T,slots:Object,setup(e){const{mergedClsPrefixRef:n,inlineThemeDisabled:i,mergedComponentPropsRef:t}=$(e),a=C("Empty","-empty",P,S,e,n),{localeRef:r}=w("Empty"),m=u(()=>{var o,s,d;return(o=e.description)!==null&&o!==void 0?o:(d=(s=t?.value)===null||s===void 0?void 0:s.Empty)===null||d===void 0?void 0:d.description}),v=u(()=>{var o,s;return((s=(o=t?.value)===null||o===void 0?void 0:o.Empty)===null||s===void 0?void 0:s.renderIcon)||(()=>l(H,null))}),h=u(()=>{const{size:o}=e,{common:{cubicBezierEaseInOut:s},self:{[z("iconSize",o)]:d,[z("fontSize",o)]:g,textColor:x,iconColor:y,extraTextColor:b}}=a.value;return{"--n-icon-size":d,"--n-font-size":g,"--n-bezier":s,"--n-text-color":x,"--n-icon-color":y,"--n-extra-text-color":b}}),c=i?L("empty",u(()=>{let o="";const{size:s}=e;return o+=s[0],o}),h,e):void 0;return{mergedClsPrefix:n,mergedRenderIcon:v,localizedDescription:u(()=>m.value||r.value.description),cssVars:i?void 0:h,themeClass:c?.themeClass,onRender:c?.onRender}},render(){const{$slots:e,mergedClsPrefix:n,onRender:i}=this;return i?.(),l("div",{class:[`${n}-empty`,this.themeClass],style:this.cssVars},this.showIcon?l("div",{class:`${n}-empty__icon`},e.icon?e.icon():l(V,{clsPrefix:n},{default:this.mergedRenderIcon})):null,this.showDescription?l("div",{class:`${n}-empty__description`},e.default?e.default():this.localizedDescription):null,e.extra?l("div",{class:`${n}-empty__extra`},e.extra()):null)}}),D=R("text",`
 transition: color .3s var(--n-bezier);
 color: var(--n-text-color);
`,[p("strong",`
 font-weight: var(--n-font-weight-strong);
 `),p("italic",{fontStyle:"italic"}),p("underline",{textDecoration:"underline"}),p("code",`
 line-height: 1.4;
 display: inline-block;
 font-family: var(--n-font-famliy-mono);
 transition: 
 color .3s var(--n-bezier),
 border-color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 box-sizing: border-box;
 padding: .05em .35em 0 .35em;
 border-radius: var(--n-code-border-radius);
 font-size: .9em;
 color: var(--n-code-text-color);
 background-color: var(--n-code-color);
 border: var(--n-code-border);
 `)]),O=Object.assign(Object.assign({},C.props),{code:Boolean,type:{type:String,default:"default"},delete:Boolean,strong:Boolean,italic:Boolean,underline:Boolean,depth:[String,Number],tag:String,as:{type:String,validator:()=>!0,default:void 0}}),k=_({name:"Text",props:O,setup(e){const{mergedClsPrefixRef:n,inlineThemeDisabled:i}=$(e),t=C("Typography","-text",D,E,e,n),a=u(()=>{const{depth:m,type:v}=e,h=v==="default"?m===void 0?"textColor":`textColor${m}Depth`:z("textColor",v),{common:{fontWeightStrong:c,fontFamilyMono:o,cubicBezierEaseInOut:s},self:{codeTextColor:d,codeBorderRadius:g,codeColor:x,codeBorder:y,[h]:b}}=t.value;return{"--n-bezier":s,"--n-text-color":b,"--n-font-weight-strong":c,"--n-font-famliy-mono":o,"--n-code-border-radius":g,"--n-code-text-color":d,"--n-code-color":x,"--n-code-border":y}}),r=i?L("text",u(()=>`${e.type[0]}${e.depth||""}`),a,e):void 0;return{mergedClsPrefix:n,compitableTag:I(e,["as","tag"]),cssVars:i?void 0:a,themeClass:r?.themeClass,onRender:r?.onRender}},render(){var e,n,i;const{mergedClsPrefix:t}=this;(e=this.onRender)===null||e===void 0||e.call(this);const a=[`${t}-text`,this.themeClass,{[`${t}-text--code`]:this.code,[`${t}-text--delete`]:this.delete,[`${t}-text--strong`]:this.strong,[`${t}-text--italic`]:this.italic,[`${t}-text--underline`]:this.underline}],r=(i=(n=this.$slots).default)===null||i===void 0?void 0:i.call(n);return this.code?l("code",{class:a,style:this.cssVars},this.delete?l("del",null,r):r):this.delete?l("del",{class:a,style:this.cssVars},r):l(this.compitableTag||"span",{class:a,style:this.cssVars},r)}});export{Z as _,k as a};
