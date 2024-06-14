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
        let response = await fetch(`${url}`);
        let isUserValue = true;
        if (!selector) {
          selector = utils.templateVersion == '7' ? 'main > *:first-child' : '#sections' ;
          isUserValue = false;
        }

        // If the call failed, throw an error
        if (!response.ok) {
          throw `Something went wrong with ${url}`;
        }

        let data = await response.text(),
            frag = document.createRange().createContextualFragment(data),
            section = frag.querySelector(selector).innerHTML;

        if (isUserValue) section = frag.querySelector(selector).outerHTML;

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
    loaders: document.querySelectorAll('[data-wm-plugin="load"]').length,
    loaded: 0,
    templateVersion: Static.SQUARESPACE_CONTEXT.templateVersion,
    loadScripts: []
  };

  function loadScripts() {
    if (!utils.loadScripts.length) {
      utils.emitEvent('wmSectionLoader:scriptsLoaded');
      return;
    }
  
    const hasLoaded = [];
    const scriptPromises = [];
  
    for (let el of utils.loadScripts) {
      //if (hasLoaded.includes(el.src) || hasLoaded.includes(el.innerHTML) || el.type === 'application/json') continue;
      if (el.type === 'application/json') continue;
  
      const promise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = el.src;
        script.async = el.async;
        script.onload = () => {
          //console.log(`${el.src} loaded successfully`);
          resolve();
        };
        script.onerror = () => {
          //console.log(`Error occurred while loading ${el.src}`);
          reject();
        };

        const isInternalScript = !!el.innerHTML.trim();
  
        if (isInternalScript) {
          eval(el.innerHTML);
          hasLoaded.push(el.innerHTML);
          resolve();
        } else {
          //document.body.appendChild(script);
          el.parentNode.insertBefore(script, el);
          el.parentNode.removeChild(el);
          hasLoaded.push(el.src);
        }
      });
      scriptPromises.push(promise);
    }
  
    Promise.allSettled(scriptPromises)
      .then(() => {
        // All scripts have loaded, fire the custom event
        utils.emitEvent('wmSectionLoader:scriptsLoaded');
      })
      .catch(error => {
        console.error('Error loading scripts:', error);
      });

  }
  
  window.refactorSectionDividers = () => {
    const loadSections = document.querySelectorAll('.page-section.has-section-divider:has(.wm-load-container)');

    loadSections.forEach(section => {
      if (section.querySelector(':scope > .section-divider-display style[data-wm-section-divider-style]')) return;
      // Find the existing style element in the section
      const dividerStyles = section.querySelector(':scope > .section-divider-display style[data-section-divider-style]');
      if (!dividerStyles) return;
      
      // Find the next section or the section in the #footer-sections
      let nextSection = section.nextElementSibling || document.querySelector('#footer-sections > .page-section');
      if (!nextSection) return;
    
      // Get the new section ID from the next section
      const newSectionId = nextSection?.getAttribute('data-section-id');
      if (!newSectionId) return;
    
      // Extract the --divider-height value from the current section's custom properties
      const dividerHeight = getComputedStyle(section).getPropertyValue('--divider-height').trim();
      if (!dividerHeight) return;
    
      // Create the new CSS rule
      const newRule = `[data-section-id="${newSectionId}"] { --wm-adjusted-previous-section-divider-offset: ${dividerHeight}; }`;
    
      // Create a new style element
      const newStyleElement = document.createElement('style');
      newStyleElement.setAttribute('data-wm-section-divider-style', '');
      newStyleElement.textContent = newRule;

      dividerStyles.parentNode.insertBefore(newStyleElement, dividerStyles.nextSibling);
    })
  }

  let LoadContent = (function () {    
    function loadSquarespaceContent(instance){
      let container = instance.elements.container;
      window.Squarespace?.initializeLayoutBlocks(Y, Y.one(container));
      window.Squarespace?.initializeNativeVideo(Y, Y.one(container));
      window.Squarespace?.initializePageContent(Y, Y.one(container))
      initializeCommerce(container)
    }
    function initWMPlugins() {
      window.wmListSectionSync?.init()
    }
    function initializeCommerce(container) {
      // Re-initializing Commerce can be risky. 
      // Remove all "add to cart buttons" first and replace them
      // so you don't double add products
      const shouldInitialize = !!container.querySelectorAll(
        '.sqs-add-to-cart-button',
      ).length;
      const allAddToCartButtons = document.querySelectorAll('.sqs-add-to-cart-button');
      
      if (shouldInitialize) {
        // For each button, replace it with a clone to remove event listeners
        allAddToCartButtons.forEach(button => {
          const clone = button.cloneNode(true);
          button.parentNode.replaceChild(clone, button);
        });
        // Reinitialize Squarespace Commerce
        Y.Squarespace.Commerce.initializeCommerce();
      }
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
      let hasBkgVideos = instance.elements.bkgVideos.length;
      let hasProductItems = instance.elements.productItems.length;
      let hasListSection = instance.elements.listSection.length;
      let hasGallerySection = instance.elements.gallerySection.length;
      let hasBkgFx = instance.elements.bkgFx.length;
      let hasColorThemeStyles = document.head.querySelector('#colorThemeStyles');
      let hasShapeBlocks = instance.elements.shapeBlocks.length;
      
      /*If Background Video or Gallery Section*/
      if (hasBkgVideos || hasListSection || hasGallerySection || hasBkgFx || hasProductItems) {
        let sqsLoaderScript = document.querySelector('body > [src*="https://static1.squarespace.com/static/vta"]');
        utils.loadScripts.push(sqsLoaderScript)
      }

      if (hasShapeBlocks) {
        loadShapeBlocks(instance)
      }
      window.refactorSectionDividers()
      if (hasColorThemeStyles) {
        //addModifiedStyleElement(hasColorThemeStyles)
      }
    }
    function imageLoader(instance) {
      //if (!document.body.classList.contains('sqs-edit-mode')) return;
      let bkgImages = instance.elements.bkgImages;
      let summaryImages = instance.elements.summaryImages;
      const images = [...bkgImages, ...summaryImages]
      images.forEach(el => {
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
    function loadShapeBlocks(instance) {
      if (document.querySelector('style#wm-shape-block-styles')) return;
      addStyles();

      function addStyles() {
        const styleContent = `
          .sqs-block[data-definition-name="website.components.shape"] svg.sqs-shape {
            fill: var(--shape-block-background-color);
            stroke: var(--shape-block-stroke-color);
          }
          .sqs-block[data-definition-name="website.components.shape"] .sqs-shape-rectangle {
            background: var(--shape-block-background-color);
            border-color: var(--shape-block-stroke-color);
          }
          .sqs-block[data-definition-name="website.components.shape"] .sqs-block-content,
          .sqs-block[data-definition-name="website.components.shape"] .sqs-block-alignment-wrapper {
            height: 100%;
          }
          .sqs-block[data-definition-name="website.components.shape"] .sqs-block-alignment-wrapper {
            display: flex;
          }
          .sqs-block[data-definition-name="website.components.shape"] .sqs-shape {
            display: block;
            position: absolute;
            overflow: visible;
          }
          .sqs-block[data-definition-name="website.components.shape"] .sqs-shape-block-container {
            position: relative;
            color: var(--shape-block-dropshadow-color);
          }`;
          
        const styleElement = document.createElement('style');
        styleElement.id = 'wm-shape-block-styles'
        styleElement.type = 'text/css';
        styleElement.appendChild(document.createTextNode(styleContent));
        document.head.appendChild(styleElement);
      }
    }

    async function buildHTML(instance) {
      let container = instance.elements.container,
          target = instance.settings.target,
          url = instance.settings.url,
          selector = instance.settings.selector;
      
      let html = await utils.getHTML(url, selector);
      container.insertAdjacentHTML('afterbegin', html);
      loadSquarespaceContent(instance);
      initWMPlugins();
      pushScripts(instance);
      pushSqsSpecificScripts(instance);
      imageLoader(instance);
      utils.loaded += 1;


      if (utils.loaded == utils.loaders) {
        loadScripts();
      } else {
        utils.emitEvent('wmSectionLoader:scriptsLoaded');
      }
      utils.emitEvent('wmSectionLoader:loaded', {
        block: container,
        target: target ? target : null
      });

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
          let url = this.target;
          if (url.includes(' ')) url = target.split(' ')[0];
          return url;
        },
        get selector() {
          let target = this.target;
          let selector = null;
          if (target.includes(' ')) {
            selector = target.split(' ').slice(1).join(' ');
          }
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
        },
        get bkgFx() {
          return this.container.querySelectorAll('.background-fx-canvas');
        },
        get productItems() {
          return this.container.querySelectorAll('article.ProductItem .ProductItem-summary');
        },
        get summaryImages() {
          return this.container.querySelectorAll('.summary-item .summary-thumbnail img');
        },
        get shapeBlocks() {
          return this.container.querySelectorAll('.sqs-block[data-definition-name="website.components.shape"]');
        },
        get listSection() {
          return this.container.querySelectorAll('.page-section.user-items-list-section');
        },
        get gallerySection() {
          return this.container.querySelectorAll('.page-section.gallery-section');
        }
      };

      instance.elements.container.classList.add('wm-load-container')
      buildHTML(instance);
    }

    return Constructor;
  }());

  let initContentLoads = () => {
    let contentLoads = document.querySelectorAll('[data-wm-plugin="load"]');
    if (!contentLoads.length) return;
    for (let el of contentLoads) {
      if (el.classList.contains('wm-load-container')) continue;
      new LoadContent(el);
    }
  }
  initContentLoads();
  window.addEventListener('mercury:load', initContentLoads)
  window.wmInitContentLoad = initContentLoads;
}());
