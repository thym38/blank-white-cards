// idea modified from https://codepen.io/chigggsy/pen/RwwexjR

function cards() {
    var tag;
    var element = document.getElementsByClassName("entry")[0];
    
    // for (let i=0; i<100; i++){
    for (let i=0; i<10; i++){
        tag = document.createElement("div");
        tag.classList.add('fallcard');
        tag.setAttribute("id", "c"+String(i));
        element.appendChild(tag);
    }
  }
  
cards();

gsap.fromTo(".fallcard", {
    x: window.innerWidth/2,
    y: window.innerHeight * 1.5,
    scale: 3,
    // zIndex: 1010
  }, {
    duration: .6,
    x: () => Math.random() * window.innerWidth - 0,
    y: () => Math.random() * window.innerHeight * 0.8 - 0,
    rotation: () =>  Math.random() * 60 - 0,
    scale: 1,
    stagger: 0.17,
    ease: "power2.in",
    zIndex: 950
  })