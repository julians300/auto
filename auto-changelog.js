(window.webpackJsonp=window.webpackJsonp||[]).push([[2],{57:function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default=void 0;var a,n=s(o(3)),r=function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var o in e)if(Object.prototype.hasOwnProperty.call(e,o)){var a=Object.defineProperty&&Object.getOwnPropertyDescriptor?Object.getOwnPropertyDescriptor(e,o):{};a.get||a.set?Object.defineProperty(t,o,a):t[o]=e[o]}return t.default=e,t}(o(0));s(o(2)),s(o(78));function s(e){return e&&e.__esModule?e:{default:e}}function i(e,t,o,n){a||(a="function"==typeof Symbol&&Symbol.for&&Symbol.for("react.element")||60103);var r=e&&e.defaultProps,s=arguments.length-3;if(t||0===s||(t={children:void 0}),t&&r)for(var i in r)void 0===t[i]&&(t[i]=r[i]);else t||(t=r||{});if(1===s)t.children=n;else if(s>1){for(var l=new Array(s),c=0;c<s;c++)l[c]=arguments[c+3];t.children=l}return{$$typeof:a,type:e,key:void 0===o?null:""+o,ref:null,props:t,_owner:null}}function l(e,t,o){return t in e?Object.defineProperty(e,t,{value:o,enumerable:!0,configurable:!0,writable:!0}):e[t]=o,e}function c(){return(c=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var o=arguments[t];for(var a in o)Object.prototype.hasOwnProperty.call(o,a)&&(e[a]=o[a])}return e}).apply(this,arguments)}function u(e,t){if(null==e)return{};var o,a,n=function(e,t){if(null==e)return{};var o,a,n={},r=Object.keys(e);for(a=0;a<r.length;a++)o=r[a],t.indexOf(o)>=0||(n[o]=e[o]);return n}(e,t);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);for(a=0;a<r.length;a++)o=r[a],t.indexOf(o)>=0||Object.prototype.propertyIsEnumerable.call(e,o)&&(n[o]=e[o])}return n}const d=e=>{let{to:t}=e,o=u(e,["to"]);return t.includes("http")?r.default.createElement("a",c({},e,{href:t})):("#"===t[0]&&(t=n.default.join("/auto/","pages/auto-changelog.html")+t),r.default.createElement("a",c({},o,{href:t,onClick:o=>{if(o.preventDefault(),"#"===e.to)return!1;const a=new URL(n.default.join(window.location.origin,t));window.history.pushState((e=>({href:e.href,pathname:e.pathname,hash:e.hash,query:e.query}))(a),null,t),e.onClick();const r=new CustomEvent("changeLocation",{detail:a});return dispatchEvent(r),!1}})))};d.defaultProps={href:"",onClick:()=>{}};const h=e=>{var t,o;return o=t=class extends r.default.Component{constructor(...e){super(...e),l(this,"state",{Comp:null})}componentDidMount(){!this.state.Comp&&this.props.shouldLoad&&e().then(e=>{this.setState({Comp:e.default})})}render(){const{Comp:e}=this.state;return e?r.default.createElement(e,this.props,this.props.children||null):null}},l(t,"defaultProps",{shouldLoad:!0}),o};h(()=>o.e(27).then(o.bind(null,79))),h(()=>o.e(27).then(o.bind(null,80)));var g=i("h1",{},void 0,i("code",{},void 0,"auto changelog")),f=i("p",{},void 0,"Prepend release notes to ",i("code",{},void 0,"CHANGELOG.md"),", create one if it doesn't exist, and commit the changes."),b=i("article",{className:"message column is-warning"},void 0,i("div",{className:"message-body"},void 0,i("p",{},void 0,"⚠️ This should be run before ",i("code",{},void 0,"npm version")," so the ",i("code",{},void 0,"CHANGELOG.md")," changes are committed before the release gets tagged."))),v=i("pre",{},void 0,i("code",{className:"language-bash"},void 0,">  auto changelog -h",i("br",{}),i("br",{}),"Options",i("br",{}),i("br",{}),"  -d, --dry-run          Report what ",i("span",{className:"hljs-built_in"},void 0,"command")," will ",i("span",{className:"hljs-keyword"},void 0,"do")," but ",i("span",{className:"hljs-keyword"},void 0,"do")," not actually ",i("span",{className:"hljs-keyword"},void 0,"do")," anything",i("br",{}),"  --no-version-prefix    Use the version as the tag without the ",i("span",{className:"hljs-string"},void 0,"'v'")," prefix",i("br",{}),"  --jira string          Jira base URL",i("br",{}),"  --from string          Tag to start changelog generation on. Defaults to latest tag.",i("br",{}),"  --to string            Tag to end changelog generation on. Defaults to HEAD.",i("br",{}),"  -m, --message string   Message to commit the changelog with. Defaults to ",i("span",{className:"hljs-string"},void 0,"'Update CHANGELOG.md [skip ci]'"),i("br",{}),i("br",{}),"Global Options",i("br",{}),i("br",{}),"  -h, --",i("span",{className:"hljs-built_in"},void 0,"help"),"            Display the ",i("span",{className:"hljs-built_in"},void 0,"help")," output ",i("span",{className:"hljs-keyword"},void 0,"for")," the ",i("span",{className:"hljs-built_in"},void 0,"command"),i("br",{}),"  -v, --verbose         Show some more logs",i("br",{}),"  -w, --very-verbose    Show a lot more logs",i("br",{}),"  --repo string         The repo to ",i("span",{className:"hljs-built_in"},void 0,"set")," the status on. Defaults to looking ",i("span",{className:"hljs-keyword"},void 0,"in")," the package definition ",i("span",{className:"hljs-keyword"},void 0,"for")," the platform",i("br",{}),"  --owner string        The owner of the GitHub repo. Defaults to reading from the package definition ",i("span",{className:"hljs-keyword"},void 0,"for")," the platform",i("br",{}),"  --github-api string   GitHub API to use",i("br",{}),"  --base-branch string  Branch to treat as the ",i("span",{className:"hljs-string"},void 0,'"master"')," branch",i("br",{}),"  --plugins string[]    Plugins to load auto with. (defaults to just npm)",i("br",{}),i("br",{}),"Examples",i("br",{}),i("br",{}),"  Generate a changelog from the last release     $ auto changelog",i("br",{}),"  to head",i("br",{}),"  Generate a changelog across specific           $ auto changelog --from v0.20.1 --to v0.21.0",i("br",{}),"  versions",i("br",{})));var m=e=>i("div",{className:e.className},void 0,i("section",{},void 0,g,f,b,v,i("h2",{id:"jira"},void 0,"Jira ",i(d,{currentPage:e.currentPage,className:"fas fa-hashtag headerLink",to:"#jira","aria-hidden":"true"})),i("p",{},void 0,"To include Jira story information you must include a URL to your hosted JIRA instance as a CLI flag or ",i(d,{currentPage:e.currentPage,to:"/auto/pages/autorc.html"},void 0,".autorc")," config option."),i("h2",{id:"changelog-titles"},void 0,"Changelog Titles ",i(d,{currentPage:e.currentPage,className:"fas fa-hashtag headerLink",to:"#changelog-titles","aria-hidden":"true"})),i("p",{},void 0,"You can customize the changelog titles and even add custom ones. To see configuration ",i(d,{currentPage:e.currentPage,to:"/auto/pages/autorc.html#changelog-titles"},void 0,"go here"),".")));t.default=m,e.exports=t.default}}]);
//# sourceMappingURL=auto-changelog.js.map