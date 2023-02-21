/* =========
  Content Loader
  Load Content anywhere you need it
  This Code is Licensed by Will-Myers.com
========== */
(function () {
  const utils = {
    emitEvent: function (type, detail = {}, elem = document) {
      if (!type) return;
      let event = new CustomEvent(type, {
        bubbles: true,
        cancelable: true,
        detail: detail,
      });
      return elem.dispatchEvent(event);
    },
    async getHTML(url, selector = null) {
      try {
        let response = await fetch(`${url}`),
            selector = utils.templateVersion == '7' ? 'main > *:first-child' : '#sections' ;

        // If the call failed, throw an error
        if (!response.ok) {
          throw `Something went wrong with ${url}`;
        }

        let data = await response.text(),
            frag = document.createRange().createContextualFragment(data),
            section = frag.querySelector(selector).innerHTML;

        if (selector) section = frag.querySelector(selector).innerHTML;

        return section;

      } catch (error) {
        return `<div class="load-plugin wm-alert"><p>Hey there, it looks like the url you are using, <code>${url}</code>, doesn't exist. Check the URL in the code block. And don't worry, this note is only showing in the Squarespace Editor, not on the live site.</p><p>If you continue to have issues, reach out to our team here: <a>https://will-myers.com/ask</a></p></div>`
        console.error(error);
      }
    },
    getPropertyValue: function (el, prop) {
      let propValue = window.getComputedStyle(el).getPropertyValue(prop),
          cleanedValue = propValue.trim().toLowerCase(),
          value = cleanedValue;

      /*If First & Last Chars are Quotes, Remove*/
      if (cleanedValue.charAt(0).includes('"') || cleanedValue.charAt(0).includes("'")) value = value.substring(1);
      if (cleanedValue.charAt(cleanedValue.length-1).includes('"') || cleanedValue.charAt(cleanedValue.length-1).includes("'")) value = value.slice(0, -1);;

      if (cleanedValue == 'true') value = true;
      if (cleanedValue == 'false') value = false;

      return value;
    },
    loaders:document.querySelectorAll('[data-wm-plugin="load"]').length,
    loaded:0,
    templateVersion: Static.SQUARESPACE_CONTEXT.templateVersion,
    loadScripts: []
  };
  
  function loadScripts() {
    if (!utils.loadScripts.length) return;
    let hasLoaded = [];
    for (let el of utils.loadScripts){
      if (hasLoaded.includes(el.src) || hasLoaded.includes(el.innerHTML)) continue;
      const script = document.createElement('script');
      script.src = el.src;
      script.async = el.async;

      script.onload = () => {
        //console.log(`${el.src} loaded successfuly`);
      };

      script.onerror = () => {
        //console.log(`Error occurred while loading ${el.src}`);
      };

      if (el.innerHTML) {
        eval(el.innerHTML);
        hasLoaded.push(el.innerHTML)
      } else {
        document.body.appendChild(script);
        hasLoaded.push(el.src)
      }
    }
  }

  let LoadContent = (function () {    
    function loadSquarespaceContent(instance){
      let container = instance.elements.container;
      window.Squarespace?.initializeLayoutBlocks(Y, Y.one(container));
      window.Squarespace?.initializeNativeVideo(Y, Y.one(container));
    }

    function pushScripts(instance){
      let allow = utils.getPropertyValue(instance.elements.container, '--load-scripts'),
          scripts = instance.elements.scripts;

      if (allow === 'false' || allow === false) return;
      if (!scripts.length) return;
      scripts.forEach(el => utils.loadScripts.push(el))
    }
    
    function pushSqsSpecificScripts(instance) {
      /*Like Background Videos*/
      let hasBkgVideos = instance.elements.bkgVideos;
      
      /*If Background Video*/
      if (hasBkgVideos.length) {
        let sqsLoaderScript = document.querySelector('body > [src*="https://static1.squarespace.com/static/vta"]');
        utils.loadScripts.push(sqsLoaderScript)
      }
    }
    
    function imageLoader(instance) {
      //if (!document.body.classList.contains('sqs-edit-mode')) return;
      let bkgImages = instance.elements.bkgImages;
      bkgImages.forEach(el => {
        el.classList.add('wm-image-loaded')
        let fData = el.dataset.imageFocalPoint.split(',');
        let focalPoint = {};
        focalPoint.x = (parseFloat(fData[0]) * 100) + '%';
        focalPoint.y = (parseFloat(fData[1]) * 100) + '%';
        el.style.setProperty('--x', focalPoint.x);
        el.style.setProperty('--y', focalPoint.y);     
        el.dataset.load = true;
        el.src = el.dataset.src
      })
    }

    async function buildHTML(instance) {
      let container = instance.elements.container,
          target = instance.settings.target,
          url = instance.settings.url,
          selector = instance.settings.selector;
      
      let html = await utils.getHTML(url, selector);

      container.insertAdjacentHTML('afterbegin', html);
      loadSquarespaceContent(instance);
      pushScripts(instance);
      pushSqsSpecificScripts(instance);
      imageLoader(instance);
      utils.loaded += 1;
      if (utils.loaded == utils.loaders) {
        loadScripts();
      }

      return container;
    }

    function Constructor(el) {
      let instance = this;
      instance.settings = {
        get target() {
          return el.dataset.target;
        },
        get url() {
          let target = this.target;
          let url;
          if (target.includes(' ')) url = target.split(' ')[0];
          return target;
        },
        get selector() {
          let target = this.target;
          let selector;
          if (target.includes(' ')) selector = target.split(' ')[1];
          return selector;
        }
      };
      instance.elements = {
        container: el,
        get scripts() {
          return this.container.querySelectorAll('script');
        },
        get bkgVideos() {
          return this.container.querySelectorAll('.section-background .sqs-video-background-native');
        },
        get bkgImages() {
          return this.container.querySelectorAll('.section-background > img:not(.wm-image-loaded)');
        }
      };
                  
      instance.elements.container.classList.add('wm-load-container')
      buildHTML(instance);
    }

    return Constructor;
  }());

  let initContentLoads = () => {
    let contentLoads = document.querySelectorAll('[data-wm-plugin="load"]');
    for (let el of contentLoads) {
      new LoadContent(el);
    }
  }
  initContentLoads();
  window.addEventListener('mercury:load', initContentLoads)
  window.wmInitContentLoad = initContentLoads;
}());
