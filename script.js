/* Starwell Holdings - script.js */
(function(){
  var reveal=document.querySelectorAll('[data-reveal]');
  function revealAll(){reveal.forEach(function(e){e.classList.add('in');});}
  try{
    var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce||!('IntersectionObserver' in window)){revealAll();}
    else{
      var io=new IntersectionObserver(function(en){en.forEach(function(e){
        if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},
        {threshold:.1,rootMargin:'0px 0px -6% 0px'});
      reveal.forEach(function(e){io.observe(e);});
    }
  }catch(err){revealAll();}
  window.addEventListener('load',function(){setTimeout(function(){
    reveal.forEach(function(e){if(!e.classList.contains('in'))e.classList.add('in');});
  },1500);});

  try{
    var burger=document.getElementById('burger');
    var mmenu=document.getElementById('mmenu');
    var mclose=document.getElementById('mclose');
    function openM(){if(mmenu){mmenu.classList.add('open');mmenu.setAttribute('aria-hidden','false');
      if(burger)burger.setAttribute('aria-expanded','true');document.body.style.overflow='hidden';
      if(mclose)mclose.focus();}}
    function closeM(){if(mmenu){mmenu.classList.remove('open');mmenu.setAttribute('aria-hidden','true');
      if(burger){burger.setAttribute('aria-expanded','false');burger.focus();}document.body.style.overflow='';}}
    if(burger)burger.addEventListener('click',openM);
    if(mclose)mclose.addEventListener('click',closeM);
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'&&mmenu&&mmenu.classList.contains('open'))closeM();
    });
    document.querySelectorAll('.mgroup .mlink').forEach(function(btn){
      btn.addEventListener('click',function(){
        var g=btn.closest('.mgroup');var sub=g.querySelector('.msub');
        var open=g.classList.toggle('open');if(sub)sub.classList.toggle('open');
        btn.setAttribute('aria-expanded',open?'true':'false');
      });
    });
    document.querySelectorAll('.mmenu a').forEach(function(a){a.addEventListener('click',closeM);});
  }catch(err){}

  try{
    var pills=document.querySelectorAll('.filters .pill');
    if(pills.length){
      pills.forEach(function(p){p.addEventListener('click',function(){
        pills.forEach(function(x){x.classList.remove('active');});p.classList.add('active');
        var cat=p.getAttribute('data-cat');
        document.querySelectorAll('.news-grid .na').forEach(function(card){
          var c=card.getAttribute('data-cat');
          card.style.display=(cat==='all'||c===cat)?'flex':'none';
        });
      });});
    }
  }catch(err){}

  try{
    var car=document.getElementById('hl-carousel');
    if(car){
      var cprev=document.querySelector('.cprev'),cnext=document.querySelector('.cnext');
      function step(){var c=car.querySelector('.pf,.xp');return c?c.getBoundingClientRect().width+22:360;}
      function upd(){
        if(cprev)cprev.disabled=car.scrollLeft<=2;
        if(cnext)cnext.disabled=car.scrollLeft+car.clientWidth>=car.scrollWidth-2;
      }
      if(cprev)cprev.addEventListener('click',function(){car.scrollBy({left:-step(),behavior:'smooth'});});
      if(cnext)cnext.addEventListener('click',function(){car.scrollBy({left:step(),behavior:'smooth'});});
      car.addEventListener('scroll',upd);window.addEventListener('resize',upd);upd();
    }
  }catch(err){}

  try{
    var f=document.getElementById('contactForm');
    if(f)f.addEventListener('submit',function(e){
      e.preventDefault();
      var note=document.getElementById('formnote');
      var cap=document.getElementById('captchaAnswer');
      if(cap && cap.value.trim()!=='20'){note.style.color='#C0444A';note.textContent='Please answer the question correctly (10 + 10).';return;}
      note.style.color='';
      var data=new FormData(f);
      fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams(data).toString()})
        .then(function(r){note.textContent=r.ok?'Thank you. Your message has been sent and we will respond shortly.':'Thanks. This form goes live once the site is deployed.';f.reset();})
        .catch(function(){note.textContent='Thanks. This form goes live once the site is deployed.';f.reset();});
    });
  }catch(err){}
})();
