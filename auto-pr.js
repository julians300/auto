(window.webpackJsonp=window.webpackJsonp||[]).push([[6],{65:function(e,t,r){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default=void 0;var s,n=a(r(3)),o=function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var r in e)if(Object.prototype.hasOwnProperty.call(e,r)){var s=Object.defineProperty&&Object.getOwnPropertyDescriptor?Object.getOwnPropertyDescriptor(e,r):{};s.get||s.set?Object.defineProperty(t,r,s):t[r]=e[r]}return t.default=e,t}(r(0));a(r(2)),a(r(82));function a(e){return e&&e.__esModule?e:{default:e}}function i(e,t,r,n){s||(s="function"==typeof Symbol&&Symbol.for&&Symbol.for("react.element")||60103);var o=e&&e.defaultProps,a=arguments.length-3;if(t||0===a||(t={children:void 0}),t&&o)for(var i in o)void 0===t[i]&&(t[i]=o[i]);else t||(t=o||{});if(1===a)t.children=n;else if(a>1){for(var l=new Array(a),u=0;u<a;u++)l[u]=arguments[u+3];t.children=l}return{$$typeof:s,type:e,key:void 0===r?null:""+r,ref:null,props:t,_owner:null}}function l(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function u(){return(u=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var r=arguments[t];for(var s in r)Object.prototype.hasOwnProperty.call(r,s)&&(e[s]=r[s])}return e}).apply(this,arguments)}function d(e,t){if(null==e)return{};var r,s,n=function(e,t){if(null==e)return{};var r,s,n={},o=Object.keys(e);for(s=0;s<o.length;s++)r=o[s],t.indexOf(r)>=0||(n[r]=e[r]);return n}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(s=0;s<o.length;s++)r=o[s],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(n[r]=e[r])}return n}const c=e=>{let{to:t}=e,r=d(e,["to"]);return t.includes("http")?o.default.createElement("a",u({},e,{href:t})):("#"===t[0]&&(t=n.default.join("/auto/","pages/auto-pr.html")+t),o.default.createElement("a",u({},r,{href:t,onClick:r=>{if(r.preventDefault(),"#"===e.to)return!1;const s=new URL(n.default.join(window.location.origin,t));window.history.pushState((e=>({href:e.href,pathname:e.pathname,hash:e.hash,query:e.query}))(s),null,t),e.onClick();const o=new CustomEvent("changeLocation",{detail:s});return dispatchEvent(o),!1}})))};c.defaultProps={href:"",onClick:()=>{}};const h=e=>{var t,r;return r=t=class extends o.default.Component{constructor(...e){super(...e),l(this,"state",{Comp:null})}componentDidMount(){!this.state.Comp&&this.props.shouldLoad&&e().then(e=>{this.setState({Comp:e.default})})}render(){const{Comp:e}=this.state;return e?o.default.createElement(e,this.props,this.props.children||null):null}},l(t,"defaultProps",{shouldLoad:!0}),r};h(()=>r.e(31).then(r.bind(null,83))),h(()=>r.e(31).then(r.bind(null,84)));var p=i("h1",{},void 0,i("code",{},void 0,"auto pr")),f=i("p",{},void 0,"Set the status on a PR commit"),b=i("pre",{},void 0,i("code",{className:"language-bash"},void 0,">  auto pr -h",i("br",{}),i("br",{}),"Options",i("br",{}),i("br",{}),"  --sha string                      Specify a custom git sha. Defaults to the HEAD ",i("span",{className:"hljs-keyword"},void 0,"for")," a git repo ",i("span",{className:"hljs-keyword"},void 0,"in")," the current repository",i("br",{}),"  --pr number [required]            The pull request the ",i("span",{className:"hljs-built_in"},void 0,"command")," should use. Detects PR number ",i("span",{className:"hljs-keyword"},void 0,"in")," CI",i("br",{}),"  --url string                      URL to associate with this status",i("br",{}),"  --state string [required]         State of the PR. [",i("span",{className:"hljs-string"},void 0,"'pending'"),", ",i("span",{className:"hljs-string"},void 0,"'success'"),", ",i("span",{className:"hljs-string"},void 0,"'error'"),", ",i("span",{className:"hljs-string"},void 0,"'failure'"),"]",i("br",{}),"  --description string [required]   A description of the status",i("br",{}),"  --context string [required]       A string label to differentiate this status from others",i("br",{}),"  -d, --dry-run                     Report what ",i("span",{className:"hljs-built_in"},void 0,"command")," will ",i("span",{className:"hljs-keyword"},void 0,"do")," but ",i("span",{className:"hljs-keyword"},void 0,"do")," not actually ",i("span",{className:"hljs-keyword"},void 0,"do")," anything",i("br",{}),i("br",{}),"Global Options",i("br",{}),i("br",{}),"  -h, --",i("span",{className:"hljs-built_in"},void 0,"help"),"            Display the ",i("span",{className:"hljs-built_in"},void 0,"help")," output ",i("span",{className:"hljs-keyword"},void 0,"for")," the ",i("span",{className:"hljs-built_in"},void 0,"command"),i("br",{}),"  -v, --verbose         Show some more logs",i("br",{}),"  -w, --very-verbose    Show a lot more logs",i("br",{}),"  --repo string         The repo to ",i("span",{className:"hljs-built_in"},void 0,"set")," the status on. Defaults to looking ",i("span",{className:"hljs-keyword"},void 0,"in")," the package definition ",i("span",{className:"hljs-keyword"},void 0,"for")," the platform",i("br",{}),"  --owner string        The owner of the GitHub repo. Defaults to reading from the package definition ",i("span",{className:"hljs-keyword"},void 0,"for")," the platform",i("br",{}),"  --github-api string   GitHub API to use",i("br",{}),"  --plugins string[]    Plugins to load auto with. (defaults to just npm)",i("br",{}),i("br",{}),"Examples",i("br",{}),i("br",{}),"$ auto pr \\",i("br",{}),"   --pr 32 \\",i("br",{}),"   --state pending \\",i("br",{}),"   --description ",i("span",{className:"hljs-string"},void 0,'"Build still running..."')," \\",i("br",{}),"   --context build-check",i("br",{})));var v=e=>i("div",{className:e.className},void 0,i("section",{},void 0,p,f,i("h2",{id:"options"},void 0,"Options ",i(c,{currentPage:e.currentPage,className:"fas fa-hashtag headerLink",to:"#options","aria-hidden":"true"})),b));t.default=v,e.exports=t.default}}]);
//# sourceMappingURL=auto-pr.js.map