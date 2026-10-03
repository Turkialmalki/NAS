/* Minimal runtime for NAS design pages: {{holes}}, sc-if, sc-for, on* handlers, setState. */
(function(){
  var KEY='nas-theme';
  function getStored(){try{return localStorage.getItem(KEY)}catch(e){return null}}
  function store(v){try{localStorage.setItem(KEY,v)}catch(e){}}
  function look(scope,path){
    var parts=path.split('.'),v=scope;
    for(var i=0;i<parts.length;i++){if(v==null)return undefined;v=v[parts[i]];}
    return v;
  }
  var HOLE=/\{\{\s*([\w.$]+)\s*\}\}/g, ONLY=/^\s*\{\{\s*([\w.$]+)\s*\}\}\s*$/;
  function interp(s,scope){return s.replace(HOLE,function(_,p){var v=look(scope,p);return v==null?'':String(v);});}
  function build(node,scope,out){
    if(node.nodeType===3){out.appendChild(document.createTextNode(interp(node.nodeValue,scope)));return;}
    if(node.nodeType!==1)return;
    var tag=node.localName;
    if(tag==='sc-if'){
      var m=(node.getAttribute('value')||'').match(ONLY);
      if(m&&look(scope,m[1]))kids(node,scope,out);
      return;
    }
    if(tag==='sc-for'){
      var lm=(node.getAttribute('list')||'').match(ONLY),as=node.getAttribute('as')||'item';
      var list=lm?look(scope,lm[1]):null;
      (list||[]).forEach(function(it){var s=Object.create(scope);s[as]=it;kids(node,s,out);});
      return;
    }
    var el=node.cloneNode(false);
    for(var i=el.attributes.length-1;i>=0;i--){
      var a=el.attributes[i],n=a.name,v=a.value;
      if(v.indexOf('{{')<0)continue;
      var hm=v.match(ONLY);
      if(n.indexOf('on')===0&&hm){
        el.removeAttribute(n);
        var fn=look(scope,hm[1]);
        if(typeof fn==='function')el.addEventListener(n.slice(2),fn);
      }else el.setAttribute(n,interp(v,scope));
    }
    kids(node.content||node,scope,el);
    out.appendChild(el);
  }
  function kids(node,scope,out){var c=node.childNodes;for(var i=0;i<c.length;i++)build(c[i],scope,out);}

  window.DCLogic=function(props){this.props=props||{};this.state=null;};
  DCLogic.prototype.setState=function(p){
    this.state=Object.assign({},this.state||{},p);
    if(p&&p.theme)store(p.theme);
    this._render();
  };
  window.mountDC=function(Comp){
    var tpl=document.getElementById('dc-tpl'),root=document.getElementById('dc-root');
    var q=new URLSearchParams(location.search).get('theme');
    var theme=(q==='dark'||q==='light')?q:(getStored()||undefined);
    var c=new Comp({theme:theme});
    c._render=function(){
      var vals=c.renderVals()||{};
      var frag=document.createDocumentFragment();
      kids(tpl.content,vals,frag);
      root.replaceChildren(frag);
      var cls=(root.firstElementChild&&root.firstElementChild.className)||'';
      document.body.style.background=/t-dark/.test(cls)?'#07070C':'';
    };
    c._render();
  };
})();
